// src/routes/lookupRoutes.js
const express = require('express');
const lookupController = require('../controllers/lookupController');
// Добавляем isAdmin для защиты CUD операций
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// --- Существующие GET роуты (доступны всем авторизованным) ---
router.get('/event-directions', authenticateToken, lookupController.getEventDirections);
router.get('/event-levels', authenticateToken, lookupController.getEventLevels);
router.get('/event-formats', authenticateToken, lookupController.getEventFormats);
router.get('/participant-categories', authenticateToken, lookupController.getParticipantCategories);
router.get('/funding-sources', authenticateToken, lookupController.getFundingSources);
router.get('/student-tags', authenticateToken, lookupController.getStudentTags); // Чтение тегов

// --- НОВЫЕ CUD РОУТЫ ДЛЯ ТЕГОВ (ТОЛЬКО АДМИН) ---
router.post('/student-tags', authenticateToken, isAdmin, lookupController.createStudentTag);
router.put('/student-tags/:id', authenticateToken, isAdmin, lookupController.updateStudentTag);
router.delete('/student-tags/:id', authenticateToken, isAdmin, lookupController.deleteStudentTag);


module.exports = router;