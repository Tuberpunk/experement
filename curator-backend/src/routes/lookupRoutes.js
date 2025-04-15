// src/routes/lookupRoutes.js
const express = require('express');
const lookupController = require('../controllers/lookupController');
const { authenticateToken } = require('../middleware/auth'); // Защищаем роуты

const router = express.Router();

router.get('/event-directions', authenticateToken, lookupController.getEventDirections);
router.get('/event-levels', authenticateToken, lookupController.getEventLevels);
router.get('/event-formats', authenticateToken, lookupController.getEventFormats);
router.get('/participant-categories', authenticateToken, lookupController.getParticipantCategories);
router.get('/funding-sources', authenticateToken, lookupController.getFundingSources);
// Добавьте другие справочники, если необходимо

module.exports = router;