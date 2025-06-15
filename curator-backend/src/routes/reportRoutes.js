// src/routes/reportRoutes.js
const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Экспорт "моих" мероприятий
router.get('/my-events/export', authenticateToken, reportController.exportMyEvents);

router.get('/all-events/export', authenticateToken, isAdmin, reportController.exportAllEvents);
// router.post('/all-events/export', authenticateToken, isAdmin, reportController.exportAllEvents); // Альтернатива с POST для фильтров
router.get('/aggregated-data', authenticateToken, reportController.getAggregatedReportData);

module.exports = router;