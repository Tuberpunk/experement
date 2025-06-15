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
import PublicIcon from '@mui/icons-material/Public';
import CategoryIcon from '@mui/icons-material/Category';
// Контекст, API, Компоненты
import { useAuth } from '../contexts/AuthContext';
import { getCuratorReportById, deleteCuratorReport } from '../api/curatorReports';
import ConfirmationDialog from '../components/ConfirmationDialog';
// Форматирование даты
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const InfoItem = ({ icon, label, value, chip = false }) => (
    <Grid item xs={12} sm={6}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ mr: 1.5, color: 'text.secondary' }}>{icon}</Box>
            <Box>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {chip ? <Chip label={value || 'Не указано'} size="small"/> : (value || 'Не указано')}
                </Typography>
            </Box>
        </Box>
    </Grid>
);

function CuratorReportDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchReport = useCallback(async () => {
        try {
            const data = await getCuratorReportById(id);
            setReport(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Не удалось загрузить данные отчета.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
    }

    if (!report) {
        return <Container sx={{ mt: 4 }}><Alert severity="info">Отчет не найден.</Alert></Container>;
    }
    
    const displayData = {
        title: report.RelatedEvent?.title ?? report.reportTitle,
        location: report.RelatedEvent?.locationText ?? report.locationText,
        direction: report.RelatedEvent?.Direction?.name ?? report.directionText,
        foreignerCount: report.RelatedEvent?.foreignerCount ?? report.foreignerCount,
        minorCount: report.RelatedEvent?.minorCount ?? report.minorCount,
        reportDate: report.reportDate,
        durationMinutes: report.durationMinutes,
        invitedGuestsInfo: report.invitedGuestsInfo,
        mediaReferences: report.mediaReferences,
        participants: report.ParticipantStudents || [],
        curatorName: report.Curator?.fullName || 'Неизвестно'
    };


    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    {displayData.title}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
                    Отчет куратора: {displayData.curatorName}
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                    <InfoItem 
                        icon={<EventIcon />} 
                        label="Дата проведения" 
                        value={displayData.reportDate ? format(new Date(displayData.reportDate), 'dd MMMM𒐝', { locale: ru }) : 'Не указана'} 
                    />
                    <InfoItem 
                        icon={<LocationOnIcon />} 
                        label="Место проведения" 
                        value={displayData.location} 
                    />
                    <InfoItem 
                        icon={<CategoryIcon />} 
                        label="Направление работы" 
                        value={displayData.direction}
                        chip={true}
                    />
                    <InfoItem 
                        icon={<AccessTimeIcon />} 
                        label="Продолжительность (минут)" 
                        value={displayData.durationMinutes} 
                    />
                     <InfoItem 
                        icon={<PublicIcon />} 
                        label="Кол-во иностранных участников" 
                        value={displayData.foreignerCount ?? 0} 
                    />
                    <InfoItem 
                        icon={<ChildCareIcon />} 
                        label="Кол-во несовершеннолетних участников" 
                        value={displayData.minorCount ?? 0} 
                    />
                </Grid>

                <Divider sx={{ my: 3 }} />
                
                <Grid container spacing={4}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom>Участники ({displayData.participants.length})</Typography>
                        {displayData.participants.length > 0 ? (
                            <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                                <List dense>
                                    {displayData.participants.map(student => (
                                        <ListItem key={student.studentId}>
                                            <ListItemIcon>
                                                <PersonIcon fontSize="small" />
                                            </ListItemIcon>
                                            {/* ИСПРАВЛЕНО: Используем 'fullName' */}
                                            <ListItemText 
                                                primary={student.fullName}
                                                secondary={student.email}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        ) : (
                            <Typography variant="body2" color="text.secondary">Список участников не указан.</Typography>
                        )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Box>
                            <Typography variant="h6" gutterBottom>Приглашенные гости</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                                {displayData.invitedGuestsInfo || 'Информация отсутствует.'}
                            </Typography>
                        </Box>
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="h6" gutterBottom>Ссылки на медиа</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {displayData.mediaReferences || 'Информация отсутствует.'}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        </Container>
    );
}

export default CuratorReportDetailPage;