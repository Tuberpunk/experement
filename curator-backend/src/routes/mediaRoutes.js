// src/routes/mediaRoutes.js
const express = require('express');
const mediaController = require('../controllers/mediaController');
const upload = require('../middleware/upload'); // Наш настроенный multer
const { authenticateToken } = require('../middleware/auth'); // Защищаем роут

const router = express.Router();

// POST /api/media/upload
router.post(
    '/upload',
    authenticateToken, // Только авторизованные пользователи
    upload.single('mediaFile'), // Middleware multer для одного файла с именем поля 'mediaFile'
    mediaController.uploadMedia // Контроллер, который вызовется ПОСЛЕ загрузки файла
);

module.exports = router;