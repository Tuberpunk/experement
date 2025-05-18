        // curator-backend/src/tests/auth.test.js (или любой другой тестовый файл)
        require('dotenv').config(); // Загружаем переменные из .env для тестов

        const request = require('supertest');
        const app = require('../app'); // Ваш Express app
        const { sequelize, User, Role /*, ...другие модели */ } = require('../models');
        // Хук перед всеми тестами в этом файле
        beforeAll(async () => {
            try {
                console.log('Syncing test database...');
                // Пересоздаем таблицы в тестовой БД
                // force: true удалит все существующие таблицы и создаст их заново - идеально для чистого старта
                await sequelize.sync({ force: true });
                console.log('Test database synced.');

                // Заполняем начальными данными (seeds)
                console.log('Seeding roles...');
                await Role.bulkCreate([
                    { roleId: 1, roleName: 'administrator' }, // Убедитесь, что ID соответствуют ожиданиям
                    { roleId: 2, roleName: 'curator' }
                ]);
                console.log('Roles seeded.');

                // Можно добавить сидинг других необходимых справочников
            } catch (error) {
                console.error('Error during test setup (beforeAll):', error);
                throw error; // Прервать тесты, если настройка не удалась
            }
        });

        // Очистка таблиц перед каждым тестом (если нужно изолировать тесты друг от друга)
        // Это может замедлить тесты. Альтернатива - очищать в afterEach или использовать транзакции.
        // beforeEach(async () => {
        //     await User.destroy({ truncate: true, cascade: true }); // Очищаем User и связанные записи
        //     // Очищаем другие таблицы, которые изменяются в тестах
        // });


        // Ваши тесты
        describe('Auth Endpoints', () => {
            it('should register a new user as curator', async () => {
                const res = await request(app)
                    .post('/api/auth/register')
                    .send({
                        email: 'test.curator@example.com',
                        password: 'password123',
                        fullName: 'Test Curator User',
                        // ... другие необходимые поля ...
                    });
                expect(res.statusCode).toEqual(201);
                expect(res.body).toHaveProperty('message', 'Пользователь успешно зарегистрирован (как Куратор)');

                // Проверяем, что пользователь действительно создан в БД с нужной ролью
                const dbUser = await User.findOne({
                    where: { email: 'test.curator@example.com' },
                    include: [{ model: Role, as: 'Role' }]
                });
                expect(dbUser).not.toBeNull();
                expect(dbUser.Role.roleName).toEqual('curator');
            });

            // ... другие тесты ...
        });

        // Хук после всех тестов в этом файле
        afterAll(async () => {
            console.log('Closing test database connection...');
            await sequelize.close(); // Важно закрывать соединение
        });
        