// src/controllers/curatorReportController.js
const { 
    CuratorReport, 
    User, 
    Student, 
    Event, 
    EventDirection, 
    EventLevel,     
    EventFormat,    
    sequelize 
} = require('../models');
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

exports.getReportsStatistics = async (req, res) => {
    const { id: currentUserId, role: currentUserRole } = req.user; // Текущий пользователь
    const { startDate, endDate, curatorId: filterCuratorId } = req.query; // Параметры фильтра

    let reportWhereCondition = {};

    // Фильтр по дате отчета (reportDate)
    if (startDate && endDate) {
        reportWhereCondition.reportDate = {
            [Op.gte]: new Date(startDate),
            [Op.lte]: new Date(endDate),
        };
    } else if (startDate) {
        reportWhereCondition.reportDate = {
            [Op.gte]: new Date(startDate),
        };
    } else if (endDate) {
        reportWhereCondition.reportDate = {
            [Op.lte]: new Date(endDate),
        };
    }

    // Определение curatorUserId для фильтрации
    // Если текущий пользователь - администратор И в запросе передан filterCuratorId, используем его.
    // Иначе, если текущий пользователь - куратор, используем его ID.
    // Если администратор не выбрал конкретного куратора, фильтра по куратору не будет (увидит всех).
    let targetCuratorUserId;
    if (currentUserRole === 'administrator' && filterCuratorId) {
        targetCuratorUserId = parseInt(filterCuratorId, 10);
    } else if (currentUserRole === 'curator') {
        targetCuratorUserId = currentUserId;
    }

    if (targetCuratorUserId) {
        reportWhereCondition.curatorUserId = targetCuratorUserId;
    }
    
    // Для SQL запроса COUNT(DISTINCT rp.student_id) нужно отдельное условие по curator_user_id
    let rawQueryCuratorCondition = '';
    if (targetCuratorUserId) {
        rawQueryCuratorCondition = `AND cr.curator_user_id = ${sequelize.escape(targetCuratorUserId)}`; // sequelize.escape для безопасности
    }
    
    // Для SQL запроса также нужно учитывать startDate и endDate, если они есть
    let rawQueryDateCondition = '';
    if (reportWhereCondition.reportDate) {
        if (reportWhereCondition.reportDate[Op.gte]) {
            rawQueryDateCondition += ` AND cr.report_date >= ${sequelize.escape(reportWhereCondition.reportDate[Op.gte].toISOString())}`;
        }
        if (reportWhereCondition.reportDate[Op.lte]) {
            // Прибавляем один день к endDate, чтобы включить весь день, если время не указано
            const adjustedEndDate = new Date(reportWhereCondition.reportDate[Op.lte]);
            adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
            rawQueryDateCondition += ` AND cr.report_date < ${sequelize.escape(adjustedEndDate.toISOString())}`;
        }
    }


    try {
        const totalReports = await CuratorReport.count({ where: reportWhereCondition });

        const totalParticipantsResult = await sequelize.query(
            `SELECT COUNT(DISTINCT rp.student_id) AS "totalUniqueParticipants"
             FROM report_participants rp
             JOIN curator_reports cr ON rp.report_id = cr.report_id
             WHERE 1=1 ${rawQueryCuratorCondition} ${rawQueryDateCondition}`, // Добавлены условия
            {
                type: sequelize.QueryTypes.SELECT,
            }
        );
        const totalUniqueParticipants = totalParticipantsResult[0]?.totalUniqueParticipants || 0;
        
        // Количество отчетов за текущий месяц - этот блок теперь может быть не нужен, если есть гибкий фильтр по датам
        // Но если хотите оставить его как отдельный показатель, не зависящий от фильтров:
        let reportsThisMonthFixedCondition = {};
        if (currentUserRole === 'curator') { // Для куратора - только его отчеты
             reportsThisMonthFixedCondition.curatorUserId = currentUserId;
        }
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(startOfMonth);
        endOfMonth.setMonth(startOfMonth.getMonth() + 1);
        reportsThisMonthFixedCondition.reportDate = {
            [Op.gte]: startOfMonth,
            [Op.lt]: endOfMonth,
        };
        const reportsThisMonth = await CuratorReport.count({ where: reportsThisMonthFixedCondition });
        
        const distinctEventsLinkedToReports = await CuratorReport.count({
            where: {
                ...reportWhereCondition, // Используем основное условие фильтра
                eventId: { [Op.ne]: null }
            },
            distinct: true,
            col: 'eventId'
        });

        const reportsByDirection = await CuratorReport.findAll({
            attributes: [
                [sequelize.col('RelatedEvent.Direction.name'), 'directionName'],
                [sequelize.fn('COUNT', sequelize.col('CuratorReport.report_id')), 'reportCount']
            ],
            include: [{
                model: Event, as: 'RelatedEvent', attributes: [], required: true,
                include: [{ model: EventDirection, as: 'Direction', attributes: [], required: true }]
            }],
            where: { ...reportWhereCondition, eventId: { [Op.ne]: null } }, // Используем основное условие фильтра
            group: [sequelize.col('RelatedEvent.Direction.name')],
            raw: true,
        });

        const reportsByLevel = await CuratorReport.findAll({
            attributes: [
                [sequelize.col('RelatedEvent.Level.name'), 'levelName'],
                [sequelize.fn('COUNT', sequelize.col('CuratorReport.report_id')), 'reportCount']
            ],
            include: [{
                model: Event, as: 'RelatedEvent', attributes: [], required: true,
                include: [{ model: EventLevel, as: 'Level', attributes: [], required: true }]
            }],
            where: { ...reportWhereCondition, eventId: { [Op.ne]: null } }, // Используем основное условие фильтра
            group: [sequelize.col('RelatedEvent.Level.name')],
            raw: true,
        });

        const reportsByFormat = await CuratorReport.findAll({
            attributes: [
                [sequelize.col('RelatedEvent.Format.name'), 'formatName'],
                [sequelize.fn('COUNT', sequelize.col('CuratorReport.report_id')), 'reportCount']
            ],
            include: [{
                model: Event, as: 'RelatedEvent', attributes: [], required: true,
                include: [{ model: EventFormat, as: 'Format', attributes: [], required: true }]
            }],
            where: { ...reportWhereCondition, eventId: { [Op.ne]: null } }, // Используем основное условие фильтра
            group: [sequelize.col('RelatedEvent.Format.name')],
            raw: true,
        });

        const totalForeignerParticipants = await CuratorReport.sum('foreignerCount', {
            where: reportWhereCondition, // Используем основное условие фильтра
        });

        const totalMinorParticipants = await CuratorReport.sum('minorCount', {
            where: reportWhereCondition, // Используем основное условие фильтра
        });

        res.json({
            totalReports,
            totalUniqueParticipants: parseInt(totalUniqueParticipants, 10),
            reportsThisMonth, // Этот показатель теперь не зависит от фильтров startDate/endDate
            distinctEventsLinkedToReports,
            reportsByDirection,
            reportsByLevel,
            reportsByFormat,
            totalForeignerParticipants: totalForeignerParticipants || 0,
            totalMinorParticipants: totalMinorParticipants || 0
        });

    } catch (error) {
        console.error('Error fetching reports statistics:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении статистики по отчетам' });
    }
};

// PUT /api/curator-reports/:id - Обновление отчета
// Мы пропускаем реализацию обновления для краткости, но она будет похожа
// на updateStudent: найти отчет, проверить права, обновить поля, обновить участников через setParticipantStudents.
// exports.updateReport = async (req, res) => { ... };