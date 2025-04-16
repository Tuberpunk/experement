// src/pages/StudentDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Box, Paper, Grid, CircularProgress, Alert, Button, Divider, Chip,
    List, ListItem, ListItemText, ListItemIcon, Link // <-- Добавить сюда
} from '@mui/material';
//import { Link as RouterLink } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import CakeIcon from '@mui/icons-material/Cake'; // День рождения
import CreditCardIcon from '@mui/icons-material/CreditCard'; // Студ билет
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LabelIcon from '@mui/icons-material/Label'; // Для тегов
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useAuth } from '../contexts/AuthContext';
import { getStudentById, deleteStudent } from '../api/students';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale'; // Локаль для даты

function StudentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

    const fetchStudent = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await getStudentById(id);
            setStudent(data);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Не удалось загрузить данные студента.');
            console.error("Fetch student detail error:", err);
        } finally { setLoading(false); }
    }, [id]);

    useEffect(() => { fetchStudent(); }, [fetchStudent]);

    const handleDeleteClick = () => setOpenDeleteDialog(true);
    const handleCloseDeleteDialog = () => setOpenDeleteDialog(false);
    const handleConfirmDelete = async () => {
        try {
            await deleteStudent(id);
            navigate('/students');
        } catch (err) {
             setError(err.response?.data?.message || err.message || 'Не удалось удалить студента');
             console.error("Delete student error:", err);
             handleCloseDeleteDialog();
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    if (error) return <Container maxWidth="md" sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
    if (!student) return <Container maxWidth="md" sx={{ mt: 4 }}><Typography>Студент не найден.</Typography></Container>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
             <Paper sx={{ p: { xs: 2, md: 3 } }}>
                {/* --- Заголовок и кнопки Админа --- */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap' }}>
                    <Typography variant="h4" component="h1" gutterBottom sx={{ mr: 2 }}>
                         {student.fullName}
                    </Typography>
                     {user?.role === 'administrator' && (
                        <Box>
                            <Button variant="outlined" startIcon={<EditIcon />} component={RouterLink} to={`/students/${student.studentId}/edit`} sx={{ mr: 1, mb: {xs: 1, sm: 0}}}> Редактировать </Button>
                             <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteClick} sx={{ mb: {xs: 1, sm: 0}}}> Удалить </Button>
                         </Box>
                    )}
                </Box>
                <Divider sx={{ mb: 2 }} />
                 <Typography variant="caption" color="error" component="div" sx={{mb: 2}}>
                     ВАЖНО: Данные являются персональными. Соблюдайте конфиденциальность и требования законодательства!
                 </Typography>

                 {/* --- Детальная информация --- */}
                 <Grid container spacing={3}>
                     <Grid item xs={12} md={6}>
                         <Typography variant="h6" gutterBottom>Личные данные</Typography>
                         <List dense>
                             <ListItem><ListItemIcon><PersonIcon/></ListItemIcon><ListItemText primary="ФИО" secondary={student.fullName} /></ListItem>
                            <ListItem><ListItemIcon><CakeIcon/></ListItemIcon><ListItemText primary="Дата рождения" secondary={student.dateOfBirth ? format(new Date(student.dateOfBirth), 'dd MMMM yyyy', { locale: ru }) : 'Не указана'} /></ListItem>
                            <ListItem><ListItemIcon><EmailIcon/></ListItemIcon><ListItemText primary="Email" secondary={student.email || 'Не указан'} /></ListItem>
                            <ListItem><ListItemIcon><PhoneIcon/></ListItemIcon><ListItemText primary="Телефон" secondary={student.phoneNumber || 'Не указан'} /></ListItem>
                            <ListItem><ListItemIcon><CreditCardIcon/></ListItemIcon><ListItemText primary="Номер студ. билета" secondary={student.studentCardNumber || 'Не указан'} /></ListItem>
                             <ListItem><ListItemIcon>{student.isActive ? <CheckCircleIcon color="success"/> : <CancelIcon color="action"/>}</ListItemIcon><ListItemText primary="Статус" secondary={student.isActive ? 'Активен (учится)' : 'Неактивен'} /></ListItem>
                             <ListItem><ListItemIcon><CalendarMonthIcon/></ListItemIcon><ListItemText primary="Добавлен в систему" secondary={student.createdAt ? format(new Date(student.createdAt), 'dd.MM.yyyy HH:mm') : '-'} /></ListItem>
                         </List>
                     </Grid>
                     <Grid item xs={12} md={6}>
                         <Typography variant="h6" gutterBottom>Учебная информация</Typography>
                        <List dense>
                             <ListItem>
                                <ListItemIcon><GroupIcon/></ListItemIcon>
                                <ListItemText primary="Группа" secondary={
                                    student.StudentGroup ? (
                                        <Link component={RouterLink} to={`/groups/${student.StudentGroup.groupId}`} underline="hover">
                                            {student.StudentGroup.groupName}
                                        </Link>
                                    ) : ('Не назначена')
                                }/>
                            </ListItem>
                            {/* Можно добавить факультет/год из группы, если нужно */}
                         </List>

                         <Typography variant="h6" gutterBottom sx={{mt: 2}}>Теги / Отметки</Typography>
                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                             {student.Tags && student.Tags.length > 0 ? (
                                 student.Tags.map(tag => (
                                     <Chip key={tag.tagId} icon={<LabelIcon fontSize="small"/>} label={tag.tagName} size="small" variant="outlined" />
                                 ))
                             ) : (
                                 <Typography variant="body2">Нет отметок.</Typography>
                             )}
                         </Box>
                         {/* ВНИМАНИЕ: Здесь НЕ отображаем чувствительные теги, если они есть */}
                     </Grid>
                 </Grid>
             </Paper>
             <ConfirmationDialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} onConfirm={handleConfirmDelete}
                title="Удалить студента?" message={`Вы уверены, что хотите удалить студента "${student?.fullName || ''}"? Это действие необратимо.`}
            />
         </Container>
    );
}

export default StudentDetailPage;