// Полный путь: src/pages/ChangePasswordPage.js
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Container, Typography, TextField, Button, Grid, Box, Paper, CircularProgress, Alert, Snackbar
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { useAuth } from '../contexts/AuthContext'; // Для выхода после смены пароля
import { changeMyPassword } from '../api/me'; // API функция

// Схема валидации для формы смены пароля
const changePasswordSchema = yup.object().shape({
    currentPassword: yup.string().required('Текущий пароль обязателен'),
    newPassword: yup.string()
        .required('Новый пароль обязателен')
        .min(6, 'Новый пароль должен быть не менее 6 символов')
        .notOneOf([yup.ref('currentPassword')], 'Новый пароль не должен совпадать с текущим'), // Проверка, что новый не равен старому
    confirmNewPassword: yup.string()
        .required('Подтвердите новый пароль')
        .oneOf([yup.ref('newPassword'), null], 'Пароли должны совпадать'), // Проверка совпадения нового пароля
});

function ChangePasswordPage() {
    const navigate = useNavigate();
    const { logout } = useAuth(); // Получаем logout для выхода после успешной смены
    const [formError, setFormError] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    const { control, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm({
        resolver: yupResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmNewPassword: '',
        }
    });

    // Обработчик отправки формы
    const onSubmit = async (data) => {
        setFormError('');
        const passwordData = {
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
            confirmNewPassword: data.confirmNewPassword, // Бэкенд тоже проверит совпадение
        };

        try {
            const response = await changeMyPassword(passwordData);
            setSnackbar({ open: true, message: response.message || 'Пароль успешно изменен! Пожалуйста, войдите снова.', severity: 'success' });
            reset(); // Очищаем форму

            // Рекомендуется выйти из системы после смены пароля,
            // чтобы пользователь вошел с новым паролем и получил новый токен.
            setTimeout(() => {
                logout(); // Вызываем logout из AuthContext
                navigate('/login');
            }, 2000); // Задержка, чтобы пользователь увидел сообщение

        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Не удалось сменить пароль.';
            setFormError(message); // Показываем ошибку над формой
            setSnackbar({ open: true, message: message, severity: 'error' });
            console.error("Change password error:", err);
        }
    };

    // Закрытие Snackbar
    const handleCloseSnackbar = useCallback((event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    return (
        <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Смена пароля
                </Typography>

                {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Controller
                                name="currentPassword"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        type="password"
                                        label="Текущий пароль"
                                        required
                                        fullWidth
                                        size="small"
                                        error={!!errors.currentPassword}
                                        helperText={errors.currentPassword?.message}
                                        autoComplete="current-password"
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Controller
                                name="newPassword"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        type="password"
                                        label="Новый пароль"
                                        required
                                        fullWidth
                                        size="small"
                                        error={!!errors.newPassword}
                                        helperText={errors.newPassword?.message || 'Минимум 6 символов'}
                                        autoComplete="new-password"
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Controller
                                name="confirmNewPassword"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        type="password"
                                        label="Подтвердите новый пароль"
                                        required
                                        fullWidth
                                        size="small"
                                        error={!!errors.confirmNewPassword}
                                        helperText={errors.confirmNewPassword?.message}
                                        autoComplete="new-password"
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<CancelIcon/>}
                                    onClick={() => navigate('/profile')} // Возврат на страницу профиля
                                    disabled={isSubmitting}
                                >
                                    Отмена
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={isSubmitting ? <CircularProgress size={16} color="inherit"/> : <SaveIcon />}
                                    disabled={isSubmitting || !isDirty} // Кнопка активна, если есть изменения
                                >
                                    Сменить пароль
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
            {/* Snackbar для уведомлений */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default ChangePasswordPage;
