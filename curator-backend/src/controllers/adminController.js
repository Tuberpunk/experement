// Полный путь: src/controllers/adminController.js
const { Event, User, Role, sequelize } = require('../models'); // Необходимые модели
const { Op } = require('sequelize');

/**
 * POST /api/admin/assign-event
 * Назначить (создать) мероприятие для одного или нескольких кураторов.
 * Доступно только администраторам.
 */
exports.assignEventToCurators = async (req, res) => {
    // Получаем ID админа, который выполняет действие
    const assignerAdminId = req.user.id;

    // Получаем данные из тела запроса
    const {
        targetUserIds, // Массив ID кураторов, которым назначаем
        title,
        startDate,
        // Опционально можно передавать и другие поля Event
        description,
        directionId,
        levelId,
        formatId,
        endDate,
        locationText,
        addressText,
        responsibleFullName // Можно по умолчанию ставить ФИО куратора? Или админа?
    } = req.body;

    // Валидация ввода
    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        return res.status(400).json({ message: 'Не выбран ни один куратор для назначения' });
    }
    if (!title || !startDate || !description || description.length < 100 ) { // Проверяем минимальный набор полей
        return res.status(400).json({ message: 'Не заполнены обязательные поля: Название, Дата начала, Описание (мин. 100 симв.)' });
    }

    let transaction;
    let createdCount = 0;
    const errors = [];

    try {
        transaction = await sequelize.transaction();

        // 1. Проверить, что все targetUserIds существуют и являются кураторами (опционально, но надежно)
        const roles = await Role.findOne({ where: { roleName: 'curator' }, attributes: ['roleId'], transaction });
        if (!roles) {
             await transaction.rollback();
             return res.status(500).json({ message: 'Роль "curator" не найдена в базе данных.' });
        }
        const curatorRoleId = roles.roleId;

        const targetUsers = await User.findAll({
            where: {
                userId: { [Op.in]: targetUserIds },
                roleId: curatorRoleId, // Проверяем роль
                isActive: true
            },
            attributes: ['userId', 'fullName', 'email', 'position', 'phoneNumber'], // Берем данные для возможной подстановки
            transaction
        });

        const foundUserIds = targetUsers.map(u => u.userId);
        const notFoundOrNotCuratorIds = targetUserIds.filter(id => !foundUserIds.includes(id));

        if (notFoundOrNotCuratorIds.length > 0) {
            await transaction.rollback();
            return res.status(400).json({ message: `Следующие ID пользователей не найдены, не активны или не являются кураторами: ${notFoundOrNotCuratorIds.join(', ')}` });
        }

        // 2. Создать по одному мероприятию для каждого куратора
        for (const targetUser of targetUsers) {
            try {
                // Если ответственный не указан явно, подставляем ФИО куратора
                const finalResponsibleFullName = responsibleFullName || targetUser.fullName;

                await Event.create({
                    title,
                    startDate,
                    description,
                    directionId: directionId || null,
                    levelId: levelId || null,
                    formatId: formatId || null,
                    endDate: endDate || null,
                    locationText: locationText || null,
                    addressText: addressText || null,
                    responsibleFullName: finalResponsibleFullName,
                    // Добавляем опционально другие поля...
                    responsiblePosition: targetUser.position || null, // Можно взять из профиля куратора
                    responsiblePhone: targetUser.phoneNumber || null,
                    responsibleEmail: targetUser.email || null,
                    // --- Ключевое поле ---
                    createdByUserId: targetUser.userId, // Создатель - сам куратор
                    // --------------------
                    status: 'Запланировано' // Статус по умолчанию
                    // Остальные поля (участники, финансы) куратор заполнит сам при редактировании
                }, { transaction });
                createdCount++;
            } catch (eventCreateError) {
                 // Логируем ошибку создания для конкретного юзера, но продолжаем цикл
                 console.error(`Failed to assign event to user ${targetUser.userId}:`, eventCreateError);
                 errors.push(`Ошибка назначения для пользователя ${targetUser.fullName} (ID: ${targetUser.userId})`);
            }
        }

        // Если были ошибки при создании для кого-то, откатываем все? Или коммитим успешные?
        // Решим пока коммитить успешные, но сообщить об ошибках.
        // Если нужна полная атомарность, то при любой ошибке в цикле делаем rollback.
        // if (errors.length > 0) {
        //    await transaction.rollback();
        //    return res.status(500).json({ message: 'Не удалось назначить мероприятие некоторым кураторам.', details: errors });
        // }

        await transaction.commit();

        res.status(201).json({
            message: `Мероприятие "${title}" успешно назначено ${createdCount} кураторам.`,
            errors: errors // Список кураторов, для которых не удалось создать
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error assigning event:', error);
        res.status(500).json({ message: 'Ошибка сервера при назначении мероприятия' });
    }
};