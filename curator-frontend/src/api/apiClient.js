// src/api/apiClient.js
import axios from 'axios';

// Укажите URL вашего бэкенда. Используйте переменную окружения.
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления JWT токена в заголовки Authorization
apiClient.interceptors.request.use(
  (config) => {
    // Получаем токен из localStorage (или другого хранилища)
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor для обработки ошибок (например, 401 Unauthorized для авто-разлогина)
apiClient.interceptors.response.use(
  (response) => response, // Просто возвращаем успешный ответ
  (error) => {
    if (error.response && error.response.status === 401) {
      // Если получили 401 (не авторизован), возможно, токен истек или невалиден
      console.warn('Unauthorized access - 401. Logging out.');
      // Очищаем токен и данные пользователя (логику лучше вынести в AuthContext)
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      // Перенаправляем на страницу входа
      // Используйте window.location или useNavigate, если это внутри компонента/контекста
      window.location.href = '/login'; // Простой редирект
    }
    // Важно пробросить ошибку дальше, чтобы ее можно было обработать в вызывающем коде
    return Promise.reject(error);
  }
);


export default apiClient;