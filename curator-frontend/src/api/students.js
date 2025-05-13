// src/api/students.js
import apiClient from './apiClient';

export const getStudents = async (params = {}) => {
    try {
        const response = await apiClient.get('/students', { params });
        return response.data; // { totalItems, totalPages, currentPage, students }
    } catch (error) {
        console.error("API Error fetching students:", error);
        throw error;
    }
};

export const getStudentById = async (id) => {
    try {
        const response = await apiClient.get(`/students/${id}`);
        return response.data;
    } catch (error) {
        console.error(`API Error fetching student ${id}:`, error);
        throw error;
    }
};

export const createStudent = async (studentData) => {
    // studentData: { fullName, groupId, dateOfBirth?, ..., tagIds? }
    try {
        const response = await apiClient.post('/students', studentData);
        return response.data;
    } catch (error) {
        console.error("API Error creating student:", error);
        throw error;
    }
};

export const updateStudent = async (id, studentData) => {
    try {
        const response = await apiClient.put(`/students/${id}`, studentData);
        return response.data;
    } catch (error) {
        console.error(`API Error updating student ${id}:`, error);
        throw error;
    }
};

export const deleteStudent = async (id) => {
    try {
        await apiClient.delete(`/students/${id}`);
    } catch (error) {
        console.error(`API Error deleting student ${id}:`, error);
        throw error;
    }
};