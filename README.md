# 🌟 Hack3D: Приложение для генерации и просмотра 3D-моделей анатомии

![Гифка демонстрации](images/logo.gif)

**Приложение на базе FastAPI и React для генерации 3D-моделей из фотографий с использованием Meshy AI, просмотра в AR и изучения анатомии (остеология, ангиология и т.д.). Поддерживает авторизацию, загрузку изображений и интеграцию с открытыми моделями.**

---

## 📝 Описание проекта

Hack3D — это веб-приложение для создания 3D-моделей анатомических структур из фотографий. Проект включает:
- Бэкенд на FastAPI с интеграцией Meshy AI для генерации моделей из одного или нескольких изображений.
- Фронтенд на React с просмотром моделей, AR-режимом и образовательными разделами (остеология, галерея анатомии).
- Поддержку авторизации пользователей и хранения моделей.
- Опциональный open-source вариант генерации с использованием Hunyuan3D.

---

## 📂 Структура проекта

backend/ — бэкенд-сервер на FastAPI
- main.py — основной файл приложения
- routers/ — маршруты API
  - auth.py — авторизация и регистрация
  - meshy.py — интеграция с Meshy AI
  - open-source-variant.py — open-source альтернатива генерации

frontend/ — фронтенд на React
- public/ — статические файлы
  - images/ — изображения
  - index.html — основной HTML
  - models/ — хранилище 3D-моделей
- src/ — исходный код React
  - App.js — роутинг
  - components/ — компоненты (Osteology, PhotoTo3D, ARAnatomy и т.д.)

images/ — изображения для README

requirements.txt — зависимости Python

---

## 🚀 Установка и запуск

### 1. Клонирование репозитория
```bash
git clone https://github.com/JeltMaria/Hack3DAnatomy.git
cd Hack3DAnatomy
```

### 2. Установка зависимостей (бэкенд)
Создайте и активируйте виртуальное окружение:
```bash
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

### 3. Установка зависимостей (фронтенд)
```bash
cd frontend
npm install
```

### 4. Запуск бэкенда
```bash
cd ../backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Запуск фронтенда
```bash
cd ../frontend
npm start
```

---

## 🌐 Доступ к приложению

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Документация API**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Healthcheck**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 🛠️ Использование

### Основной функционал
1. **Авторизация**: Зарегистрируйтесь или войдите на главной странице (/).
2. **Генерация 3D-моделей**:
   - Перейдите в /photo-to-3d.
   - Загрузите 1–4 изображения (JPG/PNG).
   - Укажите настройки (модель AI, топология, текстуры).
   - Отправьте запрос — модель сгенерируется с помощью Meshy AI и сохранится в /models.
3. **Просмотр моделей**:
   - В /load-model: Загрузите и аннотируйте модели.
   - В /ar-anatomy: Просмотр в AR с использованием маркера.
4. **Образовательные разделы**:
   - /osteology: Изучение скелета с аннотациями.
   - /gallery-anatomy: Галерея готовых моделей.
   - /angi: Ангиология (сосуды).

### Эндпоинты API
- **POST /api/meshy/create-task**: Генерация из одного изображения.
  - Пример: curl -X POST "http://localhost:8000/api/meshy/create-task" -F "file=@image.jpg"
- **POST /api/meshy/create-multi-image-task**: Генерация из нескольких изображений.
- **GET /api/meshy/task-status/{task_id}**: Проверка статуса задачи.
- **POST /api/auth/login-or-register**: Авторизация/регистрация.

### Пример работы
1. Загрузите фото в /photo-to-3d.
2. Мониторьте прогресс задачи.
3. Просмотрите модель в /load-model или AR-режиме.

---

## 🧠 Hack3D — Инструмент для 3D-анатомии

Hack3D сочетает AI-генерацию (Meshy) с просмотром в AR (A-Frame + AR.js). Подходит для образования: аннотации костей, сосудов; поддержка open-source моделей (Hunyuan3D).

### 🔧 Ключевые компоненты:
- **Генерация**: Из фото в 3D (одиночное/множественное).
- **Просмотр**: Three.js для интерактивных моделей с аннотациями.
- **AR**: Камера + маркер для реального просмотра.
- **Авторизация**: PostgreSQL + JWT.

---

## 📌 Примечания

- Установите MESHY_API_KEY в .env для Meshy AI.
- Модели сохраняются в frontend/public/models/.
- Для AR используйте мобильное устройство и маркер (скачайте из /ar-anatomy).
- Open-source вариант в backend/routers/open-source-variant.py (требует PyTorch).

---

## 🤝 Контрибьютинг

1. Сделайте форк репозитория.
2. Создайте ветку:
   ```bash
   git checkout -b feature/ваша-фича
   ```
3. Закоммитьте изменения:
   ```bash
   git commit -m "Добавление новой фичи"
   git push origin feature/ваша-фича
   ```
4. Отправьте Pull Request на GitHub.

---

## 📧 Контакты

Для вопросов или предложений свяжитесь с автором: jeltmaria@example.com.
