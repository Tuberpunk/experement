// src/controllers/curatorReportController.js
const {
    CuratorReport,
    User,
    Student,         // Убедитесь, что модель Student импортирована
    StudentGroup,    // Убедитесь, что модель StudentGroup импортирована
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

exports.deleteReport = async (req, res) => {
    // req.report is attached by loadReport middleware
    try {
        // Basic check: only admin or the report's curator can delete
        // More complex logic (e.g., cannot delete if event is 'Проведено') can be added here
        // This check is somewhat redundant if loadReport already did a similar check for access,
        // but ensures delete operation also re-validates if needed.
        if (req.user.role !== 'administrator' && req.user.id !== req.report.curatorUserId) {
            // loadReport should already handle cases where user is not admin and not author for viewing
            // but for deletion, an explicit re-check or ensuring loadReport's permissions are sufficient
            // return res.status(403).json({ message: "Доступ запрещен: вы не можете удалить этот отчет." });
        }

        await req.report.destroy();
        res.status(204).send(); // No content
    } catch (error) {
        console.error('Error deleting curator report:', error);
        res.status(500).json({ message: 'Ошибка сервера при удалении отчета куратора' });
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

exports.getReportsStatistics = async (req, res) => {
    const { id: currentUserId, role: currentUserRole } = req.user;
    const { startDate, endDate, curatorId: filterCuratorId } = req.query;

    let reportWhereCondition = {}; // Для фильтрации CuratorReport
    let groupStudentFilterCuratorId; // Для фильтрации StudentGroup и Student

    // Фильтр по дате отчета (reportDate) для CuratorReport
    if (startDate && endDate) {
        reportWhereCondition.reportDate = {
            [Op.gte]: new Date(startDate),
            [Op.lte]: new Date(endDate), // Sequelize <= включает всю дату
        };
    } else if (startDate) {
        reportWhereCondition.reportDate = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
        reportWhereCondition.reportDate = { [Op.lte]: new Date(endDate) };
    }

    // Определение ID куратора для основной фильтрации отчетов
    let targetCuratorUserIdForReports;
    if (currentUserRole === 'administrator' && filterCuratorId) {
        targetCuratorUserIdForReports = parseInt(filterCuratorId, 10);
    } else if (currentUserRole === 'curator') {
        targetCuratorUserIdForReports = currentUserId;
    }

    if (targetCuratorUserIdForReports) {
        reportWhereCondition.curatorUserId = targetCuratorUserIdForReports;
    }

    // Определение ID куратора для статистики по группам и студентам
    // Если админ выбрал куратора в фильтре, используем его. Если текущий юзер - куратор, используем его ID.
    // Иначе (админ, не выбрал куратора) - groupStudentFilterCuratorId остается undefined (для подсчета всех)
    if (currentUserRole === 'administrator' && filterCuratorId) {
        groupStudentFilterCuratorId = parseInt(filterCuratorId, 10);
    } else if (currentUserRole === 'curator') {
        groupStudentFilterCuratorId = currentUserId;
    }
    
    // Подготовка условий для "сырых" SQL запросов (для totalReportParticipations)
    let rawQueryCuratorConditionForReports = '';
    if (targetCuratorUserIdForReports) {
        rawQueryCuratorConditionForReports = `AND cr.curator_user_id = ${sequelize.escape(targetCuratorUserIdForReports)}`;
    }
    let rawQueryDateConditionForReports = '';
    if (reportWhereCondition.reportDate) {
        if (reportWhereCondition.reportDate[Op.gte]) {
            rawQueryDateConditionForReports += ` AND cr.report_date >= ${sequelize.escape(reportWhereCondition.reportDate[Op.gte].toISOString().split('T')[0])}`;
        }
        if (reportWhereCondition.reportDate[Op.lte]) {
            rawQueryDateConditionForReports += ` AND cr.report_date <= ${sequelize.escape(reportWhereCondition.reportDate[Op.lte].toISOString().split('T')[0])}`;
        }
    }

    try {
        // --- Существующая статистика (с применением reportWhereCondition) ---
        const totalReports = await CuratorReport.count({ where: reportWhereCondition });
        
        // Изменен totalUniqueParticipants на totalReportParticipations (не уникальные участиия)
        const totalReportParticipationsResult = await sequelize.query(
            `SELECT COUNT(rp.student_id) AS "totalParticipations" 
             FROM report_participants rp
             JOIN curator_reports cr ON rp.report_id = cr.report_id
             WHERE 1=1 ${rawQueryCuratorConditionForReports} ${rawQueryDateConditionForReports}`,
            { type: sequelize.QueryTypes.SELECT }
        );
        const totalReportParticipations = totalReportParticipationsResult[0]?.totalParticipations || 0;
        
        // Уникальные участники (если все еще нужны отдельно)
        const totalUniqueParticipantsResult = await sequelize.query(
            `SELECT COUNT(DISTINCT rp.student_id) AS "totalUniqueParticipants"
             FROM report_participants rp
             JOIN curator_reports cr ON rp.report_id = cr.report_id
             WHERE 1=1 ${rawQueryCuratorConditionForReports} ${rawQueryDateConditionForReports}`,
            { type: sequelize.QueryTypes.SELECT }
        );
        const totalUniqueParticipants = totalUniqueParticipantsResult[0]?.totalUniqueParticipants || 0;


        let reportsThisMonthFixedCondition = {};
        if (currentUserRole === 'curator') { reportsThisMonthFixedCondition.curatorUserId = currentUserId; }
        const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
        const endOfMonth = new Date(startOfMonth); endOfMonth.setMonth(startOfMonth.getMonth() + 1);
        reportsThisMonthFixedCondition.reportDate = { [Op.gte]: startOfMonth, [Op.lt]: endOfMonth };
        const reportsThisMonth = await CuratorReport.count({ where: reportsThisMonthFixedCondition });
        
        const distinctEventsLinkedToReports = await CuratorReport.count({
            where: { ...reportWhereCondition, eventId: { [Op.ne]: null } },
            distinct: true, col: 'eventId'
        });
        const reportsByDirection = await CuratorReport.findAll({ attributes: [[sequelize.col('RelatedEvent.Direction.name'), 'directionName'], [sequelize.fn('COUNT', sequelize.col('CuratorReport.report_id')), 'reportCount']], include: [{model: Event, as: 'RelatedEvent', attributes: [], required: true, include: [{ model: EventDirection, as: 'Direction', attributes: [], required: true }]}], where: { ...reportWhereCondition, eventId: { [Op.ne]: null } }, group: [sequelize.col('RelatedEvent.Direction.name')], raw: true });
        const reportsByLevel = await CuratorReport.findAll({ attributes: [[sequelize.col('RelatedEvent.Level.name'), 'levelName'], [sequelize.fn('COUNT', sequelize.col('CuratorReport.report_id')), 'reportCount']], include: [{model: Event, as: 'RelatedEvent', attributes: [], required: true, include: [{ model: EventLevel, as: 'Level', attributes: [], required: true }]}], where: { ...reportWhereCondition, eventId: { [Op.ne]: null } }, group: [sequelize.col('RelatedEvent.Level.name')], raw: true });
        const reportsByFormat = await CuratorReport.findAll({ attributes: [[sequelize.col('RelatedEvent.Format.name'), 'formatName'], [sequelize.fn('COUNT', sequelize.col('CuratorReport.report_id')), 'reportCount']], include: [{model: Event, as: 'RelatedEvent', attributes: [], required: true, include: [{ model: EventFormat, as: 'Format', attributes: [], required: true }]}], where: { ...reportWhereCondition, eventId: { [Op.ne]: null } }, group: [sequelize.col('RelatedEvent.Format.name')], raw: true });
        const totalForeignerParticipants = await CuratorReport.sum('foreignerCount', { where: reportWhereCondition });
        const totalMinorParticipants = await CuratorReport.sum('minorCount', { where: reportWhereCondition });

        // --- НОВАЯ СТАТИСТИКА ---
        let groupWhereCondition = {};
        let studentGroupInfo = { type: 'count', value: 0 }; // Инициализация
        let totalStudentsInFilteredGroups = 0;

        if (groupStudentFilterCuratorId) { // Статистика для конкретного куратора (текущего или выбранного админом)
            groupWhereCondition.curatorUserId = groupStudentFilterCuratorId;
            const curatorGroups = await StudentGroup.findAll({
                where: groupWhereCondition,
                attributes: ['groupId', 'groupName'] // Получаем ID и название группы
            });

            if (curatorGroups.length === 1) {
                studentGroupInfo = { type: 'name', value: curatorGroups[0].groupName };
            } else {
                studentGroupInfo = { type: 'count', value: curatorGroups.length };
            }

            if (curatorGroups.length > 0) {
                const groupIds = curatorGroups.map(g => g.groupId);
                totalStudentsInFilteredGroups = await Student.count({
                    where: { groupId: { [Op.in]: groupIds } }
                });
            }
        } else { // Администратор, не выбран конкретный куратор -> общая статистика по всем группам
            const countAllGroups = await StudentGroup.count();
            studentGroupInfo = { type: 'count', value: countAllGroups };
            totalStudentsInFilteredGroups = await Student.count();
        }

        res.json({
            totalReports,
            totalUniqueParticipants: parseInt(totalUniqueParticipants, 10),
            totalReportParticipations: parseInt(totalReportParticipations, 10),
            reportsThisMonth,
            distinctEventsLinkedToReports,
            reportsByDirection,
            reportsByLevel,
            reportsByFormat,
            totalForeignerParticipants: totalForeignerParticipants || 0,
            totalMinorParticipants: totalMinorParticipants || 0,
            
            // Обновленная информация по группам
            studentGroupInfo, // Объект с { type: 'count'/'name', value: ... }
            totalStudentsInFilteredGroups: totalStudentsInFilteredGroups || 0
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