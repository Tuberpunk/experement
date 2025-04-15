// src/pages/EventDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Box, Paper, Grid, CircularProgress, Alert, Button, Chip,
    List, ListItem, ListItemIcon, ListItemText, Divider, Select, MenuItem, FormControl, Snackbar // Добавлен Snackbar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CategoryIcon from '@mui/icons-material/Category';
import PersonIcon from '@mui/icons-material/Person';
import PaidIcon from '@mui/icons-material/Paid';
import LinkIcon from '@mui/icons-material/Link';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'; // Для медиа
import GroupIcon from '@mui/icons-material/Group'; // Для гостей
import InfoIcon from '@mui/icons-material/Info';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // Для статуса
import { useAuth } from '../contexts/AuthContext';
import { getEventById, updateEventStatus } from '../api/events';
import StatusChip from '../components/StatusChip';
import { format } from 'date-fns'; // Используем date-fns

function EventDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusChanging, setStatusChanging] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' }); // Для уведомлений

    const fetchEvent = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getEventById(id);
             // Проверка прав доступа (дублируем на всякий случай)
             if (user.role !== 'administrator' && data.createdByUserId !== user.id) {
                 navigate('/forbidden'); // Или показать сообщение об ошибке
                 return;
             }
            setEvent(data);
            setSelectedStatus(data.status); // Устанавливаем текущий статус для Select
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Не удалось загрузить данные мероприятия.');
            console.error("Fetch event detail error:", err);
        } finally {
            setLoading(false);
        }
    }, [id, user, navigate]);

    useEffect(() => {
        fetchEvent();
    }, [fetchEvent]);

    const handleStatusChange = async (event) => {
        const newStatus = event.target.value;
        setSelectedStatus(newStatus); // Обновляем состояние Select
        setStatusChanging(true);
        setError(''); // Сброс ошибки
        try {
            await updateEventStatus(id, newStatus);
            setSnackbar({ open: true, message: 'Статус успешно обновлен!', severity: 'success' });
            // Обновляем данные события после смены статуса
            fetchEvent(); // Повторно загружаем данные
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Не удалось обновить статус.';
            setError(message); // Показываем ошибку рядом с Select
            setSelectedStatus(event.status); // Возвращаем старый статус в Select при ошибке
            console.error("Update status error:", err);
        } finally {
            setStatusChanging(false);
        }
    };

     // Определяем, может ли текущий пользователь редактировать
     const canEdit = user?.role === 'administrator' || user?.id === event?.createdByUserId;
     // Определяем, может ли текущий пользователь менять статус
     const canChangeStatus = (user?.role === 'administrator') ||
                           (user?.id === event?.createdByUserId && event?.status === 'Запланировано'); // Куратор может только на "Проведено"


    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar({ ...snackbar, open: false });
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (error && !event) { // Показываем ошибку только если данные не загрузились совсем
         return <Container maxWidth="md" sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
    }

    if (!event) {
        // Случай, когда не загружено, но и ошибки нет (маловероятно)
         return <Container maxWidth="md" sx={{ mt: 4 }}><Typography>Мероприятие не найдено.</Typography></Container>;
    }

    // Функция для безопасного отображения массива имен
    const renderNameList = (items) => items && items.length > 0 ? items.map(item => item.name || 'N/A').join(', ') : 'Нет';
    const renderLinkList = (items) => items && items.length > 0 ? (
        <List dense disablePadding>
            {items.map((item, index) => (
                <ListItem key={item.linkId || item.mediaId || item.guestId || index} disableGutters>
                    <ListItemIcon sx={{minWidth: '30px'}}><LinkIcon fontSize="small" /></ListItemIcon>
                    <ListItemText
                        primary={<a href={item.url || item.mediaUrl} target="_blank" rel="noopener noreferrer">{item.url || item.mediaUrl}</a>}
                        secondary={item.description || item.mediaType || ''}
                    />
                </ListItem>
            ))}
        </List>
    ) : 'Нет';
     const renderGuestList = (items) => items && items.length > 0 ? (
        <List dense disablePadding>
            {items.map((item, index) => (
                <ListItem key={item.guestId || index} disableGutters>
                    <ListItemIcon sx={{minWidth: '30px'}}><PersonIcon fontSize="small" /></ListItemIcon>
                    <ListItemText
                        primary={item.fullName}
                        secondary={`${item.position || 'Должность не указана'}, ${item.organization || 'Организация не указана'}`}
                    />
                </ListItem>
            ))}
        </List>
    ) : 'Нет';


    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap' }}>
                    <Typography variant="h4" component="h1" gutterBottom sx={{ mr: 2 }}>
                        {event.title}
                    </Typography>
                    {canEdit && (
                         <Button
                            variant="contained"
                            startIcon={<EditIcon />}
                            component={RouterLink}
                            to={`/events/${id}/edit`}
                            sx={{ mb: { xs: 1, md: 0 } }} // Отступ снизу на мобильных
                        >
                            Редактировать
                        </Button>
                    )}
                </Box>

                <Grid container spacing={3}>
                    {/* Левая колонка */}
                    <Grid item xs={12} md={8}>
                        <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                            {event.description}
                        </Typography>
                        <Divider sx={{ my: 2 }} />

                        {/* Детали мероприятия */}
                        <Grid container spacing={1}>
                             <Grid item xs={12} sm={6}>
                                <ListItem dense> <ListItemIcon><EventIcon /></ListItemIcon> <ListItemText primary="Дата начала:" secondary={event.startDate ? format(new Date(event.startDate), 'dd.MM.yyyy') : '-'} /> </ListItem>
                            </Grid>
                             <Grid item xs={12} sm={6}>
                                <ListItem dense> <ListItemIcon><EventIcon /></ListItemIcon> <ListItemText primary="Дата окончания:" secondary={event.endDate ? format(new Date(event.endDate), 'dd.MM.yyyy') : 'Однодневное'} /> </ListItem>
                            </Grid>
                             <Grid item xs={12} sm={6}>
                                <ListItem dense> <ListItemIcon><InfoIcon /></ListItemIcon> <ListItemText primary="Направление:" secondary={event.Direction?.name || '-'} /> </ListItem>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <ListItem dense> <ListItemIcon><InfoIcon /></ListItemIcon> <ListItemText primary="Уровень:" secondary={event.Level?.name || '-'} /> </ListItem>
                            </Grid>
                             <Grid item xs={12} sm={6}>
                                <ListItem dense> <ListItemIcon><InfoIcon /></ListItemIcon> <ListItemText primary="Формат:" secondary={event.Format?.name || '-'} /> </ListItem>
                            </Grid>
                             <Grid item xs={12} sm={6}>
                                <ListItem dense> <ListItemIcon><LocationOnIcon /></ListItemIcon> <ListItemText primary="Место:" secondary={event.locationText || '-'} /> </ListItem>
                            </Grid>
                             <Grid item xs={12}>
                                <ListItem dense> <ListItemIcon><LocationOnIcon /></ListItemIcon> <ListItemText primary="Адрес:" secondary={event.addressText || '-'} /> </ListItem>
                            </Grid>
                        </Grid>
                        <Divider sx={{ my: 2 }} />

                         {/* Ссылки, медиа, гости */}
                        <Typography variant="h6" gutterBottom>Дополнительно</Typography>
                         <Grid container spacing={1}>
                            <Grid item xs={12}><Typography variant="subtitle2">Ссылки:</Typography>{renderLinkList(event.MediaLinks)}</Grid>
                            <Grid item xs={12}><Typography variant="subtitle2">Медиа:</Typography>{renderLinkList(event.EventMedias)}</Grid> {/* Предполагаем ссылки */}
                            <Grid item xs={12}><Typography variant="subtitle2">Приглашенные гости:</Typography>{renderGuestList(event.InvitedGuests)}</Grid>
                         </Grid>

                    </Grid>

                    {/* Правая колонка */}
                    <Grid item xs={12} md={4}>
                        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                             <Typography variant="h6" gutterBottom>Информация</Typography>

                             {/* Статус */}
                             <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                 <ListItemIcon sx={{minWidth: '35px'}}><AccessTimeIcon /></ListItemIcon>
                                 <Typography variant="body1" sx={{ mr: 1 }}>Статус:</Typography>
                                 {!canChangeStatus && <StatusChip status={event.status} />}
                                 {canChangeStatus && (
                                    <FormControl size="small" sx={{ minWidth: 150 }} error={!!error}>
                                         <Select
                                            value={selectedStatus}
                                            onChange={handleStatusChange}
                                            disabled={statusChanging}
                                            displayEmpty
                                        >
                                            {user?.role === 'administrator' && <MenuItem value="Запланировано">Запланировано</MenuItem>}
                                            <MenuItem value="Проведено">Проведено</MenuItem>
                                             {user?.role === 'administrator' && <MenuItem value="Не проводилось (Отмена)">Не проводилось (Отмена)</MenuItem>}
                                        </Select>
                                         {/* Показываем ошибку смены статуса здесь */}
                                        {error && <Typography variant="caption" color="error">{error}</Typography>}
                                     </FormControl>
                                 )}
                                 {statusChanging && <CircularProgress size={20} sx={{ ml: 1 }} />}
                             </Box>
                             <Divider sx={{ my: 1 }} />

                            <ListItem dense> <ListItemIcon><CategoryIcon /></ListItemIcon> <ListItemText primary="Категории участников:" secondary={renderNameList(event.ParticipantCategories)} /> </ListItem>
                            <ListItem dense> <ListItemIcon><GroupIcon /></ListItemIcon> <ListItemText primary="Кол-во участников:" secondary={event.participantCount ?? '-'} /> </ListItem>
                             <ListItem dense> <ListItemIcon><InfoIcon /></ListItemIcon> <ListItemText primary="Иностранцы:" secondary={`${event.hasForeigners ? 'Да' : 'Нет'} (${event.foreignerCount || 0} чел.)`} /> </ListItem>
                             <ListItem dense> <ListItemIcon><InfoIcon /></ListItemIcon> <ListItemText primary="Несоверш-ние:" secondary={`${event.hasMinors ? 'Да' : 'Нет'} (${event.minorCount || 0} чел.)`} /> </ListItem>
                             <Divider sx={{ my: 1 }} />
                             <ListItem dense> <ListItemIcon><PersonIcon /></ListItemIcon> <ListItemText primary="Ответственный:" secondary={event.responsibleFullName || '-'} /> </ListItem>
                             <ListItem dense> <ListItemIcon><InfoIcon /></ListItemIcon> <ListItemText primary="Должность:" secondary={event.responsiblePosition || '-'} /> </ListItem>
                             <ListItem dense> <ListItemIcon><InfoIcon /></ListItemIcon> <ListItemText primary="Телефон:" secondary={event.responsiblePhone || '-'} /> </ListItem>
                             <ListItem dense> <ListItemIcon><InfoIcon /></ListItemIcon> <ListItemText primary="Email:" secondary={event.responsibleEmail || '-'} /> </ListItem>
                             <Divider sx={{ my: 1 }} />
                             <ListItem dense> <ListItemIcon><PaidIcon /></ListItemIcon> <ListItemText primary="Источники фин-я:" secondary={renderNameList(event.FundingSources)} /> </ListItem>
                            <ListItem dense> <ListItemIcon><PaidIcon /></ListItemIcon> <ListItemText primary="Объем фин-я (тыс. руб.):" secondary={event.fundingAmount ?? '-'} /> </ListItem>
                            <Divider sx={{ my: 1 }} />
                             <ListItem dense> <ListItemIcon><PersonIcon /></ListItemIcon> <ListItemText primary="Создал:" secondary={event.Creator?.fullName || 'N/A'} /> </ListItem>
                             <ListItem dense> <ListItemIcon><CalendarMonthIcon /></ListItemIcon> <ListItemText primary="Создано:" secondary={event.createdAt ? format(new Date(event.createdAt), 'dd.MM.yyyy HH:mm') : '-'} /> </ListItem>
                            <ListItem dense> <ListItemIcon><CalendarMonthIcon /></ListItemIcon> <ListItemText primary="Обновлено:" secondary={event.updatedAt ? format(new Date(event.updatedAt), 'dd.MM.yyyy HH:mm') : '-'} /> </ListItem>
                         </Box>
                    </Grid>
                </Grid>
            </Paper>
             {/* Snackbar для уведомлений */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default EventDetailPage;