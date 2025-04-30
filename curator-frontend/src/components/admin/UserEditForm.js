// Полный путь: src/components/admin/UserEditForm.js
import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    TextField, Button, Grid, Box, CircularProgress, Alert, Typography,
    Select, MenuItem, FormControl, InputLabel, FormHelperText, Switch, FormControlLabel
} from '@mui/material';
import PropTypes from 'prop-types';
import { updateUser } from '../../api/users'; // API для обновления
import { getRoles } from '../../api/lookups';   // API для получения ролей

// Схема валидации для полей, которые можно менять
const userEditSchema = yup.object().shape({
    // Email и ID не меняем
    fullName: yup.string().required('ФИО обязательно'),
    position: yup.string().nullable(),
    department: yup.string().nullable(),
    phoneNumber: yup.string().nullable(),
    isActive: yup.boolean().required(),
    roleId: yup.number().required('Роль обязательна').positive().integer(),
});

function UserEditForm({ userToEdit, onSuccess, onClose }) {
    const [formError, setFormError] = useState('');
    const [rolesList, setRolesList] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(true);

    const { control, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm({ // isDirty - были ли изменения
        resolver: yupResolver(userEditSchema),
        defaultValues: { // Устанавливаем значения из userToEdit
            fullName: '',
            position: '',
            department: '',
            phoneNumber: '',
            isActive: true,
            roleId: '', // Изначально пустое, загрузим роли
        }
    });

    // Загрузка ролей при монтировании
    useEffect(() => {
        const fetchRoles = async () => {
            setLoadingRoles(true);
            try {
                const data = await getRoles();
                setRolesList(data || []);
            } catch (error) {
                 console.error("Failed to load roles:", error);
                 setFormError('Не удалось загрузить список ролей.');
            } finally {
                setLoadingRoles(false);
            }
        };
        fetchRoles();
    }, []);

    // Сброс формы при изменении userToEdit (когда открывается модальное окно)
    useEffect(() => {
        if (userToEdit) {
            reset({
                fullName: userToEdit.fullName || '',
                position: userToEdit.position || '',
                department: userToEdit.department || '',
                phoneNumber: userToEdit.phoneNumber || '',
                isActive: userToEdit.isActive !== undefined ? userToEdit.isActive : true,
                roleId: userToEdit.roleId || '',
            });
        } else {
             reset(); // Сброс, если пользователя нет (на всякий случай)
        }
    }, [userToEdit, reset]);


    // Обработчик отправки
    const onSubmit = async (data) => {
        setFormError('');
        // Формируем данные только с разрешенными для обновления полями
        const updateData = {
             fullName: data.fullName,
             position: data.position || null,
             department: data.department || null,
             phoneNumber: data.phoneNumber || null,
             isActive: data.isActive,
             roleId: parseInt(data.roleId, 10) // Убедимся, что это число
         };

        try {
            await updateUser(userToEdit.userId, updateData); // Вызываем API обновления
            onSuccess(); // Вызываем колбэк родителя об успехе
            onClose();   // Закрываем форму
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Не удалось обновить пользователя.';
            setFormError(message);
            console.error("User update submission error:", err);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Typography variant="h6" gutterBottom>Редактирование Пользователя</Typography>
            <Typography variant="subtitle1" gutterBottom>ID: {userToEdit?.userId}, Email: {userToEdit?.email}</Typography>

            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

            <Grid container spacing={2} sx={{mt: 1}}>
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
                 <Grid item xs={12} sm={6}>
                     <FormControl fullWidth required error={!!errors.roleId} size="small" disabled={loadingRoles}>
                         <InputLabel id="role-edit-label">Роль *</InputLabel>
                         <Controller name="roleId" control={control} defaultValue="" render={({ field }) => (
                             <Select {...field} labelId="role-edit-label" label="Роль *">
                                <MenuItem value="" disabled><em>Загрузка...</em></MenuItem>
                                {rolesList.map(r => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
                             </Select>
                         )} />
                          <FormHelperText>{errors.roleId?.message || (loadingRoles ? 'Загрузка ролей...' : '')}</FormHelperText>
                      </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} sx={{display: 'flex', alignItems: 'center'}}>
                       <Controller name="isActive" control={control} render={({ field }) => (
                           <FormControlLabel control={<Switch {...field} checked={!!field.value} />} label="Активен" sx={{ml: 1}}/>
                       )} />
                   </Grid>

                 <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                        <Button onClick={onClose} disabled={isSubmitting}>Отмена</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting || !isDirty || loadingRoles}>
                            {isSubmitting ? <CircularProgress size={24} /> : 'Сохранить'}
                        </Button>
                    </Box>
                 </Grid>
            </Grid>
        </Box>
    );
}

UserEditForm.propTypes = {
  userToEdit: PropTypes.object, // Может быть null при инициализации
  onSuccess: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default UserEditForm;