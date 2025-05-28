// src/routes/curatorReportRoutes.js
const express = require('express');
const reportController = require('../controllers/curatorReportController');
const { authenticateToken, isAdmin } = require('../middleware/auth'); // isAdmin пока не используем напрямую здесь

const router = express.Router();

router.get('/stats', authenticateToken, reportController.getReportsStatistics);

// Получение списка (фильтруется по роли внутри контроллера)
router.get('/', authenticateToken, reportController.getAllReports);

// Создание (доступно всем авторизованным, но создается для себя)
router.post('/', authenticateToken, reportController.createReport);

// Получение одного (права проверяются в loadReport)
router.get('/:id', authenticateToken, reportController.loadReport, reportController.getReportById);

console.log('Проверка типов обработчиков для DELETE /:id');
console.log('typeof authenticateToken:', typeof authenticateToken);
console.log('typeof reportController:', typeof reportController);
if (reportController) {
    console.log('typeof reportController.loadReport:', typeof reportController.loadReport);
    console.log('typeof reportController.deleteReport:', typeof reportController.deleteReport);
}

// Удаление (права проверяются в deleteReport)
router.delete('/:id', authenticateToken, reportController.loadReport, reportController.deleteReport);


// Обновление (если будете реализовывать)
// router.put('/:id', authenticateToken, reportController.loadReport, reportController.updateReport);

module.exports = router;