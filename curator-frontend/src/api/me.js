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

export const updateMyProfile = async (profileData) => {
    try {
        // Отправляем PUT запрос на эндпоинт /api/me/profile
        const response = await apiClient.put('/me/profile', profileData);
        return response.data; // Возвращаем обновленные данные
    } catch (error) {
        console.error("API Error updating my profile:", error);
        throw error;
    }
};