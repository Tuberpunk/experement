// Полный путь: src/components/admin/UserEditForm.js
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    TextField, Button, Grid, Box, CircularProgress, Alert, Typography,
    Switch, FormControlLabel
} from '@mui/material';
import PropTypes from 'prop-types';
import { updateUser } from '../../api/users'; // API для обновления

// ИЗМЕНЕНО: Схема валидации без roleId
const userEditSchema = yup.object().shape({
    fullName: yup.string().required('ФИО обязательно'),
    position: yup.string(),
    department: yup.string(),
    phoneNumber: yup.string(),
    isActive: yup.boolean().required(),
});

function UserEditForm({ userToEdit, onSuccess, onClose }) {
    const [formError, setFormError] = useState('');
    
    // ИЗМЕНЕНО: Мы больше не передаем roleId в defaultValues
    const { control, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm({
        resolver: yupResolver(userEditSchema),
        defaultValues: {
            fullName: userToEdit?.fullName || '',
            position: userToEdit?.position || '',
            department: userToEdit?.department || '',
            phoneNumber: userToEdit?.phoneNumber || '',
            isActive: userToEdit?.isActive ?? true,
        }
    });

    // ИЗМЕНЕНО: useEffect для загрузки ролей больше не нужен и удален.

    const onSubmit = async (data) => {
        setFormError('');
        try {
            // Отправляем данные без roleId
            await updateUser(userToEdit.userId, data);
            onSuccess(); // Вызываем колбэк родителя об успехе
            onClose();   // Закрываем форму
        } catch (err) {
            const message = err.response?.data?.message || 'Не удалось обновить пользователя.';
            setFormError(message);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Typography variant="subtitle1" gutterBottom>ID: {userToEdit?.userId}, Email: {userToEdit?.email}</Typography>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

            <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                    <Controller name="fullName" control={control} render={({ field }) => <TextField {...field} label="ФИО" required fullWidth size="small" error={!!errors.fullName} helperText={errors.fullName?.message}/>} />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Controller name="position" control={control} render={({ field }) => <TextField {...field} label="Должность" fullWidth size="small"/>} />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Controller name="department" control={control} render={({ field }) => <TextField {...field} label="Подразделение/Кафедра" fullWidth size="small"/>} />
                </Grid>
                <Grid item xs={12}>
                    <Controller name="phoneNumber" control={control} render={({ field }) => <TextField {...field} label="Телефон" fullWidth size="small"/>} />
                </Grid>
                
                <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Controller name="isActive" control={control} render={({ field }) => (
                        <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Активен" />
                    )} />
                </Grid>

                {/* ИЗМЕНЕНО: Блок с выбором роли полностью удален */}

                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                        <Button onClick={onClose} disabled={isSubmitting}>Отмена</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting || !isDirty}>
                            {isSubmitting ? <CircularProgress size={24} /> : 'Сохранить'}
                        </Button>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}

UserEditForm.propTypes = {
  userToEdit: PropTypes.object,
  onSuccess: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default UserEditForm;