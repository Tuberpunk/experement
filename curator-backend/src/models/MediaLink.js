const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MediaLink = sequelize.define('MediaLink', {
    linkId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'link_id'
    },
    eventId: { // Внешний ключ к Event
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'event_id'
    },
    url: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            isUrl: true // Проверка, является ли строка URL [25, 46]
        }
    },
    description: { // [34, 55]
        type: DataTypes.STRING
    }
}, {
    tableName: 'media_links',
    timestamps: false // Не нужны в этой таблице
});

module.exports = MediaLink;