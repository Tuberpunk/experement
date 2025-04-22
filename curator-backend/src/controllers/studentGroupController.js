// src/controllers/studentGroupController.js
const { StudentGroup, User, Student } = require('../models'); // Импортируем нужные модели
const { Op } = require('sequelize');

// Middleware для загрузки группы по ID (для update/delete/getById)
exports.loadGroup = async (req, res, next) => {
    try {
        const group = await StudentGroup.findByPk(req.params.id, {
            include: [ // Подключаем связанные данные сразу
                { model: User, as: 'Curator', attributes: ['userId', 'fullName', 'email'] },
               // Можно добавить include для Students, если нужно в load
               // { model: Student, as: 'Students', attributes: ['studentId', 'fullName']}
            ]
        });
        if (!group) {
            return res.status(404).json({ message: 'Группа не найдена' });
        }
        req.group = group; // Прикрепляем к запросу
        next();
    } catch (error) {
        console.error('Error loading student group:', error);
        res.status(500).json({ message: 'Ошибка сервера при загрузке группы' });
    }
};

// GET /api/groups - Получить список всех групп (с пагинацией и фильтрами)
exports.getAllGroups = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'groupName';
    const sortOrder = req.query.sortOrder || 'ASC';

    const where = {}; // Начинаем с пустого объекта условий
    const include = [
        { model: User, as: 'Curator', attributes: ['userId', 'fullName'] }
    ];

    const currentUser = req.user;
    
    if (currentUser.role === 'curator') {
        // Если пользователь - куратор, показываем ТОЛЬКО его группы
        where.curatorUserId = currentUser.id;
        console.log(`Workspaceing groups for curator ID: ${currentUser.id}`);
    } else if (currentUser.role === 'administrator') {
        // Администратор может видеть все, но может фильтровать по куратору из запроса
        if (req.query.curatorUserId) {
            where.curatorUserId = req.query.curatorUserId;
        }
        console.log(`Workspaceing groups for administrator (filter by curatorId: ${req.query.curatorUserId || 'none'})`);
    } else {
        // Другие роли (если появятся) не видят никаких групп
        console.log(`User role ${currentUser.role} has no access to view groups.`);
        return res.json({ totalItems: 0, totalPages: 0, currentPage: 1, groups: [] });
    }

    // Пример фильтрации
    if (req.query.groupName) {
        where.groupName = { [Op.iLike]: `%${req.query.groupName}%` };
    }
    if (req.query.faculty) {
        where.faculty = { [Op.iLike]: `%${req.query.faculty}%` };
    }
     if (req.query.curatorUserId) {
        where.curatorUserId = req.query.curatorUserId;
    }
    // Добавить другие фильтры по необходимости

    try {
        const { count, rows } = await StudentGroup.findAndCountAll({
            where,
            include,
            limit,
            offset,
            order: [[sortBy, sortOrder]],
            distinct: true // Важно при include
        });

        res.json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            groups: rows
        });
    } catch (error) {
        console.error('Error fetching student groups:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении списка групп' });
    }
};

// GET /api/groups/:id - Получить одну группу по ID
exports.getGroupById = async (req, res) => {
    // Группа уже загружена middleware loadGroup и доступна в req.group
     // Можно добавить больше данных, например, студентов
     try {
        const groupWithStudents = await StudentGroup.findByPk(req.params.id, {
            include: [
                { model: User, as: 'Curator', attributes: ['userId', 'fullName', 'email'] },
                { model: Student, as: 'Students', attributes: ['studentId', 'fullName', 'email', 'isActive']} // Добавляем студентов
            ],
             order: [
                // Сортировка студентов внутри группы
                [{ model: Student, as: 'Students' }, 'fullName', 'ASC']
             ]
        });
         if (!groupWithStudents) {
             return res.status(404).json({ message: 'Группа не найдена' });
         }
         res.json(groupWithStudents);
     } catch (error) {
        console.error('Error fetching group with students:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении деталей группы' });
     }
   // res.json(req.group); // Отдаем группу, загруженную middleware
};

// POST /api/groups - Создать новую группу (только админ)
exports.createGroup = async (req, res) => {
    const { groupName, curatorUserId, faculty, admissionYear } = req.body;

    // Валидация
    if (!groupName) {
        return res.status(400).json({ message: 'Название группы обязательно' });
    }

    try {
        // Проверка существования куратора, если он указан
        if (curatorUserId) {
            const curator = await User.findOne({ where: { userId: curatorUserId /*, roleId: ID_РОЛИ_КУРАТОРА */ } });
            if (!curator) {
                 return res.status(400).json({ message: 'Указанный пользователь-куратор не найден или не является куратором' });
            }
            // Тут можно добавить проверку, что у найденного user правильная roleId
        }

        const newGroup = await StudentGroup.create({
            groupName,
            curatorUserId: curatorUserId || null, // null если не указан
            faculty,
            admissionYear
        });
        res.status(201).json(newGroup);
    } catch (error) {
        console.error('Error creating student group:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
             return res.status(400).json({ message: 'Группа с таким названием уже существует' });
        }
         if (error.name === 'SequelizeValidationError') {
           return res.status(400).json({ message: "Ошибка валидации", errors: error.errors.map(e => e.message) });
        }
        res.status(500).json({ message: 'Ошибка сервера при создании группы' });
    }
};

// PUT /api/groups/:id - Обновить группу (только админ)
exports.updateGroup = async (req, res) => {
    const group = req.group; // Получаем из middleware loadGroup
    const { groupName, curatorUserId, faculty, admissionYear } = req.body;

     // Валидация
    if (groupName !== undefined && !groupName) { // Проверяем, если передано пустое имя
        return res.status(400).json({ message: 'Название группы не может быть пустым' });
    }

    try {
         // Проверка существования куратора, если он указан и изменяется
        if (curatorUserId !== undefined && curatorUserId !== group.curatorUserId) {
             if (curatorUserId === null) { // Разрешаем снять куратора
                 // ОК
             } else {
                 const curator = await User.findOne({ where: { userId: curatorUserId /*, roleId: ID_РОЛИ_КУРАТОРА */ } });
                 if (!curator) {
                     return res.status(400).json({ message: 'Указанный пользователь-куратор не найден или не является куратором' });
                 }
             }
        }

        // Обновляем только переданные поля
        const updatedGroup = await group.update({
            groupName: groupName ?? group.groupName, // Используем ?? для сохранения старого значения, если новое не передано
            curatorUserId: curatorUserId !== undefined ? curatorUserId : group.curatorUserId,
            faculty: faculty ?? group.faculty,
            admissionYear: admissionYear ?? group.admissionYear
        });

        res.json(updatedGroup);
    } catch (error) {
        console.error(`Error updating student group ${req.params.id}:`, error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Группа с таким названием уже существует' });
        }
        if (error.name === 'SequelizeValidationError') {
           return res.status(400).json({ message: "Ошибка валидации", errors: error.errors.map(e => e.message) });
        }
        res.status(500).json({ message: 'Ошибка сервера при обновлении группы' });
    }
};

// DELETE /api/groups/:id - Удалить группу (только админ)
exports.deleteGroup = async (req, res) => {
    const group = req.group; // Получаем из middleware loadGroup

    try {
        // Подумайте о зависимостях: что делать со студентами этой группы?
        // В схеме БД указано ON DELETE CASCADE для student.group_id,
        // значит, студенты будут удалены вместе с группой!
        // Если это нежелательно, измените схему или добавьте логику
        // для перевода студентов в другую группу перед удалением.

        await group.destroy();
        res.status(204).send(); // Успех, нет содержимого
    } catch (error) {
        console.error(`Error deleting student group ${req.params.id}:`, error);
        res.status(500).json({ message: 'Ошибка сервера при удалении группы' });
    }
};