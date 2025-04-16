// src/controllers/lookupController.js
const {
    EventDirection, EventLevel, EventFormat, ParticipantCategory, FundingSource, StudentTag // Добавлен StudentTag
} = require('../models');
const { Op } = require('sequelize'); // Может понадобиться для проверки уникальности при обновлении
// Общая функция для получения справочника (ИСПРАВЛЕННАЯ)
const getLookupData = async (Model, req, res) => {
    try {
        // Получаем имя первичного ключа из модели (например, 'categoryId')
        const pkAttributeName = Model.primaryKeyAttribute;
        // Получаем реальное имя столбца БД для этого ключа (например, 'category_id')
        const pkColumnName = Model.rawAttributes[pkAttributeName]?.field || pkAttributeName; // Используем .field или само имя атрибута, если field не задан

        const items = await Model.findAll({
            // Используем имя столбца БД (`pkColumnName`) в запросе
            attributes: [
                [pkColumnName, 'id'], // Выбрать столбец pkColumnName и назвать его 'id'
                'name'                // Выбрать столбец 'name'
            ],
            order: [['name', 'ASC']] // Сортировка по имени
        });
        res.json(items);
    } catch (error) {
        // Логируем ошибку с именем модели для ясности
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