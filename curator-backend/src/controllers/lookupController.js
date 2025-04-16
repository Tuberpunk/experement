// src/controllers/lookupController.js
const {
    EventDirection, EventLevel, EventFormat, ParticipantCategory, FundingSource, StudentTag // Добавлен StudentTag
} = require('../models');
const { Op } = require('sequelize'); // Может понадобиться для проверки уникальности при обновлении
// Общая функция для получения справочника (ИСПРАВЛЕННАЯ)
const getLookupData = async (Model, req, res) => {
    try {
        // Определяем имя атрибута первичного ключа (напр., 'tagId')
        const pkAttributeName = Model.primaryKeyAttribute;
        // Определяем имя столбца первичного ключа в БД (напр., 'tag_id')
        const pkColumnName = Model.rawAttributes[pkAttributeName]?.field || pkAttributeName;

        // Находим имя атрибута для отображения (первый атрибут, не являющийся ПК)
        let displayNameAttribute = 'name'; // Имя по умолчанию
        for (const attr in Model.rawAttributes) {
            if (!Model.rawAttributes[attr].primaryKey) {
                displayNameAttribute = attr; // Нашли! (напр., 'tagName')
                break;
            }
        }
        // Определяем имя столбца для отображения в БД (напр., 'tag_name')
        const displayNameColumn = Model.rawAttributes[displayNameAttribute]?.field || displayNameAttribute;

        console.log(`Lookup: Fetching ${Model.name}. PK: ${pkColumnName}, Display: ${displayNameColumn} (sorted by ${displayNameAttribute})`); // Лог для отладки

        const items = await Model.findAll({
            attributes: [
                [pkColumnName, 'id'],         // Выбрать столбец ID (как 'id')
                [displayNameColumn, 'name'] // Выбрать столбец имени (как 'name')
            ],
             // Сортируем по АТРИБУТУ модели (Sequelize сам подставит правильный столбец)
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

exports.createStudentTag = async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Название тега не может быть пустым' });
    }
    try {
        const newTag = await StudentTag.create({ tagName: name.trim() });
        // Возвращаем созданный тег в формате { id, name } для консистентности
        res.status(201).json({ id: newTag.tagId, name: newTag.tagName });
    } catch (error) {
        console.error("Error creating student tag:", error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Тег с таким названием уже существует' });
        }
        res.status(500).json({ message: 'Ошибка сервера при создании тега' });
    }
};

// PUT /api/lookups/student-tags/:id - Обновить тег
exports.updateStudentTag = async (req, res) => {
    const tagId = req.params.id;
    const { name } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Название тега не может быть пустым' });
    }

    try {
        const tag = await StudentTag.findByPk(tagId);
        if (!tag) {
            return res.status(404).json({ message: 'Тег не найден' });
        }

        // Проверка на уникальность нового имени (исключая текущий тег)
        const existingTag = await StudentTag.findOne({
            where: {
                tagName: name.trim(),
                tagId: { [Op.ne]: tagId } // Ищем другое имя, но не у текущего тега
            }
        });
        if (existingTag) {
             return res.status(400).json({ message: 'Тег с таким названием уже существует' });
        }

        tag.tagName = name.trim();
        await tag.save();
        res.json({ id: tag.tagId, name: tag.tagName }); // Возвращаем обновленный
    } catch (error) {
        console.error(`Error updating student tag ${tagId}:`, error);
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