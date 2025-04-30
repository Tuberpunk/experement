// Полный путь: src/pages/ProfileEditPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Container, Typography, TextField, Button, Grid, Box, Paper, CircularProgress, Alert, Snackbar
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { useAuth } from '../contexts/AuthContext'; // Нужен для обновления данных в контексте
import { getMyProfile, updateMyProfile } from '../api/me'; // Используем API из me.js

// Схема валидации для полей, которые можно менять
const profileEditSchema = yup.object().shape({
    fullName: yup.string().required('ФИО обязательно'),
    position: yup.string().nullable(),
    department: yup.string().nullable(),
    phoneNumber: yup.string().nullable(),
});

function ProfileEditPage() {
    const navigate = useNavigate();
    const { user, saveAuthData } = useAuth(); // Получаем saveAuthData для обновления данных в контексте/localStorage
    const [loading, setLoading] = useState(true);
    const [formError, setFormError] = useState('');
    const [initialData, setInitialData] = useState(null); // Для хранения исходных данных
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    const { control, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm({
        resolver: yupResolver(profileEditSchema),
        defaultValues: {
            fullName: '', position: '', department: '', phoneNumber: ''
        }
    });

    // Загрузка текущих данных профиля при монтировании
    useEffect(() => {
        setLoading(true); setFormError('');
        getMyProfile()
            .then(data => {
                setInitialData(data); // Сохраняем исходные данные
                // Устанавливаем значения в форму
                reset({
                    fullName: data.fullName || '',
                    position: data.position || '',
                    department: data.department || '',
                    phoneNumber: data.phoneNumber || '',
                    // Не редактируемые поля здесь не нужны
                });
            })
            .catch(err => {
                setFormError(err.response?.data?.message || err.message || 'Не удалось загрузить данные профиля для редактирования.');
                console.error("Fetch profile for edit error:", err);
            })
            .finally(() => setLoading(false));
    }, [reset]); // Зависимость от reset

    // Обработчик отправки формы
    const onSubmit = async (data) => {
        setFormError('');
        // Отправляем только разрешенные поля
        const updateData = {
            fullName: data.fullName,
            position: data.position || null,
            department: data.department || null,
            phoneNumber: data.phoneNumber || null,
        };

        try {
            const updatedUser = await updateMyProfile(updateData);
            setSnackbar({ open: true, message: 'Профиль успешно обновлен!', severity: 'success' });

            // --- Обновляем данные пользователя в AuthContext и localStorage ---
            // Получаем текущий токен
            const currentToken = localStorage.getItem('authToken');
            if (currentToken && updatedUser) {
                // Формируем объект user для контекста/localStorage
                 const userContextData = {
                     id: updatedUser.userId,
                     email: updatedUser.email, // Email не менялся
                     fullName: updatedUser.fullName, // Обновленное имя
                     role: updatedUser.Role?.roleName || user?.role // Обновленная роль (хотя здесь она не меняется)
                 };
                 saveAuthData(currentToken, userContextData); // Обновляем контекст и localStorage
            }
            // ----------------------------------------------------------------

            setTimeout(() => navigate('/profile'), 1500); // Возврат на страницу профиля
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Не удалось обновить профиль.';
            setFormError(message);
            setSnackbar({ open: true, message: message, severity: 'error' });
            console.error("Profile update error:", err);
        }
    };

    // Закрытие Snackbar
    const handleCloseSnackbar = useCallback((event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);


    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (formError && !initialData) { // Показываем ошибку загрузки, если данных нет
         return <Container maxWidth="sm" sx={{ mt: 4 }}><Alert severity="error">{formError}</Alert></Container>;
    }

    return (
        <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}> {/* Используем sm для компактной формы */}
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h4" component="h1" gutterBottom> Редактирование профиля </Typography>

                {formError && !errors.fullName && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>} {/* Показываем общую ошибку, если нет ошибки поля */}

                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <Grid container spacing={2}>
                         {/* Неизменяемые поля */}
                         <Grid item xs={12}>
                            <TextField label="Email (нельзя изменить)" value={initialData?.email || ''} fullWidth size="small" disabled InputProps={{readOnly: true}}/>
                         </Grid>
                         <Grid item xs={12}>
                             <TextField label="Роль (нельзя изменить)" value={initialData?.Role?.roleName ? getRoleDisplay(initialData.Role.roleName).label : ''} fullWidth size="small" disabled InputProps={{readOnly: true}}/>
                         </Grid>

                         {/* Редактируемые поля */}
                        <Grid item xs={12}>
                             <Controller name="fullName" control={control} render={({ field }) => <TextField {...field} label="ФИО" required fullWidth size="small" error={!!errors.fullName} helperText={errors.fullName?.message}/>} />
                        </Grid>
                        <Grid item xs={12}>
                            <Controller name="position" control={control} render={({ field }) => <TextField {...field} label="Должность" fullWidth size="small"/>} />
                        </Grid>
                        <Grid item xs={12}>
                            <Controller name="department" control={control} render={({ field }) => <TextField {...field} label="Подразделение/Кафедра/Группа" fullWidth size="small"/>} />
                        </Grid>
                         <Grid item xs={12}>
                             <Controller name="phoneNumber" control={control} render={({ field }) => <TextField {...field} label="Телефон" fullWidth size="small"/>} />
                         </Grid>

                         {/* Кнопки */}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                                <Button variant="outlined" startIcon={<CancelIcon/>} onClick={() => navigate('/profile')} disabled={isSubmitting}> Отмена </Button>
                                <Button type="submit" variant="contained" startIcon={isSubmitting ? <CircularProgress size={16} color="inherit"/> : <SaveIcon />} disabled={isSubmitting || !isDirty}> {/* Кнопка активна только если есть изменения */}
                                    Сохранить
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

// Вспомогательная функция для роли (скопирована для примера)
const getRoleDisplay = (roleName) => {
    switch (roleName) {
        case 'administrator': return { label: 'Администратор' };
        case 'curator': return { label: 'Куратор' };
        default: return { label: roleName || 'Неизвестно' };
    }
};


export default ProfileEditPage;