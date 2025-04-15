const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventDirection = sequelize.define('EventDirection', {
    directionId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'direction_id'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'event_directions',
    timestamps: false
});

module.exports = EventDirection;