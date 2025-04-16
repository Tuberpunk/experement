// src/models/Document.js
const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const Document = sequelize.define('Document', {
    docId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'doc_id'
    },
    title: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    docUrl: {
        type: DataTypes.TEXT, // Используем TEXT для потенциально длинных URL
        allowNull: false,
        field: 'doc_url',
        validate: {
            isUrl: true // Проверка URL
        }
    },
    uploadedAt: {
        type: DataTypes.DATE,
        field: 'uploaded_at',
        defaultValue: Sequelize.NOW
    },
    uploadedByUserId: { // Внешний ключ к User (Кто загрузил)
        type: DataTypes.INTEGER,
        allowNull: true, // Или false, если загрузивший обязателен
        field: 'uploaded_by_user_id'
        // references: { model: 'users', key: 'user_id' } // Связь в index.js
    }
}, {
    tableName: 'documents',
    timestamps: false // Используем свое поле uploadedAt
});

module.exports = Document;