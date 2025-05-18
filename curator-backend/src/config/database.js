    // Полный путь: src/config/database.js
    const { Sequelize } = require('sequelize');
    // require('dotenv').config(); // Загружается в server.js или при запуске тестов

    let connectionUrl;
    let enableSsl = false; // Флаг для SSL, по умолчанию выключен для локальной разработки/тестов

    // Логика определения URL подключения
    if (process.env.NODE_ENV === 'test') {
        console.log('INFO: Using TEST database URL (DATABASE_URL_TEST).');
        connectionUrl = process.env.DATABASE_URL_TEST;
        if (!connectionUrl) {
            // Эта ошибка указывает, что переменная для тестовой БД не задана
            throw new Error('DATABASE_URL_TEST environment variable is not set for test environment.');
        }
    } else {
        // Для разработки или продакшена (если Render/Heroku устанавливают DATABASE_URL)
        console.log('INFO: Using REGULAR database URL (DATABASE_URL).');
        connectionUrl = process.env.DATABASE_URL;
        if (!connectionUrl) {
            throw new Error('DATABASE_URL environment variable is not set.');
        }
        // SSL обычно нужен для продакшн БД в облаке
        if (process.env.NODE_ENV === 'production' && connectionUrl.includes('render.com')) { // Пример для Render
             console.log('INFO: Enabling SSL for production database on Render.');
             enableSsl = true;
        }
    }

    const sequelizeOptions = {
        dialect: 'postgres',
        protocol: 'postgres',
        logging: process.env.NODE_ENV === 'test' ? false : (msg) => console.log(`[SEQUELIZE] ${msg}`), // Отключаем логи SQL в тестах
        define: {
            timestamps: true,
            underscored: true,
        }
    };

    if (enableSsl) {
        sequelizeOptions.dialectOptions = {
            ssl: {
                require: true,
                rejectUnauthorized: false // Для Render может потребоваться
            }
        };
    }

    const sequelize = new Sequelize(connectionUrl, sequelizeOptions);
    logging: console.log,
    
    module.exports = sequelize;
    