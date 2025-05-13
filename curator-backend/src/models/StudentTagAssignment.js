// src/models/StudentTagAssignment.js
const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const StudentTagAssignment = sequelize.define('StudentTagAssignment', {
    // Sequelize автоматически добавит student_id и tag_id как внешние ключи
    // при настройке связей belongsToMany с использованием { through: Model }
    studentId: { // Определяем явно для ясности и возможности ссылаться
      type: DataTypes.INTEGER,
      primaryKey: true, // Часть составного ключа
      field: 'student_id'
    },
    tagId: { // Определяем явно
      type: DataTypes.INTEGER,
      primaryKey: true, // Часть составного ключа
      field: 'tag_id'
    },
    assignmentDate: {
        type: DataTypes.DATE,
        field: 'assignment_date',
        defaultValue: Sequelize.NOW
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'student_tag_assignments',
    timestamps: false // Используем свое поле assignmentDate
});

module.exports = StudentTagAssignment;