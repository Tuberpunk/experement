// src/routes/eventRoutes.js
const express = require('express');
const eventController = require('../controllers/eventController');
const { authenticateToken, isAdmin, isCreatorOrAdmin } = require('../middleware/auth');
// Дополнительно: можно добавить middleware для валидации входных данных
// const { validateEventCreation, validateEventUpdate, validateStatusUpdate } = require('../middleware/validators');

const router = express.Router();

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
    authenticateToken,
    /* validateStatusUpdate, */
    eventController.loadEvent, // Загружаем событие
    eventController.updateEventStatus // В контроллере будет своя проверка прав [6, 7, 16]
);

// Удаление мероприятия по ID (только админ)
router.delete(
    '/:id',
    authenticateToken,
    isAdmin, // Только администратор [7]
    eventController.deleteEvent
);


module.exports = router;