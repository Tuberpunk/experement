// src/api/events.js
import apiClient from './apiClient';
import { saveAs } from 'file-saver';
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
export const updateEventStatus = async (eventId, status) => {
  try {
      // Отправляем PATCH запрос на специальный эндпоинт
      const response = await apiClient.patch(`/events/${eventId}/status`, { status });
      return response.data;
  } catch (error) {
      console.error(`API Error updating status for event ${eventId}:`, error);
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

export const exportEvents = async (filterParams = {}) => {
  try {
      console.log("Requesting export with filters:", filterParams); // Отладка
      // Отправляем GET запрос на эндпоинт экспорта
      const response = await apiClient.get('/events/export', {
          params: filterParams, // Передаем фильтры как query параметры
          responseType: 'blob' // !!! ВАЖНО: Ожидаем файл (бинарные данные)
      });

      // Используем file-saver для сохранения полученного blob
      const filename = `Мероприятия_Экспорт_${new Date().toISOString().substring(0,10)}.xlsx`; // Формируем имя файла
      saveAs(response.data, filename); // Функция saveAs из file-saver

      // Возвращаем что-то для индикации успеха (хотя файл уже скачивается)
      return { success: true, filename };

  } catch (error) {
      console.error("API Error exporting events:", error);
      // Попытаться прочитать сообщение об ошибке из blob, если оно есть
      if (error.response && error.response.data instanceof Blob && error.response.data.type === "application/json") {
          const errorText = await error.response.data.text();
          try {
               const errorJson = JSON.parse(errorText);
               throw new Error(errorJson.message || 'Ошибка при экспорте');
           } catch (parseError) {
                throw new Error('Не удалось обработать ошибку сервера при экспорте.');
           }
       } else {
            throw error; // Пробрасываем стандартную ошибку Axios
       }
  }
};