import os
import asyncio
import aiohttp
import aiofiles
from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import base64
import uuid
from pathlib import Path
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Конфигурация
MESHY_API_KEY = os.getenv("MESHY_API_KEY", "api_от меши")
MESHY_BASE_URL = "https://api.meshy.ai/openapi/v1"
MODELS_DIR = "/home/user/HpProject/frontend/public/models"

# Создаем директорию для моделей если её нет
Path(MODELS_DIR).mkdir(parents=True, exist_ok=True)

router = APIRouter()

# Модели данных
class MeshyTaskResponse(BaseModel):
    task_id: str
    status: str
    progress: int
    message: str

class MeshyTaskStatus(BaseModel):
    task_id: str
    status: str
    progress: int
    model_urls: Optional[dict] = None
    thumbnail_url: Optional[str] = None
    texture_urls: Optional[list] = None
    created_at: Optional[int] = None
    finished_at: Optional[int] = None

class MeshyTaskCreate(BaseModel):
    ai_model: str = "meshy-4"
    topology: str = "triangle"
    target_polycount: int = 30000
    should_texture: bool = True
    enable_pbr: bool = False
    texture_prompt: Optional[str] = None

# Хранилище активных задач (в продакшене лучше использовать Redis или базу данных)
active_tasks = {}

async def download_model_file(url: str, filename: str) -> str:
    """Скачивает файл модели и сохраняет локально"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    file_path = os.path.join(MODELS_DIR, filename)
                    async with aiofiles.open(file_path, 'wb') as f:
                        async for chunk in response.content.iter_chunked(8192):
                            await f.write(chunk)
                    return f"/models/{filename}"
                else:
                    raise HTTPException(status_code=400, detail=f"Failed to download file: {response.status}")
    except Exception as e:
        logger.error(f"Error downloading file {url}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Download error: {str(e)}")

async def check_task_status_and_download(task_id: str):
    """Проверяет статус задачи и скачивает модель при готовности"""
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}",
        "Content-Type": "application/json"
    }
    
    max_attempts = 300  # 5 минут при проверке каждые секунду
    attempt = 0
    
    try:
        async with aiohttp.ClientSession() as session:
            while attempt < max_attempts:
                try:
                    async with session.get(f"{MESHY_BASE_URL}/image-to-3d/{task_id}", headers=headers) as response:
                        if response.status == 200:
                            data = await response.json()
                            status = data.get("status")
                            progress = data.get("progress", 0)
                            
                            logger.info(f"Task {task_id} status: {status}, progress: {progress}%")
                            
                            # Обновляем статус в хранилище
                            active_tasks[task_id] = {
                                "status": status,
                                "progress": progress,
                                "data": data,
                                "type": active_tasks[task_id].get("type", "single-image")
                            }
                            
                            if status == "SUCCEEDED":
                                # Скачиваем модель
                                model_urls = data.get("model_urls", {})
                                if model_urls.get("glb"):
                                    filename = f"{task_id}.glb"
                                    local_path = await download_model_file(model_urls["glb"], filename)
                                    active_tasks[task_id]["local_model_path"] = local_path
                                
                                # Скачиваем превью
                                if data.get("thumbnail_url"):
                                    thumbnail_filename = f"{task_id}_thumbnail.png"
                                    thumbnail_path = await download_model_file(data["thumbnail_url"], thumbnail_filename)
                                    active_tasks[task_id]["local_thumbnail_path"] = thumbnail_path
                                
                                logger.info(f"Task {task_id} completed successfully")
                                break
                            elif status in ["FAILED", "CANCELED"]:
                                error_msg = data.get("task_error", {}).get("message", "Unknown error")
                                logger.error(f"Task {task_id} failed with status: {status}, error: {error_msg}")
                                active_tasks[task_id]["error"] = error_msg
                                break
                            
                            await asyncio.sleep(2)  # Ждем 2 секунды перед следующей проверкой
                            attempt += 1
                        else:
                            logger.error(f"Error checking task status: {response.status}")
                            error_text = await response.text()
                            logger.error(f"Response: {error_text}")
                            await asyncio.sleep(5)  # Ждем дольше при ошибке
                            attempt += 1
                except Exception as e:
                    logger.error(f"Exception during status check for {task_id}: {str(e)}")
                    await asyncio.sleep(5)
                    attempt += 1
            
            if attempt >= max_attempts:
                logger.warning(f"Task {task_id} timed out after {max_attempts} attempts")
                active_tasks[task_id]["status"] = "TIMEOUT"
                
    except Exception as e:
        logger.error(f"Error in background task for {task_id}: {str(e)}")
        active_tasks[task_id]["status"] = "ERROR"
        active_tasks[task_id]["error"] = str(e)

@router.post("/create-multi-image-task", response_model=MeshyTaskResponse)
async def create_multi_image_task(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    ai_model: str = "meshy-5",
    topology: str = "triangle",
    target_polycount: int = 30000,
    should_texture: bool = True,
    texture_prompt: Optional[str] = None
):
    """Создает новую задачу для генерации 3D модели из нескольких изображений"""
    
    # Проверяем количество файлов
    if len(files) < 1 or len(files) > 4:
        raise HTTPException(status_code=400, detail="Multi-Image to 3D requires 1-4 images")
    
    # Проверяем форматы файлов
    for file in files:
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="All files must be images")
        
        allowed_formats = ['image/jpeg', 'image/jpg', 'image/png']
        if file.content_type not in allowed_formats:
            raise HTTPException(status_code=400, detail="Supported formats: JPG, JPEG, PNG")
    
    try:
        # Конвертируем все файлы в base64
        image_urls = []
        for file in files:
            file_content = await file.read()
            base64_image = base64.b64encode(file_content).decode('utf-8')
            data_uri = f"data:{file.content_type};base64,{base64_image}"
            image_urls.append(data_uri)
        
        # Подготавливаем данные для запроса
        request_data = {
            "image_urls": image_urls,
            "ai_model": ai_model,  # Multi-Image поддерживает только meshy-5
            "topology": topology,
            "target_polycount": target_polycount,
            "should_texture": should_texture
        }
        
        if texture_prompt:
            request_data["texture_prompt"] = texture_prompt
        
        # Отправляем запрос к Meshy Multi-Image API
        headers = {
            "Authorization": f"Bearer {MESHY_API_KEY}",
            "Content-Type": "application/json"
        }
        
        logger.info(f"Sending Multi-Image request to Meshy API with {len(image_urls)} images")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{MESHY_BASE_URL}/multi-image-to-3d", json=request_data, headers=headers) as response:
                # Meshy API возвращает 202 (Accepted) для успешных запросов
                if response.status in [200, 202]:
                    result = await response.json()
                    task_id = result.get("result")
                    
                    if not task_id:
                        logger.error(f"No task_id in Multi-Image response: {result}")
                        raise HTTPException(status_code=500, detail="Invalid response from Meshy Multi-Image API")
                    
                    # Инициализируем задачу в хранилище
                    active_tasks[task_id] = {
                        "status": "PENDING",
                        "progress": 0,
                        "data": {},
                        "type": "multi-image"
                    }
                    
                    # Запускаем фоновую задачу для мониторинга
                    background_tasks.add_task(check_multi_image_task_status_and_download, task_id)
                    
                    logger.info(f"Multi-Image task {task_id} created successfully")
                    
                    return MeshyTaskResponse(
                        task_id=task_id,
                        status="PENDING",
                        progress=0,
                        message=f"Multi-Image task created successfully with {len(image_urls)} images. Processing started."
                    )
                else:
                    error_text = await response.text()
                    logger.error(f"Meshy Multi-Image API error: {response.status} - {error_text}")
                    raise HTTPException(status_code=400, detail=f"Meshy Multi-Image API error ({response.status}): {error_text}")
    
    except Exception as e:
        logger.error(f"Error creating Multi-Image Meshy task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def check_multi_image_task_status_and_download(task_id: str):
    """Проверяет статус Multi-Image задачи и скачивает модель при готовности"""
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}",
        "Content-Type": "application/json"
    }
    
    max_attempts = 600  # 10 минут при проверке каждые секунду
    attempt = 0
    
    try:
        async with aiohttp.ClientSession() as session:
            while attempt < max_attempts:
                try:
                    async with session.get(f"{MESHY_BASE_URL}/multi-image-to-3d/{task_id}", headers=headers) as response:
                        if response.status == 200:
                            data = await response.json()
                            status = data.get("status")
                            progress = data.get("progress", 0)
                            
                            logger.info(f"Multi-Image task {task_id} status: {status}, progress: {progress}%")
                            
                            # Обновляем статус в хранилище
                            active_tasks[task_id] = {
                                "status": status,
                                "progress": progress,
                                "data": data,
                                "type": "multi-image"
                            }
                            
                            if status == "SUCCEEDED":
                                # Скачиваем модель
                                model_urls = data.get("model_urls", {})
                                if model_urls.get("glb"):
                                    filename = f"multi_{task_id}.glb"
                                    local_path = await download_model_file(model_urls["glb"], filename)
                                    active_tasks[task_id]["local_model_path"] = local_path
                                
                                # Скачиваем превью
                                if data.get("thumbnail_url"):
                                    thumbnail_filename = f"multi_{task_id}_thumbnail.png"
                                    thumbnail_path = await download_model_file(data["thumbnail_url"], thumbnail_filename)
                                    active_tasks[task_id]["local_thumbnail_path"] = thumbnail_path
                                
                                logger.info(f"Multi-Image task {task_id} completed successfully")
                                break
                            elif status in ["FAILED", "CANCELED"]:
                                error_msg = data.get("task_error", {}).get("message", "Unknown error")
                                logger.error(f"Multi-Image task {task_id} failed with status: {status}, error: {error_msg}")
                                active_tasks[task_id]["error"] = error_msg
                                break
                            
                            await asyncio.sleep(2)  # Ждем 2 секунды перед следующей проверкой
                            attempt += 1
                        else:
                            logger.error(f"Error checking Multi-Image task status: {response.status}")
                            error_text = await response.text()
                            logger.error(f"Response: {error_text}")
                            await asyncio.sleep(5)  # Ждем дольше при ошибке
                            attempt += 1
                except Exception as e:
                    logger.error(f"Exception during Multi-Image status check for {task_id}: {str(e)}")
                    await asyncio.sleep(5)
                    attempt += 1
            
            if attempt >= max_attempts:
                logger.warning(f"Multi-Image task {task_id} timed out after {max_attempts} attempts")
                active_tasks[task_id]["status"] = "TIMEOUT"
                
    except Exception as e:
        logger.error(f"Error in Multi-Image background task for {task_id}: {str(e)}")
        active_tasks[task_id]["status"] = "ERROR"
        active_tasks[task_id]["error"] = str(e)

@router.post("/create-task", response_model=MeshyTaskResponse)
async def create_meshy_task(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    ai_model: str = "meshy-4",
    topology: str = "triangle",
    target_polycount: int = 30000,
    should_texture: bool = True,
    enable_pbr: bool = False,
    texture_prompt: Optional[str] = None
):
    """Создает новую задачу для генерации 3D модели из изображения"""
    
    # Проверяем формат файла
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    allowed_formats = ['image/jpeg', 'image/jpg', 'image/png']
    if file.content_type not in allowed_formats:
        raise HTTPException(status_code=400, detail="Supported formats: JPG, JPEG, PNG")
    
    try:
        # Читаем файл и конвертируем в base64
        file_content = await file.read()
        base64_image = base64.b64encode(file_content).decode('utf-8')
        data_uri = f"data:{file.content_type};base64,{base64_image}"
        
        # Подготавливаем данные для запроса
        request_data = {
            "image_url": data_uri,
            "ai_model": ai_model,
            "topology": topology,
            "target_polycount": target_polycount,
            "should_texture": should_texture,
            "enable_pbr": enable_pbr
        }
        
        if texture_prompt:
            request_data["texture_prompt"] = texture_prompt
        
        # Отправляем запрос к Meshy API
        headers = {
            "Authorization": f"Bearer {MESHY_API_KEY}",
            "Content-Type": "application/json"
        }
        
        logger.info(f"Sending request to Meshy API with data: {request_data.keys()}")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{MESHY_BASE_URL}/image-to-3d", json=request_data, headers=headers) as response:
                # Meshy API возвращает 202 (Accepted) для успешных запросов
                if response.status in [200, 202]:
                    result = await response.json()
                    task_id = result.get("result")
                    
                    if not task_id:
                        logger.error(f"No task_id in response: {result}")
                        raise HTTPException(status_code=500, detail="Invalid response from Meshy API")
                    
                    # Инициализируем задачу в хранилище
                    active_tasks[task_id] = {
                        "status": "PENDING",
                        "progress": 0,
                        "data": {},
                        "type": "single-image"
                    }
                    
                    # Запускаем фоновую задачу для мониторинга
                    background_tasks.add_task(check_task_status_and_download, task_id)
                    
                    logger.info(f"Task {task_id} created successfully")
                    
                    return MeshyTaskResponse(
                        task_id=task_id,
                        status="PENDING",
                        progress=0,
                        message="Task created successfully. Processing started."
                    )
                else:
                    error_text = await response.text()
                    logger.error(f"Meshy API error: {response.status} - {error_text}")
                    raise HTTPException(status_code=400, detail=f"Meshy API error ({response.status}): {error_text}")
    
    except Exception as e:
        logger.error(f"Error creating Meshy task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/task-status/{task_id}", response_model=MeshyTaskStatus)
async def get_task_status(task_id: str, type: str = "image-to-3d"):
    """Получает статус задачи генерации 3D модели"""
    
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_info = active_tasks[task_id]
    task_data = task_info.get("data", {})
    
    return MeshyTaskStatus(
        task_id=task_id,
        status=task_info["status"],
        progress=task_info["progress"],
        model_urls=task_data.get("model_urls"),
        thumbnail_url=task_info.get("local_thumbnail_path"),
        texture_urls=task_data.get("texture_urls"),
        created_at=task_data.get("created_at"),
        finished_at=task_data.get("finished_at")
    )

@router.get("/download-model/{task_id}")
async def download_model(task_id: str):
    """Возвращает ссылку на скачанную модель"""
    
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_info = active_tasks[task_id]
    
    if task_info["status"] != "SUCCEEDED":
        raise HTTPException(status_code=400, detail="Model is not ready yet")
    
    local_model_path = task_info.get("local_model_path")
    local_thumbnail_path = task_info.get("local_thumbnail_path")
    
    if not local_model_path:
        raise HTTPException(status_code=404, detail="Model file not found")
    
    return JSONResponse({
        "model_url": local_model_path,
        "thumbnail_url": local_thumbnail_path,
        "status": "ready"
    })

@router.get("/tasks")
async def list_tasks():
    """Возвращает список всех задач"""
    tasks = []
    for task_id, task_info in active_tasks.items():
        tasks.append({
            "task_id": task_id,
            "status": task_info["status"],
            "progress": task_info["progress"],
            "type": task_info.get("type", "single-image"),
            "has_model": "local_model_path" in task_info
        })
    return {"tasks": tasks}

@router.delete("/task/{task_id}")
async def delete_task(task_id: str):
    """Удаляет задачу из памяти"""
    if task_id in active_tasks:
        del active_tasks[task_id]
        return {"message": f"Task {task_id} deleted"}
    else:
        raise HTTPException(status_code=404, detail="Task not found")