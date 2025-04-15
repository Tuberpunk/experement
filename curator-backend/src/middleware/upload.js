// src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto'); // Для генерации уникальных имен

// Определяем путь для сохранения файлов
const uploadDir = path.join(__dirname, '../../uploads/media'); // Путь относительно текущего файла

// Настройка хранилища (diskStorage)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Указываем папку для сохранения
    },
    filename: function (req, file, cb) {
        // Генерируем уникальное имя файла, сохраняя расширение
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const extension = path.extname(file.originalname); // Получаем расширение файла
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

// Фильтр файлов (принимаем только изображения и видео)
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true); // Принять файл
    } else {
        // Отклонить файл с ошибкой
        cb(new Error('Неподдерживаемый тип файла. Разрешены только изображения и видео.'), false);
    }
};

// Создаем экземпляр multer с настройками
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 50 // Лимит размера файла (например, 50MB)
    },
    fileFilter: fileFilter
});

module.exports = upload;