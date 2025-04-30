// Полный путь: src/services/eventStatusUpdater.js
const cron = require('node-cron');
const { Event, User } = require('../models'); // Импортируем модели
const { Op } = require('sequelize');
const dayjs = require('dayjs'); // Используем dayjs для работы с датами
// const { sendAdminNotification, sendUserNotification } = require('./emailService'); // Ваш сервис email

/**
 * Функция ищет просроченные запланированные мероприятия и меняет их статус.
 */
const updateOverdueEvents = async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled task: Update Overdue Events Status...`);
    const threeDaysAgo = dayjs().subtract(3, 'day').toDate(); // Дата "3 дня назад"

    try {
        // Ищем мероприятия:
        // - Статус 'Запланировано'
        // - Дата окончания (или начала, если окончания нет) раньше чем 3 дня назад
        const [updatedCount] = await Event.update(
            { status: 'Не проводилось (Отмена)' }, // Новый статус
            {
                where: {
                    status: 'Запланировано', // Только запланированные
                    [Op.or]: [ // Проверяем ИЛИ дату окончания ИЛИ дату начала
                        {
                            endDate: { // Если есть дата окончания
                                [Op.ne]: null, // Она не null
                                [Op.lt]: threeDaysAgo // И она прошла более 3 дней назад
                            }
                        },
                        {
                            endDate: { // Если нет даты окончания (или она равна дате начала)
                                [Op.eq]: null
                            },
                            startDate: { // Проверяем дату начала
                                [Op.lt]: threeDaysAgo // Она прошла более 3 дней назад
                            }
                        },
                        // Эта логика может быть не совсем точной для многодневных,
                        // если endDate совпадает с startDate. Уточните правило для многодневных.
                        // Возможно, проще проверять только startDate < threeDaysAgo?
                        // Или coalesce("endDate", "startDate") < threeDaysAgo (зависит от диалекта SQL)
                        // Упрощенный вариант: проверяем дату начала
                        // { startDate: { [Op.lt]: threeDaysAgo } }
                    ]
                },
                returning: false // Нам не нужны обновленные записи, только количество
            }
        );

        if (updatedCount > 0) {
            console.log(`[${new Date().toISOString()}] Successfully updated status for ${updatedCount} overdue events.`);
            // --- Отправка уведомления администратору ---
            // sendAdminNotification(
            //     'Автоматическое обновление статуса мероприятий',
            //     `${updatedCount} запланированных мероприятий были автоматически переведены в статус "Не проводилось (Отмена)", так как прошло более 3 дней с даты их проведения.`
            // ).catch(err => console.error("Failed to send notification about overdue events:", err));
            // -----------------------------------------
        } else {
             console.log(`[${new Date().toISOString()}] No overdue planned events found to update.`);
        }

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error running scheduled task to update event statuses:`, error);
    }
};

/**
 * Функция для запуска планировщика задач.
 */
const startScheduler = () => {
    console.log("Setting up scheduled tasks...");
    // Запускать каждый день в 3:00 ночи
    // Синтаксис cron: секунда(опц) минута час день_месяца месяц день_недели
    // '0 3 * * *' - означает в 0 минут 3-го часа каждого дня каждого месяца и каждого дня недели
    cron.schedule('0 0 * * *', updateOverdueEvents, {
        scheduled: true,
        timezone: "Europe/Moscow" // Укажите ваш часовой пояс! (Пример: Europe/Moscow, Europe/Bucharest)
    });
    console.log("Scheduled task 'updateOverdueEvents' configured to run daily at 0:00 AM.");

    // Можно добавить другие задачи по расписанию сюда
    // cron.schedule('* * * * *', () => { console.log('Running every minute'); });
};

module.exports = { startScheduler, updateOverdueEvents }; // Экспортируем функцию запуска