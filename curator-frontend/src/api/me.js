// Полный путь: src/api/users.js (или src/api/me.js)
import apiClient from './apiClient';

// Функция для получения списка пользователей (пример, может быть реализована)
export const getUsers = async (params = {}) => {
    try {
        const response = await apiClient.get('/users', { params });
        return response.data;
    } catch (error) {
        console.error("API Error fetching users:", error);
        throw error;
    }
};

// --- НОВАЯ ФУНКЦИЯ ---
// Получить профиль ТЕКУЩЕГО залогиненного пользователя
export const getMyProfile = async () => {
    try {
        const response = await apiClient.get('/me/profile');
        return response.data; // Ожидаем объект пользователя со всеми полями (кроме пароля) и ролью
    } catch (error) {
        console.error("API Error fetching my profile:", error);
        throw error;
    }
};

// Сюда можно добавить функции для обновления профиля и т.д.
// export const updateMyProfile = async (profileData) => { ... }