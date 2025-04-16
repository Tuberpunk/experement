// src/routes/studentGroupRoutes.js
const express = require('express');
const groupController = require('../controllers/studentGroupController');
const { authenticateToken, isAdmin } = require('../middleware/auth'); // Используем middleware

const router = express.Router();

// Получение списка групп (все авторизованные)
router.get('/', authenticateToken, groupController.getAllGroups);

// Создание группы (только админ)
router.post('/', authenticateToken, isAdmin, groupController.createGroup);

// Получение одной группы (все авторизованные)
// Используем middleware для загрузки группы ДО контроллера
router.get('/:id', authenticateToken, groupController.loadGroup, groupController.getGroupById);

// Обновление группы (только админ)
// loadGroup выполняется до isAdmin, что не совсем логично, но сработает
// Лучше проверять права в самом контроллере или создать отдельное middleware
router.put('/:id', authenticateToken, isAdmin, groupController.loadGroup, groupController.updateGroup);

// Удаление группы (только админ)
router.delete('/:id', authenticateToken, isAdmin, groupController.loadGroup, groupController.deleteGroup);

module.exports = router;