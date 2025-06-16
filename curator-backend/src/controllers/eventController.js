// src/controllers/eventController.js
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const {
    sequelize, // Для транзакций
    Event,
    User, // Для include Creator
    EventDirection, // Для include
    EventLevel,     // Для include
    EventFormat,    // Для include
    ParticipantCategory, // Для include и связей
    FundingSource,      // Для include и связей
    MediaLink,          // Для include
    EventMedia,         // Для include
    InvitedGuest        // Для include
} = require('../models');

// --- Вспомогательные функции ---

// Middleware для загрузки события и прикрепления к req
// Используется перед updateEvent, updateEventStatus, isCreatorOrAdmin
exports.loadEvent = async (req, res, next) => {
    try {
        const event = await Event.findByPk(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Мероприятие не найдено' });
        }
        req.event = event; // Прикрепляем найденное событие к запросу
        next();
    } catch (error) {
        console.error('Error loading event:', error);
        res.status(500).json({ message: 'Ошибка сервера при загрузке мероприятия' });
    }
};


// Функция для построения опций запроса Sequelize (where, include)
const buildEventQueryOptions = (queryParams, userRole, userId) => {
    const where = {};
    const include = [
        { model: EventDirection, as: 'Direction', attributes: ['name'] },
        { model: EventLevel, as: 'Level', attributes: ['name'] },
        { model: EventFormat, as: 'Format', attributes: ['name'] },
        // Можно добавить больше include по умолчанию, если нужно в списке
         { model: User, as: 'Creator', attributes: ['userId', 'fullName', 'email'] },
    ];

    // Фильтр по пользователю для не-админов [6, 30, 50]
    if (userRole !== 'administrator') {
        where.createdByUserId = userId;
    }

    // Обработка фильтров из queryParams [33, 34, 54, 55]
    if (queryParams.status) where.status = queryParams.status;
    if (queryParams.directionId) where.directionId = queryParams.directionId;
    if (queryParams.levelId) where.levelId = queryParams.levelId;
    if (queryParams.formatId) where.formatId = queryParams.formatId;

    // Фильтр по дате/периоду
    if (queryParams.startDate && queryParams.endDate) {
        where.startDate = { [Op.between]: [queryParams.startDate, queryParams.endDate] };
    } else if (queryParams.startDate) {
        where.startDate = { [Op.gte]: queryParams.startDate };
    } else if (queryParams.endDate) {
        // Если указана только дата окончания, ищем события, начавшиеся до этой даты
        where.startDate = { [Op.lte]: queryParams.endDate };
        // ИЛИ можно искать те, что заканчиваются до этой даты (если есть end_date)
        // where[Op.or] = [
        //     { startDate: { [Op.lte]: queryParams.endDate } },
        //     { endDate: { [Op.lte]: queryParams.endDate } } // Учитывать и endDate, если оно есть
        // ];
    }

    // Фильтр по ответственному (пример поиска по части имени)
    if (queryParams.responsibleFullName) {
        where.responsibleFullName = { [Op.iLike]: `%${queryParams.responsibleFullName}%` };
    }
    // Фильтр по названию (пример поиска по части названия)
    if (queryParams.searchTitle) {
         where.title = { [Op.iLike]: `%${queryParams.searchTitle}%` };
    }

    // Фильтрация по связанным таблицам (требует include)
    if (queryParams.participantCategoryId) {
        include.push({
            model: ParticipantCategory,
            as: 'ParticipantCategories',
            where: { categoryId: queryParams.participantCategoryId },
            attributes: [], // Не включать данные категорий в основной результат, только для фильтрации
            through: { attributes: [] } // Не включать данные связующей таблицы
        });
    }
    if (queryParams.fundingSourceId) {
         include.push({
            model: FundingSource,
            as: 'FundingSources',
            where: { sourceId: queryParams.fundingSourceId },
            attributes: [],
            through: { attributes: [] }
         });
    }

     // Фильтры hasMediaLinks / hasEventMedia (может требовать подзапросов или LEFT JOIN с проверкой на NULL)
     // Пример для hasMediaLinks (упрощенный, может быть не очень производительным на больших данных):
     if (queryParams.hasMediaLinks === 'true') {
         // Включить только если есть хотя бы одна ссылка
         include.push({ model: MediaLink, as: 'MediaLinks', attributes: ['linkId'], required: true });
     } else if (queryParams.hasMediaLinks === 'false') {
         // Включить только если нет ссылок (требует LEFT JOIN и проверку на NULL)
         include.push({ model: MediaLink, as: 'MediaLinks', attributes: ['linkId'], required: false });
         where['$MediaLinks.linkId$'] = null; // Фильтр по отсутствию связи
     }
     // Аналогично для hasEventMedia

    return { where, include };
};


// --- Функции контроллера ---

// POST /api/events
exports.createEvent = async (req, res) => {
    console.log('Received data for event creation:', JSON.stringify(req.body, null, 2));
    const {
        title, directionId, levelId, formatId, startDate, endDate,
        locationText, addressText, participantsInfo, participantCount,
        hasForeigners, foreignerCount, hasMinors, minorCount, description,
        responsibleFullName, responsiblePosition, responsiblePhone, responsibleEmail,
        fundingAmount, status, // Статус по умолчанию будет 'Запланировано'
        participantCategoryIds, // Ожидаем массив ID
        fundingSourceIds,       // Ожидаем массив ID
        mediaLinks,             // Ожидаем массив объектов [{ url, description }]
        eventMedias,            // Ожидаем массив объектов [{ mediaUrl, mediaType, description, author }]
        invitedGuests           // Ожидаем массив объектов [{ fullName, position, organization }]
    } = req.body;
    const createdByUserId = req.user.id; // Получаем ID из токена

    // **ВАЛИДАЦИЯ ВВОДА ДОЛЖНА БЫТЬ ЗДЕСЬ**
    // (проверка обязательных полей, форматов, длины description и т.д.)
    if (!title || !description || !startDate || !responsibleFullName) {
        console.error('Validation failed: Missing required fields.');
        return res.status(400).json({ message: 'Не заполнены обязательные поля (title, description, startDate, responsibleFullName)' });
    }
    if (description.length < 100) { // [16, 28, 38, 49]
        console.error('Validation failed: Description too short.');
        return res.status(400).json({ message: 'Описание должно содержать не менее 100 символов' });
    }

    let transaction;
    try {
        transaction = await sequelize.transaction();

        const newEvent = await Event.create({
            title, directionId, levelId, formatId, startDate, endDate,
            locationText, addressText, participantsInfo, participantCount,
            hasForeigners, foreignerCount, hasMinors, minorCount, description,
            responsibleFullName, responsiblePosition, responsiblePhone, responsibleEmail,
            fundingAmount,
            // status: status || 'Запланировано', // Статус по умолчанию в модели
            createdByUserId
        }, { transaction });

        const eventId = newEvent.eventId;

        // Обработка связей многие-ко-многим
        if (participantCategoryIds && participantCategoryIds.length > 0) {
            await newEvent.setParticipantCategories(participantCategoryIds, { transaction });
        }
        if (fundingSourceIds && fundingSourceIds.length > 0) {
            await newEvent.setFundingSources(fundingSourceIds, { transaction });
        }

        // Обработка связей один-ко-многим
        if (mediaLinks && mediaLinks.length > 0) {
            const linksToCreate = mediaLinks.map(link => ({ ...link, eventId }));
            await MediaLink.bulkCreate(linksToCreate, { transaction });
        }
        if (eventMedias && eventMedias.length > 0) {
            const mediasToCreate = eventMedias.map(media => ({ ...media, eventId }));
            await EventMedia.bulkCreate(mediasToCreate, { transaction });
        }
        if (invitedGuests && invitedGuests.length > 0) {
            const guestsToCreate = invitedGuests.map(guest => ({ ...guest, eventId }));
            await InvitedGuest.bulkCreate(guestsToCreate, { transaction });
        }

        await transaction.commit();

        // Возвращаем созданное событие со связями
        const createdEventWithIncludes = await Event.findByPk(eventId, {
            include: [
                 { model: User, as: 'Creator', attributes: ['userId', 'fullName', 'email'] },
                 { model: EventDirection, as: 'Direction' },
                 { model: EventLevel, as: 'Level' },
                 { model: EventFormat, as: 'Format' },
                 { model: ParticipantCategory, as: 'ParticipantCategories', through: { attributes: [] } },
                 { model: FundingSource, as: 'FundingSources', through: { attributes: [] } },
                 { model: MediaLink, as: 'MediaLinks' },
                 { model: EventMedia, as: 'EventMedias' },
                 { model: InvitedGuest, as: 'InvitedGuests' },
            ]
        });

        res.status(201).json(createdEventWithIncludes);

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error creating event:', error);
        // Проверка на ошибки валидации Sequelize
        if (error.name === 'SequelizeValidationError') {
           return res.status(400).json({ message: "Ошибка валидации", errors: error.errors.map(e => e.message) });
        }
        res.status(500).json({ message: 'Ошибка сервера при создании мероприятия' });
    }
};

// GET /api/events
exports.getEvents = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'startDate'; // По умолчанию сортировка по дате начала
    const sortOrder = req.query.sortOrder || 'DESC'; // По умолчанию сначала новые

    try {
        const { where, include } = buildEventQueryOptions(req.query, req.user.role, req.user.id);

        const { count, rows } = await Event.findAndCountAll({
            where,
            include,
            limit,
            offset,
            order: [[sortBy, sortOrder]],
            distinct: true // Важно для корректного count при include many-to-many с where
        });

        res.json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            events: rows
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении списка мероприятий' });
    }
};

// GET /api/events/:id
exports.getEventById = async (req, res) => {
    const eventId = req.params.id;

    try {
        const event = await Event.findByPk(eventId, {
             include: [
                 { model: User, as: 'Creator', attributes: ['userId', 'fullName', 'email'] },
                 { model: EventDirection, as: 'Direction' },
                 { model: EventLevel, as: 'Level' },
                 { model: EventFormat, as: 'Format' },
                 { model: ParticipantCategory, as: 'ParticipantCategories', through: { attributes: [] } },
                 { model: FundingSource, as: 'FundingSources', through: { attributes: [] } },
                 { model: MediaLink, as: 'MediaLinks' },
                 { model: EventMedia, as: 'EventMedias' },
                 { model: InvitedGuest, as: 'InvitedGuests' },
             ]
        });

        if (!event) {
            return res.status(404).json({ message: 'Мероприятие не найдено' });
        }

        // Проверка прав доступа: админ или создатель [6]
        if (req.user.role !== 'administrator' && event.createdByUserId !== req.user.id) {
            return res.status(403).json({ message: 'Доступ запрещен: вы не являетесь создателем этого мероприятия' });
        }

        res.json(event);
    } catch (error) {
        console.error(`Error fetching event ${eventId}:`, error);
        res.status(500).json({ message: 'Ошибка сервера при получении мероприятия' });
    }
};

// PUT /api/events/:id
exports.updateEvent = async (req, res) => {
    const event = req.event; // Получаем событие из middleware loadEvent
    const {
        // Поля, которые можно обновлять
        title, directionId, levelId, formatId, startDate, endDate,
        locationText, addressText, participantsInfo, participantCount,
        hasForeigners, foreignerCount, hasMinors, minorCount, description,
        responsibleFullName, responsiblePosition, responsiblePhone, responsibleEmail,
        fundingAmount,
        // Массивы для связей
        participantCategoryIds,
        fundingSourceIds,
        mediaLinks,     // Формат: [{ id?, url, description }] - id для существующих
        eventMedias,    // Формат: [{ id?, mediaUrl, mediaType, ... }]
        invitedGuests   // Формат: [{ id?, fullName, position, ... }]
    } = req.body;

    // **ВАЛИДАЦИЯ ВВОДА ДОЛЖНА БЫТЬ ЗДЕСЬ**
    if (description && description.length < 100) {
         return res.status(400).json({ message: 'Описание должно содержать не менее 100 символов' });
    }
    // Запрещаем смену создателя или статуса через этот эндпоинт
    const updateData = {
         title, directionId, levelId, formatId, startDate, endDate,
         locationText, addressText, participantsInfo, participantCount,
         hasForeigners, foreignerCount, hasMinors, minorCount, description,
         responsibleFullName, responsiblePosition, responsiblePhone, responsibleEmail,
         fundingAmount
     };
     // Удаляем ключи с undefined значениями, чтобы не перезатирать поля в БД
     Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);


    let transaction;
    try {
        transaction = await sequelize.transaction();

        // 1. Обновление основных полей события
        await event.update(updateData, { transaction });

        // 2. Обновление связей Многие-ко-Многим (простой способ - перезапись)
        if (participantCategoryIds !== undefined) { // Если массив передан (даже пустой)
            await event.setParticipantCategories(participantCategoryIds || [], { transaction });
        }
        if (fundingSourceIds !== undefined) {
            await event.setFundingSources(fundingSourceIds || [], { transaction });
        }

        // 3. Обновление связей Один-ко-Многим (сложнее - нужно сравнить)
        // --- MediaLinks ---
        if (mediaLinks !== undefined) {
            const existingLinks = await event.getMediaLinks({ transaction });
            const existingLinkIds = existingLinks.map(link => link.linkId);
            const incomingLinkIds = mediaLinks.map(link => link.id).filter(id => id); // ID переданных ссылок

            // Удалить те, которых нет в новом списке
            const linksToDelete = existingLinkIds.filter(id => !incomingLinkIds.includes(id));
            if (linksToDelete.length > 0) {
                await MediaLink.destroy({ where: { linkId: linksToDelete, eventId: event.eventId }, transaction });
            }
            // Обновить существующие и добавить новые
            for (const linkData of mediaLinks) {
                if (linkData.id) { // Обновить существующую
                    await MediaLink.update(linkData, { where: { linkId: linkData.id, eventId: event.eventId }, transaction });
                } else { // Добавить новую
                    await MediaLink.create({ ...linkData, eventId: event.eventId }, { transaction });
                }
            }
        }
        // --- Аналогичная логика для EventMedia и InvitedGuests ---
        // ... (код для EventMedia)
        // ... (код для InvitedGuests)


        await transaction.commit();

         // Возвращаем обновленное событие со связями
        const updatedEventWithIncludes = await Event.findByPk(event.eventId, {
             include: [
                  { model: User, as: 'Creator', attributes: ['userId', 'fullName', 'email'] },
                  { model: EventDirection, as: 'Direction' },
                  { model: EventLevel, as: 'Level' },
                  { model: EventFormat, as: 'Format' },
                  { model: ParticipantCategory, as: 'ParticipantCategories', through: { attributes: [] } },
                  { model: FundingSource, as: 'FundingSources', through: { attributes: [] } },
                  { model: MediaLink, as: 'MediaLinks' },
                  { model: EventMedia, as: 'EventMedias' },
                  { model: InvitedGuest, as: 'InvitedGuests' },
             ]
        });

        res.json(updatedEventWithIncludes);

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error(`Error updating event ${event.eventId}:`, error);
         if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: "Ошибка валидации", errors: error.errors.map(e => e.message) });
         }
        res.status(500).json({ message: 'Ошибка сервера при обновлении мероприятия' });
    }
};

// PATCH /api/events/:id/status
exports.updateEventStatus = async (req, res) => {
    const event = req.event; // Получаем событие из middleware loadEvent
    const { status: newStatus } = req.body; // Переименовали для ясности
    const validStatuses = ['Запланировано', 'Проведено', 'Не проводилось (Отмена)'];

    if (!newStatus || !validStatuses.includes(newStatus)) {
        return res.status(400).json({ message: 'Неверный или отсутствующий статус' });
    }

    try {
        const currentEventStatus = event.status; // Эту переменную можно не использовать, если обращаемся к event.status напрямую

        // --- ИСПРАВЛЕННАЯ ЛОГИКА ПРОВЕРКИ ПРАВ ---
        if (req.user.role !== 'administrator') {
            // Если не администратор, проверяем, является ли пользователь создателем
            if (event.createdByUserId !== req.user.id) {
                return res.status(403).json({ message: 'Доступ запрещен: вы не являетесь создателем этого мероприятия' });
            }

            // Куратор (создатель) может менять статус:
            // 1. с "Запланировано" на "Проведено"
            // 2. с "Запланировано" на "Не проводилось (Отмена)"
            if (currentEventStatus === 'Запланировано' && (newStatus === 'Проведено' || newStatus === 'Не проводилось (Отмена)')) {
                // Разрешенный переход для куратора
            } else {
                // Все остальные переходы для куратора запрещены
                return res.status(403).json({ message: `Доступ запрещен: куратор не может изменить статус с "${currentEventStatus}" на "${newStatus}".` });
            }
        }
        // Администратор может менять статус свободно (нет дополнительных проверок здесь)
        // --- КОНЕЦ ЛОГИКИ ПРОВЕРКИ ПРАВ ---

        await event.update({ status: newStatus });

        // Отправка уведомлений админу о смене статуса [15]
        // TODO: Реализовать sendAdminNotification
        // sendAdminNotification(`Статус мероприятия "${event.title}" (ID: ${event.eventId}) изменен на "${newStatus}" пользователем ${req.user.email}`);

        res.json({ message: 'Статус успешно обновлен', event: { eventId: event.eventId, status: event.status } });

    } catch (error) {
        console.error(`Error updating status for event ${event.eventId}:`, error);
        res.status(500).json({ message: 'Ошибка сервера при обновлении статуса мероприятия' });
    }
};


// DELETE /api/events/:id
exports.deleteEvent = async (req, res) => {
    const eventId = req.params.id;

    try {
        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Мероприятие не найдено' });
        }

        await event.destroy(); // Удалит событие и связанные (если настроено onDelete: 'CASCADE')

        res.status(204).send(); // Успех, нет содержимого для ответа

    } catch (error) {
        console.error(`Error deleting event ${eventId}:`, error);
        res.status(500).json({ message: 'Ошибка сервера при удалении мероприятия' });
    }
};

exports.exportEvents = async (req, res) => {
    console.log("Export request received with query:", req.query);
    try {
        // 1. Получаем фильтры и строим запрос (без пагинации)
        // Используем ту же логику фильтров, что и для getEvents
        // ВАЖНО: Логика фильтрации должна быть идентична getEvents!
        const where = {};
        const include = [ // Определяем, что ТОЧНО нужно включить для колонок отчета
             { model: User, as: 'Creator', attributes: ['fullName'] },
             { model: EventDirection, as: 'Direction', attributes: ['name'] },
             { model: EventLevel, as: 'Level', attributes: ['name'] },
             { model: EventFormat, as: 'Format', attributes: ['name'] },
             // Включаем категории и источники для отображения их имен
             { model: ParticipantCategory, as: 'ParticipantCategories', attributes: ['name'], through: { attributes: [] } },
             { model: FundingSource, as: 'FundingSources', attributes: ['name'], through: { attributes: [] } },
        ];

        // Применяем фильтры (аналогично getEvents/buildEventQueryOptions)
        // Фильтр по роли
         if (req.user.role !== 'administrator') {
             where.createdByUserId = req.user.id;
         }
         // Остальные фильтры из req.query
         if (req.query.status) where.status = req.query.status;
         if (req.query.directionId) where.directionId = req.query.directionId;
         if (req.query.levelId) where.levelId = req.query.levelId;
         if (req.query.formatId) where.formatId = req.query.formatId;
         if (req.query.startDate && req.query.endDate) {
             where.startDate = { [Op.between]: [req.query.startDate, req.query.endDate] };
         } else if (req.query.startDate) {
             where.startDate = { [Op.gte]: req.query.startDate };
         } else if (req.query.endDate) {
              where.startDate = { [Op.lte]: req.query.endDate };
          }
         if (req.query.responsibleFullName) {
             where.responsibleFullName = { [Op.iLike]: `%${req.query.responsibleFullName}%` };
         }
          if (req.query.searchTitle) {
              where.title = { [Op.iLike]: `%${req.query.searchTitle}%` };
          }
         // Фильтры по связанным таблицам (требуют добавления/модификации include)
         if (req.query.participantCategoryId) {
             const catInclude = include.find(i => i.as === 'ParticipantCategories') || { model: ParticipantCategory, as: 'ParticipantCategories', attributes: ['name'], through: { attributes: [] } };
             catInclude.where = { categoryId: req.query.participantCategoryId };
             catInclude.required = true; // INNER JOIN
             if (!include.find(i => i.as === 'ParticipantCategories')) include.push(catInclude); // Добавляем, если не было
         }
          if (req.query.fundingSourceId) {
               const srcInclude = include.find(i => i.as === 'FundingSources') || { model: FundingSource, as: 'FundingSources', attributes: ['name'], through: { attributes: [] } };
               srcInclude.where = { sourceId: req.query.fundingSourceId };
               srcInclude.required = true; // INNER JOIN
               if (!include.find(i => i.as === 'FundingSources')) include.push(srcInclude); // Добавляем, если не было
          }
        // КОНЕЦ ЛОГИКИ ФИЛЬТРАЦИИ (убедитесь, что она полная)

        console.log("Export query options:", { where, include });

        // 2. Получаем ВСЕ отфильтрованные мероприятия БЕЗ пагинации
        const events = await Event.findAll({
            where,
            include,
            order: [['startDate', 'DESC']], // Сортировка для отчета
        });

        console.log(`Found ${events.length} events for export.`);
        if (events.length === 0) {
            // Можно вернуть ошибку или пустой файл? Вернем ошибку.
             return res.status(404).json({ message: 'Нет данных для экспорта по заданным фильтрам.' });
        }

        // 3. Создаем Excel Workbook и Worksheet
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ИС Кабинет Куратора';
        workbook.created = new Date();
        const worksheet = workbook.addWorksheet('Мероприятия');

        // 4. Определяем колонки Excel
        worksheet.columns = [
            { header: 'ID', key: 'eventId', width: 8 },
            { header: 'Название', key: 'title', width: 45 },
            { header: 'Статус', key: 'status', width: 18 },
            { header: 'Дата начала', key: 'startDate', width: 14, style: { numFmt: 'dd.mm.yyyy' } },
            { header: 'Дата окончания', key: 'endDate', width: 14, style: { numFmt: 'dd.mm.yyyy' } },
            { header: 'Направление', key: 'directionName', width: 25 },
            { header: 'Уровень', key: 'levelName', width: 25 },
            { header: 'Формат', key: 'formatName', width: 25 },
            { header: 'Место', key: 'locationText', width: 30 },
            { header: 'Адрес', key: 'addressText', width: 35 },
            { header: 'Кол-во участ.', key: 'participantCount', width: 12, style: { numFmt: '0' } },
            { header: 'Категории участ.', key: 'participantCategories', width: 35 },
            { header: 'Иностр.', key: 'foreignerCount', width: 10, style: { numFmt: '0' } },
            { header: 'Несоверш.', key: 'minorCount', width: 10, style: { numFmt: '0' } },
            { header: 'Ответств. ФИО', key: 'responsibleFullName', width: 25 },
            { header: 'Ответств. Должн.', key: 'responsiblePosition', width: 25 },
            { header: 'Ответств. Тел.', key: 'responsiblePhone', width: 18 },
            { header: 'Ответств. Email', key: 'responsibleEmail', width: 25 },
            { header: 'Источники фин.', key: 'fundingSources', width: 35 },
            { header: 'Объем фин. (тыс.руб)', key: 'fundingAmount', width: 15, style: { numFmt: '#,##0.00' } },
            { header: 'Описание', key: 'description', width: 50 },
            { header: 'Создал', key: 'creatorName', width: 25 },
            { header: 'Дата создания', key: 'createdAt', width: 18, style: { numFmt: 'dd.mm.yyyy HH:mm' } },
        ];

        // Стиль для заголовков (первая строка)
        worksheet.getRow(1).font = { bold: true, size: 11 };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        worksheet.getRow(1).eachCell((cell) => {
             cell.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFD9D9D9'} }; // Серый фон
             cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
         });
         worksheet.getRow(1).height = 30; // Высота строки заголовка

        // 5. Добавляем строки с данными
        events.forEach(event => {
             // Преобразуем массивы связанных данных в строки
             const categoryNames = event.ParticipantCategories?.map(c => c.name).join('; ') || '';
             const sourceNames = event.FundingSources?.map(s => s.name).join('; ') || '';

            worksheet.addRow({
                eventId: event.eventId,
                title: event.title,
                status: event.status,
                startDate: event.startDate ? new Date(event.startDate) : null,
                endDate: event.endDate ? new Date(event.endDate) : null,
                directionName: event.Direction?.name || '',
                levelName: event.Level?.name || '',
                formatName: event.Format?.name || '',
                locationText: event.locationText || '',
                addressText: event.addressText || '',
                participantCount: event.participantCount ?? 0, // null или число
                participantCategories: categoryNames,
                foreignerCount: event.foreignerCount ?? 0,
                minorCount: event.minorCount ?? 0,
                responsibleFullName: event.responsibleFullName || '',
                responsiblePosition: event.responsiblePosition || '',
                responsiblePhone: event.responsiblePhone || '',
                responsibleEmail: event.responsibleEmail || '',
                fundingSources: sourceNames,
                fundingAmount: event.fundingAmount, // null или число
                description: event.description || '',
                creatorName: event.Creator?.fullName || '',
                createdAt: event.createdAt ? new Date(event.createdAt) : null,
            });
        });

         // Устанавливаем автофильтр на заголовки
         worksheet.autoFilter = {
            from: 'A1',
            to: { row: 1, column: worksheet.columns.length }
         };

         // Добавляем перенос текста для некоторых колонок
         ['title', 'description', 'participantCategories', 'fundingSources'].forEach(key => {
             const col = worksheet.getColumn(key);
             if (col) col.alignment = { wrapText: true, vertical: 'top' };
         });


        // 6. Устанавливаем заголовки ответа и отправляем файл
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `Мероприятия_Экспорт_${timestamp}.xlsx`;

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // MIME тип для XLSX
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` // Правильное кодирование имени файла
        );

        // Отправляем сгенерированный файл
        await workbook.xlsx.write(res);
        res.end(); // Завершаем ответ после отправки файла

    } catch (error) {
        console.error('Error exporting events:', error);
        // Отправляем ошибку, если заголовки еще не были отправлены
        if (!res.headersSent) {
             res.status(500).json({ message: 'Ошибка сервера при экспорте мероприятий в Excel' });
        } else {
             // Если отправка началась, но произошла ошибка, ее уже нельзя изменить
             console.error('Error occurred after headers were sent during Excel export.');
        }
    }
};

exports.getEventsForReportLookup = async (req, res) => {
    try {
        const events = await Event.findAll({
            where: {
                // Фильтр 1: Только мероприятия, созданные текущим пользователем
                createdByUserId: req.user.id,
                
                // Фильтр 2: Только мероприятия со статусом "Запланировано"
                status: 'Запланировано'
            },
            // Возвращаем данные в формате, удобном для фронтенда { id, name }
            attributes: [
                ['event_id', 'id'],
                ['title', 'name']
            ],
            order: [['startDate', 'DESC']] // Сортируем по дате (сначала новые)
        });
        res.json(events);
    } catch (error) {
        console.error('Error fetching events for report lookup:', error);
        res.status(500).json({ message: 'Ошибка при загрузке списка мероприятий' });
    }
};