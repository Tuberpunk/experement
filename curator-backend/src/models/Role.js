const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Role = sequelize.define('Role', {
    roleId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'role_id'
    },
    roleName: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'role_name'
    }
}, {
    tableName: 'roles',
    timestamps: false // В таблице ролей нет createdAt/updatedAt
});

module.exports = Role;