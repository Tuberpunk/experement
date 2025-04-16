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
        // Пример: получаем всех пользователей с ролью 'curator'
        // Это потребует доработки бэкенда (эндпоинт /api/users?role=curator)
        // const response = await apiClient.get('/users', { params: { role: 'curator', limit: 1000 } });
        // return response.data.users || [];
        // Заглушка:
         return Promise.resolve([
             { userId: 1, fullName: 'Иванов И.И. (Admin)' }, // Пример
             { userId: 2, fullName: 'Петров П.П. (Curator)' }, // Пример
         ]);
     } catch (error) {
         console.error("API Error fetching curators:", error);
         return []; // Возвращаем пустой массив при ошибке
     }
};