const { Sequelize } = require('sequelize');
// require('dotenv').config(); // .env нужен в основном для локальной разработки, Render использует свои переменные окружения

// Проверяем, есть ли DATABASE_URL
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.');
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres', // Явно указываем протокол
    logging: false, // Отключить логирование SQL (или настроить по желанию)
    dialectOptions: {
        ssl: {
            require: true, // Часто требуется для подключения к БД на Render
            rejectUnauthorized: false // Может понадобиться, если Render использует самоподписанные сертификаты (проверьте документацию Render)
        }
    },
    define: {
        timestamps: true,
        underscored: true,
    }
});

module.exports = sequelize;



/*
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
*/