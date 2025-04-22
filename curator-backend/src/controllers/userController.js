// Полный путь: src/controllers/userController.js
const { User, Role, StudentGroup } = require('../models'); // Убедитесь, что Role импортирована
const { Op } = require('sequelize');

// GET /api/users - Получить список пользователей (с фильтрами и пагинацией)
exports.getAllUsers = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15; // Лимит по умолчанию
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'fullName';
    const sortOrder = req.query.sortOrder || 'ASC';

    const where = {}; // Условия для User
    const include = [ // Включаем Роль пользователя
        { model: Role, as: 'Role', attributes: ['roleName'] }
    ];

    // Фильтрация по Роли (если передан параметр ?role=...)
    const requestedRoleName = req.query.role;
    if (requestedRoleName) {
        try {
            const role = await Role.findOne({ where: { roleName: requestedRoleName } });
            if (!role) {
                return res.json({ totalItems: 0, totalPages: 0, currentPage: 1, users: [] });
            }
            where.roleId = role.roleId;
            console.log(`Filtering users by role: ${requestedRoleName} (ID: ${role.roleId})`);
        } catch (roleError) {
             console.error("Error finding role for filtering:", roleError);
             return res.status(500).json({ message: 'Ошибка сервера при поиске роли' });
        }
    }

    // Другие фильтры
    if (req.query.fullName) {
        where.fullName = { [Op.iLike]: `%${req.query.fullName}%` };
    }
     if (req.query.isActive !== undefined && req.query.isActive !== 'all') {
        where.isActive = req.query.isActive === 'true';
    }
    // Добавить другие фильтры при необходимости...

    try {
        const { count, rows } = await User.findAndCountAll({
            where,
            include, // Включаем роль
            // Исключаем хеш пароля из вывода
            attributes: { exclude: ['passwordHash'] },
            limit,
            offset,
            order: [[sortBy, sortOrder]],
            distinct: true
        });

        res.json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            users: rows // Массив пользователей
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении списка пользователей' });
    }
};

// ... (другие функции контроллера: getUserById, updateUser, deleteUser - для будущей реализации) ...