from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from backend.routers import (
    meshy,
    auth      # Новый роутер для работы с Meshy.ai
)

app = FastAPI()

# Настройка CORS для взаимодействия с фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Создаем директорию для моделей если её нет
models_dir = "/home/user/HpProject/frontend/public/models"
Path(models_dir).mkdir(parents=True, exist_ok=True)

# Подключаем статическую раздачу файлов для моделей
app.mount("/models", StaticFiles(directory=models_dir), name="models")

# Подключение маршрутов
app.include_router(meshy.router, prefix="/api/meshy")  # Новый роутер для 3D моделей
app.include_router(auth.router, prefix="/api/auth")

@app.get("/")
async def root():
    return {"message": "Welcome to the Pregnancy Planning API with 3D Model Generation"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)