// Полный путь: src/routes/userRoutes.js
const express = require('express');
const userController = require('../controllers/userController');
// Доступ к списку пользователей должен быть только у авторизованных
// Возможно, даже только у администраторов, в зависимости от ваших требований
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// --- НОВЫЕ МАРШРУТЫ ---
// PUT /api/users/:id - Обновить пользователя (только Админ)
router.put('/:id', authenticateToken, isAdmin, userController.updateUser);

// DELETE /api/users/:id - Удалить пользователя (только Админ)
router.delete('/:id', authenticateToken, isAdmin, userController.deleteUser);
// GET /api/users - Получить список пользователей (с фильтром ?role=...)
// Доступно всем авторизованным (для примера, можно заменить на isAdmin)
router.get('/', authenticateToken, userController.getAllUsers);

router.get('/', authenticateToken, isAdmin, userController.getAllUsers);
// Сюда можно добавить роуты для других CRUD операций над пользователями
// (обычно они требуют прав администратора)
// router.get('/:id', authenticateToken, isAdmin, userController.getUserById);
// router.put('/:id', authenticateToken, isAdmin, userController.updateUser);
// router.delete('/:id', authenticateToken, isAdmin, userController.deleteUser);

module.exports = router;