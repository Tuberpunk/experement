const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventMedia = sequelize.define('EventMedia', {
    mediaId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'media_id'
    },
    eventId: { // Внешний ключ к Event
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'event_id'
    },
    mediaUrl: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'media_url',
        validate: {
            isUrl: true // Предполагаем, что храним ссылки [26, 47]
        }
    },
    mediaType: {
        type: DataTypes.STRING(10),
        field: 'media_type',
        validate: {
            isIn: [['photo', 'video']] // 'photo' или 'video'
        }
    },
    description: {
        type: DataTypes.TEXT
    },
    author: { // [26, 47]
        type: DataTypes.STRING
    }
}, {
    tableName: 'event_media',
    timestamps: false
});

module.exports = EventMedia;