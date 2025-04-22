// Полный путь: src/pages/ProfilePage.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Typography, Box, Paper, CircularProgress, Alert, Avatar, Chip,
    List, ListItem, ListItemIcon, ListItemText, Divider, Button, Grid // <-- Добавьте Grid
} from '@mui/material';
// Иконки
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // <-- Добавьте эту строку
import CancelIcon from '@mui/icons-material/Cancel'; // <-- Добавьте эту строку
// Контекст, API 
import { useAuth } from '../contexts/AuthContext';
import { getMyProfile } from '../api/me'; // или '../api/me' - используйте ваш правильный путь
// Форматирование даты
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Вспомогательная функция для инициалов
const getInitials = (name = '') => {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter((_, i, arr) => i === 0 || i === arr.length - 1) // Берем первую и последнюю букву ФИО
    .join('')
    .toUpperCase();
};

// Вспомогательная функция для роли (можно взять из MainLayout)
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

    const fetchProfile = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await getMyProfile();
            setProfileData(data);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Не удалось загрузить профиль.');
            console.error("Fetch profile error:", err);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    const roleInfo = profileData?.Role ? getRoleDisplay(profileData.Role.roleName) : getRoleDisplay(user?.role);

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
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                     <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: '1.5rem' }}>
                         {getInitials(profileData.fullName)}
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
                    {/* TODO: Добавить кнопку редактирования профиля */}
                    {/* <Button variant="outlined" startIcon={<EditIcon />} component={RouterLink} to="/profile/edit">Редактировать</Button> */}
                </Box>

                <Divider sx={{ mb: 3 }}/>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                         <Typography variant="h6" gutterBottom>Контактная информация</Typography>
                         <List dense>
                            <ListItem><ListItemIcon><EmailIcon fontSize="small"/></ListItemIcon><ListItemText primary="Email" secondary={profileData.email} /></ListItem>
                            <ListItem><ListItemIcon><PhoneIcon fontSize="small"/></ListItemIcon><ListItemText primary="Телефон" secondary={profileData.phoneNumber || 'Не указан'} /></ListItem>
                         </List>
                    </Grid>
                     <Grid item xs={12} md={6}>
                         <Typography variant="h6" gutterBottom>Рабочая информация</Typography>
                         <List dense>
                             <ListItem><ListItemIcon><BadgeIcon fontSize="small"/></ListItemIcon><ListItemText primary="Должность" secondary={profileData.position || 'Не указана'} /></ListItem>
                             <ListItem><ListItemIcon><BusinessIcon fontSize="small"/></ListItemIcon><ListItemText primary="Подразделение/Кафедра" secondary={profileData.department || 'Не указано'} /></ListItem>
                         </List>
                     </Grid>
                     <Grid item xs={12}>
                           <Typography variant="h6" gutterBottom>Системная информация</Typography>
                           <List dense>
                               <ListItem><ListItemIcon><CalendarMonthIcon fontSize="small"/></ListItemIcon><ListItemText primary="Дата регистрации" secondary={profileData.createdAt ? format(new Date(profileData.createdAt), 'dd MMMM yyyy, HH:mm', { locale: ru }) : '-'} /></ListItem>
                               <ListItem><ListItemIcon>{profileData.isActive ? <CheckCircleIcon color="success" fontSize="small"/> : <CancelIcon color="action" fontSize="small"/>}</ListItemIcon><ListItemText primary="Статус аккаунта" secondary={profileData.isActive ? 'Активен' : 'Неактивен'} /></ListItem>
                           </List>
                     </Grid>
                     {/* TODO: Если нужно, отобразить группы куратора */}
                     {/* {profileData.ManagedGroups && ... } */}
                </Grid>
            </Paper>
        </Container>
    );
}

export default ProfilePage;