// src/controllers/mediaController.js

// Функция для определения типа медиа
const getMediaType = (mimetype) => {
    if (mimetype.startsWith('image/')) {
        return 'photo';
    } else if (mimetype.startsWith('video/')) {
        return 'video';
    }
    return 'unknown'; // Или выбросить ошибку
};

exports.uploadMedia = (req, res) => {
    // Файл был успешно загружен multer и доступен в req.file
    if (!req.file) {
        // Эта ошибка обычно обрабатывается fileFilter в multer, но добавим проверку
        return res.status(400).json({ success: false, message: 'Файл не был загружен или не прошел фильтрацию.' });
    }

    try {
        const mediaType = getMediaType(req.file.mimetype);
        if (mediaType === 'unknown') {
             // Дополнительная проверка, хотя fileFilter должен был это отсечь
             return res.status(400).json({ success: false, message: 'Не удалось определить тип медиафайла.' });
        }

        // Формируем URL для доступа к файлу
        // Предполагается, что папка /uploads/media/ будет доступна по URL /media/
        // Например: http://localhost:5000/media/mediaFile-xxxxxxxx.jpg
        const mediaUrl = `/media/${req.file.filename}`; // Относительный URL

        // Возвращаем успешный ответ с нужными данными
        res.status(201).json({ // 201 Created
            success: true,
            message: 'Файл успешно загружен',
            mediaUrl: mediaUrl, // URL для доступа к файлу
            mediaType: mediaType,
            filename: req.file.originalname, // Оригинальное имя файла
            savedFilename: req.file.filename // Имя файла на сервере
        });

    } catch (error) {
         console.error("Error processing uploaded file:", error);
         // Важно: Если файл уже сохранен multer'ом, но тут произошла ошибка,
         // возможно, стоит удалить файл с диска. (Пропущено для простоты)
         res.status(500).json({ success: false, message: 'Ошибка сервера при обработке файла.' });
    }
};