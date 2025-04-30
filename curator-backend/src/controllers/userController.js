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

exports.updateUser = async (req, res) => {
    const userIdToUpdate = parseInt(req.params.id, 10); // ID пользователя из URL
    const adminUserId = req.user.id; // ID админа, выполняющего действие

    // Данные для обновления из тела запроса
    // Разрешаем менять только определенные поля
    const { fullName, position, department, phoneNumber, isActive, roleId } = req.body;

    // Запрещаем админу менять самого себя (роль или статус активности)
    if (userIdToUpdate === adminUserId && (isActive === false || roleId !== undefined)) {
         return res.status(403).json({ message: 'Администратор не может изменить свою роль или деактивировать свой аккаунт.' });
    }

    // Данные для обновления (только то, что передано)
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (position !== undefined) updateData.position = position;
    if (department !== undefined) updateData.department = department;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (roleId !== undefined) updateData.roleId = parseInt(roleId, 10);

    // Проверяем, есть ли вообще данные для обновления
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'Нет данных для обновления.' });
    }

    try {
        // 1. Находим пользователя для обновления
        const userToUpdate = await User.findByPk(userIdToUpdate);
        if (!userToUpdate) {
            return res.status(404).json({ message: 'Пользователь для обновления не найден.' });
        }

        // 2. Если меняется роль, проверяем, существует ли новая роль
        if (updateData.roleId !== undefined && updateData.roleId !== userToUpdate.roleId) {
             // Запрещаем назначать роль администратора? (Опционально)
             /*
             const adminRole = await Role.findOne({ where: { roleName: 'administrator' }});
             if (adminRole && updateData.roleId === adminRole.roleId && req.user.role !== 'superadmin') { // Нужна роль 'superadmin'?
                 return res.status(403).json({ message: 'Недостаточно прав для назначения роли администратора.' });
             }
             */
            const roleExists = await Role.findByPk(updateData.roleId);
            if (!roleExists) {
                return res.status(400).json({ message: `Роль с ID ${updateData.roleId} не найдена.` });
            }
        }

        // 3. Обновляем пользователя
        await userToUpdate.update(updateData);

        // 4. Возвращаем обновленные данные пользователя (без пароля, с ролью)
        const updatedUser = await User.findByPk(userIdToUpdate, {
             attributes: { exclude: ['passwordHash'] },
             include: [{ model: Role, as: 'Role', attributes: ['roleName'] }]
         });

        res.json(updatedUser);

    } catch (error) {
        console.error(`Error updating user ${userIdToUpdate}:`, error);
         if (error.name === 'SequelizeValidationError') {
           return res.status(400).json({ message: "Ошибка валидации", errors: error.errors.map(e => e.message) });
        }
         if (error.name === 'SequelizeUniqueConstraintError') { // Например, если email пытались обновить на существующий
            return res.status(400).json({ message: 'Ошибка уникальности данных (возможно, email уже занят)' });
         }
        res.status(500).json({ message: 'Ошибка сервера при обновлении пользователя' });
    }
};
// -------------------------------------------------------

// --- НОВАЯ ФУНКЦИЯ: Удаление пользователя (Админом) ---
exports.deleteUser = async (req, res) => {
    const userIdToDelete = parseInt(req.params.id, 10);
    const adminUserId = req.user.id;

    // Запрещаем админу удалять самого себя
    if (userIdToDelete === adminUserId) {
        return res.status(403).json({ message: 'Администратор не может удалить сам себя.' });
    }

    try {
        const userToDelete = await User.findByPk(userIdToDelete);
        if (!userToDelete) {
            return res.status(404).json({ message: 'Пользователь для удаления не найден.' });
        }

        // ВАЖНО: Продумайте последствия удаления!
        // Что происходит с записями (мероприятия, документы, отчеты),
        // где этот user_id используется как внешний ключ?
        // В схеме БД должно быть настроено ON DELETE SET NULL или ON DELETE CASCADE,
        // иначе удаление может вызвать ошибку внешнего ключа.
        // Возможно, перед удалением нужна доп. логика (например, переназначение записей).

        await userToDelete.destroy();

        res.status(204).send(); // Успех, нет контента

    } catch (error) {
        console.error(`Error deleting user ${userIdToDelete}:`, error);
        // Обработка ошибки внешнего ключа
        if (error.name === 'SequelizeForeignKeyConstraintError') {
             return res.status(400).json({ message: 'Невозможно удалить пользователя, так как с ним связаны другие записи (мероприятия, отчеты и т.д.). Сначала удалите или переназначьте их.' });
        }
        res.status(500).json({ message: 'Ошибка сервера при удалении пользователя' });
    }
};