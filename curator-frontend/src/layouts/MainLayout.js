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
import DnsIcon from '@mui/icons-material/Dns'; // Иконка для справочников
// Контекст аутентификации
import { useAuth } from '../contexts/AuthContext'; // Убедитесь, что путь правильный

// Вспомогательная функция для отображения роли
const getRoleDisplay = (roleName) => {
    switch (roleName) {
        case 'administrator':
            return { label: 'Администратор', icon: <AdminPanelSettingsIcon fontSize="small" sx={{ mr: 0.5 }}/> };
        case 'curator':
            return { label: 'Куратор', icon: <SupervisorAccountIcon fontSize="small" sx={{ mr: 0.5 }} /> };
        default:
            return { label: roleName || 'Неизвестная роль', icon: null };
    }
};

// Вспомогательная функция для получения инициалов
const getInitials = (name = '') => {
  if (!name || typeof name !== 'string') return '';
  const nameParts = name.split(' ').filter(part => part.length > 0);
  if (nameParts.length === 0) return '';
  if (nameParts.length === 1) return nameParts[0][0].toUpperCase();
  return (nameParts[0][0] + (nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '')).toUpperCase();
};


function MainLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [adminMenuAnchorEl, setAdminMenuAnchorEl] = useState(null);
    const openAdminMenu = Boolean(adminMenuAnchorEl);
    const handleAdminMenuOpen = (event) => setAdminMenuAnchorEl(event.currentTarget);
    const handleAdminMenuClose = () => setAdminMenuAnchorEl(null);

    const [mobileOpen, setMobileOpen] = useState(false);
    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    const handleLogout = () => { logout(); navigate('/login'); };
    const roleDisplay = user ? getRoleDisplay(user.role) : { label: '', icon: null };
    const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));

    const navButtonStyle = (path) => ({
        color: 'white', mr: 1, ml: 0.5, textTransform: 'none',
        fontWeight: isActive(path) ? 'bold' : 'normal',
        borderBottom: isActive(path) ? '2px solid white' : 'none',
        borderRadius: 0, padding: '6px 8px',
        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' }
    });

    const goToProfile = () => navigate('/profile');

    const drawerItems = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'left', width: 250 }} role="presentation">
            <Typography variant="h6" sx={{ my: 2, ml: 2, fontWeight: 'bold' }}>Меню</Typography>
            <Divider />
            <List>
                <ListItemButton component={RouterLink} to="/events" selected={isActive('/events')}> <ListItemIcon><EventNoteIcon /></ListItemIcon> <ListItemText primary="Мероприятия" /> </ListItemButton>
                <ListItemButton component={RouterLink} to="/calendar" selected={isActive('/calendar')}> <ListItemIcon><CalendarMonthIcon /></ListItemIcon> <ListItemText primary="Календарь" /> </ListItemButton>
                <ListItemButton component={RouterLink} to="/groups" selected={isActive('/groups')}> <ListItemIcon><GroupsIcon /></ListItemIcon> <ListItemText primary="Группы" /> </ListItemButton>
                <ListItemButton component={RouterLink} to="/documents" selected={isActive('/documents')}> <ListItemIcon><DescriptionIcon /></ListItemIcon> <ListItemText primary="Документы" /> </ListItemButton>
                <ListItemButton component={RouterLink} to="/students" selected={isActive('/students')}> <ListItemIcon><PeopleAltIcon /></ListItemIcon> <ListItemText primary="Студенты" /> </ListItemButton>
                {(user?.role === 'curator' || user?.role === 'administrator') && (
                    <ListItemButton component={RouterLink} to="/curator-reports" selected={isActive('/curator-reports')}> <ListItemIcon><AssessmentIcon /></ListItemIcon> <ListItemText primary={user?.role === 'administrator' ? 'Отчеты кураторов' : 'Мои Отчеты'} /> </ListItemButton>
                )}
                {/* Админские пункты в мобильном меню */}
                {user?.role === 'administrator' && (
                    <>
                        <Divider sx={{ my: 1 }}><Chip label="Админ-панель" size="small"/></Divider>
                        <ListItemButton component={RouterLink} to="/admin/users" selected={isActive('/admin/users')}> <ListItemIcon><ManageAccountsIcon /></ListItemIcon> <ListItemText primary="Пользователи" /> </ListItemButton>
                        <ListItemButton component={RouterLink} to="/admin/tags" selected={isActive('/admin/tags')}> <ListItemIcon><LabelIcon /></ListItemIcon> <ListItemText primary="Теги студентов" /> </ListItemButton>
                        <ListItemButton component={RouterLink} to="/admin/assign-event" selected={isActive('/admin/assign-event')}> <ListItemIcon><AssignmentIndIcon /></ListItemIcon> <ListItemText primary="Назначить событие" /> </ListItemButton>
                        <ListItemButton component={RouterLink} to="/admin/lookups" selected={isActive('/admin/lookups')}> <ListItemIcon><DnsIcon /></ListItemIcon> <ListItemText primary="Справочники" /> </ListItemButton>
                    </>
                )}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar position="static">
                <Toolbar>
                    <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { md: 'none' } }} >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" component={RouterLink} to="/events" sx={{ flexGrow: { xs: 1, md: 0 }, mr: { md: 2 }, textDecoration: 'none', color: 'inherit', fontWeight: 'bold' }}>
                        Кабинет Куратора
                    </Typography>
                     <Box sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1 }}>
                        <Button component={RouterLink} to="/events" startIcon={<EventNoteIcon />} sx={navButtonStyle('/events')}> Мероприятия </Button>
                        <Button component={RouterLink} to="/calendar" startIcon={<CalendarMonthIcon />} sx={navButtonStyle('/calendar')}> Календарь </Button>
                        <Button component={RouterLink} to="/groups" startIcon={<GroupsIcon />} sx={navButtonStyle('/groups')}> Группы </Button>
                        <Button component={RouterLink} to="/documents" startIcon={<DescriptionIcon />} sx={navButtonStyle('/documents')}> Документы </Button>
                        <Button component={RouterLink} to="/students" startIcon={<PeopleAltIcon />} sx={navButtonStyle('/students')}> Студенты </Button>
                        {(user?.role === 'curator' || user?.role === 'administrator') && (
                             <Button component={RouterLink} to="/curator-reports" startIcon={<AssessmentIcon />} sx={navButtonStyle('/curator-reports')}> {user?.role === 'administrator' ? 'Отчеты кураторов' : 'Мои Отчеты'} </Button>
                         )}
                         {user?.role === 'administrator' && (
                            <Button id="admin-menu-button" aria-controls={openAdminMenu ? 'admin-menu' : undefined} aria-haspopup="true" aria-expanded={openAdminMenu ? 'true' : undefined} onClick={handleAdminMenuOpen} startIcon={<SettingsIcon />} sx={navButtonStyle('/admin')}>
                                 Администрирование
                            </Button>
                         )}
                     </Box>
                    {user && (
                        <Tooltip title="Перейти в профиль">
                            <Box sx={{ display: 'flex', alignItems: 'center', ml: { xs: 0, md: 'auto' }, cursor: 'pointer', p: 0.5, borderRadius: 1, '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)'} }} onClick={goToProfile} >
                                <Avatar sx={{ width: 32, height: 32, mr: 1, fontSize: '0.875rem', bgcolor: 'secondary.light' }}> {getInitials(user.fullName || user.email || '') || <AccountCircleIcon fontSize='small'/>} </Avatar>
                                <Typography sx={{ mr: 1.5, display: { xs: 'none', lg: 'block' } }}> {user.fullName || user.email} </Typography>
                                <Chip icon={roleDisplay.icon} label={roleDisplay.label} size="small" color={user.role === 'administrator' ? 'warning' : 'info'} variant="filled" sx={{ mr: 1 }} />
                            </Box>
                        </Tooltip>
                    )}
                    <Tooltip title="Выйти">
                        <IconButton color="inherit" onClick={handleLogout} sx={{ ml: user ? 1 : 'auto' }}> <LogoutIcon /> </IconButton>
                     </Tooltip>
                </Toolbar>
            </AppBar>
            <Box component="nav">
                <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 }, }}>
                    {drawerItems}
                </Drawer>
            </Box>
            <Menu id="admin-menu" anchorEl={adminMenuAnchorEl} open={openAdminMenu} onClose={handleAdminMenuClose} MenuListProps={{ 'aria-labelledby': 'admin-menu-button' }} PaperProps={{ style: { minWidth: '230px' } }}>
                <MenuItem onClick={() => {handleAdminMenuClose(); navigate('/admin/users');}}> <ListItemIcon><ManageAccountsIcon fontSize="small" /></ListItemIcon> <ListItemText>Управление пользователями</ListItemText> </MenuItem>
                <MenuItem onClick={() => {handleAdminMenuClose(); navigate('/admin/assign-event');}}> <ListItemIcon><AssignmentIndIcon fontSize="small" /></ListItemIcon> <ListItemText>Назначить событие</ListItemText> </MenuItem>
                <MenuItem onClick={() => {handleAdminMenuClose(); navigate('/admin/lookups');}}> <ListItemIcon><DnsIcon fontSize="small" /></ListItemIcon> <ListItemText>Управление справочниками</ListItemText> </MenuItem>
            </Menu>
            <Container component="main" sx={{ flexGrow: 1, py: { xs: 2, sm: 3 } }}> <Outlet /> </Container>
        </Box>
    );
}

export default MainLayout;
