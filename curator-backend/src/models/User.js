// Полный путь: src/models/User.js

const { DataTypes, Sequelize } = require('sequelize'); // Добавлен Sequelize для defaultValue
const sequelize = require('../config/database'); // Путь к вашей конфигурации Sequelize
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
    // Атрибуты модели (поля таблицы)
    userId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'user_id' // Явное указание имени столбца в БД
    },
    email: {
        type: DataTypes.STRING, // VARCHAR(255) по умолчанию
        allowNull: false,
        unique: true,
        validate: {
            isEmail: {
                msg: "Пожалуйста, введите корректный email адрес"
            }
        }
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'password_hash'
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'full_name'
    },
    position: {
        type: DataTypes.STRING,
        allowNull: true // Должность может быть необязательной
    },
    phoneNumber: {
        type: DataTypes.STRING(50), // Можно ограничить длину
        allowNull: true,
        field: 'phone_number'
    },
    roleId: {
        type: DataTypes.INTEGER,
        allowNull: false, // Каждый пользователь должен иметь роль
        field: 'role_id'
        // Внешний ключ настраивается через ассоциации в models/index.js
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true, // Новые пользователи активны по умолчанию
        allowNull: false,
        field: 'is_active'
    },
    department: {
        type: DataTypes.STRING,
        allowNull: true // Подразделение может быть необязательным
    },
    createdAt: { // Явно определяем createdAt для надежности
        allowNull: false,
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: Sequelize.NOW // Автоматически устанавливать время создания
    }
    // Поле updatedAt не определяем здесь, так как мы его отключаем ниже
}, {
    // Опции модели
    tableName: 'users',
    timestamps: true,
    updatedAt: false, // Если вы не используете updatedAt
    createdAt: 'created_at',

    hooks: {
        beforeCreate: async (userInstance) => {
            // Хешируем пароль, если он передан в passwordHash при создании
            if (userInstance.passwordHash) {
                const salt = await bcrypt.genSalt(10);
                userInstance.passwordHash = await bcrypt.hash(userInstance.passwordHash, salt);
            }
        },
        beforeUpdate: async (userInstance) => {
            // Хешируем пароль, если поле passwordHash было изменено
            // (и предполагаем, что в него передали новый сырой пароль)
            if (userInstance.changed('passwordHash') && userInstance.passwordHash) {
                const salt = await bcrypt.genSalt(10);
                userInstance.passwordHash = await bcrypt.hash(userInstance.passwordHash, salt);
            }
        }
    }        
    
});

// Метод экземпляра для проверки пароля
User.prototype.isValidPassword = async function(password) {
    if (!this.passwordHash || !password) {
        return false; // Нельзя сравнить, если чего-то нет
    }
    try {
        return await bcrypt.compare(password, this.passwordHash);
    } catch (error) {
        console.error("Error comparing password:", error);
        return false;
    }
};

// Важно: Ассоциации (связи) должны определяться в `src/models/index.js`
// User.associate = (models) => { ... }; // Эту часть убираем отсюда

module.exports = User; // Экспортируем модель