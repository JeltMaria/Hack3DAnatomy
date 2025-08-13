import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

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

const HomePage = () => {
  const [status] = usePointerGlow();
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const items = [
    {
      id: 1,
      title: '3D анатомический атлас',
      link: '/menu-atlas',
      imageUrl: '/images/3d_atlas.png',
    },
    {
      id: 2,
      title: '3D сканер фото',
      link: '/menu-models',
      imageUrl: '/images/anatomichka.png',
    },
    {
      id: 3,
      title: 'Дополненная анатомическая реальность',
      link: '/ar-anatomy',
      imageUrl: '/images/ar_ficha.png',
    }
  ];

  // Автоматическое переключение слайдов каждые 2 секунды
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % items.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [items.length]);

  const handleMenuClick = (link) => {
    navigate(link);
  };

  return (
    <div className="welcome-container">
      <div className="background-wrapper">
        <h1><span>🧠</span> МЕНЮ</h1>
        
        <div className="main-content">
          {/* Слайд-шоу слева */}
          <div className="slideshow-container" data-glow>
            <span data-glow />
            <div className="slideshow-wrapper">
              {items.map((item, index) => (
                <div 
                  key={item.id}
                  className={`slide ${index === currentSlide ? 'active' : ''}`}
                >
                  <img src={item.imageUrl} alt={item.title} />
                </div>
              ))}
            </div>
          </div>

          {/* Меню справа */}
          <div className="menu-container">
            <div className="menu-items">
              {items.map((item, index) => (
                <button 
                  key={item.id}
                  type="button" 
                  className="menu-button"
                  data-effect="pulse"
                  data-card-index={index}
                  onClick={() => handleMenuClick(item.link)}
                >
                  <span className="text">{item.title}</span>
                  <span className="shimmer"></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;