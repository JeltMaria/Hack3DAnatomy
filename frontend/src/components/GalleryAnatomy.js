import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './GalleryAnatomy.css';

const usePointerGlow = () => {
  const [status, setStatus] = useState(null);
  useEffect(() => {
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

const GalleryAnatomy = () => {
  const [status] = usePointerGlow();
  const [models, setModels] = useState([]);
  const navigate = useNavigate();

  // Список всех файлов моделей из каталога
  const modelFiles = [
    'multi_01989ebf-e6f9-7162-9a82-5fa5d4d5b447.glb',
    '01989eb6-a504-7151-b976-bcfd1c604b84.glb',
    'multi_01989ebf-e6f9-7162-9a82-5fa5d4d5b448_Kacheksia.glb',
    '0198a3ab-3b6d-79ef-9b93-5ea203387881.glb',
    '0198a3b0-fdfb-79fb-a9f4-17df3bb58923.glb'
  ];

  // Функция для извлечения UUID из имени файла
  const extractModelNumber = (filename) => {
    const match = filename.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/);
    return match ? match[1] : filename.replace('_thumbnail.png', '');
  };

  // Функция для поиска соответствующего имени модели
  const getModelName = (thumbnailName) => {
    const uuid = extractModelNumber(thumbnailName);
    // Ищем файл модели, который содержит UUID или совпадает с ним
    const modelFile = modelFiles.find(file => 
      file.includes(uuid) || file === `${uuid}_model.glb` || file === `${uuid}.glb`
    );
    // Возвращаем имя модели, если найдено, иначе возвращаем исходное имя файла
    return modelFile || 'Kacheksia.glb'; // Фallback на skeleton.glb для неизвестных файлов
  };

  useEffect(() => {
    const fetchModels = async () => {
      try {
        // Демо данные для примера
        const demoModels = [
          { filename: 'multi_01989ebf-e6f9-7162-9a82-5fa5d4d5b447_thumbnail.png' }, 
          { filename: '01989eb6-a504-7151-b976-bcfd1c604b84_thumbnail.png' },
          { filename: 'multi_01989ebf-e6f9-7162-9a82-5fa5d4d5b448_Kacheksia.png' },
          { filename: '0198a3ab-3b6d-79ef-9b93-5ea203387881_thumbnail.png' }, 
          { filename: '0198a3b0-fdfb-79fb-a9f4-17df3bb58923_thumbnail.png' }  
        ];
        
        const modelsWithData = demoModels.map((model, index) => ({
          id: index + 1,
          filename: model.filename,
          imageUrl: `/models/${model.filename}`,
          modelNumber: extractModelNumber(model.filename),
          modelName: getModelName(model.filename)
        }));
        
        setModels(modelsWithData);
      } catch (error) {
        console.error('Ошибка загрузки моделей:', error);
      }
    };

    fetchModels();
  }, []);

  const handleCardClick = (modelName) => {
    navigate(`/load-model?model=${encodeURIComponent(modelName)}`);
  };

  return (
    <div className="gallery-container">
      <div className="background-wrapper">
        <h1><span>🧠</span> Ваша анатомическая галерея</h1>
        <main className="gallery-grid">
          {models.map((model, index) => (
            <article 
              key={model.id} 
              data-glow 
              data-card-index={index % 4}
              className="gallery-card"
            >
              <span data-glow />
              <div className="card-content">
                <img src={model.imageUrl} alt={`Модель ${model.modelNumber}`} />
                <h2>#{model.modelNumber}</h2>
                <button 
                  type="button" 
                  data-effect="pulse"
                  onClick={() => handleCardClick(model.modelName)}
                >
                  <span className="text">Загрузить модель</span>
                  <span className="shimmer"></span>
                </button>
              </div>
            </article>
          ))}
        </main>
      </div>
    </div>
  );
};

export default GalleryAnatomy;