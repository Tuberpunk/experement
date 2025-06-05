// src/controllers/lookupController.js
const {
    Role, // Роли пользователей
    EventDirection, // Направления мероприятий
    EventLevel, // Уровни мероприятий
    EventFormat, // Форматы мероприятий
    ParticipantCategory, // Категории участников
    FundingSource, // Источники финансирования
    StudentTag, // Теги студентов (например, "группа риска", "активист")
    StudentGroup // Учебные группы
} = require('../models');
const { Op } = require('sequelize'); // Может понадобиться для проверки уникальности при обновлении


const getModelAndOptions = (lookupType) => {
    switch (lookupType) {
        case 'Role':
            return {
                model: Role,
                // ИСПРАВЛЕНО: используем атрибуты модели 'roleId' и 'roleName'
                // Sequelize автоматически использует 'field' для имен колонок в БД ('role_id', 'role_name')
                // Фронтенд получит поля 'id' и 'name'
                attributes: [
                    ['roleId', 'id'],
                    ['roleName', 'name'] 
                ],
                order: [['roleName', 'ASC']] // Сортируем по атрибуту модели 'roleName'
            };
        case 'EventDirection':
            return {
                model: EventDirection,
                attributes: [['directionId', 'id'], 'name'],
                order: [['name', 'ASC']]
            };
        case 'EventLevel':
            return {
                model: EventLevel,
                attributes: [['levelId', 'id'], 'name'],
                order: [['name', 'ASC']]
            };
        case 'EventFormat':
            return {
                model: EventFormat,
                attributes: [['formatId', 'id'], 'name'],
                order: [['name', 'ASC']]
            };
        case 'ParticipantCategory':
            return {
                model: ParticipantCategory,
                attributes: [['categoryId', 'id'], 'name'],
                order: [['name', 'ASC']]
            };
        case 'FundingSource':
            return {
                model: FundingSource,
                attributes: [['sourceId', 'id'], 'name'],
                order: [['name', 'ASC']]
            };
        case 'StudentTag':
            return {
                model: StudentTag,
                attributes: [['tagId', 'id'], 'name'],
                order: [['name', 'ASC']]
            };
        case 'StudentGroup': // Добавлен кейс для учебных групп
             return {
                model: StudentGroup,
                attributes: [['groupId', 'id'], 'groupName', 'curatorUserId'], // curatorUserId может быть полезен для фильтрации
                // Если нужно также имя куратора:
                // include: [{ model: User, as: 'Curator', attributes: ['fullName'] }],
                order: [['groupName', 'ASC']]
            };
        // Добавьте другие кейсы по мере необходимости
        default:
            return null;
    }
};

exports.getAll = async (req, res) => {
    const { type } = req.params;
    const modelAndOptions = getModelAndOptions(type);

    if (!modelAndOptions) {
        return res.status(400).json({ message: 'Недопустимый тип справочника' });
    }

    const { model, attributes, order, include, where } = modelAndOptions;

    try {
        const items = await model.findAll({
            attributes: attributes || undefined, // Если attributes не заданы, Sequelize выберет все поля
            order: order || undefined,
            include: include || undefined,
            where: where || undefined,
        });
        res.json(items);
    } catch (error) {
        console.error(`Error fetching ${type}:`, error);
        res.status(500).json({ message: `Не удалось загрузить список ${type}` });
    }
};

// Общая функция для получения справочника (ИСПРАВЛЕННАЯ)
    const getLookupData = async (Model, req, res) => {
        try {
            const pkAttributeName = Model.primaryKeyAttribute;
            const pkColumnName = Model.rawAttributes[pkAttributeName]?.field || pkAttributeName;
            let displayNameAttribute = 'name';
            for (const attr in Model.rawAttributes) {
                if (!Model.rawAttributes[attr].primaryKey && (Model.rawAttributes[attr].fieldName === 'name' || Model.rawAttributes[attr].fieldName === 'level_name' || Model.rawAttributes[attr].fieldName === 'format_name' || Model.rawAttributes[attr].fieldName === 'category_name' || Model.rawAttributes[attr].fieldName === 'source_name' || Model.rawAttributes[attr].fieldName === 'tag_name' || Model.rawAttributes[attr].fieldName === 'role_name')) { // Ищем стандартные имена для названия
                    displayNameAttribute = attr;
                    break;
                } else if (!Model.rawAttributes[attr].primaryKey && !displayNameAttribute) { // Если стандартных нет, берем первое не-ПК
                     displayNameAttribute = attr;
                }
            }
             if (Model.name === "EventDirection" || Model.name === "EventLevel" || Model.name === "EventFormat" || Model.name === "ParticipantCategory" || Model.name === "FundingSource" || Model.name === "Role") { // Для этих моделей поле называется 'name'
                displayNameAttribute = 'name';
            } else if (Model.name === "StudentTag") { // Для StudentTag поле называется 'tagName'
                displayNameAttribute = 'tagName';
            }


            const displayNameColumn = Model.rawAttributes[displayNameAttribute]?.field || displayNameAttribute;

            const items = await Model.findAll({
                attributes: [
                    [pkColumnName, 'id'],
                    [displayNameColumn, 'name'] // Всегда возвращаем как 'name' для единообразия на фронте
                ],
                order: [[displayNameAttribute, 'ASC']]
            });
            res.json(items);
        } catch (error) {
            console.error(`Error fetching ${Model.name}:`, error);
            res.status(500).json({ message: `Ошибка сервера при получении данных: ${Model.name}` });
        }
    };
// Экспорты остаются прежними
exports.getEventDirections = (req, res) => getLookupData(EventDirection, req, res);
exports.getEventLevels = (req, res) => getLookupData(EventLevel, req, res);
exports.getEventFormats = (req, res) => getLookupData(EventFormat, req, res);
exports.getParticipantCategories = (req, res) => getLookupData(ParticipantCategory, req, res);
exports.getFundingSources = (req, res) => getLookupData(FundingSource, req, res);
exports.getStudentTags = (req, res) => getLookupData(StudentTag, req, res);
exports.getRoles = (req, res) => getLookupData(Role, req, res);

exports.createStudentTag = async (req, res) => {
    const { name } = req.body; // Ожидаем 'name' от фронтенда
    if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Название тега не может быть пустым' });
    }
    try {
        // Сохраняем в поле 'tagName' модели
        const newTag = await StudentTag.create({ tagName: name.trim() });
        // Возвращаем в стандартном формате { id, name }
        res.status(201).json({ id: newTag.tagId, name: newTag.tagName });
    } catch (error) {
        console.error("Error creating student tag:", error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Тег с таким названием уже существует' });
        }
        res.status(500).json({ message: 'Ошибка сервера при создании тега' });
    }
};

exports.updateStudentTag = async (req, res) => {
    const tagId = req.params.id;
    const { name } = req.body; // Ожидаем 'name'

    if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Название тега не может быть пустым' });
    }
    try {
        const tag = await StudentTag.findByPk(tagId);
        if (!tag) {
            return res.status(404).json({ message: 'Тег не найден' });
        }
        // Проверка на уникальность нового имени (для поля tagName)
        const existingTag = await StudentTag.findOne({
            where: {
                tagName: name.trim(), // Проверяем по tagName
                tagId: { [Op.ne]: tagId }
            }
        });
        if (existingTag) {
             return res.status(400).json({ message: 'Тег с таким названием уже существует.' });
        }
        tag.tagName = name.trim(); // Обновляем поле tagName
        await tag.save();
        res.json({ id: tag.tagId, name: tag.tagName }); // Возвращаем name как tagName
    } catch (error) {
        console.error(`Error updating student tag ${tagId}:`, error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Тег с таким названием уже существует.' });
        }
        res.status(500).json({ message: 'Ошибка сервера при обновлении тега' });
    }
};

// DELETE /api/lookups/student-tags/:id - Удалить тег
exports.deleteStudentTag = async (req, res) => {
    const tagId = req.params.id;
    try {
        const tag = await StudentTag.findByPk(tagId);
        if (!tag) {
            return res.status(404).json({ message: 'Тег не найден' });
        }

        // При удалении тега связи с студентами в student_tag_assignments
        // будут удалены автоматически благодаря ON DELETE CASCADE в SQL схеме.

        await tag.destroy();
        res.status(204).send(); // Успех, нет содержимого
    } catch (error) {
        console.error(`Error deleting student tag ${tagId}:`, error);
        // Обработка возможных ошибок внешних ключей, если CASCADE не сработает
        if (error.name === 'SequelizeForeignKeyConstraintError') {
             return res.status(400).json({ message: 'Невозможно удалить тег, так как он используется.' });
        }
        res.status(500).json({ message: 'Ошибка сервера при удалении тега' });
    }
};

exports.createEventDirection = async (req, res) => {
        try {
            const { name } = req.body;
            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'Название направления не может быть пустым.' });
            }
            // Проверка на уникальность (если нужно, Sequelize обычно сам это делает при unique constraint)
            const existingDirection = await EventDirection.findOne({ where: { name: name.trim() } });
            if (existingDirection) {
                return res.status(400).json({ message: 'Такое направление уже существует.' });
            }
            const newDirection = await EventDirection.create({ name: name.trim() });
            res.status(201).json(newDirection);
        } catch (error) {
            console.error("Error creating event direction:", error);
            if (error.name === 'SequelizeUniqueConstraintError') { // На случай если проверка выше не сработала
                return res.status(400).json({ message: 'Такое направление уже существует.' });
            }
            res.status(500).json({ message: 'Ошибка сервера при создании направления.' });
        }
    };

    exports.updateEventDirection = async (req, res) => {
        try {
            const { id } = req.params;
            const { name } = req.body;
            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'Название направления не может быть пустым.' });
            }
            const direction = await EventDirection.findByPk(id);
            if (!direction) {
                return res.status(404).json({ message: 'Направление не найдено.' });
            }
            // Проверка на уникальность при изменении (кроме текущей записи)
            const existingDirection = await EventDirection.findOne({ where: { name: name.trim(), id: { [Op.ne]: id } } }); // Op нужно импортировать
            if (existingDirection) {
                return res.status(400).json({ message: 'Такое направление уже существует.' });
            }
            direction.name = name.trim();
            await direction.save();
            res.json(direction);
        } catch (error) {
            console.error("Error updating event direction:", error);
             if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ message: 'Такое направление уже существует.' });
            }
            res.status(500).json({ message: 'Ошибка сервера при обновлении направления.' });
        }
    };

    exports.deleteEventDirection = async (req, res) => {
        try {
            const { id } = req.params;
            const direction = await EventDirection.findByPk(id);
            if (!direction) {
                return res.status(404).json({ message: 'Направление не найдено.' });
            }
            // ВАЖНО: Проверка использования перед удалением
            // const relatedEvents = await Event.count({ where: { directionId: id } });
            // if (relatedEvents > 0) {
            //     return res.status(400).json({ message: `Нельзя удалить направление "${direction.name}", так как оно используется в ${relatedEvents} мероприятиях.` });
            // }
            await direction.destroy();
            res.status(204).send();
        } catch (error) {
            console.error("Error deleting event direction:", error);
            // Обработка ошибки внешнего ключа, если не была сделана проверка выше
             if (error.name === 'SequelizeForeignKeyConstraintError') {
                return res.status(400).json({ message: 'Невозможно удалить направление, так как оно используется в мероприятиях.' });
            }
            res.status(500).json({ message: 'Ошибка сервера при удалении направления.' });
        }
    };

     exports.createEventLevel = async (req, res) => {
        try {
            const { name } = req.body;
            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'Название уровня не может быть пустым.' });
            }
            const existingLevel = await EventLevel.findOne({ where: { name: name.trim() } });
            if (existingLevel) {
                return res.status(400).json({ message: 'Такой уровень уже существует.' });
            }
            const newLevel = await EventLevel.create({ name: name.trim() });
            res.status(201).json(newLevel);
        } catch (error) {
            console.error("Error creating event level:", error);
            res.status(500).json({ message: 'Ошибка сервера при создании уровня.' });
        }
    };

    exports.updateEventLevel = async (req, res) => {
        try {
            const { id } = req.params;
            const { name } = req.body;
            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'Название уровня не может быть пустым.' });
            }
            const level = await EventLevel.findByPk(id);
            if (!level) {
                return res.status(404).json({ message: 'Уровень не найден.' });
            }
            const existingLevel = await EventLevel.findOne({ where: { name: name.trim(), id: { [Op.ne]: id } } });
            if (existingLevel) {
                return res.status(400).json({ message: 'Такой уровень уже существует.' });
            }
            level.name = name.trim();
            await level.save();
            res.json(level);
        } catch (error) {
            console.error("Error updating event level:", error);
            res.status(500).json({ message: 'Ошибка сервера при обновлении уровня.' });
        }
    };

    exports.deleteEventLevel = async (req, res) => {
        try {
            const { id } = req.params;
            const level = await EventLevel.findByPk(id);
            if (!level) {
                return res.status(404).json({ message: 'Уровень не найден.' });
            }
            // ВАЖНО: Проверка использования перед удалением
            // const relatedEvents = await Event.count({ where: { levelId: id } });
            // if (relatedEvents > 0) {
            //     return res.status(400).json({ message: `Нельзя удалить уровень "${level.name}", так как он используется в ${relatedEvents} мероприятиях.` });
            // }
            await level.destroy();
            res.status(204).send();
        } catch (error) {
            console.error("Error deleting event level:", error);
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                return res.status(400).json({ message: 'Невозможно удалить уровень, так как он используется в мероприятиях.' });
            }
            res.status(500).json({ message: 'Ошибка сервера при удалении уровня.' });
        }
    };


    exports.createEventFormat = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Название формата не может быть пустым.' });
        }
        const existingFormat = await EventFormat.findOne({ where: { name: name.trim() } });
        if (existingFormat) {
            return res.status(400).json({ message: 'Такой формат уже существует.' });
        }
        const newFormat = await EventFormat.create({ name: name.trim() });
        res.status(201).json(newFormat);
    } catch (error) {
        console.error("Error creating event format:", error);
        res.status(500).json({ message: 'Ошибка сервера при создании формата.' });
    }
};

exports.updateEventFormat = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Название формата не может быть пустым.' });
        }
        const format = await EventFormat.findByPk(id);
        if (!format) {
            return res.status(404).json({ message: 'Формат не найден.' });
        }
        const existingFormat = await EventFormat.findOne({ where: { name: name.trim(), id: { [Op.ne]: id } } });
        if (existingFormat) {
            return res.status(400).json({ message: 'Такой формат уже существует.' });
        }
        format.name = name.trim();
        await format.save();
        res.json(format);
    } catch (error) {
        console.error("Error updating event format:", error);
        res.status(500).json({ message: 'Ошибка сервера при обновлении формата.' });
    }
};

exports.deleteEventFormat = async (req, res) => {
    try {
        const { id } = req.params;
        const format = await EventFormat.findByPk(id);
        if (!format) {
            return res.status(404).json({ message: 'Формат не найден.' });
        }
        // TODO: Проверка использования перед удалением (Event.count({ where: { formatId: id } }))
        await format.destroy();
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting event format:", error);
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ message: 'Невозможно удалить формат, так как он используется в мероприятиях.' });
        }
        res.status(500).json({ message: 'Ошибка сервера при удалении формата.' });
    }
};

exports.createParticipantCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Название категории участников не может быть пустым.' });
        }
        const existingCategory = await ParticipantCategory.findOne({ where: { name: name.trim() } });
        if (existingCategory) {
            return res.status(400).json({ message: 'Такая категория участников уже существует.' });
        }
        const newCategory = await ParticipantCategory.create({ name: name.trim() });
        res.status(201).json(newCategory);
    } catch (error) {
        console.error("Error creating participant category:", error);
        res.status(500).json({ message: 'Ошибка сервера при создании категории участников.' });
    }
};

exports.updateParticipantCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Название категории участников не может быть пустым.' });
        }
        const category = await ParticipantCategory.findByPk(id);
        if (!category) {
            return res.status(404).json({ message: 'Категория участников не найдена.' });
        }
        const existingCategory = await ParticipantCategory.findOne({ where: { name: name.trim(), id: { [Op.ne]: id } } });
        if (existingCategory) {
            return res.status(400).json({ message: 'Такая категория участников уже существует.' });
        }
        category.name = name.trim();
        await category.save();
        res.json(category);
    } catch (error) {
        console.error("Error updating participant category:", error);
        res.status(500).json({ message: 'Ошибка сервера при обновлении категории участников.' });
    }
};

exports.deleteParticipantCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await ParticipantCategory.findByPk(id);
        if (!category) {
            return res.status(404).json({ message: 'Категория участников не найдена.' });
        }
        // ВАЖНО: Проверка использования перед удалением.
        // Так как это связь многие-ко-многим с Event, нужно проверить таблицу event_participant_categories.
        // const relatedEventsCount = await sequelize.models.event_participant_categories.count({ where: { category_id: id } });
        // if (relatedEventsCount > 0) {
        //    return res.status(400).json({ message: `Нельзя удалить категорию "${category.name}", так как она используется в ${relatedEventsCount} мероприятиях.` });
        // }
        await category.destroy();
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting participant category:", error);
        if (error.name === 'SequelizeForeignKeyConstraintError') { // На случай если проверка выше не сработает или неполная
            return res.status(400).json({ message: 'Невозможно удалить категорию участников, так как она используется.' });
        }
        res.status(500).json({ message: 'Ошибка сервера при удалении категории участников.' });
    }
};

exports.createFundingSource = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Название источника финансирования не может быть пустым.' });
        }
        const existingSource = await FundingSource.findOne({ where: { name: name.trim() } });
        if (existingSource) {
            return res.status(400).json({ message: 'Такой источник финансирования уже существует.' });
        }
        const newSource = await FundingSource.create({ name: name.trim() });
        res.status(201).json(newSource);
    } catch (error) {
        console.error("Error creating funding source:", error);
        res.status(500).json({ message: 'Ошибка сервера при создании источника финансирования.' });
    }
};

exports.updateFundingSource = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Название источника финансирования не может быть пустым.' });
        }
        const source = await FundingSource.findByPk(id);
        if (!source) {
            return res.status(404).json({ message: 'Источник финансирования не найден.' });
        }
        const existingSource = await FundingSource.findOne({ where: { name: name.trim(), id: { [Op.ne]: id } } });
        if (existingSource) {
            return res.status(400).json({ message: 'Такой источник финансирования уже существует.' });
        }
        source.name = name.trim();
        await source.save();
        res.json(source);
    } catch (error) {
        console.error("Error updating funding source:", error);
        res.status(500).json({ message: 'Ошибка сервера при обновлении источника финансирования.' });
    }
};

exports.deleteFundingSource = async (req, res) => {
    try {
        const { id } = req.params;
        const source = await FundingSource.findByPk(id);
        if (!source) {
            return res.status(404).json({ message: 'Источник финансирования не найден.' });
        }
        // Проверка использования перед удалением.
        // Связь многие-ко-многим с Event через event_funding_sources.
        // const relatedEventsCount = await sequelize.models.event_funding_sources.count({ where: { source_id: id } });
        // if (relatedEventsCount > 0) {
        //    return res.status(400).json({ message: `Нельзя удалить источник "${source.name}", так как он используется в ${relatedEventsCount} мероприятиях.` });
        // }
        await source.destroy();
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting funding source:", error);
         if (error.name === 'SequelizeForeignKeyConstraintError') { // На случай если проверка выше не сработает
            return res.status(400).json({ message: 'Невозможно удалить источник финансирования, так как он используется.' });
        }
        res.status(500).json({ message: 'Ошибка сервера при удалении источника финансирования.' });
    }
};