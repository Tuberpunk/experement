// src/api/events.js
import apiClient from './apiClient';

// Получение списка мероприятий с фильтрами и пагинацией
export const getEvents = async (params = {}) => {
  try {
    const response = await apiClient.get('/events', { params });
    return response.data; // Ожидаем { totalItems, totalPages, currentPage, events }
  } catch (error) {
    console.error("API Error fetching events:", error);
    throw error; // Пробрасываем ошибку для обработки в компоненте
  }
};

// Получение одного мероприятия по ID
export const getEventById = async (id) => {
  try {
    const response = await apiClient.get(`/events/${id}`);
    return response.data;
  } catch (error) {
    console.error(`API Error fetching event ${id}:`, error);
    throw error;
  }
};

// Создание мероприятия
export const createEvent = async (eventData) => {
  try {
    const response = await apiClient.post('/events', eventData);
    return response.data;
  } catch (error) {
    console.error("API Error creating event:", error);
    throw error;
  }
};

// Обновление мероприятия
export const updateEvent = async (id, eventData) => {
  try {
    // Удаляем ID связанных сущностей перед отправкой, если бэкенд их не ожидает в основном объекте
    const dataToSend = { ...eventData };
    // delete dataToSend.MediaLinks; // и т.д., если нужно

    const response = await apiClient.put(`/events/${id}`, dataToSend);
    return response.data;
  } catch (error) {
    console.error(`API Error updating event ${id}:`, error);
    throw error;
  }
};

// Обновление статуса мероприятия
export const updateEventStatus = async (id, status) => {
  try {
    const response = await apiClient.patch(`/events/${id}/status`, { status });
    return response.data;
  } catch (error) {
    console.error(`API Error updating status for event ${id}:`, error);
    throw error;
  }
};

// Удаление мероприятия
export const deleteEvent = async (id) => {
  try {
    const response = await apiClient.delete(`/events/${id}`);
    return response.data; // Или response.status === 204
  } catch (error) {
    console.error(`API Error deleting event ${id}:`, error);
    throw error;
  }
};

// --- Функции для экспорта ---
// (Бэкенд возвращает файл, нужно обработать на фронте)
export const exportMyEvents = async (params = {}) => {
    try {
        const response = await apiClient.get('/reports/my-events/export', {
            params,
            responseType: 'blob', // Важно для получения файла
        });
        return response; // Возвращаем весь объект ответа для обработки blob
    } catch (error) {
        console.error("API Error exporting my events:", error);
        throw error;
    }
};

export const exportAllEvents = async (params = {}) => {
     try {
        const response = await apiClient.get('/reports/all-events/export', {
            params,
            responseType: 'blob',
        });
        return response;
    } catch (error) {
        console.error("API Error exporting all events:", error);
        throw error;
    }
};