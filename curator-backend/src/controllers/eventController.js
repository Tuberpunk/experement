// src/controllers/eventController.js
const { Op } = require('sequelize');
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
        return res.status(400).json({ message: 'Не заполнены обязательные поля (title, description, startDate, responsibleFullName)' });
    }
    if (description.length < 100) { // [16, 28, 38, 49]
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
    const { status } = req.body;
    const validStatuses = ['Запланировано', 'Проведено', 'Не проводилось (Отмена)'];

    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Неверный или отсутствующий статус' });
    }

    try {
        // Проверка прав доступа [6, 7, 16]
        if (req.user.role !== 'administrator') {
            // Не-админ может менять только с "Запланировано" на "Проведено"
            if (event.status !== 'Запланировано' || status !== 'Проведено') {
                 return res.status(403).json({ message: 'Доступ запрещен: недостаточно прав для изменения статуса' });
            }
            // Дополнительная проверка, является ли пользователь создателем (хотя isCreatorOrAdmin уже есть в роуте, дублируем для ясности логики статуса)
             if (event.createdByUserId !== req.user.id) {
                  return res.status(403).json({ message: 'Доступ запрещен: вы не являетесь создателем этого мероприятия' });
             }
        }
        // Администратор может менять статус свободно

        await event.update({ status });

        // Отправка уведомлений админу о смене статуса [15]
        // sendAdminNotification(`Статус мероприятия "${event.title}" (ID: ${event.eventId}) изменен на "${status}" пользователем ${req.user.email}`);

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