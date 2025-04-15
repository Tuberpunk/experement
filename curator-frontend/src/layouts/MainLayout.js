// src/layouts/MainLayout.js
import React from 'react';
import { Outlet, Link as RouterLink, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container, Box, Chip } from '@mui/material'; // Добавлен Chip
import AccountCircleIcon from '@mui/icons-material/AccountCircle'; // Иконка пользователя
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'; // Иконка админа
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'; // Иконка куратора
import { useAuth } from '../contexts/AuthContext'; // Импортируем хук useAuth

// Функция для получения отображаемого имени роли и иконки
const getRoleDisplay = (roleName) => {
    switch (roleName) {
        case 'administrator':
            return { label: 'Администратор', icon: <AdminPanelSettingsIcon fontSize="small" sx={{ ml: 0.5 }}/> };
        case 'curator':
            return { label: 'Куратор', icon: <SupervisorAccountIcon fontSize="small" sx={{ ml: 0.5 }} /> };
        default:
            return { label: roleName || 'Неизвестная роль', icon: null }; // На случай других ролей или отсутствия
    }
};

function MainLayout() {
    const { user, logout } = useAuth(); // Получаем пользователя из контекста
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Получаем отображаемое имя и иконку для роли
    const roleDisplay = user ? getRoleDisplay(user.role) : { label: '', icon: null };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar position="static">
                <Toolbar>
                    {/* Название приложения */}
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        <RouterLink to="/events" style={{ textDecoration: 'none', color: 'inherit' }}>
                            Кабинет Куратора
                        </RouterLink>
                    </Typography>

                    {/* Информация о пользователе и роли */}
                    {user && ( // Показываем, только если пользователь есть
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AccountCircleIcon sx={{ mr: 1 }} />
                            <Typography sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}> {/* Скрываем ФИО на маленьких экранах */}
                                {user.fullName || user.email}
                            </Typography>
                            {/* Отображаем роль с помощью Chip */}
                            <Chip
                                icon={roleDisplay.icon}
                                label={roleDisplay.label}
                                size="small"
                                color={user.role === 'administrator' ? 'secondary' : 'info'} // Разные цвета для ролей
                                variant="filled" // или "outlined"
                            />
                        </Box>
                    )}

                    {/* Кнопка Выйти */}
                    <Button color="inherit" onClick={handleLogout} sx={{ ml: 2 }}>
                        Выйти
                    </Button>
                </Toolbar>
            </AppBar>
            <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
                <Outlet /> {/* Основной контент страницы */}
            </Container>
            {/* Подвал */}
            <Box component="footer" sx={{ bgcolor: 'background.paper', p: 2, mt: 'auto' }}>
                 <Typography variant="body2" color="text.secondary" align="center">
                   © {new Date().getFullYear()} Крутой проект
                 </Typography>
            </Box>
        </Box>
    );
}

export default MainLayout;