const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventLevel = sequelize.define('EventLevel', {
    levelId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'level_id'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'event_levels',
    timestamps: false
});

module.exports = EventLevel;