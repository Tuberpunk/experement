const express = require('express');
const path = require('path');
const cors = require('cors');
const { sequelize } = require('./models');

// ... (Импорт других роутов: authRoutes, eventRoutes, lookupRoutes, reportRoutes) ...
const mediaRoutes = require('./routes/mediaRoutes'); // <-- Импорт нового роута
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const lookupRoutes = require('./routes/lookupRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Для обработки данных формы, если понадобится

// --- Настройка для отдачи загруженных файлов ---
// Делаем папку uploads/media доступной по URL /media
// __dirname - текущая директория (где находится app.js)
app.use('/media', express.static(path.join(__dirname, '../uploads/media')));
// Убедитесь, что путь '../uploads/media' правильный относительно app.js

// Роуты
app.use('/api/auth', authRoutes);         // Теперь authRoutes определена
app.use('/api/events', eventRoutes);       // Теперь eventRoutes определена
app.use('/api/lookups', lookupRoutes);     // Теперь lookupRoutes определена
app.use('/api/reports', reportRoutes);     // Теперь reportRoutes определена
app.use('/api/media', mediaRoutes);

// ... (Обработка ошибок 404, глобальный обработчик ошибок) ...

// Запуск сервера
const PORT = process.env.PORT || 5000;
sequelize.authenticate()
    .then(() => {
        console.log('Database connection established successfully.');
         // Добавьте или раскомментируйте эту строку ТОЛЬКО для разработки
         //return sequelize.sync({ force: false }); // force: false - не удаляет таблицы, если они есть
     })
    .then(() => {
        console.log('Sync skipped, proceeding to listen...');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.error('Unable to connect or sync database:', err));

module.exports = app;