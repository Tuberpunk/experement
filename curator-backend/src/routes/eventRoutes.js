// src/routes/eventRoutes.js
const express = require('express');
const eventController = require('../controllers/eventController');
const { authenticateToken, isAdmin, isCreatorOrAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload'); // Если используется для других роутов

const router = express.Router();
router.get('/export',authenticateToken, eventController.exportEvents);

// Получение списка мероприятий (с фильтрами)
router.get('/', authenticateToken, eventController.getEvents); // [6, 7, 30, 32-34, 50, 52-55]

// Создание мероприятия
router.post('/', authenticateToken, /* validateEventCreation, */ eventController.createEvent); // [6]

// Получение одного мероприятия по ID
router.get('/:id', authenticateToken, eventController.getEventById);

// Обновление мероприятия по ID
// Сначала загружаем событие в getEventById Middleware (если используется), потом проверяем права
router.put(
    '/:id',
    authenticateToken,
    /* validateEventUpdate, */
    eventController.loadEvent, // Middleware для загрузки события в req.event
    isCreatorOrAdmin('event'), // Проверка прав (создатель или админ) [6]
    eventController.updateEvent
);

// Обновление статуса мероприятия по ID
router.patch(
    '/:id/status',
    authenticateToken,      // Проверяем аутентификацию
    eventController.loadEvent, // Загружаем событие в req.event
    // Права доступа (админ или создатель с ограничениями) проверяются внутри контроллера updateEventStatus
    eventController.updateEventStatus
);

// Удаление мероприятия по ID (только админ)
router.delete(
    '/:id',
    authenticateToken, // Проверка аутентификации
    isAdmin,           // <-- ТЕПЕРЬ ТОЛЬКО АДМИН
    eventController.loadEvent, // Загружаем событие перед удалением (опционально, можно убрать)
    eventController.deleteEvent // Контроллер удаления
);


module.exports = router;