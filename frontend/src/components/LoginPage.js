import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import './LoginPage.css';

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/login-or-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        navigate('/home');
      } else {
        setError(data.message || 'Произошла ошибка');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером. Пожалуйста, попробуйте позже.');
    }
  };

  return (
    <div className="welcome-container">
      <img src="/images/anat_pic_login.png" alt="Background" className="right-image" />
      <div className="card">
        <div className="content">
          <h1><span>🫀</span> ВОЙДИТЕ ИЛИ ЗАРЕГИСТРИРУЙТЕСЬ</h1>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" data-effect="pulse">
              <span className="text">ВОЙТИ</span>
              <span className="shimmer"></span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;