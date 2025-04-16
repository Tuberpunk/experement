// src/routes/documentRoutes.js
const express = require('express');
const documentController = require('../controllers/documentController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Получение списка документов (все авторизованные)
router.get('/', authenticateToken, documentController.getAllDocuments);

// Создание/Загрузка документа (только админ)
router.post('/', authenticateToken, isAdmin, documentController.createDocument);

// Удаление документа (только админ)
router.delete('/:id', authenticateToken, isAdmin, documentController.deleteDocument);

// GET /:id и PUT /:id пока не реализуем для простоты

module.exports = router;