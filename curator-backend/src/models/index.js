'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
// Импортируем экземпляр sequelize из файла конфигурации
const sequelize = require('../config/database');
const db = {};

// Автоматический импорт всех файлов моделей из текущей директории
// (Этот код предполагает, что index.js находится в той же папке, что и файлы моделей)
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&       // Не скрытые файлы
      file !== basename &&             // Не сам index.js
      file.slice(-3) === '.js' &&      // Только .js файлы
      file.indexOf('.test.js') === -1  // Исключаем тестовые файлы (если есть)
    );
  })
  .forEach(file => {
    // Используем require для импорта модели
    const model = require(path.join(__dirname, file));
    // Добавляем модель в объект db под ее именем
    // (Предполагается, что имя модели совпадает с экспортом из файла, например, User из User.js)
    if (model && model.name) {
        db[model.name] = model;
    } else {
        console.warn(`Could not automatically import model from file: ${file}`);
    }
  });


// --- Определение связей (Associations) ---

// 1. User <-> Role (One-to-Many)
db.Role.hasMany(db.User, { foreignKey: 'roleId', as: 'Users' });
db.User.belongsTo(db.Role, { foreignKey: 'roleId', as: 'Role' });

// 2. User <-> Event (One-to-Many - Creator)
db.User.hasMany(db.Event, { foreignKey: 'createdByUserId', as: 'CreatedEvents' });
db.Event.belongsTo(db.User, { foreignKey: 'createdByUserId', as: 'Creator' });

// 3. Event <-> EventDirection (One-to-Many)
db.EventDirection.hasMany(db.Event, { foreignKey: 'directionId', as: 'Events' });
db.Event.belongsTo(db.EventDirection, { foreignKey: 'directionId', as: 'Direction' });

// 4. Event <-> EventLevel (One-to-Many)
db.EventLevel.hasMany(db.Event, { foreignKey: 'levelId', as: 'Events' });
db.Event.belongsTo(db.EventLevel, { foreignKey: 'levelId', as: 'Level' });

// 5. Event <-> EventFormat (One-to-Many)
db.EventFormat.hasMany(db.Event, { foreignKey: 'formatId', as: 'Events' });
db.Event.belongsTo(db.EventFormat, { foreignKey: 'formatId', as: 'Format' });

// 6. Event <-> MediaLink (One-to-Many)
db.Event.hasMany(db.MediaLink, { foreignKey: 'eventId', as: 'MediaLinks', onDelete: 'CASCADE' });
db.MediaLink.belongsTo(db.Event, { foreignKey: 'eventId', as: 'Event' });

// 7. Event <-> EventMedia (One-to-Many)
db.Event.hasMany(db.EventMedia, { foreignKey: 'eventId', as: 'EventMedias', onDelete: 'CASCADE' });
db.EventMedia.belongsTo(db.Event, { foreignKey: 'eventId', as: 'Event' });

// 8. Event <-> InvitedGuest (One-to-Many)
db.Event.hasMany(db.InvitedGuest, { foreignKey: 'eventId', as: 'InvitedGuests', onDelete: 'CASCADE' });
db.InvitedGuest.belongsTo(db.Event, { foreignKey: 'eventId', as: 'Event' });

// 9. Event <-> ParticipantCategory (Many-to-Many)
db.Event.belongsToMany(db.ParticipantCategory, {
    through: 'event_participant_categories', // Явно указываем имя связующей таблицы
    foreignKey: 'event_id',          // Ключ в связующей таблице, ссылающийся на Event
    otherKey: 'category_id',         // Ключ в связующей таблице, ссылающийся на ParticipantCategory
    as: 'ParticipantCategories',     // Псевдоним для доступа к категориям из Event
    timestamps: false                // В связующей таблице нет created_at/updated_at
});
db.ParticipantCategory.belongsToMany(db.Event, {
    through: 'event_participant_categories',
    foreignKey: 'category_id',
    otherKey: 'event_id',
    as: 'Events',                   // Псевдоним для доступа к мероприятиям из ParticipantCategory
    timestamps: false
});

// 10. Event <-> FundingSource (Many-to-Many)
// ПРИМЕЧАНИЕ: Если в таблице event_funding_sources есть доп. поля (amount),
// то нужно создать для нее отдельную модель (например, EventFundingSource)
// и использовать through: { model: db.EventFundingSource }
// Если доп. полей нет, можно указать имя таблицы строкой, как ниже.
db.Event.belongsToMany(db.FundingSource, {
    through: 'event_funding_sources', // Явно указываем имя связующей таблицы
    foreignKey: 'event_id',
    otherKey: 'source_id',
    as: 'FundingSources',            // Псевдоним для доступа к источникам из Event
    timestamps: false               // В связующей таблице нет created_at/updated_at
});
db.FundingSource.belongsToMany(db.Event, {
    through: 'event_funding_sources',
    foreignKey: 'source_id',
    otherKey: 'event_id',
    as: 'Events',                   // Псевдоним для доступа к мероприятиям из FundingSource
    timestamps: false
});

// --- Конец определения связей ---

// Добавляем экземпляр sequelize и Sequelize в экспортируемый объект
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db; // Экспортируем объект db, содержащий все модели и sequelize