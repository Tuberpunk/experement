// src/middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ message: 'Отсутствует токен аутентификации' });

    jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
        if (err) {
            console.error("JWT Verification Error:", err.message);
            return res.status(403).json({ message: 'Невалидный или истекший токен' });
        }
        // Добавляем данные пользователя в объект запроса
        // Убедимся, что payload содержит id и role
        if (!userPayload.user || !userPayload.user.id || !userPayload.user.role) {
             console.error("JWT Payload Error: Missing user data", userPayload);
             return res.status(403).json({ message: 'Ошибка в данных токена' });
        }
        req.user = userPayload.user;
        next();
    });
}

function isAdmin(req, res, next) {
    if (req.user && req.user.role === 'administrator') {
        next();
    } else {
        res.status(403).json({ message: 'Доступ запрещен: требуется роль администратора' });
    }
}

// Middleware для проверки, является ли пользователь создателем ресурса ИЛИ админом
// (требует, чтобы ресурс был загружен и прикреплен к req, например req.event)
function isCreatorOrAdmin(resourceName = 'event') {
    return (req, res, next) => {
        const resource = req[resourceName]; // Получаем ресурс (например, req.event)

        if (!resource) {
            console.error(`isCreatorOrAdmin Error: Resource "${resourceName}" not found on request object.`);
            return res.status(500).json({ message: 'Ошибка сервера при проверке прав доступа' });
        }

        // Проверяем ID создателя ресурса
        // Убедитесь, что в вашей модели поле называется createdByUserId
        const creatorId = resource.createdByUserId;

        if (!creatorId) {
             console.error(`isCreatorOrAdmin Error: Resource "${resourceName}" does not have a "createdByUserId" property.`);
            return res.status(500).json({ message: 'Ошибка сервера при проверке прав доступа' });
        }

        if (req.user && (req.user.role === 'administrator' || req.user.id === creatorId)) {
            next(); // Разрешить доступ админу ИЛИ создателю
        } else {
            res.status(403).json({ message: 'Доступ запрещен: вы не являетесь создателем ресурса или администратором' });
        }
    };
}


module.exports = {
    authenticateToken,
    isAdmin,
    isCreatorOrAdmin // Экспортируем новую функцию
};