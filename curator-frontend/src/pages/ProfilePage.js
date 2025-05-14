// Полный путь: src/pages/ProfilePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom'; // Импортируем RouterLink
import {
    Container, Typography, Box, Paper, CircularProgress, Alert, Avatar, Chip,
    List, ListItem, ListItemIcon, ListItemText, Divider, Button, Grid // <-- Добавлен Grid
} from '@mui/material';
// Иконки
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge'; // Для должности
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business'; // Для подразделения
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import EditIcon from '@mui/icons-material/Edit'; // Для кнопки редактирования
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // <-- Добавлен
import CancelIcon from '@mui/icons-material/Cancel'; // <-- Добавлен
import VpnKeyIcon from '@mui/icons-material/VpnKey';
// Контекст и API
import { useAuth } from '../contexts/AuthContext'; // Убедитесь, что путь правильный
import { getMyProfile } from '../api/me'; // <-- Исправлен путь импорта
// Форматирование даты
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Вспомогательная функция для инициалов
const getInitials = (name = '') => {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter((n, i, arr) => n && (i === 0 || i === arr.length - 1)) // Берем первую и последнюю букву ФИО, если есть
    .join('')
    .toUpperCase();
};

// Вспомогательная функция для роли (можно вынести в utils)
const getRoleDisplay = (roleName) => {
     switch (roleName) {
        case 'administrator': return { label: 'Администратор', icon: <AdminPanelSettingsIcon fontSize="small"/> };
        case 'curator': return { label: 'Куратор', icon: <SupervisorAccountIcon fontSize="small"/> };
        default: return { label: roleName || 'Неизвестно', icon: null };
    }
};

function ProfilePage() {
    const { user } = useAuth(); // Можно взять базовые данные для отображения во время загрузки
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Функция загрузки профиля
    const fetchProfile = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await getMyProfile(); // Вызов API
            setProfileData(data);
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Не удалось загрузить профиль.';
            setError(message);
            console.error("Fetch profile error:", err);
        } finally { setLoading(false); }
    }, []);

    // Загрузка при монтировании
    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    // Получаем данные для отображения роли (из загруженных данных или из контекста, пока грузится)
    const roleInfo = profileData?.Role ? getRoleDisplay(profileData.Role.roleName) : getRoleDisplay(user?.role);

    // --- Рендеринг ---
    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (error) {
         return <Container maxWidth="sm" sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
    }

    if (!profileData) {
         return <Container maxWidth="sm" sx={{ mt: 4 }}><Typography>Не удалось загрузить данные профиля.</Typography></Container>;
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: { xs: 2, md: 4 } }}>
                {/* Шапка профиля */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                     <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: '1.5rem' }}>
                         {getInitials(profileData.fullName || '') || <PersonIcon />}
                     </Avatar>
                     <Box sx={{ flexGrow: 1}}>
                         <Typography variant="h4" component="h1">
                             {profileData.fullName}
                         </Typography>
                         <Chip
                            icon={roleInfo.icon}
                            label={roleInfo.label}
                            size="small"
                            color={profileData.Role?.roleName === 'administrator' ? 'warning' : 'info'}
                            variant="filled"
                            sx={{ mt: 0.5 }}
                        />
                     </Box>
                      {/* Кнопка редактирования */}
                      <Button
                         variant="outlined"
                         startIcon={<EditIcon />}
                         component={RouterLink} // Используем Link из роутера
                         to="/profile/edit" // Ссылка на страницу редактирования
                     >
                        Редактировать профиль
                          </Button>
                          {/* --- НОВАЯ КНОПКА СМЕНЫ ПАРОЛЯ --- */}
                          <Button
                             variant="outlined"
                             color="secondary" // Другой цвет для отличия
                             startIcon={<VpnKeyIcon />}
                             component={RouterLink}
                             to="/profile/change-password" // Ссылка на новую страницу
                          >
                             Сменить пароль
                          </Button>
                      
                 </Box>

                <Divider sx={{ mb: 3 }}/>

                {/* Секции с данными */}
                <Grid container spacing={3}>
                    {/* Контактная информация */}
                    <Grid item xs={12} md={6}>
                         <Typography variant="h6" gutterBottom>Контактная информация</Typography>
                         <List dense>
                            <ListItem><ListItemIcon><EmailIcon fontSize="small"/></ListItemIcon><ListItemText primary="Email" secondary={profileData.email} /></ListItem>
                            <ListItem><ListItemIcon><PhoneIcon fontSize="small"/></ListItemIcon><ListItemText primary="Телефон" secondary={profileData.phoneNumber || 'Не указан'} /></ListItem>
                         </List>
                    </Grid>
                    {/* Рабочая информация */}
                     <Grid item xs={12} md={6}>
                         <Typography variant="h6" gutterBottom>Рабочая информация</Typography>
                         <List dense>
                             <ListItem><ListItemIcon><BadgeIcon fontSize="small"/></ListItemIcon><ListItemText primary="Должность" secondary={profileData.position || 'Не указана'} /></ListItem>
                             <ListItem><ListItemIcon><BusinessIcon fontSize="small"/></ListItemIcon><ListItemText primary="Подразделение/Кафедра" secondary={profileData.department || 'Не указано'} /></ListItem>
                         </List>
                     </Grid>
                     {/* Системная информация */}
                     <Grid item xs={12}>
                           <Typography variant="h6" gutterBottom>Системная информация</Typography>
                           <List dense>
                               <ListItem><ListItemIcon><CalendarMonthIcon fontSize="small"/></ListItemIcon><ListItemText primary="Дата регистрации" secondary={profileData.createdAt ? format(new Date(profileData.createdAt), 'dd MMMM yyyy, HH:mm', { locale: ru }) : '-'} /></ListItem>
                               {/* Отображение статуса с иконкой */}
                               <ListItem><ListItemIcon>{profileData.isActive ? <CheckCircleIcon color="success" fontSize="small"/> : <CancelIcon color="action" fontSize="small"/>}</ListItemIcon><ListItemText primary="Статус аккаунта" secondary={profileData.isActive ? 'Активен' : 'Неактивен'} /></ListItem>
                           </List>
                     </Grid>
                     {/* TODO: Если нужно, отобразить группы куратора (из profileData.ManagedGroups) */}
                </Grid>
            </Paper>
        </Container>
    );
}

export default ProfilePage;