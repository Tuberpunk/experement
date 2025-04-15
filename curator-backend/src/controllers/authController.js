// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User, Role } = require('../models');
require('dotenv').config();

// --- Заглушка/Импорт сервиса отправки email ---
const sendAdminNotification = async (subject, text) => {
    console.log(`--- Sending Admin Notification ---`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text}`);
    console.log(`---------------------------------`);
    return Promise.resolve();
};
// -------------------------------------------

// --- Регистрация пользователя (ВСЕГДА КАК КУРАТОР) ---
exports.register = async (req, res) => {
    // Данные из запроса (без roleName)
    const {
        email,
        password,
        fullName,
        position,
        phoneNumber,
        department
    } = req.body;

    // Роль жестко задана
    const fixedRoleName = 'curator';

    // Валидация входных данных
    if (!email || !password || !fullName) {
        return res.status(400).json({ message: 'Email, пароль и ФИО обязательны для регистрации' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Пароль должен быть не менее 6 символов' });
    }

    try {
        // 1. Проверка существующего email
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
        }

        // 2. Поиск ID роли 'curator'
        const role = await Role.findOne({ where: { roleName: fixedRoleName } });
        if (!role) {
            // Эта ошибка критична - роль 'curator' ДОЛЖНА быть в БД
            console.error(`CRITICAL Registration Error: Default role "${fixedRoleName}" not found in database!`);
            return res.status(500).json({ message: 'Ошибка конфигурации ролей на сервере.' });
        }

        // 3. Создание пользователя
        const newUser = await User.create({
            email,
            passwordHash: password, // Хешируется хуком
            fullName,
            position,
            phoneNumber,
            department,
            roleId: role.roleId, // Используем ID роли 'curator'
            isActive: true
        });

        // 4. Отправка уведомления администратору
        sendAdminNotification(
            `Новый пользователь зарегистрирован: ${newUser.email}`,
            `Зарегистрирован новый пользователь:\nEmail: ${newUser.email}\nФИО: ${newUser.fullName}\nРоль: ${fixedRoleName}` // Указываем назначенную роль
        ).catch(emailError => {
            console.error(`Failed to send admin notification email for ${newUser.email}:`, emailError);
        });

        // 5. Отправка успешного ответа
        res.status(201).json({ message: 'Пользователь успешно зарегистрирован (как Куратор)' });

    } catch (error) {
        console.error("Register controller error:", error);
        if (error.name === 'SequelizeValidationError') {
           return res.status(400).json({ message: "Ошибка валидации данных", errors: error.errors.map(e => ({ field: e.path, message: e.message })) });
        }
        res.status(500).json({ message: 'Внутренняя ошибка сервера при регистрации' });
    }
};


// --- Вход пользователя (exports.login) ---
// Функция login остается без изменений
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email и пароль обязательны' });
    }

    try {
        const user = await User.findOne({
            where: { email, isActive: true },
            include: [{ model: Role, as: 'Role', attributes: ['roleName'] }]
        });

        if (!user) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }

        const isMatch = await user.isValidPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }

        if (!user.Role || !user.Role.roleName) {
             console.error(`Login Error: User ${user.userId} has missing Role information.`);
             return res.status(500).json({ message: 'Ошибка данных пользователя.' });
        }

        const payload = { user: { id: user.userId, email: user.email, role: user.Role.roleName } };
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("JWT_SECRET is not defined in .env file!");
            return res.status(500).json({ message: "Ошибка конфигурации сервера." });
        }

        jwt.sign(payload, jwtSecret, { expiresIn: '2h' }, (err, token) => {
            if (err) {
                console.error("Error signing JWT:", err);
                return res.status(500).json({ message: "Не удалось создать токен." });
            }
            res.json({
                token,
                user: {
                    id: user.userId, email: user.email, fullName: user.fullName, role: user.Role.roleName
                }
            });
        });

    } catch (error) {
        console.error("Login controller error:", error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при входе' });
    }
};