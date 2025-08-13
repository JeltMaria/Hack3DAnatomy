import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './LoadModel.css';

const LoadModel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const modelRef = useRef(null);
  const isLoadingRef = useRef(false);
  
  const [modelPath, setModelPath] = useState(null);
  const [modelName, setModelName] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [inputPosition, setInputPosition] = useState({ x: 0, y: 0 });
  const [error, setError] = useState(null);

  // Получаем название модели из URL параметров
  useEffect(() => {
    const modelParam = searchParams.get('model');
    
    if (modelParam) {
      setModelName(modelParam);
      const modelPath = `/models/${modelParam}`;
      setModelPath(modelPath);
    } else {
      setError('Не указано название модели');
      setTimeout(() => {
        navigate('/gallery-anatomy', { replace: true });
      }, 2000);
    }
  }, [searchParams, navigate]);

  const createAnnotation = (point, term = '') => {
    const annotationGroup = new THREE.Group();
    
    // Создаем маркер (маленький шар)
    const markerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(point);
    
    // Создаем линию
    const lineGeometry = new THREE.BufferGeometry();
    const lineEnd = point.clone().add(new THREE.Vector3(1, 1, 0));
    const linePoints = [point, lineEnd];
    lineGeometry.setFromPoints(linePoints);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    
    // Создаем горизонтальную линию в конце
    const hLineGeometry = new THREE.BufferGeometry();
    const hLineStart = lineEnd.clone();
    const hLineEnd = lineEnd.clone().add(new THREE.Vector3(0.5, 0, 0));
    const hLinePoints = [hLineStart, hLineEnd];
    hLineGeometry.setFromPoints(hLinePoints);
    const hLine = new THREE.Line(hLineGeometry, lineMaterial);
    
    annotationGroup.add(marker);
    annotationGroup.add(line);
    annotationGroup.add(hLine);
    
    // Создаем текст для метки
    let textSprite = null;
    if (term) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;
      
      context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.font = '20px Arial';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(term, canvas.width / 2, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      textSprite = new THREE.Sprite(spriteMaterial);
      textSprite.position.copy(hLineEnd);
      textSprite.scale.set(1, 0.25, 1);
      annotationGroup.add(textSprite);
    }
    
    const annotation = {
      id: Date.now(),
      group: annotationGroup,
      position: point.clone(),
      term: term,
      lineEnd: hLineEnd.clone(),
      textSprite: textSprite
    };
    
    sceneRef.current.add(annotationGroup);
    return annotation;
  };

  const updateAnnotationText = (annotation, term) => {
    // Удаляем старый текст
    if (annotation.textSprite) {
      annotation.group.remove(annotation.textSprite);
    }
    
    // Создаем новый текст
    if (term) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;
      
      context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.font = '20px Arial';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(term, canvas.width / 2, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const textSprite = new THREE.Sprite(spriteMaterial);
      textSprite.position.copy(annotation.lineEnd);
      textSprite.scale.set(1, 0.25, 1);
      annotation.group.add(textSprite);
      annotation.textSprite = textSprite;
    }
  };

  const handleDoubleClick = (event) => {
    if (!modelRef.current) return;
    
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(modelRef.current, true);
    
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const annotation = createAnnotation(point);
      setAnnotations(prev => [...prev, annotation]);
      setEditingAnnotation(annotation.id);
      
      // Вычисляем позицию поля ввода
      const vector = annotation.lineEnd.clone();
      vector.project(cameraRef.current);
      
      const x = (vector.x * 0.5 + 0.5) * rect.width;
      const y = (vector.y * -0.5 + 0.5) * rect.height;
      
      setInputPosition({ x, y });
    }
  };

  const updateAnnotationTerm = (id, term) => {
    setAnnotations(prev => prev.map(ann => {
      if (ann.id === id) {
        updateAnnotationText(ann, term);
        return { ...ann, term };
      }
      return ann;
    }));
    setEditingAnnotation(null);
  };

  const deleteAnnotation = (id) => {
    const annotation = annotations.find(ann => ann.id === id);
    if (annotation && sceneRef.current) {
      sceneRef.current.remove(annotation.group);
      setAnnotations(prev => prev.filter(ann => ann.id !== id));
    }
  };

  const handleBackToGallery = () => {
    navigate('/gallery-anatomy');
  };

  useEffect(() => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(
      75,
      (window.innerWidth * 0.7) / window.innerHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth * 0.7, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    
    if (mountRef.current) {
      mountRef.current.innerHTML = '';
      mountRef.current.appendChild(renderer.domElement);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, -10, -5);
    scene.add(directionalLight2);

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.enablePan = true;
    controlsRef.current = controls;

    // Event listeners
    const handleDoubleClickBound = (event) => handleDoubleClick(event);
    renderer.domElement.addEventListener('dblclick', handleDoubleClickBound);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      const width = window.innerWidth * 0.7;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('dblclick', handleDoubleClickBound);
      }
      if (mountRef.current && renderer.domElement && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      isLoadingRef.current = false;
    };
  }, []);

  // Загружаем модель когда получили путь
  useEffect(() => {
    if (modelPath && sceneRef.current) {
      const loader = new GLTFLoader();
      loader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;
          modelRef.current = model;
          sceneRef.current.add(model);

          // Center and scale model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 12 / maxDim;
          model.scale.set(scale, scale, scale);
          model.position.sub(center.multiplyScalar(scale));

          // Adjust camera position
          cameraRef.current.position.set(maxDim * scale * 0.6, maxDim * scale * 0.4, maxDim * scale * 0.6);
          cameraRef.current.lookAt(0, 0, 0);
        },
        undefined,
        (error) => {
          console.error('Error loading model:', error);
          setError('Ошибка загрузки модели: ' + error.message);
        }
      );
    }
  }, [modelPath]);

  if (error && !modelPath) {
    return (
      <div className="loadmodel-container">
        <div className="header">
          <h1>🔬 Виртуальная анатомичка</h1>
        </div>
        <div className="error-message">
          <p>{error}</p>
          <button onClick={handleBackToGallery} className="back-button">
            Вернуться в галерею
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="loadmodel-container">
      {/* Header */}
      <div className="header">
        <h1>🔬 Виртуальная анатомичка</h1>
      </div>

      <div className="main-content">
        {/* 3D Model Viewer */}
        <div className="model-section">
          <div ref={mountRef} className="model-viewer" />
          
          {/* Annotation input */}
          {editingAnnotation && (
            <div 
              className="annotation-input"
              style={{
                position: 'absolute',
                left: `${inputPosition.x}px`,
                top: `${inputPosition.y}px`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <input
                type="text"
                placeholder="Введите термин..."
                autoFocus
                onBlur={(e) => updateAnnotationTerm(editingAnnotation, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateAnnotationTerm(editingAnnotation, e.target.value);
                  } else if (e.key === 'Escape') {
                    deleteAnnotation(editingAnnotation);
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Annotations Panel */}
        <div className="annotations-panel">
          <div className="panel-header">
            <h2>Аннотации модели</h2>
            <p>Дважды щелкните по модели для добавления метки</p>
          </div>
          
          {/* Model info */}
          <div className="model-info">
            <h3>Модель: {modelName}</h3>
          </div>
          
          {/* Annotations list */}
          {annotations.length > 0 && (
            <div className="annotations-section">
              <h3>Метки ({annotations.length})</h3>
              <div className="annotations-list">
                {annotations.map(annotation => (
                  <div key={annotation.id} className="annotation-item">
                    <span>{annotation.term || 'Без названия'}</span>
                    <button 
                      className="delete-btn"
                      onClick={() => deleteAnnotation(annotation.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back button */}
          <div className="panel-actions">
            <button onClick={handleBackToGallery} className="back-button">
              🔙 Вернуться в галерею
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadModel;