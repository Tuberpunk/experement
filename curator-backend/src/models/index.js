// src/models/index.js
'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const sequelize = require('../config/database'); // Ваш экземпляр sequelize
const db = {};

// Автоматический импорт файлов моделей (оставляем как есть)
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    // Используем require и передаем sequelize и DataTypes, как это делает sequelize-cli
    // const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    // ИЛИ если вы экспортируете модель напрямую:
    const model = require(path.join(__dirname, file));
    if (model && model.name) { // Проверяем, что это модель Sequelize
      db[model.name] = model;
    }
  });

// --- Определение связей (Associations) ---

// Старые связи (User, Role, Event, Справочники...)
// ... (оставьте здесь существующие определения связей) ...
db.Role.hasMany(db.User, { foreignKey: 'roleId', as: 'Users' });
db.User.belongsTo(db.Role, { foreignKey: 'roleId', as: 'Role' });
// ... и так далее для всех старых связей ...


// --- НОВЫЕ СВЯЗИ ---

// User (Куратор) <-> StudentGroup (Один-ко-Многим)
// Предполагаем, что у куратора может быть несколько групп
db.User.hasMany(db.StudentGroup, { foreignKey: 'curatorUserId', as: 'ManagedGroups' });
db.StudentGroup.belongsTo(db.User, { foreignKey: 'curatorUserId', as: 'Curator' });

// StudentGroup <-> Student (Один-ко-Многим)
// В группе много студентов
db.StudentGroup.hasMany(db.Student, { foreignKey: 'groupId', as: 'Students' });
db.Student.belongsTo(db.StudentGroup, { foreignKey: 'groupId', as: 'StudentGroup' });

// Student <-> StudentTag (Многие-ко-Многим через StudentTagAssignment)
db.Student.belongsToMany(db.StudentTag, {
    through: db.StudentTagAssignment, // Явно указываем модель промежуточной таблицы
    foreignKey: 'student_id',         // Внешний ключ в StudentTagAssignment, ссылающийся на Student
    otherKey: 'tag_id',               // Внешний ключ в StudentTagAssignment, ссылающийся на StudentTag
    as: 'Tags',                       // Псевдоним для доступа к тегам студента (student.getTags(), student.Tags)
    timestamps: false                 // Если в StudentTagAssignment нет createdAt/updatedAt
});
db.StudentTag.belongsToMany(db.Student, {
    through: db.StudentTagAssignment, // Явно указываем модель промежуточной таблицы
    foreignKey: 'tag_id',
    otherKey: 'student_id',
    as: 'Students',                   // Псевдоним для доступа к студентам с этим тегом (studentTag.getStudents())
    timestamps: false
});
// Можно добавить прямые связи к промежуточной таблице, если нужно получать доп. поля (assignmentDate, notes)
db.Student.hasMany(db.StudentTagAssignment, { foreignKey: 'student_id', as: 'TagAssignments'});
db.StudentTagAssignment.belongsTo(db.Student, { foreignKey: 'student_id', as: 'Student'});
db.StudentTag.hasMany(db.StudentTagAssignment, { foreignKey: 'tag_id', as: 'StudentAssignments'});
db.StudentTagAssignment.belongsTo(db.StudentTag, { foreignKey: 'tag_id', as: 'Tag'});


// User (Загрузивший) <-> Document (Один-ко-Многим)
db.User.hasMany(db.Document, { foreignKey: 'uploadedByUserId', as: 'UploadedDocuments' });
db.Document.belongsTo(db.User, { foreignKey: 'uploadedByUserId', as: 'Uploader' });

// User (Куратор) <-> CuratorReport (Один-ко-Многим)
db.User.hasMany(db.CuratorReport, { foreignKey: 'curatorUserId', as: 'CuratorReports' });
db.CuratorReport.belongsTo(db.User, { foreignKey: 'curatorUserId', as: 'Curator' });

// Event <-> CuratorReport (Один-ко-Многим, необязательная связь)
db.Event.hasMany(db.CuratorReport, { foreignKey: 'eventId', as: 'RelatedReports' }); // eventId в CuratorReport может быть NULL
db.CuratorReport.belongsTo(db.Event, { foreignKey: 'eventId', as: 'RelatedEvent' });

// Связь Event <-> EventDirection (Один-ко-Многим)
db.EventDirection.hasMany(db.Event, { foreignKey: 'directionId', as: 'Events' });
db.Event.belongsTo(db.EventDirection, { foreignKey: 'directionId', as: 'Direction' });

// Связь Event <-> EventLevel (Один-ко-Многим)
db.EventLevel.hasMany(db.Event, { foreignKey: 'levelId', as: 'Events' });
db.Event.belongsTo(db.EventLevel, { foreignKey: 'levelId', as: 'Level' });

// Связь Event <-> EventFormat (Один-ко-Многим)
db.EventFormat.hasMany(db.Event, { foreignKey: 'formatId', as: 'Events' });
db.Event.belongsTo(db.EventFormat, { foreignKey: 'formatId', as: 'Format' }); 

// Мероприятие принадлежит одному пользователю (создателю)
db.User.hasMany(db.Event, { foreignKey: 'createdByUserId', as: 'CreatedEvents' });
db.Event.belongsTo(db.User, { foreignKey: 'createdByUserId', as: 'Creator' });

// CuratorReport <-> Student (Участники, Многие-ко-Многим)
// Используем строку, т.к. у report_participants нет доп. полей и отдельной модели
db.CuratorReport.belongsToMany(db.Student, {
    through: 'report_participants',     // Имя связующей таблицы
    foreignKey: 'report_id',            // Ключ в связующей таблице, ссылающийся на CuratorReport
    otherKey: 'student_id',             // Ключ в связующей таблице, ссылающийся на Student
    as: 'ParticipantStudents',          // Псевдоним для доступа к студентам-участникам
    timestamps: false                   // В связующей таблице нет created_at/updated_at
});
db.Student.belongsToMany(db.CuratorReport, {
    through: 'report_participants',
    foreignKey: 'student_id',
    otherKey: 'report_id',
    as: 'AttendedReports',             // Псевдоним для доступа к отчетам, где студент участвовал
    timestamps: false
});
db.Event.belongsToMany(db.ParticipantCategory, {
  through: 'event_participant_categories', // Имя связующей таблицы
  foreignKey: 'event_id',
  otherKey: 'category_id',
  as: 'ParticipantCategories', // Псевдоним для include
  timestamps: false
});
db.ParticipantCategory.belongsToMany(db.Event, {
  through: 'event_participant_categories',
  foreignKey: 'category_id',
  otherKey: 'event_id',
  as: 'Events', // Псевдоним для запросов из ParticipantCategory
  timestamps: false
});

// Event <-> FundingSource (Многие-ко-Многим)
db.Event.belongsToMany(db.FundingSource, {
  through: 'event_funding_sources', // Имя связующей таблицы
  foreignKey: 'event_id',
  otherKey: 'source_id',
  as: 'FundingSources', // Псевдоним для include
  timestamps: false
  // Если в event_funding_sources есть доп. поля (amount), нужна явная модель
});
db.FundingSource.belongsToMany(db.Event, {
  through: 'event_funding_sources',
  foreignKey: 'source_id',
  otherKey: 'event_id',
  as: 'Events', // Псевдоним для запросов из FundingSource
  timestamps: false
});

// Event -> MediaLink (Один-ко-Многим)
db.Event.hasMany(db.MediaLink, {
  foreignKey: 'eventId',
  as: 'MediaLinks', // Псевдоним для include
  onDelete: 'CASCADE' // Автоматически удалять ссылки при удалении события
});
db.MediaLink.belongsTo(db.Event, {
  foreignKey: 'eventId',
  as: 'Event'
});

// Event -> EventMedia (Один-ко-Многим)
db.Event.hasMany(db.EventMedia, {
  foreignKey: 'eventId',
  as: 'EventMedias', // Псевдоним для include
  onDelete: 'CASCADE'
});
db.EventMedia.belongsTo(db.Event, {
  foreignKey: 'eventId',
  as: 'Event'
});

// Event -> InvitedGuest (Один-ко-Многим)
db.Event.hasMany(db.InvitedGuest, {
  foreignKey: 'eventId',
  as: 'InvitedGuests', // Псевдоним для include
  onDelete: 'CASCADE'
});
db.InvitedGuest.belongsTo(db.Event, {
  foreignKey: 'eventId',
  as: 'Event'
});
// --- Конец определения связей ---

// Вызов метода associate, если он есть у моделей (альтернативный способ)
// Object.keys(db).forEach(modelName => {
//   if (db[modelName].associate) {
//     db[modelName].associate(db);
//   }
// });

// Экспорт sequelize и всех моделей
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db; // Экспортируем объект db