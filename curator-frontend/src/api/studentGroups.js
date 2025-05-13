// src/api/studentGroups.js
import apiClient from './apiClient';

export const getGroups = async (params = {}) => {
    try {
        const response = await apiClient.get('/groups', { params });
        return response.data; // { totalItems, totalPages, currentPage, groups }
    } catch (error) {
        console.error("API Error fetching groups:", error);
        throw error;
    }
};

export const getGroupById = async (id) => {
    try {
        const response = await apiClient.get(`/groups/${id}`);
        return response.data;
    } catch (error) {
        console.error(`API Error fetching group ${id}:`, error);
        throw error;
    }
};

export const createGroup = async (groupData) => {
    try {
        const response = await apiClient.post('/groups', groupData);
        return response.data;
    } catch (error) {
        console.error("API Error creating group:", error);
        throw error;
    }
};

export const updateGroup = async (id, groupData) => {
    try {
        const response = await apiClient.put(`/groups/${id}`, groupData);
        return response.data;
    } catch (error) {
        console.error(`API Error updating group ${id}:`, error);
        throw error;
    }
};

export const deleteGroup = async (id) => {
    try {
        await apiClient.delete(`/groups/${id}`);
        // DELETE обычно не возвращает тело ответа при успехе (204)
    } catch (error) {
        console.error(`API Error deleting group ${id}:`, error);
        throw error;
    }
};

// Функция для получения списка кураторов (для формы) - пример
// Возможно, понадобится отдельный эндпоинт на бэкенде
export const getCurators = async () => {
    try {
        // Отправляем запрос на бэкенд для получения пользователей с ролью 'curator'
        // Запрашиваем большой лимит, чтобы получить всех (или настроить пагинацию в Autocomplete)
        const response = await apiClient.get('/users', {
            params: {
                role: 'curator', // Фильтр по роли на бэкенде
                limit: 1000,     // Получить достаточно большой список
                sortBy: 'fullName' // Сортировать по имени для удобства
            }
        });
        // Бэкенд возвращает объект { totalItems, ..., users: [...] }
        // Нам нужен массив users
        return response.data.users || []; // Возвращаем массив пользователей или пустой массив
    } catch (error) {
        console.error("API Error fetching curators:", error);
        return []; // Возвращаем пустой массив при ошибке
    }
};