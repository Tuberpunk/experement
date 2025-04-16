// src/api/documents.js
import apiClient from './apiClient';

export const getDocuments = async (params = {}) => {
    try {
        const response = await apiClient.get('/documents', { params });
        // Ожидаем { totalItems, totalPages, currentPage, documents }
        return response.data;
    } catch (error) {
        console.error("API Error fetching documents:", error);
        throw error;
    }
};

export const createDocument = async (documentData) => {
    // documentData: { title, description, category, docUrl }
    try {
        const response = await apiClient.post('/documents', documentData);
        return response.data;
    } catch (error) {
        console.error("API Error creating document:", error);
        throw error;
    }
};

export const deleteDocument = async (id) => {
    try {
        await apiClient.delete(`/documents/${id}`);
    } catch (error) {
        console.error(`API Error deleting document ${id}:`, error);
        throw error;
    }
};