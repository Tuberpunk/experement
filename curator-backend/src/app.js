// Полный путь: src/app.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const { sequelize } = require('./models'); // Импорт из index.js

// Импорт всех роутов
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const lookupRoutes = require('./routes/lookupRoutes');
const reportRoutes = require('./routes/reportRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const studentGroupRoutes = require('./routes/studentGroupRoutes');
const studentRoutes = require('./routes/studentRoutes');
const curatorReportRoutes = require('./routes/curatorReportRoutes');
const meRoutes = require('./routes/meRoutes'); // <-- Импорт новых роутов /me
const userRoutes = require('./routes/userRoutes');
const documentRoutes = require('./routes/documentRoutes');
const adminRoutes = require('./routes/adminRoutes');
// В начале компонента EventDetailPage или в отдельном конфигурационном файле
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статика для загруженных файлов
app.use('/media', express.static(path.join(__dirname, '../uploads/media')));

// Регистрация Роутов
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/lookups', lookupRoutes);
app.use('/api/reports', reportRoutes); // Возможно, стоит переименовать, если мешает /api/curator-reports
app.use('/api/media', mediaRoutes);
app.use('/api/groups', studentGroupRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/curator-reports', curatorReportRoutes);
app.use('/api/me', meRoutes); // <-- Регистрация новых роутов /me
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);

// Обработчики ошибок 404 и глобальный (должны быть в конце)
// app.use((req, res, next) => { ... }); // 404 handler
// app.use((err, req, res, next) => { ... }); // Global error handler


// Запуск сервера (с проверкой и синхронизацией БД для разработки)
const PORT = process.env.PORT || 5000;
sequelize.authenticate()
    .then(() => {
        console.log('Database connection established successfully.');
        // В разработке можно использовать sync, но в продакшене - миграции!
        // return sequelize.sync({ force: false, alter: process.env.NODE_ENV !== 'production' }); // alter: true - опасно
        return sequelize.sync({ force: false }); // Простой sync
    })
    .then(() => {
        console.log('Database synchronized successfully.');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}. Uploads accessible at /media`));
    })
    .catch(err => {
        console.error('Unable to connect to or sync the database:', err);
        // В случае критической ошибки можно завершить процесс
        // process.exit(1);
    });

module.exports = app; // Экспорт для server.js