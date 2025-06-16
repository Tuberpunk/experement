// src/routes/lookupRoutes.js
const express = require('express');
const lookupController = require('../controllers/lookupController');
// isAdmin для защиты CUD операций
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
router.get('/roles', authenticateToken, isAdmin, lookupController.getRoles);

router.post('/student-tags', authenticateToken, isAdmin, lookupController.createStudentTag);
router.put('/student-tags/:id', authenticateToken, isAdmin, lookupController.updateStudentTag);
router.delete('/student-tags/:id', authenticateToken, isAdmin, lookupController.deleteStudentTag);

router.post('/event-directions', authenticateToken, isAdmin, lookupController.createEventDirection);
router.put('/event-directions/:id', authenticateToken, isAdmin, lookupController.updateEventDirection);
router.delete('/event-directions/:id', authenticateToken, isAdmin, lookupController.deleteEventDirection);

router.post('/event-levels', authenticateToken, isAdmin, lookupController.createEventLevel);
router.put('/event-levels/:id', authenticateToken, isAdmin, lookupController.updateEventLevel);
router.delete('/event-levels/:id', authenticateToken, isAdmin, lookupController.deleteEventLevel);

router.post('/event-formats', authenticateToken, isAdmin, lookupController.createEventFormat);
router.put('/event-formats/:id', authenticateToken, isAdmin, lookupController.updateEventFormat);
router.delete('/event-formats/:id', authenticateToken, isAdmin, lookupController.deleteEventFormat);

router.post('/participant-categories', authenticateToken, isAdmin, lookupController.createParticipantCategory);
router.put('/participant-categories/:id', authenticateToken, isAdmin, lookupController.updateParticipantCategory);
router.delete('/participant-categories/:id', authenticateToken, isAdmin, lookupController.deleteParticipantCategory);

router.post('/funding-sources', authenticateToken, isAdmin, lookupController.createFundingSource);
router.put('/funding-sources/:id', authenticateToken, isAdmin, lookupController.updateFundingSource);
router.delete('/funding-sources/:id', authenticateToken, isAdmin, lookupController.deleteFundingSource);
router.get('/:type', authenticateToken, lookupController.getAll);
module.exports = router;