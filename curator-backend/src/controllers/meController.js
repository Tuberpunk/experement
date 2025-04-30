// Полный путь: src/controllers/meController.js
const { User, Role, Student, StudentGroup } = require('../models');
const { Op } = require('sequelize');

exports.getMyStudents = async (req, res) => {
    const curatorUserId = req.user.id;
    console.log(`Workspaceing students for curator ID: ${curatorUserId}`);

    try {
        const groups = await StudentGroup.findAll({
            where: { curatorUserId: curatorUserId },
            attributes: ['groupId'],
            raw: true
        });

        if (!groups || groups.length === 0) {
            console.log(`No groups found for curator ID: ${curatorUserId}`);
            return res.json([]);
        }
        const groupIds = groups.map(group => group.groupId);
        console.log(`Curator ${curatorUserId} manages group IDs: ${groupIds.join(', ')}`);

        const students = await Student.findAll({
            where: {
                groupId: { [Op.in]: groupIds },
                isActive: true
            },
            // Включаем информацию о группе студента
            include: [{
                model: StudentGroup,
                as: 'StudentGroup', // Используем псевдоним, заданный в models/index.js
                attributes: ['groupName'] // Нам нужно только название группы
            }],
            // Выбираем нужные поля студента
            attributes: ['studentId', 'fullName', 'email'], // Email может быть полезен для доп. информации
            order: [['fullName', 'ASC']]
        });

        // Преобразуем результат для фронтенда, добавляя groupName к объекту студента
        const results = students.map(student => ({
            studentId: student.studentId,
            fullName: student.fullName,
            email: student.email,
            // Безопасно получаем groupName
            groupName: student.StudentGroup?.groupName || 'Группа не найдена'
        }));

        console.log(`Found ${results.length} active students with group names for curator ${curatorUserId}.`);
        res.json(results); // Отправляем массив студентов с groupName

    } catch (error) {
        console.error(`Server error fetching students for curator ${curatorUserId}:`, error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при получении списка студентов.' });
    }
};

exports.getMyProfile = async (req, res) => {
    const userId = req.user.id;
    try {
        const userProfile = await User.findByPk(userId, { // <-- Теперь User определена
            attributes: { exclude: ['passwordHash'] },
            include: [{
                model: Role, // <-- Теперь Role определена
                as: 'Role',
                attributes: ['roleName']
            }]
        });

        if (!userProfile) {
            return res.status(404).json({ message: 'Профиль пользователя не найден' });
        }
        res.json(userProfile);

    } catch (error) {
        console.error(`Error fetching profile for user ${userId}:`, error);
        res.status(500).json({ message: 'Ошибка сервера при получении профиля' });
    }
};

exports.updateMyProfile = async (req, res) => {
    const userId = req.user.id; // ID пользователя из токена

    // Определяем поля, которые пользователь МОЖЕТ сам изменить
    const allowedFields = ['fullName', 'position', 'department', 'phoneNumber'];
    const updateData = {};

    // Собираем только разрешенные поля из тела запроса
    for (const key of allowedFields) {
        if (req.body[key] !== undefined) { // Поле присутствует в запросе
            // Добавляем его в объект для обновления
            // Пустые строки сохраняем как null (если поле nullable)
            updateData[key] = req.body[key] === '' ? null : req.body[key];
        }
    }

    // Проверяем, переданы ли вообще данные для обновления
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'Нет данных для обновления профиля.' });
    }

    // Валидация (пример - ФИО не может быть пустым)
    if (updateData.fullName !== undefined && !updateData.fullName) {
         return res.status(400).json({ message: 'Поле ФИО не может быть пустым.' });
    }
    // TODO: Добавить другую необходимую валидацию

    try {
        // Находим пользователя
        const user = await User.findByPk(userId);
        if (!user) {
             // Крайне маловероятно, если токен валиден
             return res.status(404).json({ message: 'Пользователь не найден.' });
        }

        // Обновляем данные пользователя
        await user.update(updateData);

        // Получаем обновленные данные (чтобы вернуть их фронтенду)
        const updatedUserProfile = await User.findByPk(userId, {
             attributes: { exclude: ['passwordHash'] }, // Исключаем пароль
             include: [{ model: Role, as: 'Role', attributes: ['roleName'] }] // Включаем роль
         });

        res.json(updatedUserProfile); // Отправляем обновленный профиль

    } catch (error) {
        console.error(`Error updating profile for user ${userId}:`, error);
         if (error.name === 'SequelizeValidationError') {
           return res.status(400).json({ message: "Ошибка валидации данных", errors: error.errors.map(e => e.message) });
        }
        res.status(500).json({ message: 'Ошибка сервера при обновлении профиля' });
    }
};