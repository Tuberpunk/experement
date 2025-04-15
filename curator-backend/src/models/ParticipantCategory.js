const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ParticipantCategory = sequelize.define('ParticipantCategory', {
    categoryId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'category_id'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'participant_categories',
    timestamps: false
});

module.exports = ParticipantCategory;