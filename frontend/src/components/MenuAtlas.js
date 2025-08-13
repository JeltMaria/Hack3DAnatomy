import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MenuAtlas.css';

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

const MenuAtlas = () => {
  const [status] = usePointerGlow();
  const navigate = useNavigate();

  const items = [
    {
      id: 1,
      title: 'Остеология',
      link: '/osteology',
      imageUrl: '/images/skel.png',
    },
    {
      id: 2,
      title: 'Ангиология',
      link: '/angi',
      imageUrl: '/images/angi.png',
    },
    {
      id: 3,
      title: 'Спланхология',
      link: '/calendar',
      imageUrl: '/images/splanchi.png',
    }
  ];

  const handleCardClick = (link) => {
    navigate(link);
  };

  return (
    <div className="welcome-container">
      <div className="background-wrapper">
        <h1><span>🧠</span>МЕНЮ Атласа</h1>
        <main>
          {items.map((item, index) => (
            <article key={item.id} data-glow data-card-index={index}>
              <span data-glow />
              <div className="card-content">
                <h2>{item.title}</h2>
                <img src={item.imageUrl} alt={item.title} />
                <button 
                  type="button" 
                  data-effect="pulse"
                  onClick={() => handleCardClick(item.link)}
                >
                  <span className="text">Перейти</span>
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

export default MenuAtlas;