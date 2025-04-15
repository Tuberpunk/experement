// src/routes/reportRoutes.js
const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Экспорт "моих" мероприятий [6, 10, 30, 50]
router.get('/my-events/export', authenticateToken, reportController.exportMyEvents);

// Экспорт всех мероприятий (только админ) [7, 10, 31, 32, 51, 52, 53]
// Используем POST, чтобы передать фильтры в теле запроса, если их много
// Или можно оставить GET и передавать фильтры как query params
router.get('/all-events/export', authenticateToken, isAdmin, reportController.exportAllEvents);
// router.post('/all-events/export', authenticateToken, isAdmin, reportController.exportAllEvents); // Альтернатива с POST для фильтров

module.exports = router;