const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FundingSource = sequelize.define('FundingSource', {
    sourceId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'source_id'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'funding_sources',
    timestamps: false
});

module.exports = FundingSource;