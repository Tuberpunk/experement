// src/controllers/lookupController.js
const { EventDirection, EventLevel, EventFormat, ParticipantCategory, FundingSource } = require('../models');

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