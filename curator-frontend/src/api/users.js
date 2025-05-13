// Полный путь: src/api/users.js

import apiClient from './apiClient'; // Ваш настроенный экземпляр Axios

/**
 * Получить список пользователей с возможностью фильтрации и пагинации.
 * Доступно только администраторам (бэкенд должен проверять роль).
 * @param {object} params - Параметры запроса (page, limit, role, fullName, isActive, etc.)
 * @returns {Promise<object>} - Объект с данными { totalItems, totalPages, currentPage, users }
 */
export const getUsers = async (params = {}) => {
    try {
        // Отправляем GET запрос на /api/users с параметрами
        const response = await apiClient.get('/users', { params });
        // Ожидаем от бэкенда объект с пагинацией и массивом users
        return response.data;
    } catch (error) {
        console.error("API Error fetching users:", error);
        // Пробрасываем ошибку для обработки в компоненте
        throw error;
    }
};

/**
 * Получить профиль ТЕКУЩЕГО залогиненного пользователя.
 * Использует эндпоинт /api/me/profile.
 *
 * Примечание: Эту функцию логичнее разместить в src/api/me.js, если вы его создали.
 *
 * @returns {Promise<object>} - Объект с данными пользователя (включая роль)
 */
export const getMyProfile = async () => {
    try {
        const response = await apiClient.get('/me/profile');
        // Ожидаем объект пользователя от бэкенда
        return response.data;
    } catch (error) {
        console.error("API Error fetching my profile:", error);
        throw error;
    }
};


// --- Функции для будущей реализации (если понадобятся) ---

/**
 * Получить детальную информацию о конкретном пользователе по ID.
 * Обычно доступно только администраторам.
 * @param {number} id - ID пользователя
 * @returns {Promise<object>} - Объект с данными пользователя
 */
export const getUserById = async (id) => {
    try {
        const response = await apiClient.get(`/users/${id}`);
        return response.data;
    } catch (error) {
        console.error(`API Error fetching user ${id}:`, error);
        throw error;
    }
};

/**
 * Обновить данные пользователя (например, роль, статус).
 * Обычно доступно только администраторам.
 * @param {number} id - ID пользователя
 * @param {object} userData - Данные для обновления
 * @returns {Promise<object>} - Обновленный объект пользователя
 */
export const updateUser = async (id, userData) => {
    try {
        const response = await apiClient.put(`/users/${id}`, userData); // Или PATCH, если обновляем частично
        return response.data;
    } catch (error) {
        console.error(`API Error updating user ${id}:`, error);
        throw error;
    }
};

/**
 * Удалить пользователя.
 * Обычно доступно только администраторам.
 * @param {number} id - ID пользователя
 * @returns {Promise<void>}
 */
export const deleteUser = async (id) => {
    try {
        await apiClient.delete(`/users/${id}`);
    } catch (error) {
        console.error(`API Error deleting user ${id}:`, error);
        throw error;
    }
};

// ---------------------------------------------------------