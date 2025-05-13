// Полный путь: src/api/apiClient.js
// Версия БЕЗ автоматического выхода при ошибках 401/403

import axios from 'axios';

// Определяем базовый URL API (лучше из .env файла фронтенда)
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Создаем экземпляр axios
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Интерцептор ЗАПРОСОВ (Request Interceptor) ---
// Добавляет токен авторизации ко всем исходящим запросам
apiClient.interceptors.request.use(
    (config) => {
        // Получаем токен из localStorage (ключ 'authToken' должен совпадать с используемым в AuthContext)
        const token = localStorage.getItem('authToken');
        if (token) {
            // Если токен есть, добавляем заголовок Authorization
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config; // Возвращаем измененную конфигурацию запроса
    },
    (error) => {
        // Пробрасываем ошибку конфигурации запроса
        console.error("Axios request config error:", error); // Логируем ошибку настройки
        return Promise.reject(error);
    }
);

// --- Интерцептор ОТВЕТОВ УДАЛЕН ---
// В этой версии нет автоматической обработки ошибок 401/403 и редиректа на /login.
// Ошибки нужно будет обрабатывать вручную в каждом месте вызова API
// или реализовать другой механизм глобальной обработки ошибок.

export default apiClient;