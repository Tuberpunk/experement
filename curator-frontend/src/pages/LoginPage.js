// src/pages/LoginPage.js
import React, { useState, useContext } from 'react';
import { useNavigate, Navigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Контекст аутентификации
import { loginUser } from '../api/auth'; // Функция API для входа
import {
    TextField,
    Button,
    Container,
    Typography,
    Box,
    Alert,
    CircularProgress,
    Link,
    Grid // Добавлен Grid
} from '@mui/material';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // Получаем данные и функции из контекста
    const { saveAuthData, isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            // Вызов функции API для входа
            const data = await loginUser({ email, password });
            if (data.token && data.user) {
                // Сохраняем токен и данные пользователя через контекст
                saveAuthData(data.token, data.user);
                // Перенаправляем на страницу мероприятий после успешного входа
                navigate('/events');
            } else {
                setError('Не удалось получить данные аутентификации от сервера.');
            }
        } catch (err) {
            // Получаем сообщение об ошибке из ответа API или стандартное
            const message = err.response?.data?.message || err.message || 'Ошибка входа. Проверьте email и пароль.';
            setError(message);
            console.error("Login failed:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Если контекст еще загружается, показываем индикатор
    if (authLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    // Если пользователь уже аутентифицирован, перенаправляем его
    if (isAuthenticated) {
        return <Navigate to="/events" replace />;
    }

    // Рендеринг формы входа
    return (
        <Container maxWidth="xs">
            <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5">
                    Вход в Систему Куратора
                </Typography>
                {/* Отображение ошибки, если она есть */}
                {error && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{error}</Alert>}
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading} // Блокируем поле во время загрузки
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Пароль"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading} // Блокируем поле во время загрузки
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={isLoading} // Блокируем кнопку во время загрузки
                    >
                        {/* Показываем индикатор загрузки на кнопке */}
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Войти'}
                    </Button>
                    {/* Ссылка на страницу регистрации */}
                    <Grid container justifyContent="flex-end">
                        <Grid item>
                            <Link component={RouterLink} to="/register" variant="body2">
                                Нет аккаунта? Зарегистрироваться
                            </Link>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </Container>
    );
}

export default LoginPage;