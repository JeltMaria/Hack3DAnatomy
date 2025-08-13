import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './ARAnatomy.css';

const ARAnatomy = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMarkerVisible, setIsMarkerVisible] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [arStarted, setArStarted] = useState(false);
  const sceneRef = useRef(null);

  useEffect(() => {
    // Проверяем поддержку камеры
    const checkCameraSupport = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Камера не поддерживается вашим браузером');
        }

        // Запрашиваем разрешение на камеру
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment' // Задняя камера на мобильных
          } 
        });
        
        // Останавливаем поток, так как A-Frame сам управляет камерой
        stream.getTracks().forEach(track => track.stop());
        
        setCameraPermission(true);
        setIsLoading(false);
      } catch (err) {
        console.error('Ошибка доступа к камере:', err);
        setError(`Ошибка доступа к камере: ${err.message}`);
        setCameraPermission(false);
        setIsLoading(false);
      }
    };

    checkCameraSupport();

    // Инициализация A-Frame после загрузки
    const initAFrame = () => {
      if (typeof AFRAME !== 'undefined' && sceneRef.current) {
        console.log('A-Frame инициализирован');
        
        // Обработчики событий для маркера
        const marker = sceneRef.current.querySelector('a-marker');
        if (marker) {
          marker.addEventListener('markerFound', () => {
            console.log('Маркер найден!');
            setIsMarkerVisible(true);
          });

          marker.addEventListener('markerLost', () => {
            console.log('Маркер потерян');
            setIsMarkerVisible(false);
          });
        }

        // Обработчик загрузки модели
        const model = sceneRef.current.querySelector('a-gltf-model');
        if (model) {
          model.addEventListener('model-loaded', () => {
            console.log('3D модель загружена успешно');
          });

          model.addEventListener('model-error', (e) => {
            console.error('Ошибка загрузки модели:', e);
            setError('Ошибка загрузки 3D модели');
          });
        }
      }
    };

    // Ждем загрузки A-Frame
    if (typeof AFRAME !== 'undefined') {
      initAFrame();
    } else {
      const checkAFrame = setInterval(() => {
        if (typeof AFRAME !== 'undefined') {
          initAFrame();
          clearInterval(checkAFrame);
        }
      }, 100);

      return () => clearInterval(checkAFrame);
    }
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  const handleStartAR = () => {
    setShowInstructions(false);
    setArStarted(true);
  };

  const handleFullscreen = () => {
    if (sceneRef.current) {
      const canvas = sceneRef.current.querySelector('canvas');
      if (canvas && canvas.requestFullscreen) {
        canvas.requestFullscreen();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="ar-loading">
        <div className="loading-spinner"></div>
        <h2>Инициализация AR...</h2>
        <p>Подготавливаем камеру и AR компоненты</p>
      </div>
    );
  }

  if (error || cameraPermission === false) {
    return (
      <div className="ar-error">
        <div className="error-icon">📹</div>
        <h2>Ошибка доступа к камере</h2>
        <p>{error || 'Для работы AR необходим доступ к камере'}</p>
        <div className="error-instructions">
          <h3>Как исправить:</h3>
          <ul>
            <li>Разрешите доступ к камере в браузере</li>
            <li>Убедитесь, что используете HTTPS</li>
            <li>Проверьте настройки приватности браузера</li>
          </ul>
        </div>
        <button className="back-button" onClick={handleBack}>
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="ar-container">
      {/* AR Сцена */}
      {arStarted && (
        <a-scene
          ref={sceneRef}
          className="ar-scene"
          embedded
          arjs="sourceType: webcam; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3; trackingMethod: best; sourceWidth:1280; sourceHeight:960; displayWidth: 1280; displayHeight: 960;"
          vr-mode-ui="enabled: false;"
          renderer="logarithmicDepthBuffer: true; colorManagement: true; sortObjects: true;"
          loading-screen="enabled: false;"
        >
          {/* Ресурсы */}
          <a-assets>
            <a-asset-item 
              id="anatomyModel" 
              src="/models/0198a3b0-fdfb-79fb-a9f4-17df3bb58923.glb"
              crossorigin="anonymous"
            />
          </a-assets>

          {/* Маркер Hiro */}
          <a-marker 
            preset="hiro"
            raycaster="objects: .clickable"
            emitevents="true"
            cursor="fuse: false; rayOrigin: mouse;"
          >
            {/* Основная 3D модель */}
            <a-gltf-model
              src="#anatomyModel"
              position="0 0 0"
              scale="0.3 0.3 0.3"
              rotation="-90 0 0"
              animation__rotate="property: rotation; to: -90 360 0; loop: true; dur: 15000; easing: linear"
              animation__float="property: position; to: 0 0.2 0; dir: alternate; dur: 2000; loop: true; easing: easeInOutSine"
              class="clickable"
            />

            {/* Дополнительные визуальные эффекты */}
            <a-ring
              position="0 -0.1 0"
              radius-inner="0.3"
              radius-outer="0.5"
              color="#4ECDC4"
              opacity="0.3"
              animation="property: rotation; to: 0 360 0; loop: true; dur: 8000; easing: linear"
            />

            {/* Информационная панель */}
            <a-plane
              position="0 1 0"
              width="2"
              height="0.5"
              color="#000000"
              opacity="0.7"
              text="value: Анатомическая модель; color: white; align: center; width: 6"
            />

            {/* Освещение */}
            <a-light type="ambient" color="#ffffff" intensity="0.6" />
            <a-light type="directional" position="1 1 1" intensity="0.8" color="#ffffff" />
            <a-light type="point" position="0 2 0" intensity="0.5" color="#4ECDC4" />
          </a-marker>

          {/* Камера */}
          <a-entity camera look-controls-enabled="false" arjs-look-controls="smoothingFactor: 0.1" />
        </a-scene>
      )}

      {/* UI Overlay */}
      <div className="ar-overlay">
        {/* Заголовок */}
        <div className="ar-header">
          <h1 className="ar-title">
            <span className="ar-icon">🔬</span>
            AR Анатомия
          </h1>
          <div className="ar-status">
            {isMarkerVisible ? (
              <span className="status-found">
                <span className="status-indicator active"></span>
                Маркер найден
              </span>
            ) : (
              <span className="status-searching">
                <span className="status-indicator"></span>
                Поиск маркера...
              </span>
            )}
          </div>
        </div>

        {/* Инструкции */}
        {!arStarted && showInstructions && (
          <div className="ar-instructions">
            <div className="instruction-card">
              <h3>📍 Как использовать AR:</h3>
              <ol>
                <li>Нажмите "Перейти к AR" для запуска камеры</li>
                <li>Наведите камеру на маркер Hiro</li>
                <li>Держите камеру стабильно</li>
                <li>Обеспечьте хорошее освещение</li>
                <li>Дождитесь появления 3D модели</li>
              </ol>
              <div className="instruction-buttons">
                <a 
                  href="/images/hiro.png" 
                  target="_blank" 
                  className="marker-link"
                >
                  📥 Скачать маркер Hiro
                </a>
                <button 
                  className="start-ar-button"
                  onClick={handleStartAR}
                >
                  🚀 Перейти к AR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AR интерфейс после запуска */}
        {arStarted && (
          <>
            <div className="ar-status">
              {isMarkerVisible ? (
                <span className="status-found">
                  <span className="status-indicator active"></span>
                  Маркер найден
                </span>
              ) : (
                <span className="status-searching">
                  <span className="status-indicator"></span>
                  Поиск маркера...
                </span>
              )}
            </div>

            {!isMarkerVisible && (
              <div className="ar-hint">
                <div className="hint-card">
                  <p>📱 Наведите камеру на маркер Hiro</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Информация о модели */}
        {arStarted && isMarkerVisible && (
          <div className="model-info">
            <div className="info-card">
              <h3>🧬 Анатомическая модель</h3>
              <p>Интерактивная 3D модель для изучения анатомии</p>
              <div className="model-controls">
                <span className="control-hint">
                  🔄 Модель автоматически вращается
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Кнопки управления */}
        <div className="ar-controls">
          <button className="control-button back-btn" onClick={handleBack}>
            <span>←</span>
            <span>Назад</span>
          </button>
          
          <button className="control-button fullscreen-btn" onClick={handleFullscreen}>
            <span>⛶</span>
            <span>Полный экран</span>
          </button>
          
          {!arStarted && (
            <button className="control-button start-btn" onClick={handleStartAR}>
              <span>🚀</span>
              <span>Запустить AR</span>
            </button>
          )}
        </div>

        {/* Индикатор загрузки модели */}
        <div className="loading-indicator">
          <div className="loading-bar"></div>
        </div>
      </div>
    </div>
  );
};

export default ARAnatomy;