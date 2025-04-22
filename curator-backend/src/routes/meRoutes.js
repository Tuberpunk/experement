// Полный путь: src/routes/meRoutes.js
const express = require('express');
const meController = require('../controllers/meController'); // Контроллер для /me
const { authenticateToken } = require('../middleware/auth'); // Middleware аутентификации
const { isCurator } = require('../middleware/roleCheck'); // Middleware проверки роли

const router = express.Router();

// Маршрут для получения списка студентов ТЕКУЩЕГО куратора
// GET /api/me/students
router.get(
    '/students',        // Путь относительно /api/me
    authenticateToken,  // Проверка аутентификации
    isCurator,          // Проверка роли 'curator'
    meController.getMyStudents // Обработчик контроллера
);

router.get(
    '/profile',
     authenticateToken,
      meController.getMyProfile
    );
// Сюда можно добавить другие маршруты для /api/me/*
// router.get('/profile', authentdicateToken, meController.getMyProfile);

module.exports = router;