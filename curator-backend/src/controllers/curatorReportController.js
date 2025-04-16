// src/controllers/curatorReportController.js
const { CuratorReport, User, Student, Event, sequelize } = require('../models');
const { Op } = require('sequelize');

// Middleware для загрузки отчета и проверки прав доступа (Чтение/Удаление/Обновление)
exports.loadReport = async (req, res, next) => {
    try {
        const report = await CuratorReport.findByPk(req.params.id, {
            include: [
                { model: User, as: 'Curator', attributes: ['userId', 'fullName', 'email'] },
                { model: Event, as: 'RelatedEvent', attributes: ['eventId', 'title', 'startDate'] }, // Опциональное связанное событие
                { model: Student, as: 'ParticipantStudents', attributes: ['studentId', 'fullName'], through: { attributes: [] } } // Участники
            ]
        });

        if (!report) {
            return res.status(404).json({ message: 'Отчет куратора не найден' });
        }

        // Проверка прав на ЧТЕНИЕ (просматривать могут админ и создатель отчета)
        if (req.user.role !== 'administrator' && report.curatorUserId !== req.user.id) {
            return res.status(403).json({ message: 'Доступ запрещен: вы не автор этого отчета' });
        }

        req.report = report; // Прикрепляем к запросу для следующих шагов
        next();
    } catch (error) {
        console.error('Error loading curator report:', error);
        res.status(500).json({ message: 'Ошибка сервера при загрузке отчета куратора' });
    }
};


// GET /api/curator-reports - Получить список отчетов
exports.getAllReports = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'reportDate'; // Сортировка по дате отчета
    const sortOrder = req.query.sortOrder || 'DESC';

    const where = {};
    const include = [ // Подключаем автора
        { model: User, as: 'Curator', attributes: ['userId', 'fullName'] }
    ];

    // --- Фильтрация по роли ---
    if (req.user.role === 'curator') {
        // Куратор видит только свои отчеты
        where.curatorUserId = req.user.id;
    } else if (req.query.curatorUserId) {
        // Администратор может фильтровать по куратору
        where.curatorUserId = req.query.curatorUserId;
    }
    // --- Конец фильтрации по роли ---

    // Другие фильтры
    if (req.query.reportTitle) {
        where.reportTitle = { [Op.iLike]: `%${req.query.reportTitle}%` };
    }
    if (req.query.startDate && req.query.endDate) {
        where.reportDate = { [Op.between]: [req.query.startDate, req.query.endDate] };
    } else if (req.query.startDate) {
        where.reportDate = { [Op.gte]: req.query.startDate };
    } else if (req.query.endDate) {
        where.reportDate = { [Op.lte]: req.query.endDate };
    }

    try {
        const { count, rows } = await CuratorReport.findAndCountAll({
            where,
            include,
            limit,
            offset,
            order: [[sortBy, sortOrder]],
            distinct: true
        });

        res.json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            reports: rows
        });
    } catch (error) {
        console.error('Error fetching curator reports:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении списка отчетов' });
    }
};

// GET /api/curator-reports/:id - Получить один отчет
exports.getReportById = async (req, res) => {
    // Отчет уже загружен и проверен middleware loadReport
    res.json(req.report);
};

// POST /api/curator-reports - Создать отчет (Куратор создает для себя)
exports.createReport = async (req, res) => {
    const {
        reportTitle, reportDate, locationText, directionText,
        invitedGuestsInfo, foreignerCount, minorCount, durationMinutes,
        mediaReferences, eventId, // eventId - опционально
        studentIds = [] // Массив ID студентов-участников
    } = req.body;
    const curatorUserId = req.user.id; // ID текущего пользователя (куратора)

    if (!reportTitle || !reportDate) {
        return res.status(400).json({ message: 'Название/тема и дата отчета обязательны' });
    }

    let transaction;
    try {
        transaction = await sequelize.transaction();

        // Проверка существования связанного Event, если ID передан
        if (eventId) {
            const event = await Event.findByPk(eventId, { transaction });
            if (!event) {
                await transaction.rollback();
                return res.status(400).json({ message: `Связанное мероприятие с ID ${eventId} не найдено` });
            }
        }

        // Создаем отчет
        const newReport = await CuratorReport.create({
            curatorUserId, reportTitle, reportDate, locationText, directionText,
            invitedGuestsInfo, foreignerCount, minorCount, durationMinutes,
            mediaReferences,
            eventId: eventId || null
        }, { transaction });

        // Добавляем студентов-участников
        if (Array.isArray(studentIds) && studentIds.length > 0) {
            // В реальном приложении хорошо бы проверить, существуют ли эти студенты
            // и имеет ли куратор к ним доступ (например, из его группы)
            await newReport.setParticipantStudents(studentIds, { transaction });
        }

        await transaction.commit();

        // Возвращаем созданный отчет с данными
        const result = await CuratorReport.findByPk(newReport.reportId, {
             include: [
                { model: User, as: 'Curator', attributes: ['userId', 'fullName'] },
                { model: Event, as: 'RelatedEvent', attributes: ['eventId', 'title'] },
                { model: Student, as: 'ParticipantStudents', attributes: ['studentId', 'fullName'], through: { attributes: [] } }
            ]
        });
        res.status(201).json(result);

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error creating curator report:', error);
         if (error.name === 'SequelizeValidationError') {
           return res.status(400).json({ message: "Ошибка валидации", errors: error.errors.map(e => e.message) });
        }
        res.status(500).json({ message: 'Ошибка сервера при создании отчета' });
    }
};


// DELETE /api/curator-reports/:id - Удалить отчет
exports.deleteReport = async (req, res) => {
    const report = req.report; // Из loadReport

    // Дополнительная проверка прав на удаление (только админ или автор)
    if (req.user.role !== 'administrator' && report.curatorUserId !== req.user.id) {
         return res.status(403).json({ message: 'Доступ запрещен: вы не автор этого отчета и не администратор' });
    }

    try {
        // Связи в report_participants удалятся каскадно (согласно схеме)
        await report.destroy();
        res.status(204).send();
    } catch (error) {
        console.error(`Error deleting curator report ${req.params.id}:`, error);
        res.status(500).json({ message: 'Ошибка сервера при удалении отчета' });
    }
};


// PUT /api/curator-reports/:id - Обновление отчета
// Мы пропускаем реализацию обновления для краткости, но она будет похожа
// на updateStudent: найти отчет, проверить права, обновить поля, обновить участников через setParticipantStudents.
// exports.updateReport = async (req, res) => { ... };