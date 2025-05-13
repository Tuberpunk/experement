// src/controllers/studentController.js
const { Student, StudentGroup, StudentTag, StudentTagAssignment, sequelize } = require('../models');
const { Op } = require('sequelize');

// Middleware для загрузки студента по ID
exports.loadStudent = async (req, res, next) => {
    try {
        const student = await Student.findByPk(req.params.id, {
            include: [
                { model: StudentGroup, as: 'StudentGroup', attributes: ['groupId', 'groupName'] },
                { model: StudentTag, as: 'Tags', attributes: ['tagId', 'tagName'], through: { attributes: [] } } // Загружаем теги
            ]
        });
        if (!student) {
            return res.status(404).json({ message: 'Студент не найден' });
        }
        req.student = student;
        next();
    } catch (error) {
        console.error('Error loading student:', error);
        res.status(500).json({ message: 'Ошибка сервера при загрузке данных студента' });
    }
};

// GET /api/students - Получить список студентов
exports.getAllStudents = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'fullName';
    const sortOrder = req.query.sortOrder || 'ASC';

    const where = {}; // Условия для Student.findAll
    const include = [ // Модели для включения
        { model: StudentGroup, as: 'StudentGroup', attributes: ['groupId', 'groupName'] },
        { model: StudentTag, as: 'Tags', attributes: ['tagId', 'tagName'], through: { attributes: [] } }
    ];

    const currentUser = req.user; // Пользователь из токена

    try {
        // --- Логика фильтрации по роли пользователя ---
        if (currentUser.role === 'curator') {
            // 1. Найти все группы текущего куратора
            const groups = await StudentGroup.findAll({
                where: { curatorUserId: currentUser.id },
                attributes: ['groupId'],
                raw: true
            });

            if (!groups || groups.length === 0) {
                // Если у куратора нет групп, он не видит студентов
                return res.json({ totalItems: 0, totalPages: 0, currentPage: 1, students: [] });
            }
            const groupIds = groups.map(group => group.groupId);

            // 2. Добавить условие для выборки студентов ТОЛЬКО из этих групп
            where.groupId = { [Op.in]: groupIds };
            console.log(`Workspaceing students for curator ${currentUser.id} in groups: ${groupIds.join(', ')}`);

        } else if (currentUser.role === 'administrator') {
            // Администратор может фильтровать по любой группе из запроса
            if (req.query.groupId) {
                where.groupId = req.query.groupId;
            }
            console.log(`Workspaceing students for administrator (filter by groupId: ${req.query.groupId || 'none'})`);
        } else {
            // Другие роли не видят студентов
            console.log(`User role ${currentUser.role} has no access to view students.`);
            return res.json({ totalItems: 0, totalPages: 0, currentPage: 1, students: [] });
        }
        // --- Конец логики фильтрации по роли ---

        // Применяем остальные фильтры из запроса
        if (req.query.fullName) {
            where.fullName = { [Op.iLike]: `%${req.query.fullName}%` };
        }
        if (req.query.isActive !== undefined && req.query.isActive !== 'all') {
             // Фильтр по статусу активности (true/false)
             where.isActive = req.query.isActive === 'true';
         }
         if (req.query.tagId) { // Фильтр по тегу
             // Нужно модифицировать include для фильтрации по тегу
             const tagInclude = include.find(inc => inc.as === 'Tags');
             if (tagInclude) { // Если include для тегов уже есть
                 tagInclude.where = { tagId: req.query.tagId };
                 tagInclude.required = true; // Делаем INNER JOIN для фильтрации
             } else { // Если include для тегов не было добавлено по умолчанию
                 include.push({
                     model: StudentTag,
                     as: 'Tags',
                     attributes: [], // Не обязательно возвращать теги в списке для фильтрации
                     where: { tagId: req.query.tagId },
                     through: { attributes: [] },
                     required: true // INNER JOIN
                 });
             }
        }

        // Выполняем запрос к БД
        const { count, rows } = await Student.findAndCountAll({
            where,
            include,
            limit,
            offset,
            order: [[sortBy, sortOrder]],
            distinct: true // Важно при include с where на связанных таблицах (особенно M:N как теги)
        });

        res.json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            students: rows
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении списка студентов' });
    }
};

// GET /api/students/:id - Получить одного студента
exports.getStudentById = async (req, res) => {
    // Данные уже в req.student из loadStudent
    res.json(req.student);
};

// POST /api/students - Создать студента (только админ)
exports.createStudent = async (req, res) => {
    const {
        fullName, dateOfBirth, groupId, phoneNumber, email, studentCardNumber, isActive, tagIds // tagIds - массив ID тегов
    } = req.body;

    if (!fullName || !groupId) {
        return res.status(400).json({ message: 'ФИО и ID группы обязательны' });
    }

    let transaction;
    try {
        transaction = await sequelize.transaction();

        // Проверка существования группы
        const group = await StudentGroup.findByPk(groupId, { transaction });
        if (!group) {
            await transaction.rollback();
            return res.status(400).json({ message: `Группа с ID ${groupId} не найдена` });
        }

        const newStudent = await Student.create({
            fullName,
            dateOfBirth: dateOfBirth || null,
            groupId,
            phoneNumber,
            email,
            studentCardNumber,
            isActive: isActive !== undefined ? isActive : true
        }, { transaction });

        // Добавляем теги, если они переданы
        if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
            // Проверяем существование тегов (опционально, но хорошо бы)
            const validTags = await StudentTag.findAll({ where: { tagId: tagIds }, transaction });
            if (validTags.length !== tagIds.length) {
                 await transaction.rollback();
                 // Найти невалидные ID для сообщения об ошибке
                 return res.status(400).json({ message: 'Один или несколько указанных тегов не существуют' });
            }
            await newStudent.setTags(tagIds, { transaction }); // Устанавливаем связи с тегами
        }

        await transaction.commit();

        // Возвращаем созданного студента с данными группы и тегов
        const result = await Student.findByPk(newStudent.studentId, {
             include: [
                { model: StudentGroup, as: 'StudentGroup', attributes: ['groupId', 'groupName'] },
                { model: StudentTag, as: 'Tags', attributes: ['tagId', 'tagName'], through: { attributes: [] } }
            ]
        });
        res.status(201).json(result);

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error creating student:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
             return res.status(400).json({ message: 'Студент с таким Email или номером студ. билета уже существует' });
        }
        if (error.name === 'SequelizeValidationError') {
           return res.status(400).json({ message: "Ошибка валидации", errors: error.errors.map(e => e.message) });
        }
        res.status(500).json({ message: 'Ошибка сервера при создании студента' });
    }
};

// PUT /api/students/:id - Обновить студента (только админ)
exports.updateStudent = async (req, res) => {
    const student = req.student; // Из loadStudent
    const {
        fullName, dateOfBirth, groupId, phoneNumber, email, studentCardNumber, isActive, tagIds
    } = req.body;

    // Не позволяем изменять все поля сразу без проверки, создаем объект с тем, что можно менять
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth || null;
    if (groupId !== undefined) updateData.groupId = groupId;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (email !== undefined) updateData.email = email;
    if (studentCardNumber !== undefined) updateData.studentCardNumber = studentCardNumber;
    if (isActive !== undefined) updateData.isActive = isActive;

    let transaction;
    try {
         transaction = await sequelize.transaction();

         // Проверка группы, если она меняется
         if (groupId !== undefined && groupId !== student.groupId) {
             const group = await StudentGroup.findByPk(groupId, { transaction });
             if (!group) {
                 await transaction.rollback();
                 return res.status(400).json({ message: `Группа с ID ${groupId} не найдена` });
             }
         }

        // Обновляем основные данные
        await student.update(updateData, { transaction });

        // Обновляем теги (если переданы) - setTags перезаписывает все теги
        if (tagIds && Array.isArray(tagIds)) {
            // Проверяем существование тегов (опционально)
            const validTags = await StudentTag.findAll({ where: { tagId: tagIds }, transaction });
            if (validTags.length !== tagIds.length) {
                 await transaction.rollback();
                 return res.status(400).json({ message: 'Один или несколько указанных тегов не существуют' });
            }
            await student.setTags(tagIds, { transaction });
        }

        await transaction.commit();

        // Возвращаем обновленного студента
        const result = await Student.findByPk(student.studentId, {
             include: [
                { model: StudentGroup, as: 'StudentGroup', attributes: ['groupId', 'groupName'] },
                { model: StudentTag, as: 'Tags', attributes: ['tagId', 'tagName'], through: { attributes: [] } }
            ]
        });
        res.json(result);

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error(`Error updating student ${req.params.id}:`, error);
        if (error.name === 'SequelizeUniqueConstraintError') {
             return res.status(400).json({ message: 'Студент с таким Email или номером студ. билета уже существует' });
        }
         if (error.name === 'SequelizeValidationError') {
           return res.status(400).json({ message: "Ошибка валидации", errors: error.errors.map(e => e.message) });
        }
        res.status(500).json({ message: 'Ошибка сервера при обновлении студента' });
    }
};

// DELETE /api/students/:id - Удалить студента (только админ)
exports.deleteStudent = async (req, res) => {
    const student = req.student; // Из loadStudent
    try {
        // Перед удалением можно выполнить доп. проверки или действия
        await student.destroy();
        res.status(204).send();
    } catch (error) {
        console.error(`Error deleting student ${req.params.id}:`, error);
        res.status(500).json({ message: 'Ошибка сервера при удалении студента' });
    }
};