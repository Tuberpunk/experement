// Полный путь: src/controllers/userController.js
const { User, Role } = require('../models'); // Импортируем User и Role
const { Op } = require('sequelize');

// GET /api/users - Получить список пользователей (с фильтрами и пагинацией)
exports.getAllUsers = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    // Для списка кураторов в форме обычно не нужна пагинация,
    // но мы сделаем эндпоинт более универсальным.
    // Фронтенд может запросить большой limit.
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'fullName';
    const sortOrder = req.query.sortOrder || 'ASC';

    const where = {}; // Условия для фильтрации пользователей
    const include = []; // Связанные модели (пока не нужны для простого списка)

    // --- Фильтрация по Роли ---
    const requestedRoleName = req.query.role; // Получаем ?role=... из запроса
    if (requestedRoleName) {
        try {
            // Ищем ID роли по имени
            const role = await Role.findOne({ where: { roleName: requestedRoleName } });
            if (!role) {
                // Если роль не найдена, возвращаем пустой список, а не ошибку
                console.log(`Role filter: Role "${requestedRoleName}" not found.`);
                return res.json({ totalItems: 0, totalPages: 0, currentPage: 1, users: [] });
            }
            // Добавляем условие по roleId
            where.roleId = role.roleId;
            console.log(`Filtering users by role: ${requestedRoleName} (ID: ${role.roleId})`); // Лог
        } catch (roleError) {
             console.error("Error finding role for filtering:", roleError);
             return res.status(500).json({ message: 'Ошибка сервера при поиске роли' });
        }
    }
    // --- Конец Фильтрации по Роли ---

    // Другие возможные фильтры (например, по имени)
    if (req.query.fullName) {
        where.fullName = { [Op.iLike]: `%${req.query.fullName}%` };
    }
    // По умолчанию показываем только активных пользователей
    if (req.query.isActive !== 'all') { // Позволяем запросить всех через ?isActive=all
        where.isActive = true;
    }


    try {
        const { count, rows } = await User.findAndCountAll({
            where,
            // Возвращаем только нужные поля, ИСКЛЮЧАЯ пароль!
            attributes: ['userId', 'email', 'fullName', 'position', 'department', 'isActive', 'roleId'],
            // include: [{ model: Role, as: 'Role', attributes: ['roleName'] }], // Можно подключить имя роли, если нужно
            limit,
            offset,
            order: [[sortBy, sortOrder]],
            distinct: true // Важно, если есть include
        });

        res.json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            users: rows // Переименуем ключ в 'users' для ясности
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении списка пользователей' });
    }
};

// Сюда можно добавить другие функции: getUserById, updateUser, deleteUser и т.д.
// exports.getUserById = async (req, res) => { ... };
// exports.updateUser = async (req, res) => { ... }; // Потребует isAdmin
// exports.deleteUser = async (req, res) => { ... }; // Потребует isAdmin