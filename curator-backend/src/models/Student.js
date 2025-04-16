// src/models/Student.js
const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const Student = sequelize.define('Student', {
    studentId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'student_id'
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'full_name'
    },
    dateOfBirth: {
        type: DataTypes.DATEONLY, // Храним только дату
        allowNull: true,
        field: 'date_of_birth'
    },
    groupId: { // Внешний ключ к StudentGroup
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'group_id'
        // references: { model: 'student_groups', key: 'group_id' } // Связь в index.js
    },
    phoneNumber: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'phone_number'
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true, // Email студента должен быть уникальным, если не NULL
        validate: {
            isEmail: true
        }
    },
    studentCardNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        field: 'student_card_number'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: Sequelize.NOW
    }
    // updatedAt не было в SQL
}, {
    tableName: 'students',
    timestamps: true, // Включаем createdAt
    updatedAt: false, // Отключаем updatedAt
    createdAt: 'created_at'
});

module.exports = Student;