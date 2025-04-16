// Полный путь: src/pages/CuratorReportDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Box, Paper, Grid, CircularProgress, Alert, Button, Divider, Chip,
    List, ListItem, ListItemText, ListItemIcon, Tooltip, IconButton
} from '@mui/material';
// Иконки
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event'; // Дата события/отчета
import LocationOnIcon from '@mui/icons-material/LocationOn'; // Место
import PersonIcon from '@mui/icons-material/Person'; // Куратор / Студент
import GroupIcon from '@mui/icons-material/Group'; // Группа студентов
import InfoIcon from '@mui/icons-material/Info'; // Общая информация
import LinkIcon from '@mui/icons-material/Link'; // Ссылки
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // Продолжительность
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'; // Приглашенные гости
import FlagIcon from '@mui/icons-material/Flag'; // Направление
import LanguageIcon from '@mui/icons-material/Language'; // Иностранцы
import ChildCareIcon from '@mui/icons-material/ChildCare'; // Несовершеннолетние
import ArticleIcon from '@mui/icons-material/Article'; // Связанное мероприятие
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'; // Дата создания
// Контекст, API, Компоненты
import { useAuth } from '../contexts/AuthContext';
import { getCuratorReportById, deleteCuratorReport } from '../api/curatorReports';
import ConfirmationDialog from '../components/ConfirmationDialog';
// Форматирование даты
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

function CuratorReportDetailPage() {
    const { id } = useParams(); // Получаем ID отчета из URL
    const navigate = useNavigate();
    const { user } = useAuth(); // Получаем текущего пользователя для проверки прав
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

    // Функция загрузки данных отчета
    const fetchReport = useCallback(async () => {
        setLoading(true); setError('');
        try {
            // Запрос на бэкенд, права на чтение проверяются там же + в middleware loadReport
            const data = await getCuratorReportById(id);
            setReport(data);
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Не удалось загрузить данные отчета.';
            setError(message);
            console.error("Fetch report detail error:", err);
            // Если ошибка "не найдено" или "доступ запрещен", можно вернуть пользователя назад
            if(err.response?.status === 404 || err.response?.status === 403) {
                 setTimeout(() => navigate('/curator-reports'), 3000); // Возврат через 3 сек
            }
        } finally { setLoading(false); }
    }, [id, navigate]);

    // Загрузка при монтировании или смене ID
    useEffect(() => { fetchReport(); }, [fetchReport]);

    // --- Логика удаления ---
    const handleDeleteClick = () => setOpenDeleteDialog(true);
    const handleCloseDeleteDialog = () => setOpenDeleteDialog(false);
    const handleConfirmDelete = async () => {
        setError(''); // Сброс предыдущих ошибок
        try {
            await deleteCuratorReport(id);
            navigate('/curator-reports'); // Возврат к списку после удаления
            // Можно использовать Snackbar для сообщения об успехе на странице списка
        } catch (err) {
             const message = err.response?.data?.message || err.message || 'Не удалось удалить отчет';
             setError(message); // Показать ошибку на этой странице
             console.error("Delete report error:", err);
             handleCloseDeleteDialog(); // Закрыть диалог
        }
    };

    // Проверка прав на удаление (Админ или Автор отчета)
    const canDelete = user?.role === 'administrator' || user?.id === report?.curatorUserId;

    // --- Рендеринг ---
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    // Показываем ошибку, если она есть (даже если отчет загрузился, т.к. ошибка может быть при удалении)
    if (error && !report) return <Container maxWidth="md" sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
    if (!report) return <Container maxWidth="md" sx={{ mt: 4 }}><Typography>Отчет не найден или доступ запрещен.</Typography></Container>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
             <Paper sx={{ p: { xs: 2, md: 3 } }}>
                {/* --- Заголовок и кнопки --- */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                     <Box>
                        <Typography variant="h4" component="h1" gutterBottom sx={{ mr: 2 }}>
                             Отчет куратора
                        </Typography>
                         <Typography variant="h5" component="h2" color="text.secondary">
                             {report.reportTitle}
                         </Typography>
                    </Box>
                     {/* Кнопка удаления (если есть права) */}
                     {canDelete && (
                        <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteClick} sx={{ mb: {xs: 1, sm: 0}}}> Удалить отчет </Button>
                     )}
                 </Box>
                 {/* Показываем ошибку удаления */}
                 {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                 <Divider sx={{ mb: 3 }} />

                 {/* --- Детальная информация --- */}
                 <Grid container spacing={3}>
                     {/* Левая колонка: Детали отчета */}
                     <Grid item xs={12} md={7}>
                         <Typography variant="h6" gutterBottom>Детали</Typography>
                         <List dense>
                             <ListItem><ListItemIcon><EventIcon/></ListItemIcon><ListItemText primary="Дата проведения" secondary={format(new Date(report.reportDate), 'dd MMMM yyyy', { locale: ru })} /></ListItem>
                             <ListItem><ListItemIcon><LocationOnIcon/></ListItemIcon><ListItemText primary="Место проведения" secondary={report.locationText || 'Не указано'} /></ListItem>
                             <ListItem><ListItemIcon><FlagIcon/></ListItemIcon><ListItemText primary="Направление работы" secondary={report.directionText || 'Не указано'} /></ListItem>
                             <ListItem><ListItemIcon><AccessTimeIcon/></ListItemIcon><ListItemText primary="Продолжительность (минут)" secondary={report.durationMinutes ?? 'Не указано'} /></ListItem>
                             <ListItem><ListItemIcon><PeopleOutlineIcon/></ListItemIcon><ListItemText primary="Приглашенные гости/эксперты" secondary={report.invitedGuestsInfo || 'Не указано'} sx={{whiteSpace: 'pre-wrap'}} /></ListItem>
                             <ListItem><ListItemIcon><LinkIcon/></ListItemIcon><ListItemText primary="Ссылки на фото/публикации" secondary={report.mediaReferences || 'Не указано'} sx={{whiteSpace: 'pre-wrap'}} /></ListItem>
                         </List>

                         {/* Связанное мероприятие */}
                         {report.RelatedEvent && (
                            <>
                                <Divider sx={{my: 2}}/>
                                <Typography variant="h6" gutterBottom>Связанное мероприятие</Typography>
                                 <ListItem button component={RouterLink} to={`/events/${report.RelatedEvent.eventId}`} sx={{color: 'inherit', textDecoration: 'none'}}>
                                     <ListItemIcon><ArticleIcon/></ListItemIcon>
                                     <ListItemText primary={report.RelatedEvent.title} secondary={`Дата: ${format(new Date(report.RelatedEvent.startDate), 'dd.MM.yyyy')}`} />
                                 </ListItem>
                             </>
                         )}

                     </Grid>

                      {/* Правая колонка: Автор, Участники, Статистика */}
                     <Grid item xs={12} md={5}>
                          {/* Автор */}
                         <Typography variant="h6" gutterBottom>Автор и Статистика</Typography>
                         <List dense>
                            <ListItem>
                                <ListItemIcon><PersonIcon/></ListItemIcon>
                                <ListItemText primary="Автор отчета (Куратор)" secondary={report.Curator?.fullName || 'Неизвестен'} />
                            </ListItem>
                             <ListItem><ListItemIcon><CalendarMonthIcon/></ListItemIcon><ListItemText primary="Отчет создан" secondary={format(new Date(report.createdAt), 'dd.MM.yyyy HH:mm')} /></ListItem>
                            <ListItem><ListItemIcon><LanguageIcon/></ListItemIcon><ListItemText primary="Кол-во иностранцев" secondary={report.foreignerCount ?? 0} /></ListItem>
                            <ListItem><ListItemIcon><ChildCareIcon/></ListItemIcon><ListItemText primary="Кол-во несовершеннолетних" secondary={report.minorCount ?? 0} /></ListItem>
                         </List>

                         <Divider sx={{my: 2}}/>

                         {/* Участники */}
                         <Typography variant="h6" gutterBottom>Студенты-участники ({report.ParticipantStudents?.length || 0})</Typography>
                         {report.ParticipantStudents && report.ParticipantStudents.length > 0 ? (
                             <List dense sx={{ maxHeight: 350, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                                {report.ParticipantStudents.map(student => (
                                    <ListItem key={student.studentId} disablePadding>
                                         {/* TODO: Сделать ссылку на /students/:id, если есть такая страница */}
                                         <ListItemText primary={student.fullName} sx={{pl:1}}/>
                                    </ListItem>
                                ))}
                             </List>
                         ) : (
                             <Typography variant="body2" color="text.secondary">Студенты-участники не указаны.</Typography>
                         )}
                     </Grid>
                 </Grid>
             </Paper>

             <ConfirmationDialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} onConfirm={handleConfirmDelete}
                title="Удалить отчет?" message={`Вы уверены, что хотите удалить отчет "${report?.reportTitle || ''}"?`}
            />
         </Container>
    );
}

export default CuratorReportDetailPage;