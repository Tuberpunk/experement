// src/api/lookups.js
import apiClient from './apiClient';

const fetchLookup = async (endpoint) => {
    try {
        const response = await apiClient.get(`/lookups/${endpoint}`);
        return response.data; // Ожидаем массив [{ id, name }]
    } catch (error) {
        console.error(`API Error fetching lookup ${endpoint}:`, error);
        throw error;
    }
}

export const getEventDirections = () => fetchLookup('event-directions');
export const getEventLevels = () => fetchLookup('event-levels');
export const getEventFormats = () => fetchLookup('event-formats');
export const getParticipantCategories = () => fetchLookup('participant-categories');
export const getFundingSources = () => fetchLookup('funding-sources');
// ... другие справочники