// src/models/CuratorReport.js
const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const CuratorReport = sequelize.define('CuratorReport', {
    reportId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'report_id'
    },
    curatorUserId: { // Внешний ключ к User (Куратор)
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'curator_user_id'
        // references: { model: 'users', key: 'user_id' } // Связь в index.js
    },
    reportTitle: {
        type: DataTypes.STRING(500),
        allowNull: false,
        field: 'report_title'
    },
    reportDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'report_date'
    },
    locationText: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'location_text'
    },
    directionText: { // Можно заменить на FK direction_id
        type: DataTypes.STRING,
        allowNull: true,
        field: 'direction_text'
    },
    invitedGuestsInfo: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'invited_guests_info'
    },
    foreignerCount: {
        type: DataTypes.INTEGER,
        allowNull: true, // Разрешаем NULL, если не указано
        defaultValue: 0,
        field: 'foreigner_count'
    },
    minorCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        field: 'minor_count'
    },
    durationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'duration_minutes'
    },
    mediaReferences: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'media_references'
    },
    eventId: { // Внешний ключ к Event (опционально)
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'event_id'
        // references: { model: 'events', key: 'event_id' } // Связь в index.js
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: Sequelize.NOW
    }
    // updatedAt не было в SQL
}, {
    tableName: 'curator_reports',
    timestamps: true, // Включаем createdAt
    updatedAt: false, // Отключаем updatedAt
    createdAt: 'created_at'
});

module.exports = CuratorReport;