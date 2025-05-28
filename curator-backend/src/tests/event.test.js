// Полный путь: curator-backend/src/tests/event.test.js
require('dotenv').config(); // Загружаем .env для тестов
const request = require('supertest');
const app = require('../app'); // Наш Express app
const { sequelize, User, Role, Event, EventDirection, EventLevel, EventFormat } = require('../models'); // Импортируем необходимые модели

let adminToken;
let curatorToken;
let adminUser;
let curatorUser;
let testEventByCurator;
let testEventByAdmin;

// Вспомогательные данные
let direction1, level1, format1;

beforeAll(async () => {
    await sequelize.sync({ force: true }); // Пересоздаем таблицы
    console.log('Test database synced for event tests.');

    // Создаем роли
    const adminRole = await Role.create({ roleName: 'administrator' });
    const curatorRole = await Role.create({ roleName: 'curator' });
    console.log('Roles created for event tests.');

    // Создаем пользователей
    adminUser = await User.create({
        email: 'admin.event@example.com',
        passwordHash: 'adminpassword', // хук beforeCreate захеширует
        fullName: 'Admin Event User',
        roleId: adminRole.roleId,
        isActive: true
    });
    curatorUser = await User.create({
        email: 'curator.event@example.com',
        passwordHash: 'curatorpassword',
        fullName: 'Curator Event User',
        roleId: curatorRole.roleId,
        isActive: true
    });
    console.log('Users created for event tests.');

    // Получаем токены для пользователей
    let res = await request(app).post('/api/auth/login').send({ email: 'admin.event@example.com', password: 'adminpassword' });
    adminToken = res.body.token;
    res = await request(app).post('/api/auth/login').send({ email: 'curator.event@example.com', password: 'curatorpassword' });
    curatorToken = res.body.token;
    console.log('Tokens obtained for event tests.');

    // Создаем справочные данные
    direction1 = await EventDirection.create({ name: 'Тестовое Направление 1' });
    level1 = await EventLevel.create({ name: 'Тестовый Уровень 1' });
    format1 = await EventFormat.create({ name: 'Тестовый Формат 1' });
    console.log('Lookup data created for event tests.');
});

describe('Event Endpoints - /api/events', () => {
    // --- POST /api/events ---
    describe('POST /api/events (Create Event)', () => {
        it('should create a new event for an authenticated curator', async () => {
            const res = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${curatorToken}`)
                .send({
                    title: 'Мероприятие от куратора',
                    description: 'Это очень важное и длинное описание тестового мероприятия, созданного куратором, содержащее не менее ста символов для успешной валидации.',
                    startDate: '2025-10-01',
                    responsibleFullName: curatorUser.fullName,
                    directionId: direction1.id,
                    levelId: level1.id,
                    formatId: format1.id,
                    // ... другие необходимые поля ...
                });
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('eventId');
            expect(res.body.title).toBe('Мероприятие от куратора');
            expect(res.body.createdByUserId).toBe(curatorUser.userId);
            testEventByCurator = res.body; // Сохраняем для других тестов
        });

        it('should create a new event for an authenticated admin', async () => {
            const res = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'Мероприятие от админа',
                    description: 'Это очень важное и длинное описание тестового мероприятия, созданного администратором, содержащее не менее ста символов для успешной валидации.',
                    startDate: '2025-11-01',
                    responsibleFullName: adminUser.fullName,
                    // ...
                });
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('eventId');
            testEventByAdmin = res.body;
        });

        it('should fail to create an event without required fields (e.g., title)', async () => {
            const res = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${curatorToken}`)
                .send({
                    // title: 'Нет названия', // Пропускаем title
                    description: 'Короткое описание не пройдет валидацию, так как оно должно быть достаточно длинным, чтобы содержать более ста символов.',
                    startDate: '2025-10-02',
                    responsibleFullName: curatorUser.fullName,
                });
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', 'Не заполнены обязательные поля (Название, Описание, Дата начала, ФИО ответственного)');
        });

        it('should fail to create an event with short description', async () => {
            const res = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${curatorToken}`)
                .send({
                    title: 'Короткое описание',
                    description: 'мало символов',
                    startDate: '2025-10-03',
                    responsibleFullName: curatorUser.fullName,
                });
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', 'Описание должно содержать не менее 100 символов');
        });

        it('should fail to create an event if not authenticated', async () => {
            const res = await request(app)
                .post('/api/events')
                .send({ title: 'Попытка без токена', description: 'длинное описание ...', startDate: '2025-10-04', responsibleFullName: 'Кто-то' });
            expect(res.statusCode).toEqual(401); // Отсутствует токен
        });
    });

    // --- GET /api/events ---
    describe('GET /api/events (Get Events List)', () => {
        it('curator should get only their own events', async () => {
            const res = await request(app)
                .get('/api/events')
                .set('Authorization', `Bearer ${curatorToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('events');
            expect(Array.isArray(res.body.events)).toBe(true);
            // Все полученные мероприятия должны быть созданы этим куратором
            res.body.events.forEach(event => {
                expect(event.createdByUserId).toBe(curatorUser.userId);
            });
            // Проверяем, что мероприятие админа не попало в список куратора
            const adminEventPresent = res.body.events.some(event => event.eventId === testEventByAdmin?.eventId);
            expect(adminEventPresent).toBe(false);
        });

        it('admin should get all events', async () => {
            const res = await request(app)
                .get('/api/events')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('events');
            // Проверяем, что в списке есть мероприятия, созданные разными пользователями
            const curatorEventFound = res.body.events.some(event => event.eventId === testEventByCurator?.eventId);
            const adminEventFound = res.body.events.some(event => event.eventId === testEventByAdmin?.eventId);
            expect(curatorEventFound).toBe(true);
            expect(adminEventFound).toBe(true);
        });

        it('should filter events by status for admin', async () => {
            // Сначала создадим одно мероприятие со статусом "Проведено" админом
            await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'Проведенное для фильтра', description: 'длинное описание для проведенного мероприятия сто символов минимум для валидации', startDate: '2025-01-01', responsibleFullName: 'Admin Test', status: 'Проведено' });

            const res = await request(app)
                .get('/api/events?status=Проведено')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            res.body.events.forEach(event => {
                expect(event.status).toBe('Проведено');
            });
            const plannedEventPresent = res.body.events.some(event => event.status === 'Запланировано');
            expect(plannedEventPresent).toBe(false); // Убедимся, что запланированных нет в отфильтрованном списке
        });
    });


    // --- GET /api/events/:id ---
    describe('GET /api/events/:id (Get Single Event)', () => {
        it('curator should get their own event by ID', async () => {
            const res = await request(app)
                .get(`/api/events/${testEventByCurator.eventId}`)
                .set('Authorization', `Bearer ${curatorToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.eventId).toBe(testEventByCurator.eventId);
        });

        it('curator should NOT get another user\'s event by ID (403 Forbidden)', async () => {
            const res = await request(app)
                .get(`/api/events/${testEventByAdmin.eventId}`) // Пытаемся получить мероприятие админа
                .set('Authorization', `Bearer ${curatorToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('admin should get any event by ID', async () => {
            let res = await request(app)
                .get(`/api/events/${testEventByCurator.eventId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);

            res = await request(app)
                .get(`/api/events/${testEventByAdmin.eventId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
        });

        it('should return 404 for a non-existent event ID', async () => {
            const res = await request(app)
                .get('/api/events/99999')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(404);
        });
    });

    // --- PUT /api/events/:id ---
    describe('PUT /api/events/:id (Update Event)', () => {
        it('curator should update their own event', async () => {
            const res = await request(app)
                .put(`/api/events/${testEventByCurator.eventId}`)
                .set('Authorization', `Bearer ${curatorToken}`)
                .send({ title: 'Обновленное куратором название', description: testEventByCurator.description, startDate: testEventByCurator.startDate, responsibleFullName: testEventByCurator.responsibleFullName });
            expect(res.statusCode).toEqual(200);
            expect(res.body.event.title).toBe('Обновленное куратором название');
        });

        it('curator should NOT update another user\'s event (403)', async () => {
             const res = await request(app)
                .put(`/api/events/${testEventByAdmin.eventId}`)
                .set('Authorization', `Bearer ${curatorToken}`)
                .send({ title: 'Попытка куратора обновить чужое', description: testEventByAdmin.description, startDate: testEventByAdmin.startDate, responsibleFullName: testEventByAdmin.responsibleFullName });
            expect(res.statusCode).toEqual(403);
        });

        it('admin should update any event', async () => {
            const res = await request(app)
                .put(`/api/events/${testEventByCurator.eventId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'Обновлено админом', description: testEventByCurator.description, startDate: testEventByCurator.startDate, responsibleFullName: testEventByCurator.responsibleFullName });
            expect(res.statusCode).toEqual(200);
            expect(res.body.event.title).toBe('Обновлено админом');
        });
    });

    // --- PATCH /api/events/:id/status ---
    describe('PATCH /api/events/:id/status (Update Event Status)', () => {
        it('curator should update own "Запланировано" event to "Проведено"', async () => {
            // Убедимся, что статус "Запланировано"
            await Event.update({ status: 'Запланировано' }, { where: { eventId: testEventByCurator.eventId } });

            const res = await request(app)
                .patch(`/api/events/${testEventByCurator.eventId}/status`)
                .set('Authorization', `Bearer ${curatorToken}`)
                .send({ status: 'Проведено' });
            expect(res.statusCode).toEqual(200);
            expect(res.body.event.status).toBe('Проведено');
        });

        it('curator should update own "Запланировано" event to "Не проводилось (Отмена)"', async () => {
            await Event.update({ status: 'Запланировано' }, { where: { eventId: testEventByCurator.eventId } });
            const res = await request(app)
                .patch(`/api/events/${testEventByCurator.eventId}/status`)
                .set('Authorization', `Bearer ${curatorToken}`)
                .send({ status: 'Не проводилось (Отмена)' });
            expect(res.statusCode).toEqual(200);
            expect(res.body.event.status).toBe('Не проводилось (Отмена)');
        });

        it('curator should NOT update own "Проведено" event to "Запланировано" (403)', async () => {
            await Event.update({ status: 'Проведено' }, { where: { eventId: testEventByCurator.eventId } });
            const res = await request(app)
                .patch(`/api/events/${testEventByCurator.eventId}/status`)
                .set('Authorization', `Bearer ${curatorToken}`)
                .send({ status: 'Запланировано' });
            expect(res.statusCode).toEqual(403);
        });
    });


    // --- DELETE /api/events/:id ---
    describe('DELETE /api/events/:id (Delete Event)', () => {
        it('curator should NOT delete an event (403)', async () => {
            const res = await request(app)
                .delete(`/api/events/${testEventByCurator.eventId}`)
                .set('Authorization', `Bearer ${curatorToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('admin should delete an event', async () => {
            const res = await request(app)
                .delete(`/api/events/${testEventByCurator.eventId}`) // Удаляем событие куратора
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(204); // No Content

            // Проверяем, что событие действительно удалено
            const deletedEvent = await Event.findByPk(testEventByCurator.eventId);
            expect(deletedEvent).toBeNull();
        });
    });

});

afterAll(async () => {
    await sequelize.close();
});