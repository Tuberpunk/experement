// src/pages/admin/ManageTagsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Container, Typography, Box, Paper, List, ListItem, ListItemText, TextField, Button,
    IconButton, CircularProgress, Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip // <-- Добавить сюда
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { useAuth } from '../../contexts/AuthContext'; // Проверка роли
import { getStudentTags, createStudentTag, updateStudentTag, deleteStudentTag } from '../../api/lookups';
import ConfirmationDialog from '../../components/ConfirmationDialog'; // Диалог подтверждения

// Схема валидации для формы тега
const tagSchema = yup.object().shape({
    name: yup.string().required('Название тега обязательно').max(100, 'Слишком длинное название'),
});

function ManageTagsPage() {
    const { user } = useAuth();
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    // Состояние для редактирования/добавления
    const [isAdding, setIsAdding] = useState(false);
    const [editingTag, setEditingTag] = useState(null); // { id, name } или null
    const [showForm, setShowForm] = useState(false); // Показать форму добавления/редактирования

    // Состояние для диалога удаления
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [tagToDelete, setTagToDelete] = useState(null); // { id, name }

    // --- React Hook Form ---
    const { control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(tagSchema),
        defaultValues: { name: '' }
    });

    // --- Загрузка данных ---
    const fetchTags = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await getStudentTags();
            setTags(data || []);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Не удалось загрузить теги');
            console.error("Fetch tags error:", err);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchTags(); }, [fetchTags]);

    // --- Обработчики формы ---
    const handleOpenAddForm = () => {
        reset({ name: '' }); // Очищаем форму
        setEditingTag(null); // Сбрасываем редактирование
        setIsAdding(true);
        setShowForm(true); // Показываем форму
    };

    const handleOpenEditForm = (tag) => {
        setEditingTag(tag); // Устанавливаем редактируемый тег
        setValue('name', tag.name); // Заполняем поле формы
        setIsAdding(false);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingTag(null);
        setIsAdding(false);
        reset({ name: '' });
    };

    const onSubmit = async (data) => {
        setError(''); // Сбрасываем общую ошибку
        try {
            let result;
            if (editingTag) { // Редактирование
                result = await updateStudentTag(editingTag.id, data);
            } else { // Добавление
                result = await createStudentTag(data);
            }
            fetchTags(); // Обновляем список
            handleCloseForm(); // Закрываем форму
            setSnackbar({ open: true, message: `Тег успешно ${editingTag ? 'обновлен' : 'добавлен'}!`, severity: 'success' });
        } catch (err) {
            const message = err.response?.data?.message || err.message || `Не удалось ${editingTag ? 'обновить' : 'добавить'} тег.`;
            // Показываем ошибку прямо в форме/модалке? Или как общую?
             setSnackbar({ open: true, message: message, severity: 'error' });
            console.error("Tag form submission error:", err);
        }
    };

    // --- Обработчики удаления ---
    const handleDeleteClick = (tag) => {
        setTagToDelete(tag);
        setOpenDeleteDialog(true);
    };
    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
        setTagToDelete(null);
    };
    const handleConfirmDelete = async () => {
        if (!tagToDelete) return;
        try {
            await deleteStudentTag(tagToDelete.id);
            fetchTags(); // Обновляем список
            handleCloseDeleteDialog();
            setSnackbar({ open: true, message: 'Тег удален', severity: 'success' });
        } catch (err) {
             setError(err.response?.data?.message || err.message || 'Не удалось удалить тег');
             console.error("Delete tag error:", err);
             handleCloseDeleteDialog();
        }
    };

    // --- Обработчик Snackbar ---
    const handleCloseSnackbar = useCallback((event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    // --- Рендеринг ---
     // Доступ только для админа (проверка уже в роутинге, но можно добавить и здесь)
     if (user?.role !== 'administrator') {
         return <Container maxWidth="md" sx={{ mt: 4 }}><Alert severity="error">Доступ запрещен.</Alert></Container>;
     }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" component="h1">Управление Тегами Студентов</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddForm}> Добавить Тег </Button>
                </Box>
                 <Typography variant="caption" color="textSecondary" component="div" sx={{mb: 2}}>
                     Теги используются для отметок студентов (напр., Активист, Спортсмен). Будьте осторожны при создании тегов, связанных с чувствительными персональными данными!
                 </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {/* Форма добавления/редактирования (можно вынести в отдельный компонент или модальное окно) */}
                {showForm && (
                     <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="h6">{editingTag ? 'Редактировать тег' : 'Добавить новый тег'}</Typography>
                        <Controller name="name" control={control} render={({ field }) => (
                            <TextField {...field} label="Название тега" required fullWidth margin="normal" size="small" error={!!errors.name} helperText={errors.name?.message} />
                        )} />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 1 }}>
                            <Button onClick={handleCloseForm} size="small" startIcon={<CancelIcon />} disabled={isSubmitting}>Отмена</Button>
                            <Button type="submit" variant="contained" size="small" startIcon={isSubmitting ? <CircularProgress size={16} color="inherit"/> : <SaveIcon />} disabled={isSubmitting}> {editingTag ? 'Сохранить' : 'Добавить'} </Button>
                         </Box>
                     </Box>
                )}

                {/* Список тегов */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
                 ) : !tags.length && !showForm ? ( // Показываем, только если не открыта форма
                     <Typography sx={{ textAlign: 'center', p: 3 }}>Теги еще не созданы.</Typography>
                 ) : (
                    <List dense>
                        {tags.map((tag) => (
                            <ListItem
                                key={tag.id}
                                secondaryAction={ // Кнопки справа
                                    <>
                                        <Tooltip title="Редактировать">
                                            <IconButton edge="end" aria-label="edit" onClick={() => handleOpenEditForm(tag)} size="small" sx={{mr: 0.5}}>
                                                <EditIcon fontSize="small"/>
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Удалить">
                                            <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(tag)} size="small" color="error">
                                                <DeleteIcon fontSize="small"/>
                                            </IconButton>
                                        </Tooltip>
                                     </>
                                }
                                disablePadding
                                sx={{borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 }}}
                            >
                                <ListItemText primary={tag.name} sx={{py: 1, px: 1}}/>
                             </ListItem>
                        ))}
                    </List>
                 )}
            </Paper>

             {/* Диалог подтверждения удаления */}
             <ConfirmationDialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} onConfirm={handleConfirmDelete}
                 title="Удалить тег?" message={`Вы уверены, что хотите удалить тег "${tagToDelete?.name || ''}"? Он будет удален у всех студентов, которым был присвоен.`}
             />

             {/* Snackbar */}
             <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                  <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
             </Snackbar>
        </Container>
    );
}

export default ManageTagsPage;