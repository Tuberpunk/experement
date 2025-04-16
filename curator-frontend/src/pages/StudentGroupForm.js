// Полный путь: src/pages/StudentGroupForm.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Navigate, Link as RouterLink } from 'react-router-dom'; // Добавлены Navigate и RouterLink
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Container, Typography, TextField, Button, Grid, Box, Paper, CircularProgress, Alert, Snackbar,
    Select, MenuItem, FormControl, InputLabel, FormHelperText
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext'; // Убедитесь, что путь правильный
import { getGroupById, createGroup, updateGroup, getCurators } from '../api/studentGroups'; // Убедитесь, что путь правильный

// Схема валидации Yup
const groupSchema = yup.object().shape({
    groupName: yup.string().required('Название группы обязательно'),
    faculty: yup.string().nullable(),
    admissionYear: yup.number()
        .nullable()
        .typeError('Введите год числом')
        .integer('Год должен быть целым числом')
        .min(1900, 'Год слишком маленький')
        .max(new Date().getFullYear() + 5, 'Год слишком большой')
        .transform(value => (isNaN(value) || value === null || value === '' ? null : value)),
    curatorUserId: yup.number().nullable().positive('ID куратора должен быть > 0').integer('ID куратора должен быть целым числом'),
});


function StudentGroupForm({ mode }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // Нужен для проверки роли
    const [loading, setLoading] = useState(mode === 'edit');
    const [formError, setFormError] = useState('');
    const [curators, setCurators] = useState([]); // Список кураторов для выбора
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const isEditMode = mode === 'edit';

    // === ВЫЗОВ ХУКОВ (ДО ПРОВЕРКИ ПРАВ) ===
    const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(groupSchema),
        defaultValues: {
            groupName: '',
            faculty: '',
            admissionYear: '',
            curatorUserId: '', // Пустая строка для Select
        }
    });

    const loadCurators = useCallback(async () => {
        // Загрузка кураторов
        setFormError(''); // Сброс ошибки при попытке загрузки
        try {
            const curatorList = await getCurators();
            setCurators(curatorList || []);
        } catch (err) {
             console.error("Failed to load curators:", err);
             setFormError('Не удалось загрузить список кураторов.');
        }
    }, []); // Пустые зависимости

    const loadGroupData = useCallback(async () => {
        // Загрузка данных группы в режиме редактирования
        if (isEditMode && id) {
            setLoading(true);
            setFormError('');
            try {
                const groupData = await getGroupById(id);
                // Права проверяются роутером
                reset({
                    groupName: groupData.groupName || '',
                    faculty: groupData.faculty || '',
                    admissionYear: groupData.admissionYear ?? '',
                    curatorUserId: groupData.curatorUserId || '',
                });
            } catch (err) {
                setFormError(err.response?.data?.message || err.message || 'Не удалось загрузить данные группы.');
                console.error("Fetch group for edit error:", err);
                 if (err.response?.status === 403 || err.response?.status === 404) {
                     navigate('/groups', { replace: true });
                }
            } finally {
                setLoading(false);
            }
        }
    }, [id, isEditMode, reset, navigate]); // Добавили navigate

    useEffect(() => {
        // Вызов загрузки данных при монтировании
        loadCurators();
        loadGroupData();
    }, [loadCurators, loadGroupData]);

    const onSubmit = async (data) => {
        // Обработчик отправки формы
        setFormError('');
        const groupDataToSend = {
            ...data,
            admissionYear: data.admissionYear ? parseInt(data.admissionYear, 10) : null,
            curatorUserId: data.curatorUserId ? parseInt(data.curatorUserId, 10) : null,
            faculty: data.faculty || null,
        };

        try {
            let result;
            if (isEditMode) {
                result = await updateGroup(id, groupDataToSend);
            } else {
                result = await createGroup(groupDataToSend);
            }
            setSnackbar({ open: true, message: `Группа успешно ${isEditMode ? 'обновлена' : 'создана'}!`, severity: 'success' });
            setTimeout(() => navigate('/groups'), 1500);
        } catch (err) {
            const message = err.response?.data?.message || err.message || `Не удалось ${isEditMode ? 'обновить' : 'создать'} группу.`;
            setFormError(message);
            setSnackbar({ open: true, message: message, severity: 'error' });
            console.error("Group form submission error:", err);
        }
    };

    const handleCloseSnackbar = useCallback((event, reason) => {
        // Обработчик закрытия Snackbar
        if (reason === 'clickaway') return;
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    // === ПРОВЕРКА ПРАВ ДОСТУПА (ПОСЛЕ ВСЕХ ХУКОВ) ===
    // Форма доступна только администратору
    if (user?.role !== 'administrator') {
        return <Navigate to="/forbidden" replace />;
    }
    // ==========================================


    // --- Рендеринг ---
    if (loading && isEditMode) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    {isEditMode ? 'Редактировать группу' : 'Создать новую группу'}
                </Typography>

                {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Controller name="groupName" control={control} render={({ field }) => <TextField {...field} label="Название группы" required fullWidth error={!!errors.groupName} helperText={errors.groupName?.message} />} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                             <Controller name="faculty" control={control} render={({ field }) => <TextField {...field} label="Факультет/Институт" fullWidth error={!!errors.faculty} helperText={errors.faculty?.message} />} />
                         </Grid>
                        <Grid item xs={12} sm={6}>
                             <Controller name="admissionYear" control={control} render={({ field }) => <TextField {...field} label="Год поступления" type="number" fullWidth error={!!errors.admissionYear} helperText={errors.admissionYear?.message} />} />
                         </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth error={!!errors.curatorUserId}>
                                <InputLabel id="curator-select-label">Куратор (необязательно)</InputLabel>
                                <Controller
                                    name="curatorUserId"
                                    control={control}
                                    defaultValue="" // Используем пустую строку по умолчанию для Select
                                    render={({ field }) => (
                                        <Select
                                            {...field}
                                            labelId="curator-select-label"
                                            label="Куратор (необязательно)"
                                        >
                                            <MenuItem value=""><em>Не назначен</em></MenuItem>
                                            {/* Загрузка списка кураторов */}
                                            {curators.map(c => (
                                                <MenuItem key={c.userId} value={c.userId}>
                                                    {c.fullName} {/* Отображаем ФИО */}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    )}
                                />
                                 <FormHelperText>{errors.curatorUserId?.message}</FormHelperText>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 2 }}>
                                <Button variant="outlined" onClick={() => navigate('/groups')} disabled={isSubmitting}>
                                    Отмена
                                </Button>
                                <Button type="submit" variant="contained" disabled={isSubmitting || loading}>
                                    {isSubmitting ? <CircularProgress size={24} /> : (isEditMode ? 'Сохранить' : 'Создать группу')}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Container>
    );
}

export default StudentGroupForm;