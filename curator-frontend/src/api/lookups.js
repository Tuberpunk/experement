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