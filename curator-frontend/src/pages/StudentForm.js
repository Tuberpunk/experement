// Полный путь: src/pages/StudentForm.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Navigate, Link as RouterLink } from 'react-router-dom'; // Добавлены Navigate и RouterLink
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Container, Typography, TextField, Button, Grid, Box, Paper, CircularProgress, Alert, Snackbar,
    Select, MenuItem, FormControl, InputLabel, FormHelperText, Checkbox, FormControlLabel, Autocomplete, Chip,
    IconButton // Добавлен IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../contexts/AuthContext'; // Убедитесь, что путь правильный
import { getStudentById, createStudent, updateStudent } from '../api/students'; // Убедитесь, что путь правильный
import { getGroups } from '../api/studentGroups'; // Убедитесь, что путь правильный
import { getStudentTags } from '../api/lookups'; // Убедитесь, что путь правильный

// Схема валидации Yup
const studentSchema = yup.object().shape({
    fullName: yup.string().required('ФИО студента обязательно'),
    groupId: yup.number().required('Группа обязательна').positive('Группа обязательна').integer('Группа обязательна'),
    email: yup.string().email('Неверный формат email').nullable().transform(value => value || null),
    dateOfBirth: yup.date().nullable().typeError('Неверный формат даты').max(dayjs().subtract(15, 'year'), 'Студент должен быть старше 15 лет'),
    phoneNumber: yup.string().nullable().transform(value => value || null),
    studentCardNumber: yup.string().nullable().transform(value => value || null),
    isActive: yup.boolean(),
    tagIds: yup.array().of(yup.number().integer()).nullable(),
});


function StudentForm({ mode }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(mode === 'edit');
    const [formError, setFormError] = useState('');
    const [groupsList, setGroupsList] = useState([]);
    const [tagsList, setTagsList] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const isEditMode = mode === 'edit';

    // === ВЫЗОВ ХУКОВ (ДО ПРОВЕРКИ ПРАВ) ===
    const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(studentSchema),
        defaultValues: {
            fullName: '', groupId: '', email: '', dateOfBirth: null,
            phoneNumber: '', studentCardNumber: '', isActive: true, tagIds: []
        }
    });

    const loadLookups = useCallback(async () => {
        try {
            const [groupsData, tagsData] = await Promise.all([
                getGroups({ limit: 1000 }),
                getStudentTags()
            ]);
            setGroupsList(groupsData.groups || []);
            setTagsList(tagsData || []);
        } catch (err) {
            console.error("Failed to load lookups for student form:", err);
            setFormError('Не удалось загрузить списки групп или тегов.');
        }
    }, []); // Пустые зависимости, т.к. не зависит от внешних переменных

    const loadStudentData = useCallback(async () => {
        if (isEditMode && id) {
            setLoading(true);
            setFormError('');
            try {
                const studentData = await getStudentById(id);
                // Проверка прав больше не нужна здесь, ее делает PrivateRoute
                reset({
                    fullName: studentData.fullName || '',
                    groupId: studentData.groupId || '',
                    email: studentData.email || '',
                    dateOfBirth: studentData.dateOfBirth ? dayjs(studentData.dateOfBirth) : null,
                    phoneNumber: studentData.phoneNumber || '',
                    studentCardNumber: studentData.studentCardNumber || '',
                    isActive: studentData.isActive !== undefined ? studentData.isActive : true,
                    tagIds: studentData.Tags?.map(tag => tag.tagId) || []
                });
            } catch (err) {
                setFormError(err.response?.data?.message || err.message || 'Не удалось загрузить данные студента.');
                console.error("Fetch student for edit error:", err);
                // Если ошибка - доступ запрещен или не найдено, можно перенаправить
                if (err.response?.status === 403 || err.response?.status === 404) {
                     navigate('/students', { replace: true });
                }
            } finally {
                setLoading(false);
            }
        }
    }, [id, isEditMode, reset, navigate]); // Добавили navigate

    useEffect(() => {
        loadLookups();
        loadStudentData();
    }, [loadLookups, loadStudentData]);

    const onSubmit = async (data) => {
        setFormError('');
        const studentDataToSend = {
            ...data,
            dateOfBirth: data.dateOfBirth ? dayjs(data.dateOfBirth).format('YYYY-MM-DD') : null,
            groupId: parseInt(data.groupId, 10),
            tagIds: data.tagIds || []
        };
        if (!studentDataToSend.email) studentDataToSend.email = null;
        if (!studentDataToSend.phoneNumber) studentDataToSend.phoneNumber = null;
        if (!studentDataToSend.studentCardNumber) studentDataToSend.studentCardNumber = null;

        try {
            let result;
            if (isEditMode) {
                result = await updateStudent(id, studentDataToSend);
            } else {
                result = await createStudent(studentDataToSend);
            }
            setSnackbar({ open: true, message: `Данные студента успешно ${isEditMode ? 'обновлены' : 'созданы'}!`, severity: 'success' });
            setTimeout(() => navigate('/students'), 1500);
        } catch (err) {
            const message = err.response?.data?.message || err.message || `Не удалось ${isEditMode ? 'обновить' : 'создать'} студента.`;
            setFormError(message);
            setSnackbar({ open: true, message: message, severity: 'error' });
            console.error("Student form submission error:", err);
        }
    };

    const handleCloseSnackbar = useCallback((event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    // === ПРОВЕРКА ПРАВ ДОСТУПА (ПОСЛЕ ХУКОВ) ===
    // Эта форма доступна только администратору
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
                    {isEditMode ? 'Редактировать данные студента' : 'Добавить нового студента'}
                </Typography>
                <Typography variant="caption" color="error" component="div" sx={{mb: 2}}>
                    НАДА ЕЩЕ ПОДУМАТЬ!
                 </Typography>

                {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <Grid container spacing={3}>
                        {/* --- Основные поля студента --- */}
                        <Grid item xs={12} sm={8}>
                            <Controller name="fullName" control={control} render={({ field }) => <TextField {...field} label="ФИО Студента" required fullWidth error={!!errors.fullName} helperText={errors.fullName?.message} />} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Controller name="dateOfBirth" control={control} render={({ field }) => (<DatePicker {...field} label="Дата рождения" views={['year', 'month', 'day']} value={field.value ? dayjs(field.value) : null} onChange={(date) => field.onChange(date)} disableFuture maxDate={dayjs().subtract(15, 'year')} slotProps={{ textField: { fullWidth: true, error: !!errors.dateOfBirth, helperText: errors.dateOfBirth?.message } }} />)} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required error={!!errors.groupId}>
                                <InputLabel id="group-select-label">Группа *</InputLabel>
                                <Controller name="groupId" control={control} render={({ field }) => (
                                    <Select {...field} labelId="group-select-label" label="Группа *">
                                        <MenuItem value="" disabled><em>Выберите группу...</em></MenuItem>
                                        {groupsList.map(g => <MenuItem key={g.groupId} value={g.groupId}>{g.groupName}</MenuItem>)}
                                    </Select>
                                )} />
                                <FormHelperText>{errors.groupId?.message || 'Студент должен быть привязан к группе'}</FormHelperText>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller name="studentCardNumber" control={control} render={({ field }) => <TextField {...field} label="Номер студ. билета" fullWidth error={!!errors.studentCardNumber} helperText={errors.studentCardNumber?.message} />} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller name="email" control={control} render={({ field }) => <TextField {...field} label="Email" type="email" fullWidth error={!!errors.email} helperText={errors.email?.message} />} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller name="phoneNumber" control={control} render={({ field }) => <TextField {...field} label="Телефон" fullWidth />} />
                        </Grid>

                        {/* --- Теги --- */}
                        <Grid item xs={12}>
                            <Controller
                                name="tagIds"
                                control={control}
                                defaultValue={[]}
                                render={({ field }) => (
                                    <Autocomplete multiple id="student-tags-autocomplete" options={tagsList} getOptionLabel={(option) => option.name || ''} isOptionEqualToValue={(option, value) => option.id === value.id}
                                        value={tagsList.filter(tag => field.value?.includes(tag.id))}
                                        onChange={(_, newValue) => {
                                            field.onChange(newValue ? newValue.map(item => item.id) : []);
                                        }}
                                        renderInput={(params) => <TextField {...params} label="Теги/Отметки" error={!!errors.tagIds} helperText={errors.tagIds?.message || "Напр., Активист, Спортсмен (Осторожно с перс. данными!)"} />}
                                        renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option.name} {...getTagProps({ index })} size="small"/>))}
                                    />
                                )}
                            />
                        </Grid>

                        {/* --- Статус --- */}
                        <Grid item xs={12}>
                            <Controller name="isActive" control={control} render={({ field }) => <FormControlLabel control={<Checkbox {...field} checked={!!field.value} />} label="Студент активен (учится)" />} />
                        </Grid>

                        {/* --- Кнопки --- */}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 2 }}>
                                <Button variant="outlined" onClick={() => navigate(isEditMode ? `/students/${id}` : '/students')} disabled={isSubmitting}>
                                    Отмена
                                </Button>
                                <Button type="submit" variant="contained" disabled={isSubmitting || loading}>
                                    {isSubmitting ? <CircularProgress size={24} /> : (isEditMode ? 'Сохранить' : 'Добавить студента')}
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

export default StudentForm;