// Полный путь: src/api/curatorReports.js
import apiClient from './apiClient'; // Наш настроенный axios клиент

// Получить список отчетов куратора (своих или всех для админа)
export const getCuratorReports = async (params = {}) => {
    try {
        const response = await apiClient.get('/curator-reports', { params });
        return response.data; // Ожидаем { totalItems, totalPages, currentPage, reports }
    } catch (error) {
        console.error("API Error fetching curator reports:", error);
        throw error;
    }
};

// Получить один отчет куратора по ID
export const getCuratorReportById = async (id) => {
    try {
        const response = await apiClient.get(`/curator-reports/${id}`);
        return response.data;
    } catch (error) {
        console.error(`API Error fetching curator report ${id}:`, error);
        throw error;
    }
};

// Создать новый отчет куратора
export const createCuratorReport = async (reportData) => {
    // reportData включает: reportTitle, reportDate, ..., studentIds: [...]
    try {
        const response = await apiClient.post('/curator-reports', reportData);
        return response.data; // Возвращает созданный отчет
    } catch (error) {
        console.error("API Error creating curator report:", error);
        throw error;
    }
};

// Удалить отчет куратора по ID
export const deleteCuratorReport = async (id) => {
    try {
        await apiClient.delete(`/curator-reports/${id}`);
        // Успешное удаление обычно не возвращает контент (204)
    } catch (error) {
        console.error(`API Error deleting curator report ${id}:`, error);
        throw error;
    }
};

// --- ОБНОВЛЕННАЯ ФУНКЦИЯ ---
// Получить список студентов (ID, ФИО) ТЕКУЩЕГО куратора для формы отчета
export const getMyStudentsForReport = async () => {
     try {
         // Вызываем новый эндпоинт бэкенда
         const response = await apiClient.get('/me/students');
         // Бэкенд должен вернуть массив студентов [{ studentId, fullName, email }, ...]
         // или пустой массив, если куратор не назначен или у него нет студентов
         return response.data || [];
     } catch (error) {
          console.error("API Error fetching my students:", error);
          // Возвращаем пустой массив в случае любой ошибки
          // (включая 403 Forbidden, если пользователь не куратор)
          return [];
     }
};

export const getCuratorReportsStatistics = async (params = {}) => { // Принимает объект параметров
    try {
        // params может содержать { startDate, endDate, curatorId }
        const response = await apiClient.get('/curator-reports/stats', { params });
        return response.data;
    } catch (error) {
        console.error("API Error fetching curator reports statistics:", error);
        throw error;
    }
};