// src/routes/studentRoutes.js
const express = require('express');
const studentController = require('../controllers/studentController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Получение списка (все авторизованные)
router.get('/', authenticateToken, studentController.getAllStudents);

// Создание (только админ)
router.post('/', authenticateToken, isAdmin, studentController.createStudent);

// Получение одного (все авторизованные)
router.get('/:id', authenticateToken, studentController.loadStudent, studentController.getStudentById);

// Обновление (только админ)
router.put('/:id', authenticateToken, isAdmin, studentController.loadStudent, studentController.updateStudent);

// Удаление (только админ)
router.delete('/:id', authenticateToken, isAdmin, studentController.loadStudent, studentController.deleteStudent);

module.exports = router;