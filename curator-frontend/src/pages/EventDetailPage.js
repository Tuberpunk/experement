// Полный путь: src/pages/EventDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
// Компоненты MUI
import {
    Container, Typography, Box, Paper, Grid, CircularProgress, Alert, Button, Divider, Chip,
    List, ListItem, ListItemText, ListItemIcon, Link, // Добавлен Link
    ImageList, ImageListItem, ImageListItemBar, // Для галереи медиа
    Tooltip, IconButton
} from '@mui/material';
// Иконки MUI
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CategoryIcon from '@mui/icons-material/Category';
import PersonIcon from '@mui/icons-material/Person';
import PaidIcon from '@mui/icons-material/Paid';
import LinkIcon from '@mui/icons-material/Link';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'; // Для медиа (можно заменить на ImageIcon)
import GroupIcon from '@mui/icons-material/Group'; // Для категорий/гостей
import InfoIcon from '@mui/icons-material/Info'; // Для уровня/формата
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'; // Для дат
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // Для статуса (или Timestamps)
import DownloadIcon from '@mui/icons-material/Download'; // Для скачивания
import VideocamIcon from '@mui/icons-material/Videocam'; // Для видео
import ImageIcon from '@mui/icons-material/Image'; // Для фото
import FlagIcon from '@mui/icons-material/Flag'; // Для направления
import LanguageIcon from '@mui/icons-material/Language'; // Иностранцы
import ChildCareIcon from '@mui/icons-material/ChildCare'; // Несовершеннолетние
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'; // Приглашенные гости
// Контекст, API, Компоненты
import { useAuth } from '../contexts/AuthContext'; // Убедитесь, что путь правильный
import { getEventById, deleteEvent } from '../api/events'; // Используем API для событий
import ConfirmationDialog from '../components/ConfirmationDialog'; // Диалог подтверждения
import StatusChip from '../components/StatusChip'; // Чип статуса
// Форматирование даты
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'http://localhost:5000';

function EventDetailPage() {
    const { id } = useParams(); // Получаем ID мероприятия из URL
    const navigate = useNavigate();
    const { user } = useAuth(); // Получаем текущего пользователя
    const [event, setEvent] = useState(null); // Состояние для данных мероприятия
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(''); // Состояние для ошибок
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false); // Состояние для диалога удаления

    // Функция загрузки данных мероприятия
    const fetchEvent = useCallback(async () => {
        setLoading(true); setError('');
        try {
            // ВАЖНО: Убедитесь, что API getEventById включает ВСЕ необходимые связанные данные:
            // Creator, Direction, Level, Format, ParticipantCategories, FundingSources, MediaLinks, EventMedias, InvitedGuests
            const data = await getEventById(id);
            setEvent(data);
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Не удалось загрузить данные мероприятия.';
            setError(message);
            console.error("Fetch event detail error:", err);
            // Если не найдено или доступ запрещен, возвращаем пользователя к списку
            if(err.response?.status === 404 || err.response?.status === 403) {
                 setTimeout(() => navigate('/events', { replace: true }), 3000);
            }
        } finally { setLoading(false); }
    }, [id, navigate]);

    // Загрузка данных при монтировании или смене ID
    useEffect(() => { fetchEvent(); }, [fetchEvent]);

    // --- Логика удаления ---
    const handleDeleteClick = () => setOpenDeleteDialog(true);
    const handleCloseDeleteDialog = () => setOpenDeleteDialog(false);
    const handleConfirmDelete = async () => {
        setError(''); // Сброс ошибки перед попыткой
        try {
            await deleteEvent(id); // Вызываем API для удаления
            navigate('/events'); // Возвращаемся к списку после удаления
            // TODO: Показать Snackbar об успехе на странице списка
        } catch (err) {
             const message = err.response?.data?.message || err.message || 'Не удалось удалить мероприятие';
             setError(message); // Показываем ошибку на этой странице
             console.error("Delete event error:", err);
             handleCloseDeleteDialog(); // Закрываем диалог
        }
    };

    // Проверка прав на удаление/редактирование (Админ или Автор)
    const canManage = user?.role === 'administrator' || user?.id === event?.createdByUserId;

    // --- Вспомогательные функции ---
    // Функция для определения MIME типа видео по URL (упрощенная)
    const getVideoMimeType = (url = '') => {
        if (url.endsWith('.mp4')) return 'video/mp4';
        if (url.endsWith('.webm')) return 'video/webm';
        if (url.endsWith('.ogv')) return 'video/ogg';
        return 'video/mp4'; // Default
    };

    // Функция для получения имени файла из URL (упрощенная)
    const getFilenameFromUrl = (url = '') => {
        try {
            const decodedUrl = decodeURI(url); // Декодируем URL на случай кириллицы
            return decodedUrl.substring(decodedUrl.lastIndexOf('/') + 1);
        } catch {
            return 'download'; // Имя по умолчанию
        }
    };

    // Функция для безопасного отображения массива имен
    const renderNameList = (items = [], keyField = 'id', nameField = 'name') => items && items.length > 0
        ? items.map(item => item[nameField] || 'N/A').join(', ')
        : 'Не указаны';

    // --- Рендеринг ---
    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;
    }
    // Показываем ошибку, если она есть (даже если мероприятие загружено, ошибка могла быть при удалении)
    if (error && !event) { // Показываем только если нет данных мероприятия
        return <Container maxWidth="md" sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
    }
    if (!event) {
        // Такое может случиться, если произошла ошибка 404/403 и сработал navigate
        return <Container maxWidth="md" sx={{ mt: 4 }}><Typography>Мероприятие не найдено или доступ запрещен.</Typography></Container>;
    }

    console.log('Event Media Data:', event?.EventMedias);

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
             <Paper sx={{ p: { xs: 2, md: 3 } }}>
                {/* --- Заголовок и кнопки управления --- */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                     <Typography variant="h4" component="h1" gutterBottom sx={{ mr: 2, wordBreak: 'break-word' }}>
                         {event.title}
                     </Typography>
                     {/* Кнопки доступны админу или создателю */}
                     {canManage && (
                        <Box sx={{ flexShrink: 0}}> {/* Чтобы кнопки не переносились по одной */}
                            <Button variant="outlined" startIcon={<EditIcon />} component={RouterLink} to={`/events/${event.eventId}/edit`} sx={{ mr: 1, mb: {xs: 1, sm: 0}}}> Редактировать </Button>
                            <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteClick} sx={{ mb: {xs: 1, sm: 0}}}> Удалить </Button>
                        </Box>
                    )}
                </Box>
                 {/* Показываем ошибку удаления, если она возникла */}
                 {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Divider sx={{ mb: 3 }} />

                 {/* --- Детальная информация о мероприятии --- */}
                 <Grid container spacing={3}>
                     {/* Левая колонка: Описание, детали, ссылки, гости */}
                     <Grid item xs={12} md={7}>
                         <Typography variant="h6" gutterBottom>Описание</Typography>
                          <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                            {event.description}
                          </Typography>
                          <Divider sx={{ my: 2 }} />

                          <Typography variant="h6" gutterBottom>Детали проведения</Typography>
                         <List dense>
                             <ListItem><ListItemIcon><EventIcon/></ListItemIcon><ListItemText primary="Дата начала:" secondary={event.startDate ? format(new Date(event.startDate), 'dd MMMM yyyy', { locale: ru }) : '-'} /> </ListItem>
                             <ListItem><ListItemIcon><EventIcon/></ListItemIcon><ListItemText primary="Дата окончания:" secondary={event.endDate ? format(new Date(event.endDate), 'dd MMMM yyyy', { locale: ru }) : 'Однодневное'} /> </ListItem>
                             <ListItem><ListItemIcon><FlagIcon/></ListItemIcon><ListItemText primary="Направление:" secondary={event.Direction?.name || '-'} /> </ListItem>
                            <ListItem><ListItemIcon><InfoIcon/></ListItemIcon><ListItemText primary="Уровень:" secondary={event.Level?.name || '-'} /> </ListItem>
                             <ListItem><ListItemIcon><InfoIcon/></ListItemIcon><ListItemText primary="Формат:" secondary={event.Format?.name || '-'} /> </ListItem>
                             <ListItem><ListItemIcon><LocationOnIcon/></ListItemIcon><ListItemText primary="Место:" secondary={event.locationText || '-'} /> </ListItem>
                             <ListItem><ListItemIcon><LocationOnIcon/></ListItemIcon><ListItemText primary="Адрес:" secondary={event.addressText || '-'} /> </ListItem>
                         </List>
                         <Divider sx={{ my: 2 }} />

                         <Typography variant="h6" gutterBottom>Ссылки СМИ</Typography>
                         {event.MediaLinks && event.MediaLinks.length > 0 ? (
                             <List dense disablePadding>
                                 {event.MediaLinks.map(link => (
                                     <ListItem key={link.linkId} disableGutters>
                                         <ListItemIcon sx={{minWidth: '35px'}}><LinkIcon fontSize='small'/></ListItemIcon>
                                         <ListItemText primary={<Link href={link.url} target="_blank" rel="noopener noreferrer" underline="hover">{link.url}</Link>} secondary={link.description}/>
                                     </ListItem>
                                 ))}
                             </List>
                         ) : <Typography variant="body2" color="text.secondary">Нет ссылок.</Typography>}
                         <Divider sx={{ my: 2 }} />

                         <Typography variant="h6" gutterBottom>Приглашенные гости / эксперты</Typography>
                         {event.InvitedGuests && event.InvitedGuests.length > 0 ? (
                             <List dense disablePadding>
                                {event.InvitedGuests.map((guest, index) => (
                                    <ListItem key={guest.guestId || index} disableGutters>
                                        <ListItemIcon sx={{minWidth: '35px'}}><PeopleOutlineIcon fontSize="small"/></ListItemIcon>
                                        <ListItemText
                                            primary={guest.fullName}
                                            secondary={`${guest.position || 'Должность не указана'}${guest.organization ? `, ${guest.organization}` : ''}`}
                                         />
                                     </ListItem>
                                 ))}
                             </List>
                         ) : <Typography variant="body2" color="text.secondary">Нет приглашенных гостей.</Typography>}

                     </Grid>

                     {/* Правая колонка: Статус, Участники, Ответственный, Финансы, Автор */}
                     <Grid item xs={12} md={5}>
                         <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, mb: 2 }}>
                             <Typography variant="h6" gutterBottom>Статус и Участники</Typography>
                             <List dense disablePadding>
                                <ListItem><ListItemIcon><AccessTimeIcon/></ListItemIcon><ListItemText primary="Статус:" secondary={<StatusChip status={event.status} />} /> </ListItem>
                                <ListItem><ListItemIcon><GroupIcon/></ListItemIcon><ListItemText primary="Категории участников:" secondary={renderNameList(event.ParticipantCategories, 'categoryId', 'name')} /> </ListItem>
                                <ListItem><ListItemIcon><GroupIcon/></ListItemIcon><ListItemText primary="Общее кол-во участников:" secondary={event.participantCount ?? 'Не указано'} /> </ListItem>
                                <ListItem><ListItemIcon><LanguageIcon/></ListItemIcon><ListItemText primary="Иностранцы:" secondary={`${event.hasForeigners ? 'Да' : 'Нет'} (${event.foreignerCount ?? 0} чел.)`} /> </ListItem>
                                <ListItem><ListItemIcon><ChildCareIcon/></ListItemIcon><ListItemText primary="Несовершеннолетние:" secondary={`${event.hasMinors ? 'Да' : 'Нет'} (${event.minorCount ?? 0} чел.)`} /> </ListItem>
                                {event.participantsInfo && <ListItem><ListItemIcon><InfoIcon/></ListItemIcon><ListItemText primary="Доп. инфо об участниках:" secondary={event.participantsInfo} sx={{whiteSpace: 'pre-wrap'}}/> </ListItem>}
                             </List>
                         </Box>

                         <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, mb: 2 }}>
                             <Typography variant="h6" gutterBottom>Ответственный</Typography>
                             <List dense disablePadding>
                                <ListItem><ListItemIcon><PersonIcon/></ListItemIcon><ListItemText primary="ФИО:" secondary={event.responsibleFullName || '-'} /> </ListItem>
                                <ListItem><ListItemIcon><InfoIcon/></ListItemIcon><ListItemText primary="Должность:" secondary={event.responsiblePosition || '-'} /> </ListItem>
                                <ListItem><ListItemIcon><InfoIcon/></ListItemIcon><ListItemText primary="Телефон:" secondary={event.responsiblePhone || '-'} /> </ListItem>
                                <ListItem><ListItemIcon><InfoIcon/></ListItemIcon><ListItemText primary="Email:" secondary={event.responsibleEmail || '-'} /> </ListItem>
                            </List>
                        </Box>

                        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, mb: 2 }}>
                             <Typography variant="h6" gutterBottom>Финансирование</Typography>
                             <List dense disablePadding>
                                 <ListItem><ListItemIcon><PaidIcon/></ListItemIcon><ListItemText primary="Источники:" secondary={renderNameList(event.FundingSources, 'sourceId', 'name')} /> </ListItem>
                                 <ListItem><ListItemIcon><PaidIcon/></ListItemIcon><ListItemText primary="Объем (тыс. руб.):" secondary={event.fundingAmount ?? 'Не указан'} /> </ListItem>
                             </List>
                         </Box>

                         <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, mb: 2 }}>
                            <Typography variant="h6" gutterBottom>Информация о записи</Typography>
                            <List dense disablePadding>
                                <ListItem><ListItemIcon><PersonIcon/></ListItemIcon><ListItemText primary="Создал запись:" secondary={event.Creator?.fullName || 'N/A'} /> </ListItem>
                                <ListItem><ListItemIcon><CalendarMonthIcon/></ListItemIcon><ListItemText primary="Создано:" secondary={event.createdAt ? format(new Date(event.createdAt), 'dd.MM.yyyy HH:mm') : '-'} /> </ListItem>
                                <ListItem><ListItemIcon><CalendarMonthIcon/></ListItemIcon><ListItemText primary="Обновлено:" secondary={event.updatedAt ? format(new Date(event.updatedAt), 'dd.MM.yyyy HH:mm') : '-'} /> </ListItem>
                            </List>
                         </Box>
                     </Grid>

                      {/* Секция Медиафайлов */}
                      <Grid item xs={12}>
                         <Divider sx={{ my: 2 }} />
                         <Typography variant="h6" gutterBottom>Прикрепленные медиафайлы</Typography>
                         {event.EventMedias && event.EventMedias.length > 0 ? (
                            <ImageList variant="masonry" cols={3} gap={8}>
                                {event.EventMedias.map((media) => {
                                   // --- Формируем АБСОЛЮТНЫЙ URL ---
                                    const absoluteMediaUrl = media.mediaUrl?.startsWith('http')
                                         ? media.mediaUrl // Если уже абсолютный
                                         : `${BACKEND_BASE_URL}${media.mediaUrl?.startsWith('/') ? '' : '/'}${media.mediaUrl || ''}`; // Формируем, добавляя / если нужно
                                   // ---------------------------------
                                   const filename = getFilenameFromUrl(media.mediaUrl);

                                   return (
                                       <ImageListItem key={media.mediaId}>
                                           {media.mediaType === 'photo' && (
                                               <img src={absoluteMediaUrl} alt={media.description || event.title} loading="lazy"
                                                   style={{ display: 'block', width: '100%', height: 'auto', cursor: 'pointer' }}
                                                   onClick={() => window.open(absoluteMediaUrl, '_blank')}
                                               />
                                           )}
                                           {media.mediaType === 'video' && (
                                               <video controls style={{ width: '100%', height: 'auto', display: 'block' }} >
                                                   <source src={absoluteMediaUrl} type={getVideoMimeType(media.mediaUrl)} />
                                                   Ваш браузер не поддерживает тег video.
                                               </video>
                                           )}
                                           <ImageListItemBar
                                               title={media.description || filename}
                                               subtitle={media.author ? `Автор: ${media.author}`: ''}
                                               actionIcon={
                                                   <Tooltip title="Скачать файл">
                                                       <IconButton sx={{ color: 'rgba(255, 255, 255, 0.7)' }} aria-label={`Скачать ${media.description || 'файл'}`}
                                                           href={absoluteMediaUrl} // <-- Абсолютный URL
                                                           download={filename} // <-- Имя файла
                                                           target="_blank" rel="noopener noreferrer"
                                                       > <DownloadIcon /> </IconButton>
                                                   </Tooltip>
                                               }
                                           />
                                       </ImageListItem>
                                   );
                               })}
                            </ImageList>
                         ) : (
                            <Typography variant="body2" color="text.secondary">Нет прикрепленных медиафайлов.</Typography>
                         )}
                     </Grid>
                 </Grid>
             </Paper>

             {/* Диалог подтверждения удаления */}
             <ConfirmationDialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                title="Удалить мероприятие?"
                message={`Вы уверены, что хотите удалить мероприятие "${event?.title || ''}"? Это действие необратимо.`}
            />
         </Container>
    );
}

export default EventDetailPage;