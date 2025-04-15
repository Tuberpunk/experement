// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import apiClient from '../api/apiClient'; // Используем наш настроенный клиент

// Создаем контекст
const AuthContext = createContext(null);

// Хук для удобного использования контекста
export const useAuth = () => useContext(AuthContext);

// Провайдер контекста
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken') || null);
  const [loading, setLoading] = useState(true); // Начальная загрузка состояния

  // Функция для сохранения данных после входа
  const saveAuthData = useCallback((newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUser', JSON.stringify(userData)); // Сохраняем юзера тоже
  }, []);

  // Функция входа
  const login = async (credentials) => {
    // API вызов вынесен во внешний файл (например, src/api/auth.js)
    // Здесь просто пример структуры
    // const response = await apiClient.post('/auth/login', credentials);
    // if (response.data.token && response.data.user) {
    //   saveAuthData(response.data.token, response.data.user);
    // }
    // Возвращаем данные или выбрасываем ошибку для обработки в LoginPage
    // return response.data;

    // Заглушка: Реальная логика должна быть в LoginPage или API-слое
    // и вызывать saveAuthData при успехе
    console.log("Login function called in context, credentials:", credentials);
    throw new Error("Login API call not implemented here. Call from component.");
  };

  // Функция выхода
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    // Можно добавить редирект на /login здесь или в компоненте
    console.log("User logged out");
  }, []);

  // Эффект для восстановления состояния при загрузке приложения
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user data:", error);
        logout(); // Очищаем, если данные некорректны
      }
    }
    setLoading(false); // Завершаем начальную загрузку
  }, [logout]);


  // Значение, передаваемое через контекст
  const value = {
    user,
    token,
    isAuthenticated: !!token, // Простой флаг аутентификации
    loading,
    login, // Предоставляем функцию входа (хотя логика API будет в компоненте)
    logout,
    saveAuthData // Функция для сохранения данных после успешного API вызова
  };

  // Не рендерим дочерние элементы, пока идет проверка токена
  // чтобы избежать мигания UI
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};