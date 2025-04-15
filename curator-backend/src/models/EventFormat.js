const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventFormat = sequelize.define('EventFormat', {
    formatId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'format_id'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'event_formats',
    timestamps: false
});

module.exports = EventFormat;