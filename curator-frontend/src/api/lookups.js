// src/api/lookups.js
import apiClient from './apiClient';

// Общая функция для получения справочника
const fetchLookup = async (endpoint) => {
    try {
        const response = await apiClient.get(`/lookups/${endpoint}`);
        return response.data; // Ожидаем массив [{ id, name }]
    } catch (error) {
        console.error(`API Error fetching lookup ${endpoint}:`, error);
        throw error;
    }
};

// Существующие функции
export const getEventDirections = () => fetchLookup('event-directions');
export const getEventLevels = () => fetchLookup('event-levels');
export const getEventFormats = () => fetchLookup('event-formats');
export const getParticipantCategories = () => fetchLookup('participant-categories');
export const getFundingSources = () => fetchLookup('funding-sources');
export const getStudentTags = () => fetchLookup('student-tags'); // Уже была
export const getRoles = () => fetchLookup('roles');
// --- НОВЫЕ ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ ТЕГАМИ ---

export const createStudentTag = async (tagData) => {
    // tagData = { name: 'Новый тег' }
    try {
        const response = await apiClient.post('/lookups/student-tags', tagData);
        return response.data; // Ожидаем { id, name } созданного тега
    } catch (error) {
        console.error("API Error creating student tag:", error);
        throw error;
    }
};

export const updateStudentTag = async (id, tagData) => {
    // tagData = { name: 'Обновленное имя' }
    try {
        const response = await apiClient.put(`/lookups/student-tags/${id}`, tagData);
        return response.data; // Ожидаем { id, name } обновленного тега
    } catch (error) {
        console.error(`API Error updating student tag ${id}:`, error);
        throw error;
    }
};

export const deleteStudentTag = async (id) => {
    try {
        await apiClient.delete(`/lookups/student-tags/${id}`);
        // Успех - нет ответа
    } catch (error) {
        console.error(`API Error deleting student tag ${id}:`, error);
        throw error;
    }
};

export const getLookups = async (type) => {
    try {
        // Делаем запрос на универсальный эндпоинт /api/lookups/:type
        const response = await apiClient.get(`/lookups/${type}`);
        // Ожидаем, что бэкенд вернет массив объектов [{ id, name }]
        return response.data;
    } catch (error) {
        console.error(`API Error fetching lookup for type ${type}:`, error);
        throw error;
    }
};

export const createEventDirection = async (data) => {
    const response = await apiClient.post('/lookups/event-directions', data);
    return response.data;
};
export const updateEventDirection = async (id, data) => {
    const response = await apiClient.put(`/lookups/event-directions/${id}`, data);
    return response.data;
};
export const deleteEventDirection = async (id) => {
    await apiClient.delete(`/lookups/event-directions/${id}`);
};

export const createEventLevel = async (data) => {
    const response = await apiClient.post('/lookups/event-levels', data);
    return response.data;
};
export const updateEventLevel = async (id, data) => {
    const response = await apiClient.put(`/lookups/event-levels/${id}`, data);
    return response.data;
};
export const deleteEventLevel = async (id) => {
    await apiClient.delete(`/lookups/event-levels/${id}`);
};

export const createEventFormat = async (data) => {
    const response = await apiClient.post('/lookups/event-formats', data);
    return response.data;
};
export const updateEventFormat = async (id, data) => {
    const response = await apiClient.put(`/lookups/event-formats/${id}`, data);
    return response.data;
};
export const deleteEventFormat = async (id) => {
    await apiClient.delete(`/lookups/event-formats/${id}`);
};

export const createParticipantCategory = async (data) => {
    const response = await apiClient.post('/lookups/participant-categories', data);
    return response.data;
};
export const updateParticipantCategory = async (id, data) => {
    const response = await apiClient.put(`/lookups/participant-categories/${id}`, data);
    return response.data;
};
export const deleteParticipantCategory = async (id) => {
    await apiClient.delete(`/lookups/participant-categories/${id}`);
};

export const createFundingSource = async (data) => {
    const response = await apiClient.post('/lookups/funding-sources', data);
    return response.data;
};
export const updateFundingSource = async (id, data) => {
    const response = await apiClient.put(`/lookups/funding-sources/${id}`, data);
    return response.data;
};
export const deleteFundingSource = async (id) => {
    await apiClient.delete(`/lookups/funding-sources/${id}`);
};