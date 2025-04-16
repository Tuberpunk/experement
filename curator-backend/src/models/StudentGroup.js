// src/models/StudentGroup.js
const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const StudentGroup = sequelize.define('StudentGroup', {
    groupId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'group_id'
    },
    groupName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'group_name'
    },
    curatorUserId: { // Внешний ключ к User (Куратор)
        type: DataTypes.INTEGER,
        allowNull: true, // Может ли быть группа без куратора? Решите сами.
        field: 'curator_user_id'
        // references: { model: 'users', key: 'user_id' } // Связь настраивается в index.js
    },
    faculty: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    admissionYear: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'admission_year'
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: Sequelize.NOW
    }
    // updatedAt не было в SQL, отключаем или добавляем
}, {
    tableName: 'student_groups',
    timestamps: true, // Включаем createdAt
    updatedAt: false, // Отключаем updatedAt, если его нет в БД
    createdAt: 'created_at'
});

module.exports = StudentGroup;