// src/middleware/roleCheck.js

// Проверка, что пользователь имеет роль 'curator'
exports.isCurator = (req, res, next) => {
    // req.user добавляется middleware authenticateToken
    if (req.user && req.user.role === 'curator') {
        next(); // Роль подходит, пропускаем дальше
    } else {
        res.status(403).json({ message: 'Доступ запрещен: требуется роль куратора' });
    }
};

// Можно добавить и другие проверки ролей по аналогии, если нужно
// exports.isStudentOrganizer = (req, res, next) => { ... };