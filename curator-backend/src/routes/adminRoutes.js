// Полный путь: src/routes/adminRoutes.js
const express = require('express');
const adminController = require('../controllers/adminController'); // Наш новый контроллер
const { authenticateToken, isAdmin } = require('../middleware/auth'); // Защита

const router = express.Router();

// Маршрут для назначения мероприятия кураторам
// POST /api/admin/assign-event
router.post(
    '/assign-event',
    authenticateToken,
    isAdmin, // Только администратор
    adminController.assignEventToCurators
);

// Сюда можно добавить другие админские роуты в будущем

module.exports = router;