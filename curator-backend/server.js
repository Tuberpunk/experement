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