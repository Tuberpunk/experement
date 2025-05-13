// Полный путь: src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '../../uploads/media'); // Убедитесь, что путь верный

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

// Фильтр файлов (РАСШИРЕННЫЙ)
const fileFilter = (req, file, cb) => {
    // Добавляем application/pdf и другие нужные MIME типы документов
    const allowedMimes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', // Картинки
        'video/mp4', 'video/webm', 'video/quicktime',       // Видео

        // --- ДОКУМЕНТЫ ---
        'application/pdf',                                  // PDF
        'application/msword',                               // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.ms-excel',                         // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-powerpoint',                    // .ppt
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'text/plain',                                       // .txt
        'application/rtf'                                   // .rtf
        // --- Добавьте другие нужные типы при необходимости ---
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true); // Принять файл
    } else {
        // Отклонить файл с обновленной ошибкой
        console.warn(`Upload rejected: File type ${file.mimetype} not allowed.`); // Логируем для отладки
        cb(new Error('Неподдерживаемый тип файла. Разрешены изображения, видео, PDF, документы MS Office, TXT, RTF.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 50 // Лимит 50MB
    },
    fileFilter: fileFilter // Используем обновленный фильтр
});

module.exports = upload;