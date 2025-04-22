// Полный путь: src/controllers/mediaController.js
const { User } = require('../models'); // Импортируем User, если нужно связать файл с пользователем (пока не используется)

// Обновленная функция для определения типа медиа
const getMediaType = (mimetype = '') => {
    if (mimetype.startsWith('image/')) {
        return 'photo';
    } else if (mimetype.startsWith('video/')) {
        return 'video';
    } else if (mimetype === 'application/pdf') { // <-- Добавлена проверка PDF
         return 'document'; // Возвращаем общий тип 'document'
    } else if (
        // Можно добавить другие типы документов из middleware/upload.js
        mimetype.startsWith('application/msword') ||
        mimetype.startsWith('application/vnd.openxmlformats-officedocument.wordprocessingml') ||
        mimetype.startsWith('application/vnd.ms-excel') ||
        mimetype.startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml') ||
        mimetype.startsWith('application/vnd.ms-powerpoint') ||
        mimetype.startsWith('application/vnd.openxmlformats-officedocument.presentationml') ||
        mimetype.startsWith('text/') ||
        mimetype.startsWith('application/rtf')
    ) {
         return 'document'; // Тоже 'document'
    }
    // Если тип неизвестен, но файл прошел фильтр multer,
    // можно вернуть 'file' или оставить 'unknown' для дальнейшей обработки
    console.warn(`Unknown MIME type passed filter: ${mimetype}`);
    return 'file'; // Возвращаем общий тип 'file'
};

// Обработчик загрузки медиафайла
exports.uploadMedia = (req, res) => {
    // Файл должен быть уже загружен middleware multer и доступен в req.file
    if (!req.file) {
        // Эта проверка на случай, если что-то пошло не так до fileFilter
        return res.status(400).json({ success: false, message: 'Файл не был загружен.' });
    }

    // Логируем информацию о загруженном файле для отладки
    console.log('File uploaded via multer:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
    });


    try {
        // Определяем тип медиа с помощью обновленной функции
        const mediaType = getMediaType(req.file.mimetype);

        // Проверяем, удалось ли определить тип (теперь file или document тоже допустимы)
        // Оставляем 'unknown' как индикатор проблемы, если getMediaType его вернул
        if (mediaType === 'unknown') {
             console.error(`Could not determine media type for uploaded file with MIME: ${req.file.mimetype}`);
             // Важно: Не удаляем файл, т.к. он уже загружен multer'ом на диск
             return res.status(400).json({ success: false, message: 'Не удалось определить тип загруженного файла.' });
        }

        // Формируем относительный URL для доступа к файлу через статический сервер
        const mediaUrl = `/media/${req.file.filename}`;

        // Возвращаем успешный ответ, который ожидает фронтенд (FileUploader)
        res.status(201).json({ // 201 Created - ресурс (файл) создан
            success: true,
            message: 'Файл успешно загружен',
            mediaUrl: mediaUrl, // Относительный URL для использования фронтендом
            mediaType: mediaType, // 'photo', 'video', 'document', 'file'
            filename: req.file.originalname, // Оригинальное имя файла
            savedFilename: req.file.filename // Имя файла на сервере (для возможных будущих операций)
        });

    } catch (error) {
         console.error("Error processing uploaded file in controller:", error);
         // Здесь файл уже на диске. В идеале, нужна логика для удаления "осиротевших" файлов при ошибке.
         res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера при обработке файла.' });
    }
};