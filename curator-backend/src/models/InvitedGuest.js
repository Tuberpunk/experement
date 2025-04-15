const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvitedGuest = sequelize.define('InvitedGuest', {
    guestId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'guest_id'
    },
    eventId: { // Внешний ключ к Event
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'event_id'
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false, // ФИО обязательно, если гость добавлен
        field: 'full_name'
    },
    position: {
        type: DataTypes.STRING
    },
    organization: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'invited_guests',
    timestamps: false
});

module.exports = InvitedGuest;