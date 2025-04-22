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