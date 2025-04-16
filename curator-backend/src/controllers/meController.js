// Полный путь: src/controllers/meController.js
const { Student, StudentGroup } = require('../models'); // Импортируем нужные модели
const { Op } = require('sequelize');

// GET /api/me/students - Получить список студентов текущего куратора
exports.getMyStudents = async (req, res) => {
    // ID пользователя берем из объекта req.user, добавленного authenticateToken
    // Middleware isCurator уже гарантировало, что это куратор
    const curatorUserId = req.user.id;

    try {
        // 1. Найти все группы, где текущий пользователь является куратором
        const groups = await StudentGroup.findAll({
            where: { curatorUserId: curatorUserId },
            attributes: ['groupId'] // Выбираем только ID групп
        });

        // Если куратор не курирует ни одной группы
        if (!groups || groups.length === 0) {
            console.log(`Curator ${curatorUserId} has no assigned groups.`);
            return res.json([]); // Возвращаем пустой массив - это не ошибка
        }

        // Собираем массив ID групп
        const groupIds = groups.map(group => group.groupId);
        console.log(`Curator ${curatorUserId} manages group IDs: ${groupIds.join(', ')}`); // Лог для отладки

        // 2. Найти всех АКТИВНЫХ студентов из этих групп
        const students = await Student.findAll({
            where: {
                groupId: { [Op.in]: groupIds }, // Студенты из найденных групп
                isActive: true                  // Только активные
            },
            // Выбираем только нужные поля для формы выбора
            attributes: ['studentId', 'fullName', 'email'],
            order: [['fullName', 'ASC']] // Сортируем по ФИО для удобства
        });

        console.log(`Found ${students.length} active students for curator ${curatorUserId}.`); // Лог для отладки
        res.json(students); // Отправляем список студентов

    } catch (error) {
        console.error(`Error fetching students for curator ${curatorUserId}:`, error);
        res.status(500).json({ message: 'Ошибка сервера при получении списка студентов куратора' });
    }
};

// Сюда можно добавить другие функции для /api/me/*, например, getMyProfile
// exports.getMyProfile = async (req, res) => { ... };