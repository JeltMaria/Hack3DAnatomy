import React, { useState, useRef, useEffect } from 'react';
import './PhotoTo3D.css';

const usePointerGlow = () => {
  const [status, setStatus] = React.useState(null);
  React.useEffect(() => {
    const syncPointer = ({ x: pointerX, y: pointerY }) => {
      const x = pointerX.toFixed(2);
      const y = pointerY.toFixed(2);
      const xp = (pointerX / window.innerWidth).toFixed(2);
      const yp = (pointerY / window.innerHeight).toFixed(2);
      document.documentElement.style.setProperty('--x', x);
      document.documentElement.style.setProperty('--xp', xp);
      document.documentElement.style.setProperty('--y', y);
      document.documentElement.style.setProperty('--yp', yp);
      setStatus({ x, y, xp, yp });
    };
    document.body.addEventListener('pointermove', syncPointer);
    return () => {
      document.body.removeEventListener('pointermove', syncPointer);
    };
  }, []);
  return [status];
};

const PhotoTo3D = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [status] = usePointerGlow();

  const [settings, setSettings] = useState({
    ai_model: 'meshy-4',
    topology: 'triangle',
    target_polycount: 30000,
    should_texture: true,
    enable_pbr: false,
    texture_prompt: ''
  });

  const pollInterval = useRef(null);

  const pollTaskStatus = async (taskId, isMultiImage = false) => {
    try {
      const endpoint = isMultiImage ? 'multi-image-to-3d' : 'image-to-3d';
      const response = await fetch(`http://localhost:8000/api/meshy/task-status/${taskId}?type=${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTaskStatus(data);

      if (data.status === 'SUCCEEDED') {
        setSuccessMessage('🎉 3D модель успешно создана и добавлена в галерею!');
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          pollInterval.current = null;
        }
      } else if (data.status === 'FAILED' || data.status === 'CANCELED' || data.status === 'TIMEOUT') {
        const errorMsg = data.status === 'TIMEOUT' ? 'Время ожидания истекло' : 
                        data.error || 'Генерация модели не удалась';
        setError(errorMsg);
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          pollInterval.current = null;
        }
      }
    } catch (error) {
      setError(`Ошибка при проверке статуса задачи: ${error.message}`);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      if (files.length > 4) {
        setError('Максимум 4 изображения для Multi-Image to 3D');
        return;
      }
      setSelectedFiles(files);
      setError(null);
      setSuccessMessage(null);
    }
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setCurrentTask(null);
    setTaskStatus(null);
    setError(null);
    setSuccessMessage(null);
    setIsUploading(false);
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Пожалуйста, выберите файлы');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);
    setCurrentTask(null);
    setTaskStatus(null);

    try {
      const formData = new FormData();
      const isMultiImage = selectedFiles.length > 1;
      const endpoint = isMultiImage ? 'create-multi-image-task' : 'create-task';
      
      if (isMultiImage) {
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('ai_model', 'meshy-5');
      } else {
        formData.append('file', selectedFiles[0]);
        formData.append('ai_model', settings.ai_model);
        formData.append('enable_pbr', settings.enable_pbr.toString());
      }
      
      formData.append('topology', settings.topology);
      formData.append('target_polycount', settings.target_polycount.toString());
      formData.append('should_texture', settings.should_texture.toString());
      
      if (settings.texture_prompt.trim()) {
        formData.append('texture_prompt', settings.texture_prompt);
      }

      const response = await fetch(`http://localhost:8000/api/meshy/${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentTask(data);
        pollInterval.current = setInterval(() => {
          pollTaskStatus(data.task_id, isMultiImage);
        }, 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Ошибка при загрузке файлов');
      }
    } catch (error) {
      setError('Ошибка сети при загрузке файлов');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (currentTask && taskStatus && taskStatus.status === 'IN_PROGRESS') {
        e.preventDefault();
        e.returnValue = 'Генерация 3D модели в процессе. Вы уверены, что хотите покинуть страницу?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [currentTask, taskStatus]);

  const getStatusMessage = () => {
    if (!taskStatus) return null;
    switch (taskStatus.status) {
      case 'PENDING':
        return 'Задача в очереди...';
      case 'IN_PROGRESS':
        return `Создание 3D модели... ${taskStatus.progress}%`;
      case 'SUCCEEDED':
        return 'Модель успешно создана!';
      case 'FAILED':
        return 'Ошибка при генерации модели';
      case 'CANCELED':
        return 'Задача отменена';
      default:
        return `Статус: ${taskStatus.status}`;
    }
  };

  const isMultiImageMode = selectedFiles.length > 1;

  return (
    <div className="photo-to-3d-container">
      <div className="background-wrapper">
        <h1><span>📸</span> Создание 3D модели</h1>
        <main>
          <article data-glow data-card-index="0">
            <span data-glow />
            <div className="card-content">
              <h2>Загрузить фотографии</h2>
              <div className="file-upload">
                <input
                  type="file"
                  id="file-input"
                  accept="image/jpeg,image/jpg,image/png"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                <label htmlFor="file-input" className={`file-label ${isUploading ? 'disabled' : ''}`}>
                  {selectedFiles.length === 0 ? '📁 Выбрать фото' : `📁 ${selectedFiles.length} файл(ов) выбрано`}
                </label>
              </div>
              {selectedFiles.length > 0 && (
                <div className="preview-section">
                  <h3>Предварительный просмотр:</h3>
                  <div className="preview-grid">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="preview-item">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="preview-image"
                        />
                        <p>{file.name}</p>
                      </div>
                    ))}
                  </div>
                  {isMultiImageMode && (
                    <p className="info-text">🔄 Multi-Image to 3D режим активен. Будет использована модель Meshy-5.</p>
                  )}
                </div>
              )}
            </div>
          </article>

          <article data-glow data-card-index="1">
            <span data-glow />
            <div className="card-content">
              <h2>Настройки модели</h2>
              <div className="settings-grid">
                <div className="setting-group">
                  <label>AI Модель:</label>
                  <select
                    value={isMultiImageMode ? 'meshy-5' : settings.ai_model}
                    onChange={(e) => setSettings({...settings, ai_model: e.target.value})}
                    disabled={isUploading || isMultiImageMode}
                  >
                    <option value="meshy-4">Meshy-4</option>
                    <option value="meshy-5">Meshy-5</option>
                  </select>
                  {isMultiImageMode && <small>Multi-Image режим поддерживает только Meshy-5</small>}
                </div>
                <div className="setting-group">
                  <label>Топология:</label>
                  <select
                    value={settings.topology}
                    onChange={(e) => setSettings({...settings, topology: e.target.value})}
                    disabled={isUploading}
                  >
                    <option value="triangle">Triangle</option>
                    <option value="quad">Quad</option>
                  </select>
                </div>
                <div className="setting-group">
                  <label>Полигоны: {settings.target_polycount.toLocaleString()}</label>
                  <input
                    type="range"
                    min="1000"
                    max="100000"
                    step="1000"
                    value={settings.target_polycount}
                    onChange={(e) => setSettings({...settings, target_polycount: parseInt(e.target.value)})}
                    disabled={isUploading}
                  />
                </div>
                <div className="setting-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.should_texture}
                      onChange={(e) => setSettings({...settings, should_texture: e.target.checked})}
                      disabled={isUploading}
                    />
                    Создать текстуры
                  </label>
                </div>
                {!isMultiImageMode && (
                  <div className="setting-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.enable_pbr}
                        onChange={(e) => setSettings({...settings, enable_pbr: e.target.checked})}
                        disabled={isUploading}
                      />
                      PBR материалы
                    </label>
                  </div>
                )}
                <div className="setting-group full-width">
                  <label>Описание текстуры:</label>
                  <textarea
                    value={settings.texture_prompt}
                    onChange={(e) => setSettings({...settings, texture_prompt: e.target.value})}
                    placeholder="Опишите желаемую текстуру..."
                    disabled={isUploading}
                    maxLength={600}
                  />
                  <small>{settings.texture_prompt.length}/600 символов</small>
                </div>
              </div>
            </div>
          </article>

          <article data-glow data-card-index="2">
            <span data-glow />
            <div className="card-content">
              <h2>Действия</h2>
              <div className="action-buttons">
                <button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || isUploading}
                  data-effect="pulse"
                  className={selectedFiles.length === 0 || isUploading ? 'disabled' : ''}
                >
                  <span className="text">
                    {isUploading ? '🔄 Загружается...' : 
                     isMultiImageMode ? '🚀 Создать Multi-3D модель' : '🚀 Создать 3D модель'}
                  </span>
                  <span className="shimmer"></span>
                </button>
                <button
                  onClick={handleReset}
                  data-effect="pulse"
                  className={isUploading ? 'disabled' : ''}
                >
                  <span className="text">🔄 Сбросить</span>
                  <span className="shimmer"></span>
                </button>
              </div>
              {successMessage && (
                <div className="success-section">
                  <p className="success-text">{successMessage}</p>
                </div>
              )}
              {(currentTask || taskStatus) && !successMessage && (
                <div className="status-section">
                  <p className="status-text">{getStatusMessage()}</p>
                  {taskStatus && taskStatus.progress > 0 && taskStatus.status !== 'SUCCEEDED' && (
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${taskStatus.progress}%` }}></div>
                    </div>
                  )}
                  {currentTask && (
                    <div className="task-info">
                      <p><strong>ID задачи:</strong> {currentTask.task_id}</p>
                      {isMultiImageMode && (
                        <p><strong>Режим:</strong> Multi-Image to 3D ({selectedFiles.length} изображений)</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {error && (
                <div className="error-section">
                  <p className="error-text">❌ {error}</p>
                </div>
              )}
            </div>
          </article>

          <article data-glow data-card-index="3">
            <span data-glow />
            <div className="card-content">
              <h2>Информация</h2>
              <div className="info-grid">
                <div className="info-block">
                  <h3>💡 Советы</h3>
                  <ul>
                    <li>Используйте четкие фотографии с хорошим освещением</li>
                    <li>Объект должен быть хорошо виден</li>
                    <li>Избегайте размытых изображений</li>
                    <li>Размер не менее 512x512 пикселей</li>
                    <li>Для Multi-Image: фотографии одного объекта с разных ракурсов</li>
                    <li>Процесс может занять 2-8 минут</li>
                  </ul>
                </div>
                <div className="info-block">
                  <h3>📁 Форматы</h3>
                  <div>
                    <strong>Входные форматы:</strong>
                    <ul>
                      <li>JPEG (.jpg, .jpeg)</li>
                      <li>PNG (.png)</li>
                    </ul>
                    <strong>Выходные форматы:</strong>
                    <ul>
                      <li>GLB (основной для веб)</li>
                      <li>FBX (для 3D редакторов)</li>
                      <li>OBJ (универсальный)</li>
                      <li>USDZ (для AR на iOS)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
};

export default PhotoTo3D;