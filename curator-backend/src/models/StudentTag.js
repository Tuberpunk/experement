// src/models/StudentTag.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StudentTag = sequelize.define('StudentTag', {
    tagId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'tag_id'
    },
    tagName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'tag_name'
    }
}, {
    tableName: 'student_tags',
    timestamps: false // Временные метки для тегов обычно не нужны
});

module.exports = StudentTag;