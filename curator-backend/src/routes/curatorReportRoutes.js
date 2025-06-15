// Полный путь: src/routes/curatorReportRoutes.js
const express = require('express');
const reportController = require('../controllers/curatorReportController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// --- ПРАВИЛЬНЫЙ ПОРЯДОК И СТРУКТУРА ---

// 1. Сначала самые конкретные маршруты (без параметров)
router.get('/stats', authenticateToken, reportController.getReportsStatistics);
router.get('/aggregated-data', authenticateToken, reportController.getAggregatedReportData);

// 2. Затем общие маршруты для всей коллекции
router.get('/', authenticateToken, reportController.getAllReports);
router.post('/', authenticateToken, reportController.createReport);

// 3. В самом конце - маршруты с параметром :id
router.get('/:id', authenticateToken, reportController.loadReport, reportController.getReportById);
router.delete('/:id', authenticateToken, reportController.loadReport, reportController.deleteReport);

// Пример для будущего расширения (обновление)
// router.put('/:id', authenticateToken, reportController.loadReport, reportController.updateReport);

module.exports = router;