// Полный путь: src/routes/documentRoutes.js
const express = require('express');
const documentController = require('../controllers/documentController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/documents - Получение списка документов (все авторизованные)
router.get('/', authenticateToken, documentController.getAllDocuments);

// POST /api/documents - Создание/Загрузка документа (только админ)
router.post('/', authenticateToken, isAdmin, documentController.createDocument);

// DELETE /api/documents/:id - Удаление документа (только админ)
router.delete('/:id', authenticateToken, isAdmin, documentController.deleteDocument);

module.exports = router;