require('dotenv').config();

// 2. Запускаем основное приложение (которое само подключится к БД и запустит сервер)
require('./src/app');

const app = require('./src/app'); // Запускаем основной app.js
const { startScheduler } = require('./src/services/eventStatusUpdater'); // Импорт планировщика

// Получаем порт из app или .env (убедитесь, что он доступен)
const PORT = process.env.PORT || 5000;

// Запускаем сервер (слушаем порт)
// Логика запуска может быть внутри app.js, тогда нужно будет
// вызывать startScheduler после app.listen там.
// Если app.listen вызывается ЗДЕСЬ:
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}. Uploads accessible at /media`);
    console.log('Starting scheduler...');
    // Запускаем планировщик ПОСЛЕ старта сервера
    startScheduler();
});

// Обработка ошибок запуска сервера (если есть)
server.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

console.log('[Server] Загрузка dotenv...');
// Сначала загружаем переменные окружения
require('dotenv').config();
console.log('[Server] dotenv загружен.');
// Проверяем, загрузилась ли ПЕРЕД require('./src/app')
console.log('[Server] Проверка DATABASE_URL до загрузки app:', process.env.DATABASE_URL ? 'УСТАНОВЛЕНА' : 'НЕ УСТАНОВЛЕНА!');

console.log('[Server] Загрузка основного приложения app...');
// Затем подключаем и запускаем основное приложение из папки src
try {
    require('./src/app');
    console.log('[Server] Основное приложение app успешно загружено (require выполнен).');
    // Примечание: Сообщение о запуске сервера (app.listen) будет выведено из app.js
} catch (error) {
    console.error('[Server] Ошибка при require("./src/app"):', error);
    // Если ошибка здесь, проблема в синтаксисе или зависимостях внутри app.js или его импортов
}
