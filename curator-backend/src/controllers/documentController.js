// src/controllers/documentController.js
const { Document, User } = require('../models'); // Импортируем модели Document и User
const { Op } = require('sequelize');

// GET /api/documents - Получить список документов (с пагинацией и фильтрами)
exports.getAllDocuments = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // По умолчанию больше документов на странице
    const offset = (page - 1) * limit;
    // Сортировка по умолчанию - по дате загрузки, новые сверху
    const sortBy = req.query.sortBy || 'uploadedAt';
    const sortOrder = req.query.sortOrder || 'DESC';

    const where = {};
    const include = [ // Подключаем информацию о загрузившем пользователе
        { model: User, as: 'Uploader', attributes: ['userId', 'fullName'] }
    ];

    // Фильтры (примеры)
    if (req.query.title) {
        where.title = { [Op.iLike]: `%${req.query.title}%` };
    }
    if (req.query.category) {
        where.category = { [Op.iLike]: `%${req.query.category}%` };
    }
    if (req.query.uploaderId) {
        where.uploadedByUserId = req.query.uploaderId;
    }

    try {
        const { count, rows } = await Document.findAndCountAll({
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
            documents: rows
        });
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении списка документов' });
    }
};

// POST /api/documents - Загрузить (создать) новый документ (только админ)
exports.createDocument = async (req, res) => {
    // docUrl должен прийти от фронтенда (после загрузки файла на /api/media/upload)
    const { title, description, category, docUrl } = req.body;
    const uploadedByUserId = req.user.id; // ID админа из токена

    // Валидация
    if (!title || !docUrl) {
        return res.status(400).json({ message: 'Название и URL документа обязательны' });
    }
    // Простая проверка URL (можно улучшить)
    if (!docUrl.startsWith('/media/') && !docUrl.startsWith('http')) {
         return res.status(400).json({ message: 'Некорректный URL документа' });
    }


    try {
        const newDocument = await Document.create({
            title,
            description,
            category,
            docUrl, // Сохраняем URL, полученный после загрузки файла
            uploadedByUserId
            // uploadedAt устанавливается по умолчанию в БД/модели
        });

        // Возвращаем созданный документ с информацией о загрузившем
        const result = await Document.findByPk(newDocument.docId, {
            include: [{ model: User, as: 'Uploader', attributes: ['userId', 'fullName'] }]
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating document:', error);
        if (error.name === 'SequelizeValidationError') {
           return res.status(400).json({ message: "Ошибка валидации", errors: error.errors.map(e => e.message) });
        }
        res.status(500).json({ message: 'Ошибка сервера при создании документа' });
    }
};

// DELETE /api/documents/:id - Удалить документ (только админ)
exports.deleteDocument = async (req, res) => {
    const docId = req.params.id;

    try {
        const document = await Document.findByPk(docId);
        if (!document) {
            return res.status(404).json({ message: 'Документ не найден' });
        }

        // TODO: Подумать об удалении самого файла с сервера/хранилища,
        // если это необходимо (зависит от вашей логики).
        // Например, извлечь имя файла из docUrl и удалить его из папки uploads/media.

        await document.destroy();
        res.status(204).send(); // Успех, нет содержимого

    } catch (error) {
        console.error(`Error deleting document ${docId}:`, error);
        res.status(500).json({ message: 'Ошибка сервера при удалении документа' });
    }
};