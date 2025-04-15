// src/controllers/reportController.js
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const {
    Event, User, EventDirection, EventLevel, EventFormat,
    ParticipantCategory, FundingSource, MediaLink, EventMedia, InvitedGuest
} = require('../models');
// Импортируем функцию построения запроса из eventController
const { buildEventQueryOptions } = require('./eventController'); // Убедитесь, что она экспортирована

// Общая функция для генерации Excel
const generateExcelReport = async (res, events, filename) => {
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'CuratorApp';
        workbook.lastModifiedBy = 'CuratorApp';
        workbook.created = new Date();
        workbook.modified = new Date();

        const worksheet = workbook.addWorksheet('Мероприятия');

        // Определение колонок (пример)
        worksheet.columns = [
            { header: 'ID', key: 'eventId', width: 10 },
            { header: 'Название', key: 'title', width: 40 },
            { header: 'Статус', key: 'status', width: 15 },
            { header: 'Дата начала', key: 'startDate', width: 15, style: { numFmt: 'dd.mm.yyyy' } },
            { header: 'Дата окончания', key: 'endDate', width: 15, style: { numFmt: 'dd.mm.yyyy' } },
            { header: 'Направление', key: 'direction', width: 25 },
            { header: 'Уровень', key: 'level', width: 20 },
            { header: 'Формат', key: 'format', width: 20 },
            { header: 'Место', key: 'locationText', width: 30 },
            { header: 'Адрес', key: 'addressText', width: 30 },
            { header: 'Кол-во участников', key: 'participantCount', width: 15 },
            { header: 'Категории участников', key: 'participantCategories', width: 35 },
            { header: 'Иностранцы?', key: 'hasForeigners', width: 10 },
            { header: 'Несоверш-ние?', key: 'hasMinors', width: 10 },
            { header: 'Ответственный', key: 'responsibleFullName', width: 30 },
            { header: 'Должность отв.', key: 'responsiblePosition', width: 25 },
            { header: 'Телефон отв.', key: 'responsiblePhone', width: 20 },
            { header: 'Email отв.', key: 'responsibleEmail', width: 25 },
            { header: 'Источники фин.', key: 'fundingSources', width: 30 },
            { header: 'Объем фин.', key: 'fundingAmount', width: 15 },
            { header: 'Описание', key: 'description', width: 50 },
            { header: 'Создатель', key: 'creator', width: 30 },
            { header: 'Ссылки СМИ', key: 'mediaLinks', width: 40 },
            { header: 'Медиа', key: 'eventMedias', width: 40 },
            { header: 'Гости', key: 'invitedGuests', width: 40 },
            // Добавьте другие поля по необходимости
        ];

        // Добавление данных
        events.forEach(event => {
            worksheet.addRow({
                eventId: event.eventId,
                title: event.title,
                status: event.status,
                startDate: event.startDate,
                endDate: event.endDate,
                direction: event.Direction?.name || '', // Безопасный доступ к связанным данным
                level: event.Level?.name || '',
                format: event.Format?.name || '',
                locationText: event.locationText,
                addressText: event.addressText,
                participantCount: event.participantCount,
                participantCategories: event.ParticipantCategories?.map(c => c.name).join(', ') || '',
                hasForeigners: event.hasForeigners ? 'Да' : 'Нет',
                hasMinors: event.hasMinors ? 'Да' : 'Нет',
                responsibleFullName: event.responsibleFullName,
                responsiblePosition: event.responsiblePosition,
                responsiblePhone: event.responsiblePhone,
                responsibleEmail: event.responsibleEmail,
                fundingSources: event.FundingSources?.map(s => s.name).join(', ') || '',
                fundingAmount: event.fundingAmount,
                description: event.description,
                creator: event.Creator?.fullName || '',
                mediaLinks: event.MediaLinks?.map(l => l.url).join('\n') || '', // Ссылки с новой строки
                eventMedias: event.EventMedias?.map(m => `${m.mediaType}: ${m.mediaUrl}`).join('\n') || '',
                invitedGuests: event.InvitedGuests?.map(g => `${g.fullName} (${g.organization || 'N/A'})`).join('\n') || '',
            });
        });

        // Настройка заголовков ответа
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${filename}.xlsx"`
        );

        // Отправка файла
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error(`Error generating Excel report ${filename}:`, error);
        // Отправляем ошибку, только если заголовки еще не были отправлены
        if (!res.headersSent) {
            res.status(500).json({ message: 'Ошибка сервера при генерации отчета Excel' });
        }
    }
};

// GET /api/reports/my-events/export
exports.exportMyEvents = async (req, res) => {
    try {
        // Используем ту же логику фильтрации, что и в getEvents, но без пагинации
        // и принудительно для текущего пользователя
        const { where, include } = buildEventQueryOptions(req.query, 'curator', req.user.id); // Роль не важна, т.к. ID передан

        // Добавляем все нужные для отчета include, если их нет в базовом наборе
         include.push({ model: ParticipantCategory, as: 'ParticipantCategories', through: { attributes: [] } });
         include.push({ model: FundingSource, as: 'FundingSources', through: { attributes: [] } });
         include.push({ model: MediaLink, as: 'MediaLinks' });
         include.push({ model: EventMedia, as: 'EventMedias' });
         include.push({ model: InvitedGuest, as: 'InvitedGuests' });
         // Убедимся, что Creator включен
         if (!include.some(inc => inc.as === 'Creator')) {
             include.push({ model: User, as: 'Creator', attributes: ['userId', 'fullName', 'email'] });
         }

        const events = await Event.findAll({
            where,
            include,
            order: [['startDate', 'DESC']] // Или другая сортировка
            // distinct: true // Может понадобиться
        });

        await generateExcelReport(res, events, `my_events_export_${Date.now()}`);

    } catch (error) {
        console.error('Error exporting my events:', error);
         if (!res.headersSent) {
            res.status(500).json({ message: 'Ошибка сервера при экспорте мероприятий' });
         }
    }
};

// GET /api/reports/all-events/export (Admin)
exports.exportAllEvents = async (req, res) => {
     try {
        // Используем ту же логику фильтрации, что и в getEvents, но без пагинации
        // Роль 'administrator' позволит видеть все события
        const { where, include } = buildEventQueryOptions(req.query, 'administrator', null); // ID не нужен

        // Добавляем все нужные для отчета include, если их нет в базовом наборе
         include.push({ model: ParticipantCategory, as: 'ParticipantCategories', through: { attributes: [] } });
         include.push({ model: FundingSource, as: 'FundingSources', through: { attributes: [] } });
         include.push({ model: MediaLink, as: 'MediaLinks' });
         include.push({ model: EventMedia, as: 'EventMedias' });
         include.push({ model: InvitedGuest, as: 'InvitedGuests' });
         // Убедимся, что Creator включен
         if (!include.some(inc => inc.as === 'Creator')) {
             include.push({ model: User, as: 'Creator', attributes: ['userId', 'fullName', 'email'] });
         }

        const events = await Event.findAll({
            where,
            include,
            order: [['startDate', 'DESC']]
            // distinct: true // Может понадобиться
        });

        await generateExcelReport(res, events, `all_events_export_${Date.now()}`);

    } catch (error) {
        console.error('Error exporting all events:', error);
        if (!res.headersSent) {
             res.status(500).json({ message: 'Ошибка сервера при экспорте мероприятий' });
        }
    }
};