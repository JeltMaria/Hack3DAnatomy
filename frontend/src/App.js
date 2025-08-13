import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./components/HomePage";
import LoginPage from "./components/LoginPage";
import Osteology from "./components/Osteology";
import MenuAtlas from "./components/MenuAtlas";
import PhotoTo3D from "./components/PhotoTo3D";
import LoadModel from "./components/LoadModel";
import GalleryAnatomy from "./components/GalleryAnatomy";
import ARAnatomy from "./components/ARAnatomy"; // Импорт нового AR компонента
import Angi from "./components/Angi";
import MenuModels from "./components/MenuModels";

function App() {
  return (
    <Router>
      <Routes>
        {/* Основные страницы */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/menu-atlas" element={<MenuAtlas />} />
        <Route path="/menu-models" element={<MenuModels />} />
        <Route path="/osteology" element={<Osteology />} />
        <Route path="/photo-to-3d" element={<PhotoTo3D />} />
        <Route path="/load-model" element={<LoadModel />} />
        <Route path="/gallery-anatomy" element={<GalleryAnatomy />} />
        <Route path="/angi" element={<Angi />} />
        
        {/* AR Анатомия - новый маршрут */}
        <Route path="/ar-anatomy" element={<ARAnatomy />} />
      </Routes>
    </Router>
  );
}

export default App;