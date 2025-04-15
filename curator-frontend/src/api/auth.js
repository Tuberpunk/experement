// src/api/auth.js
import apiClient from './apiClient';

// Функция входа (уже должна быть)
export const loginUser = async (credentials) => {
  try {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data; // { token, user: { id, email, fullName, role } }
  } catch (error) {
     console.error("API Error logging in:", error);
     throw error; // Пробрасываем для обработки в компоненте
  }
};

// --- НОВАЯ ФУНКЦИЯ РЕГИСТРАЦИИ ---
export const registerUser = async (userData) => {
  try {
    // userData ожидает: email, password, fullName, [position, phoneNumber, department]
    const response = await apiClient.post('/auth/register', userData);
    return response.data; // Ожидаем { message: 'Пользователь успешно зарегистрирован' } или ошибку
  } catch (error) {
    console.error("API Error registering user:", error);
    throw error; // Пробрасываем для обработки в компоненте
  }
};