const express = require('express');
const path = require('path'); // Используем path для express.static
const cors = require('cors');
const { sequelize } = require('./models'); // Импорт экземпляра sequelize из models/index.js

// --- Импорт маршрутов ---
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const lookupRoutes = require('./routes/lookupRoutes');
// const reportRoutes = require('./routes/reportRoutes'); // Если у вас есть отдельный файл для /api/reports
const mediaRoutes = require('./routes/mediaRoutes');
const studentGroupRoutes = require('./routes/studentGroupRoutes');
const studentRoutes = require('./routes/studentRoutes');
const curatorReportRoutes = require('./routes/curatorReportRoutes');
const meRoutes = require('./routes/meRoutes'); // Маршруты для /api/me
const userRoutes = require('./routes/userRoutes'); // Маршруты для /api/users
const adminRoutes = require('./routes/adminRoutes'); // Маршруты для /api/admin
const documentRoutes = require('./routes/documentRoutes');
// --- Импорт планировщиков задач ---
const { startScheduler: startEventScheduler } = require('./services/eventStatusUpdater');
const { startStudentDataScheduler } = require('./services/studentDataUpdater');

const app = express();

// --- Middleware ---
app.use(cors()); // Включаем CORS для всех запросов
app.use(express.json()); // Для парсинга JSON-тел запросов
app.use(express.urlencoded({ extended: true })); // Для парсинга URL-кодированных тел

// --- Настройка для отдачи статических файлов (загруженные медиа) ---
// Папка uploads/media будет доступна по URL /media
// __dirname здесь будет указывать на src, поэтому поднимаемся на уровень выше
app.use('/media', express.static(path.join(__dirname, '../uploads/media')));

// --- Регистрация Маршрутов API ---
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/lookups', lookupRoutes);
// app.use('/api/reports', reportRoutes); // Если есть, раскомментируйте
app.use('/api/media', mediaRoutes);
app.use('/api/groups', studentGroupRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/curator-reports', curatorReportRoutes);
app.use('/api/me', meRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/documents', documentRoutes);

// --- Обработчик для несуществующих маршрутов (404) ---
app.use((req, res, next) => {
    res.status(404).json({ message: 'Запрашиваемый ресурс не найден' });
});

// --- Глобальный обработчик ошибок (должен быть последним middleware) ---
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Global error handler:', err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Внутренняя ошибка сервера',
        // В режиме разработки можно возвращать стек ошибки
        // error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// --- Запуск сервера и инициализация БД ---
const PORT = process.env.PORT || 5000; // Берем порт из .env или по умолчанию 5000

sequelize.authenticate()
    .then(() => {
        console.log('Database connection established successfully.');
        // В разработке можно использовать sync для создания/обновления таблиц.
        // В продакшене лучше использовать миграции.
        // force: true - удалит таблицы и создаст заново (ПОТЕРЯ ДАННЫХ!)
        // alter: true - попытается изменить таблицы для соответствия моделям (может быть опасно)
        return sequelize.sync({ force: false }); // force: false - не удаляет таблицы, если они есть
    })
    .then(() => {
        console.log('Database synchronized successfully.');
        // Запускаем сервер Express ПОСЛЕ успешной синхронизации с БД
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}. Uploads accessible at /media`);

            // --- Запускаем планировщики задач ПОСЛЕ старта сервера ---
            console.log('Starting event status update scheduler...');
            startEventScheduler();

            console.log('Starting student data update scheduler...');
            startStudentDataScheduler();
            // -------------------------------------------------------
        });
    })
    .catch(err => {
        console.error('Unable to connect to or sync the database:', err);
        // При критической ошибке подключения к БД можно завершить процесс
        // process.exit(1);
    });

module.exports = app;