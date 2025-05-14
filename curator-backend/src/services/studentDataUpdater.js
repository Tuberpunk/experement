// Полный путь: src/services/studentDataUpdater.js
const cron = require('node-cron');
const { Student, StudentTag, StudentTagAssignment, sequelize } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

const MINOR_TAG_NAME = 'Несовершеннолетний'; // Или как он у вас точно называется в БД

/**
 * Обновляет тег "Несовершеннолетний" для студентов на основе их возраста.
 */
const updateMinorStatusTag = async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled task: Update Minor Status Tag...`);
    let tagIdMinor;

    try {
        // 1. Найти ID тега "Несовершеннолетний"
        const minorTag = await StudentTag.findOne({ where: { tagName: MINOR_TAG_NAME } });
        if (!minorTag) {
            console.error(`[${new Date().toISOString()}] Tag "${MINOR_TAG_NAME}" not found. Task cannot proceed.`);
            return;
        }
        tagIdMinor = minorTag.tagId;

        // 2. Найти всех студентов с указанной датой рождения
        const students = await Student.findAll({
            where: {
                dateOfBirth: { [Op.ne]: null }, // У кого есть дата рождения
                isActive: true // Обрабатываем только активных студентов
            },
            include: [{
                model: StudentTag,
                as: 'Tags', // Псевдоним из вашей модели Student
                attributes: ['tagId'], // Нам нужны только ID тегов
                through: { attributes: [] } // Не нужны данные из связующей таблицы здесь
            }]
        });

        if (!students || students.length === 0) {
            console.log(`[${new Date().toISOString()}] No active students with birth dates found to update minor tag.`);
            return;
        }

        let addedCount = 0;
        let removedCount = 0;
        const today = dayjs();

        for (const student of students) {
            const age = today.diff(dayjs(student.dateOfBirth), 'year');
            const hasMinorTag = student.Tags.some(tag => tag.tagId === tagIdMinor);

            const transaction = await sequelize.transaction(); // Транзакция для каждого студента
            try {
                if (age < 18) {
                    // Студент несовершеннолетний
                    if (!hasMinorTag) {
                        // Тега нет, добавляем
                        await student.addTag(tagIdMinor, { transaction }); // Используем метод связи add<Alias>
                        addedCount++;
                        console.log(`Added "${MINOR_TAG_NAME}" tag to student ID ${student.studentId} (age: ${age})`);
                    }
                } else {
                    // Студент совершеннолетний (18 лет и старше)
                    if (hasMinorTag) {
                        // Тег есть, удаляем
                        await student.removeTag(tagIdMinor, { transaction }); // Используем метод связи remove<Alias>
                        removedCount++;
                        console.log(`Removed "${MINOR_TAG_NAME}" tag from student ID ${student.studentId} (age: ${age})`);
                    }
                }
                await transaction.commit();
            } catch (studentError) {
                await transaction.rollback();
                console.error(`Error updating minor tag for student ID ${student.studentId}:`, studentError);
            }
        }

        console.log(`[${new Date().toISOString()}] Minor status tag update complete. Added: ${addedCount}, Removed: ${removedCount}.`);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error running scheduled task to update minor status tag:`, error);
    }
};


/**
 * Функция для запуска планировщика задач для студентов.
 */
const startStudentDataScheduler = () => {
    console.log("Setting up student data scheduled tasks...");
    // запуск каждый день в 0:00
    cron.schedule('0 0 * * *', updateMinorStatusTag, {
        scheduled: true,
        timezone: "Europe/Moscow" // Укажите ваш актуальный часовой пояс
    });
    console.log("Scheduled task 'updateMinorStatusTag' configured to run daily at 4:00 AM.");
};

module.exports = { startStudentDataScheduler, updateMinorStatusTag };