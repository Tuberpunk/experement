const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        logging: false, // Отключить логирование SQL в консоль (или настроить)
        define: {
            timestamps: true, // Добавлять createdAt, updatedAt
            underscored: true, // Использовать snake_case для авто-генерируемых полей (foreign keys)
        }
    }
);

module.exports = sequelize;