// Полный путь: src/api/admin.js (или другое подходящее место)
import apiClient from './apiClient';

/**
 * Назначить мероприятие одному или нескольким кураторам.
 * @param {object} assignmentData - Данные для назначения
 * @param {number[]} assignmentData.targetUserIds - Массив ID кураторов
 * @param {string} assignmentData.title - Название мероприятия
 * @param {string} assignmentData.startDate - Дата начала (YYYY-MM-DD)
 * @param {string} assignmentData.description - Описание
 * @param {object} [assignmentData.otherEventData] - Остальные необязательные поля Event
 * @returns {Promise<object>} - Ответ сервера (сообщение, ошибки)
 */
export const assignEventToCurators = async (assignmentData) => {
    try {
        const response = await apiClient.post('/admin/assign-event', assignmentData);
        return response.data;
    } catch (error) {
        console.error("API Error assigning event:", error);
        throw error;
    }
};