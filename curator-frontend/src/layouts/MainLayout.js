// Полный путь: src/layouts/MainLayout.js
import React, { useState } from 'react';
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
    IconButton,
    Tooltip,
    Avatar,
    Menu, // Для выпадающего админского меню
    MenuItem, // Для выпадающего админского меню
    Drawer, // Для мобильного меню
    List, // Для мобильного меню
    ListItemButton, // Для мобильного меню
    ListItemIcon, // Для иконок в меню
    ListItemText, // Для текста в меню
    Divider // Для разделителей в меню
} from '@mui/material';
// Иконки Material UI
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import GroupsIcon from '@mui/icons-material/Groups';
import EventNoteIcon from '@mui/icons-material/EventNote';
import DescriptionIcon from '@mui/icons-material/Description';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import LabelIcon from '@mui/icons-material/Label';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu'; // Иконка-бургер
import SettingsIcon from '@mui/icons-material/Settings'; // Для админского меню
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
  if (!name) return '';
  return name
    .split(' ')
    .map((n) => n[0])
    .filter((n, i, arr) => n && (i === 0 || (arr.length > 1 && i === arr.length - 1))) // Берем первую и последнюю букву ФИО, если есть
    .join('')
    .toUpperCase();
};


function MainLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Состояние для админского выпадающего меню (десктоп)
    const [adminMenuAnchorEl, setAdminMenuAnchorEl] = useState(null);
    const openAdminMenu = Boolean(adminMenuAnchorEl);
    const handleAdminMenuOpen = (event) => setAdminMenuAnchorEl(event.currentTarget);
    const handleAdminMenuClose = () => setAdminMenuAnchorEl(null);

    // Состояние для мобильного выезжающего меню (Drawer)
    const [mobileOpen, setMobileOpen] = useState(false);
    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    const handleLogout = () => { logout(); navigate('/login'); };
    const roleDisplay = user ? getRoleDisplay(user.role) : { label: '', icon: null };
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
        textTransform: 'none', // Убираем КАПС
        '&:hover': { // Убираем стандартный фон при наведении
            backgroundColor: 'rgba(255, 255, 255, 0.08)'
        }
    });

    // --- Функция перехода в профиль ---
     const goToProfile = () => {
         navigate('/profile');
     };
     // --------------------------------

    // --- Пункты меню для мобильного Drawer ---
    const drawerItems = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'left', width: 250 }} role="presentation">
            <Typography variant="h6" sx={{ my: 2, ml: 2 }}>Меню</Typography>
            <Divider />
            <List>
                <ListItemButton component={RouterLink} to="/events"> <ListItemIcon><EventNoteIcon /></ListItemIcon> <ListItemText primary="Мероприятия" /> </ListItemButton>
                <ListItemButton component={RouterLink} to="/calendar"> <ListItemIcon><CalendarMonthIcon /></ListItemIcon> <ListItemText primary="Календарь" /> </ListItemButton>
                <ListItemButton component={RouterLink} to="/groups"> <ListItemIcon><GroupsIcon /></ListItemIcon> <ListItemText primary="Группы" /> </ListItemButton>
                <ListItemButton component={RouterLink} to="/documents"> <ListItemIcon><DescriptionIcon /></ListItemIcon> <ListItemText primary="Документы" /> </ListItemButton>
                <ListItemButton component={RouterLink} to="/students"> <ListItemIcon><PeopleAltIcon /></ListItemIcon> <ListItemText primary="Студенты" /> </ListItemButton>
                {(user?.role === 'curator' || user?.role === 'administrator') && (
                    <ListItemButton component={RouterLink} to="/curator-reports"> <ListItemIcon><AssessmentIcon /></ListItemIcon> <ListItemText primary={user?.role === 'administrator' ? 'Отчеты кураторов' : 'Мои Отчеты'} /> </ListItemButton>
                )}
                {/* Админские пункты в мобильном меню */}
                {user?.role === 'administrator' && (
                    <>
                        <Divider sx={{ my: 1 }}><Chip label="Админ-панель" size="small"/></Divider>
                        <ListItemButton component={RouterLink} to="/admin/users"> <ListItemIcon><ManageAccountsIcon /></ListItemIcon> <ListItemText primary="Пользователи" /> </ListItemButton>
                        <ListItemButton component={RouterLink} to="/admin/tags"> <ListItemIcon><LabelIcon /></ListItemIcon> <ListItemText primary="Теги студентов" /> </ListItemButton>
                        <ListItemButton component={RouterLink} to="/admin/assign-event"> <ListItemIcon><AssignmentIndIcon /></ListItemIcon> <ListItemText primary="Назначить событие" /> </ListItemButton>
                    </>
                )}
            </List>
        </Box>
    );
    // ------------------------------------

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar position="static">
                <Toolbar>
                    {/* Иконка-бургер для мобильных */}
                    <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { md: 'none' } }} >
                        <MenuIcon />
                    </IconButton>

                    {/* Название/Логотип */}
                    <Typography variant="h6" component={RouterLink} to="/events" sx={{ flexGrow: { xs: 1, md: 0 }, mr: { md: 2 }, textDecoration: 'none', color: 'inherit' }}>
                        Кабинет Куратора
                    </Typography>

                    {/* Десктопная навигация */}
                     <Box sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1 }}>
                        <Button component={RouterLink} to="/events" startIcon={<EventNoteIcon />} sx={navButtonStyle('/events')}> Мероприятия </Button>
                        <Button component={RouterLink} to="/calendar" startIcon={<CalendarMonthIcon />} sx={navButtonStyle('/calendar')}> Календарь </Button>
                        <Button component={RouterLink} to="/groups" startIcon={<GroupsIcon />} sx={navButtonStyle('/groups')}> Группы </Button>
                        <Button component={RouterLink} to="/documents" startIcon={<DescriptionIcon />} sx={navButtonStyle('/documents')}> Документы </Button>
                        <Button component={RouterLink} to="/students" startIcon={<PeopleAltIcon />} sx={navButtonStyle('/students')}> Студенты </Button>
                        {(user?.role === 'curator' || user?.role === 'administrator') && (
                             <Button component={RouterLink} to="/curator-reports" startIcon={<AssessmentIcon />} sx={navButtonStyle('/curator-reports')}> {user?.role === 'administrator' ? 'Отчеты кураторов' : 'Мои Отчеты'} </Button>
                         )}
                         {/* Кнопка для админского выпадающего меню */}
                         {user?.role === 'administrator' && (
                            <Button id="admin-menu-button" aria-controls={openAdminMenu ? 'admin-menu' : undefined} aria-haspopup="true" aria-expanded={openAdminMenu ? 'true' : undefined} onClick={handleAdminMenuOpen} startIcon={<SettingsIcon />} sx={navButtonStyle('/admin')}>
                                 Администрирование
                            </Button>
                         )}
                     </Box>

                    {/* Информация о пользователе и роли */}
                    {user && (
                        <Tooltip title="Перейти в профиль">
                            <Box
                                sx={{ display: 'flex', alignItems: 'center', ml: { xs: 0, md: 'auto' }, cursor: 'pointer', p: 0.5, borderRadius: 1, '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)'} }}
                                onClick={goToProfile}
                            >
                                <Avatar sx={{ width: 32, height: 32, mr: 1, fontSize: '0.875rem', bgcolor: 'secondary.light' }}>
                                     {getInitials(user.fullName || '') || <AccountCircleIcon fontSize='small'/>}
                                </Avatar>
                                <Typography sx={{ mr: 1.5, display: { xs: 'none', lg: 'block' } }}>
                                    {user.fullName || user.email}
                                </Typography>
                                <Chip icon={roleDisplay.icon} label={roleDisplay.label} size="small" color={user.role === 'administrator' ? 'warning' : 'info'} variant="filled" sx={{ mr: 1 }} />
                            </Box>
                        </Tooltip>
                    )}
                    <Tooltip title="Выйти">
                        <IconButton color="inherit" onClick={handleLogout} sx={{ ml: user ? 1 : 'auto' }}>
                            <LogoutIcon />
                        </IconButton>
                     </Tooltip>
                </Toolbar>
            </AppBar>

            {/* Мобильное выезжающее меню (Drawer) */}
            <Box component="nav">
                <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 }, }}>
                    {drawerItems}
                </Drawer>
            </Box>

            {/* Админское выпадающее меню (для десктопа) */}
            <Menu id="admin-menu" anchorEl={adminMenuAnchorEl} open={openAdminMenu} onClose={handleAdminMenuClose} MenuListProps={{ 'aria-labelledby': 'admin-menu-button' }} PaperProps={{ style: { minWidth: '220px' } }}>
                <MenuItem component={RouterLink} to="/admin/users" onClick={handleAdminMenuClose}> <ListItemIcon><ManageAccountsIcon fontSize="small" /></ListItemIcon> <ListItemText>Пользователи</ListItemText> </MenuItem>
                <MenuItem component={RouterLink} to="/admin/tags" onClick={handleAdminMenuClose}> <ListItemIcon><LabelIcon fontSize="small" /></ListItemIcon> <ListItemText>Теги студентов</ListItemText> </MenuItem>
                <MenuItem component={RouterLink} to="/admin/assign-event" onClick={handleAdminMenuClose}> <ListItemIcon><AssignmentIndIcon fontSize="small" /></ListItemIcon> <ListItemText>Назначить событие</ListItemText> </MenuItem>
                {/* TODO: Добавить другие админские пункты */}
            </Menu>

            {/* Основной контент страницы */}
            <Container component="main" sx={{ flexGrow: 1, py: { xs: 2, sm: 3 } }}>
                <Outlet />
            </Container>

            {/* Подвал */}
            <Box component="footer" sx={{ bgcolor: 'background.paper', p: 2, mt: 'auto', borderTop: '1px solid', borderColor: 'divider' }}>
                 <Typography variant="body2" color="text.secondary" align="center">
                   © {new Date().getFullYear()} Все права защищены.
                 </Typography>
            </Box>
        </Box>
    );
}

export default MainLayout;