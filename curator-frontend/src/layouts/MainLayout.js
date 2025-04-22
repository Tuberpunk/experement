// Полный путь: src/layouts/MainLayout.js
import React from 'react';
// Хуки и компоненты для роутинга
import { Outlet, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
// Компоненты Material UI
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Container,
    Box,
    Chip,
    IconButton, // Для возможного мобильного меню
    Tooltip,    // Для подсказок к иконкам
    Avatar      // Для отображения инициалов
} from '@mui/material';
// Иконки Material UI
import AccountCircleIcon from '@mui/icons-material/AccountCircle'; // Можно использовать для Avatar fallback
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import GroupsIcon from '@mui/icons-material/Groups'; // Группы
import EventNoteIcon from '@mui/icons-material/EventNote'; // Мероприятия
import DescriptionIcon from '@mui/icons-material/Description'; // Документы
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'; // Студенты
import LabelIcon from '@mui/icons-material/Label'; // Теги
import AssessmentIcon from '@mui/icons-material/Assessment'; // Отчеты
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'; // Управление пользователями
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'; // Назначение события
import LogoutIcon from '@mui/icons-material/Logout'; // Выход
// Контекст аутентификации
import { useAuth } from '../contexts/AuthContext'; // Убедитесь, что путь правильный

// Вспомогательная функция для отображения роли
const getRoleDisplay = (roleName) => {
    switch (roleName) {
        case 'administrator':
            return { label: 'Администратор', icon: <AdminPanelSettingsIcon fontSize="small" sx={{ ml: 0.5 }}/> };
        case 'curator':
            return { label: 'Куратор', icon: <SupervisorAccountIcon fontSize="small" sx={{ ml: 0.5 }} /> };
        default:
            return { label: roleName || 'Неизвестная роль', icon: null };
    }
};

// Вспомогательная функция для получения инициалов
const getInitials = (name = '') => {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter((n, i, arr) => n && (i === 0 || i === arr.length - 1)) // Берем первую и последнюю букву ФИО, если есть
    .join('')
    .toUpperCase();
};


function MainLayout() {
    const { user, logout } = useAuth(); // Получаем пользователя и функцию выхода
    const navigate = useNavigate();
    const location = useLocation(); // Получаем текущий путь для подсветки активного меню

    // Обработчик выхода
    const handleLogout = () => {
        logout(); // Вызываем функцию выхода из контекста
        navigate('/login'); // Перенаправляем на страницу входа
    };

    // Получаем текст и иконку для отображения роли
    const roleDisplay = user ? getRoleDisplay(user.role) : { label: '', icon: null };

    // Функция для проверки, активен ли путь (для подсветки кнопок)
    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    // Стиль для навигационных кнопок
    const navButtonStyle = (path) => ({
        color: 'white',
        mr: 1, // Отступ справа между кнопками
        ml: 0.5, // Небольшой отступ слева
        fontWeight: isActive(path) ? 'bold' : 'normal', // Жирный шрифт для активной
        borderBottom: isActive(path) ? '2px solid white' : 'none', // Подчеркивание для активной
        borderRadius: 0, // Прямые углы для эффекта вкладки
        paddingBottom: '4px', // Отступ снизу для линии подчеркивания
        '&:hover': { // Убираем стандартный фон при наведении
            backgroundColor: 'rgba(255, 255, 255, 0.08)'
        }
    });

    // --- Функция перехода в профиль ---
     const goToProfile = () => {
         navigate('/profile');
     };
     // --------------------------------


    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Верхняя панель */}
            <AppBar position="static">
                <Toolbar>
                    {/* Название/Логотип */}
                    <Typography
                        variant="h6"
                        component={RouterLink} // Делаем название ссылкой
                        to="/events" // Ссылка на главную (мероприятия)
                        sx={{
                            flexGrow: { xs: 1, md: 0 }, // Растягиваем на мобильных, фиксируем на больших
                            mr: { md: 3 },
                            textDecoration: 'none',
                            color: 'inherit'
                        }}
                    >
                        Кабинет Куратора
                    </Typography>

                    {/* Основная навигация (скрывается на маленьких экранах) */}
                     <Box sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1 }}>
                        <Button component={RouterLink} to="/events" startIcon={<EventNoteIcon />} sx={navButtonStyle('/events')}>
                            Мероприятия
                        </Button>
                         <Button component={RouterLink} to="/groups" startIcon={<GroupsIcon />} sx={navButtonStyle('/groups')}>
                             Группы
                         </Button>
                          <Button component={RouterLink} to="/documents" startIcon={<DescriptionIcon />} sx={navButtonStyle('/documents')}>
                             Документы
                         </Button>
                          <Button component={RouterLink} to="/students" startIcon={<PeopleAltIcon />} sx={navButtonStyle('/students')}>
                             Студенты
                         </Button>
                         {/* Ссылка на Отчеты */}
                         {(user?.role === 'curator' || user?.role === 'administrator') && (
                             <Button component={RouterLink} to="/curator-reports" startIcon={<AssessmentIcon />} sx={navButtonStyle('/curator-reports')}>
                                 {user?.role === 'administrator' ? 'Отчеты кураторов' : 'Мои Отчеты'}
                             </Button>
                         )}
                         {/* Ссылки для админа */}
                         {user?.role === 'administrator' && (
                            <> {/* Используем фрагмент для группировки админских кнопок */}
                                <Button component={RouterLink} to="/admin/tags" startIcon={<LabelIcon />} sx={navButtonStyle('/admin/tags')}>
                                     Теги
                                </Button>
                                <Button component={RouterLink} to="/admin/users" startIcon={<ManageAccountsIcon />} sx={navButtonStyle('/admin/users')}>
                                     Пользователи
                                </Button>
                                <Button component={RouterLink} to="/admin/assign-event" startIcon={<AssignmentIndIcon />} sx={navButtonStyle('/admin/assign-event')}>
                                      Назначить событие
                                 </Button>
                             </>
                         )}
                     </Box>

                     {/* TODO: Добавить кнопку-бургер и выпадающее меню для мобильной версии */}
                     {/* <IconButton sx={{ display: { xs: 'flex', md: 'none' }, ml: 'auto' }} ... /> */}

                    {/* Информация о пользователе и роли (прижимаем к правому краю, делаем кликабельной) */}
                    {user && (
                        <Tooltip title="Перейти в профиль">
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    ml: { xs: 0, md: 'auto' }, // ml:auto только на >md
                                    cursor: 'pointer', // Показываем, что можно кликнуть
                                    p: 0.5, // Небольшие отступы для области клика
                                    borderRadius: 1,
                                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)'} // Эффект при наведении
                                }}
                                onClick={goToProfile} // <-- Обработчик клика для перехода в профиль
                            >
                                {/* Аватар с инициалами */}
                                <Avatar sx={{ width: 32, height: 32, mr: 1, fontSize: '0.875rem', bgcolor: 'secondary.light' }}>
                                     {getInitials(user.fullName || '') || <AccountCircleIcon fontSize='small'/>} {/* Fallback иконка */}
                                </Avatar>
                                {/* Имя пользователя (скрывается на малых экранах) */}
                                <Typography sx={{ mr: 1.5, display: { xs: 'none', lg: 'block' } }}>
                                    {user.fullName || user.email}
                                </Typography>
                                {/* Роль */}
                                <Chip
                                    icon={roleDisplay.icon}
                                    label={roleDisplay.label}
                                    size="small"
                                    color={user.role === 'administrator' ? 'warning' : 'info'}
                                    variant="filled"
                                    sx={{ mr: 1 }}
                                />
                            </Box>
                        </Tooltip>
                    )}
                     {/* Кнопка Выйти (Иконка) */}
                    <Tooltip title="Выйти">
                        <IconButton color="inherit" onClick={handleLogout} sx={{ ml: 1 }}> {/* Небольшой отступ слева */}
                            <LogoutIcon />
                        </IconButton>
                     </Tooltip>
                </Toolbar>
            </AppBar>

            {/* Основной контент страницы */}
            <Container component="main" sx={{ flexGrow: 1, py: { xs: 2, sm: 3 } }}> {/* Адаптивные отступы */}
                <Outlet /> {/* Сюда будет рендериться содержимое дочерних роутов */}
            </Container>

            {/* Подвал */}
            <Box component="footer" sx={{ bgcolor: 'background.paper', p: 2, mt: 'auto', borderTop: '1px solid', borderColor: 'divider' }}>
                 <Typography variant="body2" color="text.secondary" align="center">
                   © {new Date().getFullYear()} Ваш Университет. Все права защищены.
                 </Typography>
            </Box>
        </Box>
    );
}

export default MainLayout;