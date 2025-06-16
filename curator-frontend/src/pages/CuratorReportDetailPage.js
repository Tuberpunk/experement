// Полный путь: src/pages/CuratorReportDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
    Container, Box, Typography, CircularProgress, Alert, Paper, Grid,
    List, ListItem, ListItemText, ListItemIcon, Divider, Chip, Link
} from '@mui/material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Иконки
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CategoryIcon from '@mui/icons-material/Category';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import PublicIcon from '@mui/icons-material/Public';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import LinkIcon from '@mui/icons-material/Link'; // Иконка для связанного мероприятия

import { getCuratorReportById } from '../api/curatorReports';
import { useAuth } from '../contexts/AuthContext';

// Вспомогательный компонент для отображения информационных полей
const InfoItem = ({ icon, label, value, chip = false, component: ValueComponent = Typography }) => (
    <Grid item xs={12} sm={6}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ mr: 1.5, color: 'text.secondary' }}>{icon}</Box>
            <Box sx={{ overflow: 'hidden' }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <ValueComponent variant="body1" sx={{ fontWeight: 'medium', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {chip ? <Chip label={value || 'Не указано'} size="small"/> : (value || 'Не указано')}
                </ValueComponent>
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
    
    // Определяем данные для отображения
    const displayData = {
        title: report.RelatedEvent?.title ?? report.reportTitle,
        location: report.RelatedEvent?.locationText ?? report.locationText,
        direction: report.RelatedEvent?.Direction?.name ?? report.directionText,
        foreignerCount: report.RelatedEvent?.foreignerCount ?? report.foreignerCount,
        minorCount: report.RelatedEvent?.minorCount ?? report.minorCount,
        reportDate: report.reportDate,
        durationMinutes: report.durationMinutes,
        participants: report.ParticipantStudents || [],
        curatorName: report.Curator?.fullName || 'Неизвестно',
        relatedEvent: report.RelatedEvent // Сохраняем все связанное мероприятие
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
                        value={displayData.reportDate ? format(new Date(displayData.reportDate), 'dd MMMM yyyy', { locale: ru }) : 'Не указана'} 
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

                {/* ИЗМЕНЕНО: Добавляем ссылку на связанное мероприятие, если оно есть */}
                {displayData.relatedEvent && (
                    <>
                        <Divider sx={{ my: 3 }} />
                        <InfoItem 
                            icon={<LinkIcon />} 
                            label="Связанное мероприятие" 
                            value={
                                <Link component={RouterLink} to={`/events/${displayData.relatedEvent.eventId}`}>
                                    {displayData.relatedEvent.title}
                                </Link>
                            } 
                        />
                    </>
                )}

                <Divider sx={{ my: 3 }} />
                
                {/* ИЗМЕНЕНО: Секция с участниками теперь занимает всю ширину */}
                <Grid container spacing={4}>
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>Участники ({displayData.participants.length})</Typography>
                        {displayData.participants.length > 0 ? (
                            <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                                <List dense>
                                    {displayData.participants.map(student => (
                                        <ListItem key={student.studentId}>
                                            <ListItemIcon>
                                                <PersonIcon fontSize="small" />
                                            </ListItemIcon>
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
                    
                    {/* ИЗМЕНЕНО: Блоки "Приглашенные гости" и "Ссылки на медиа" удалены */}
                </Grid>
            </Paper>
        </Container>
    );
}

export default CuratorReportDetailPage;