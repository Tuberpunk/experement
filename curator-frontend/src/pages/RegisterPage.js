// src/pages/RegisterPage.js
import React, { useState, useCallback } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Container, Typography, TextField, Button, Grid, Box, Paper, CircularProgress, Alert, Snackbar, Link,
    Select, MenuItem, FormControl, InputLabel, FormHelperText

} from '@mui/material';
import { registerUser } from '../api/auth';
import { useAuth } from '../contexts/AuthContext'; // Для регистрации
// --- Схема валидации БЕЗ РОЛИ ---
const registrationSchema = yup.object().shape({
fullName: yup.string().required('ФИО обязательно'),
    email: yup.string().email('Некорректный email').required('Email обязателен'),
    password: yup.string()
        .required('Пароль обязателен')
        .min(8, 'Пароль должен содержать не менее 8 символов')
        .matches(/[a-z]/, 'Пароль должен содержать хотя бы одну строчную букву')
        .matches(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
        .matches(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру')
        .matches(/[\W_]/, 'Пароль должен содержать хотя бы один специальный символ (например, !@#$%)'), // \W эквивалентно [^a-zA-Z0-9_], _ добавляем отдельно если он нужен
    confirmPassword: yup.string()
        .oneOf([yup.ref('password'), null], 'Пароли должны совпадать')
        .required('Подтверждение пароля обязательно'),
    // roleName убран из схемы
    position: yup.string().nullable(),
    phoneNumber: yup.string().nullable(),
    department: yup.string().nullable(),
});

function RegisterPage() {
    const navigate = useNavigate();
    const [formError, setFormError] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(registrationSchema),
        defaultValues: { // Убираем roleName из defaultValues
            fullName: '',
            email: '',
            password: '',
            confirmPassword: '',
            // roleName: '', <-- Убрано
            position: '',
            phoneNumber: '',
            department: '',
        }
    });

    const onSubmit = async (data) => {
        setFormError('');
        // Убираем confirmPassword, roleName и так не придет
        const { confirmPassword, ...registrationData } = data;

        try {
            // Отправляем данные БЕЗ roleName, бэкенд назначит 'curator'
            const response = await registerUser(registrationData);
            setSnackbar({ open: true, message: response.message || 'Регистрация прошла успешно! Теперь вы можете войти.', severity: 'success' });
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Ошибка регистрации. Попробуйте снова.';
            setFormError(message);
            setSnackbar({ open: true, message: message, severity: 'error' });
            console.error("Registration error:", err);
        }
    };

    const handleCloseSnackbar = useCallback((event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    return (
        <Container maxWidth="sm" sx={{ mt: 5, mb: 4 }}>
            <Paper sx={{ p: { xs: 2, md: 4 } }}>
                <Typography variant="h4" component="h1" align="center" gutterBottom>
                    Регистрация
                </Typography>

                {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <Grid container spacing={2}>
                        {/* --- Основные поля --- */}
                        <Grid item xs={12}>
                            <Controller name="fullName" control={control} render={({ field }) => <TextField {...field} label="ФИО" required fullWidth error={!!errors.fullName} helperText={errors.fullName?.message} autoComplete="name" />} />
                        </Grid>
                        <Grid item xs={12}>
                            <Controller name="email" control={control} render={({ field }) => <TextField {...field} label="Email" type="email" required fullWidth error={!!errors.email} helperText={errors.email?.message} autoComplete="email" />} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller name="password" control={control} render={({ field }) => <TextField {...field} label="Пароль" type="password" required fullWidth error={!!errors.password} helperText={errors.password?.message} autoComplete="new-password" />} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller name="confirmPassword" control={control} render={({ field }) => <TextField {...field} label="Подтвердите пароль" type="password" required fullWidth error={!!errors.confirmPassword} helperText={errors.confirmPassword?.message} autoComplete="new-password" />} />
                        </Grid>

                        {/* --- Поле выбора роли УБРАНО --- */}

                        {/* --- Необязательные поля "Мини-анкета" --- */}
                        <Grid item xs={12}><Typography variant="caption">Дополнительная информация (необязательно)</Typography></Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller name="position" control={control} render={({ field }) => <TextField {...field} label="Должность" fullWidth />} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller name="department" control={control} render={({ field }) => <TextField {...field} label="Подразделение/Кафедра/Группа" fullWidth />} />
                        </Grid>
                        <Grid item xs={12}>
                             <Controller name="phoneNumber" control={control} render={({ field }) => <TextField {...field} label="Контактный телефон" fullWidth />} />
                        </Grid>

                        {/* --- Кнопка и ссылка --- */}
                        <Grid item xs={12}>
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 2, mb: 1 }}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <CircularProgress size={24} /> : 'Зарегистрироваться'}
                            </Button>
                        </Grid>
                        <Grid item xs={12} sx={{ textAlign: 'center' }}>
                            <Link component={RouterLink} to="/login" variant="body2">
                                Уже есть аккаунт? Войти
                            </Link>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>

            {/* Snackbar для уведомлений */}
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Container>
    );
}

export default RegisterPage;