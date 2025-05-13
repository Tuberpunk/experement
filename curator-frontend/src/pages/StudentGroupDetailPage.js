// src/pages/StudentGroupDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Box, Paper, Grid, CircularProgress, Alert, Button, Divider,
    List, ListItem, ListItemText, ListItemIcon, Chip // <-- Добавить сюда
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import SchoolIcon from '@mui/icons-material/School'; // Для факультета
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'; // Для года
import PersonIcon from '@mui/icons-material/Person'; // Для куратора и студентов
import { useAuth } from '../contexts/AuthContext';
import { getGroupById, deleteGroup } from '../api/studentGroups';
import ConfirmationDialog from '../components/ConfirmationDialog';

function StudentGroupDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

    const fetchGroup = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Запрашиваем группу с включением куратора и студентов
            const data = await getGroupById(id);
            setGroup(data);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Не удалось загрузить данные группы.');
            console.error("Fetch group detail error:", err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchGroup();
    }, [fetchGroup]);

    // Удаление
    const handleDeleteClick = () => setOpenDeleteDialog(true);
    const handleCloseDeleteDialog = () => setOpenDeleteDialog(false);
    const handleConfirmDelete = async () => {
        try {
            await deleteGroup(id);
            navigate('/groups'); // Возвращаемся к списку после удаления
            // Можно добавить Snackbar об успехе на странице списка
        } catch (err) {
             setError(err.response?.data?.message || err.message || 'Не удалось удалить группу');
             console.error("Delete group error:", err);
             handleCloseDeleteDialog();
        }
    };


    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (error) {
        return <Container maxWidth="md" sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
    }
    if (!group) {
        return <Container maxWidth="md" sx={{ mt: 4 }}><Typography>Группа не найдена.</Typography></Container>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
             <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap' }}>
                    <Typography variant="h4" component="h1" gutterBottom sx={{ mr: 2 }}>
                        Группа: {group.groupName}
                    </Typography>
                    {/* Кнопки для админа */}
                    {user?.role === 'administrator' && (
                        <Box>
                            <Button
                                variant="outlined"
                                startIcon={<EditIcon />}
                                component={RouterLink}
                                to={`/groups/${group.groupId}/edit`}
                                sx={{ mr: 1, mb: {xs: 1, sm: 0}}}
                            >
                                Редактировать
                            </Button>
                             <Button
                                variant="contained"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={handleDeleteClick}
                                sx={{ mb: {xs: 1, sm: 0}}}
                            >
                                Удалить
                            </Button>
                        </Box>
                    )}
                </Box>
                <Divider sx={{ mb: 2 }} />

                {/* Основная информация */}
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                         <Typography variant="h6" gutterBottom>Основная информация</Typography>
                         <List dense>
                             <ListItem>
                                <ListItemIcon><SchoolIcon /></ListItemIcon>
                                <ListItemText primary="Факультет/Институт" secondary={group.faculty || 'Не указан'} />
                            </ListItem>
                            <ListItem>
                                 <ListItemIcon><CalendarTodayIcon /></ListItemIcon>
                                 <ListItemText primary="Год поступления" secondary={group.admissionYear || 'Не указан'} />
                             </ListItem>
                             <ListItem>
                                <ListItemIcon><PersonIcon /></ListItemIcon>
                                <ListItemText primary="Куратор" secondary={group.Curator?.fullName || 'Не назначен'} />
                            </ListItem>
                         </List>
                    </Grid>

                     {/* Список студентов */}
                     <Grid item xs={12} md={6}>
                         <Typography variant="h6" gutterBottom>Студенты ({group.Students?.length || 0})</Typography>
                         {group.Students && group.Students.length > 0 ? (
                            <List dense sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                {group.Students.map(student => (
                                    <ListItem key={student.studentId} secondaryAction={!student.isActive ? <Chip label="Неактивен" size="small"/> : null}>
                                        <ListItemIcon><PersonIcon fontSize="small"/></ListItemIcon>
                                        {/* TODO: Сделать ссылку на страницу студента /students/:studentId */}
                                        <ListItemText primary={student.fullName} secondary={student.email || 'Email не указан'}/>
                                    </ListItem>
                                ))}
                            </List>
                         ) : (
                             <Typography variant="body2">В группе пока нет студентов.</Typography>
                         )}
                     </Grid>
                </Grid>
            </Paper>

            {/* Диалог подтверждения удаления */}
            <ConfirmationDialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                title="Удалить группу?"
                message={`Вы уверены, что хотите удалить группу "${group?.groupName || ''}"? Все связанные студенты также будут удалены (если настроено каскадное удаление)!`}
            />
        </Container>
    );
}

export default StudentGroupDetailPage;