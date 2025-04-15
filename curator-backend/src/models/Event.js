const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const Event = sequelize.define('Event', {
    eventId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'event_id'
    },
    title: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    directionId: { // Внешний ключ для EventDirection
        type: DataTypes.INTEGER,
        allowNull: true, // Или false, если обязательно
        field: 'direction_id'
    },
    levelId: { // Внешний ключ для EventLevel
        type: DataTypes.INTEGER,
        allowNull: true, // Или false, если обязательно
        field: 'level_id'
    },
    formatId: { // Внешний ключ для EventFormat
        type: DataTypes.INTEGER,
        allowNull: true, // Или false, если обязательно
        field: 'format_id'
    },
    startDate: {
        type: DataTypes.DATEONLY, // Используем DATEONLY для хранения только даты
        allowNull: false,
        field: 'start_date'
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'end_date'
    },
    locationText: {
        type: DataTypes.TEXT,
        field: 'location_text'
    },
    addressText: {
        type: DataTypes.TEXT,
        field: 'address_text'
    },
    participantsInfo: {
        type: DataTypes.TEXT,
        field: 'participants_info'
    },
    participantCount: {
        type: DataTypes.INTEGER,
        field: 'participant_count'
    },
    hasForeigners: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'has_foreigners'
    },
    foreignerCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'foreigner_count'
    },
    hasMinors: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'has_minors'
    },
    minorCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'minor_count'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            len: {
                args: [100, Infinity], // [16, 28, 38, 49] Минимум 100 символов
                msg: "Описание должно содержать не менее 100 символов"
            }
        }
    },
    responsibleFullName: { // [27, 48]
        type: DataTypes.STRING,
        allowNull: false, // Сделаем обязательным по ТЗ
        field: 'responsible_full_name'
    },
    responsiblePosition: { // [27, 48]
        type: DataTypes.STRING,
        field: 'responsible_position'
    },
    responsiblePhone: { // [28, 49]
        type: DataTypes.STRING(50),
        field: 'responsible_phone'
        // Можно добавить валидацию формата телефона
    },
    responsibleEmail: { // [28]
        type: DataTypes.STRING,
        field: 'responsible_email',
        validate: {
            isEmail: true // Валидация email
        }
    },
    fundingAmount: { // [28]
        type: DataTypes.DECIMAL(12, 2),
        field: 'funding_amount'
    },
    status: { // [16]
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'Запланировано',
        validate: {
            isIn: [['Запланировано', 'Проведено', 'Не проводилось (Отмена)']]
        }
    },
    createdByUserId: { // Внешний ключ для User [4, 36]
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'created_by_user_id'
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
    }
}, {
    tableName: 'events',
    timestamps: true, // Используем createdAt и updatedAt
    updatedAt: 'updatedAt', // Явно указываем поле для Sequelize
    createdAt: 'createdAt'
});

module.exports = Event;