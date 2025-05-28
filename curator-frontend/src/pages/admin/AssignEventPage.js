// Полный путь: src/pages/admin/AssignEventPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom'; // Добавили Navigate
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Container, Typography, TextField, Button, Grid, Box, Paper, CircularProgress, Alert, Snackbar,
    Autocomplete, Chip, FormHelperText, Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { getUsers } from '../../api/users'; // Изменили API для получения кураторов
import { assignEventToCurators } from '../../api/admin';

// Схема валидации
const assignSchema = yup.object().shape({
    title: yup.string().required('Название обязательно').max(500),
    startDate: yup.date().required('Дата начала обязательна').typeError('Неверный формат').min(dayjs().startOf('day'), 'Дата не может быть в прошлом'),
    description: yup.string().required('Описание обязательно').min(100, 'Минимум 100 символов'),
    targetUserIds: yup.array().of(yup.number().integer()).min(1, 'Выберите хотя бы одного куратора').required(),
    // Опциональные поля мероприятия
    directionId: yup.number().nullable().positive().integer(),
    levelId: yup.number().nullable().positive().integer(),
    formatId: yup.number().nullable().positive().integer(),
    endDate: yup.date().nullable().typeError('Неверный формат даты').min(yup.ref('startDate'), 'Дата окончания не может быть раньше даты начала'),
    locationText: yup.string().nullable(),
    addressText: yup.string().nullable(),
    responsibleFullName: yup.string().nullable(), // Будет подставляться ФИО куратора, если пусто
});

function AssignEventPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loadingLookups, setLoadingLookups] = useState(true); // Флаг загрузки списка кураторов
    const [formError, setFormError] = useState('');
    const [curatorsList, setCuratorsList] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(assignSchema),
        defaultValues: {
            title: '',
            startDate: dayjs(), // Сегодня по умолчанию
            description: '',
            targetUserIds: [],
            directionId: null, levelId: null, formatId: null, endDate: null, locationText: '', addressText: '', responsibleFullName: ''
        }
    });

    // Загрузка списка кураторов
    const loadCuratorsList = useCallback(async () => {
        setLoadingLookups(true); setFormError('');
        try {
            // Используем getUsers с фильтром по роли 'curator'
            const curatorsData = await getUsers({ role: 'curator', limit: 1000, isActive: true }); // Загружаем активных кураторов
            setCuratorsList(curatorsData.users || []);
            if (!curatorsData.users || curatorsData.users.length === 0) {
                 setFormError('Не найдено ни одного активного куратора для назначения.');
            }
        } catch (err) {
             setFormError('Не удалось загрузить список кураторов.');
             console.error("Load curators error:", err);
        } finally {
             setLoadingLookups(false);
        }
    }, []);

    useEffect(() => { loadCuratorsList(); }, [loadCuratorsList]);

    // --- Функция для выбора всех кураторов ---
    const handleSelectAllCurators = () => {
        const allCuratorIds = curatorsList.map(curator => curator.userId);
        setValue('targetUserIds', allCuratorIds, { shouldValidate: true, shouldDirty: true });
    };
    // ---------------------------------------

    // Отправка формы
    const onSubmit = async (data) => {
        setFormError('');
        const assignmentData = {
            targetUserIds: data.targetUserIds,
            title: data.title,
            startDate: dayjs(data.startDate).format('YYYY-MM-DD'),
            description: data.description,
            // Передаем опциональные поля, если они заполнены
            ...(data.directionId && { directionId: data.directionId }),
            ...(data.levelId && { levelId: data.levelId }),
            ...(data.formatId && { formatId: data.formatId }),
            ...(data.endDate && { endDate: dayjs(data.endDate).format('YYYY-MM-DD') }),
            ...(data.locationText && { locationText: data.locationText }),
            ...(data.addressText && { addressText: data.addressText }),
            ...(data.responsibleFullName && { responsibleFullName: data.responsibleFullName }),
        };

        console.log("Assigning event with data:", assignmentData);

        try {
            const response = await assignEventToCurators(assignmentData);
            setSnackbar({ open: true, message: response.message || 'Мероприятия успешно назначены!', severity: 'success' });
            if (response.errors && response.errors.length > 0) {
                setSnackbar({ open: true, message: `${response.message} Ошибки: ${response.errors.join(', ')}`, severity: 'warning', autoHideDuration: 10000 });
            }
            reset(); // Очистить форму
            // Можно добавить небольшой редирект или оставить на странице
            // setTimeout(() => navigate('/events'), 2000);
        } catch (err) {
             const message = err.response?.data?.message || err.message || 'Ошибка при назначении мероприятия.';
             setFormError(message);
             setSnackbar({ open: true, message: message, severity: 'error' });
             console.error("Assign event error:", err);
        }
    };

     const handleCloseSnackbar = useCallback((event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    // Доступ только для админа
    if (user?.role !== 'administrator') return <Navigate to="/forbidden" replace />;

    return (
         <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
             <Paper sx={{ p: {xs: 2, md: 3} }}>
                 <Typography variant="h4" component="h1" gutterBottom> Назначить мероприятие кураторам </Typography>
                 {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

                 <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                     <Grid container spacing={2}> {/* Уменьшил spacing */}
                         <Grid item xs={12}>
                             <Controller name="title" control={control} render={({ field }) => <TextField {...field} label="Название/Тема мероприятия *" required fullWidth size="small" error={!!errors.title} helperText={errors.title?.message} />} />
                         </Grid>
                         <Grid item xs={12} sm={6}>
                            <Controller name="startDate" control={control} render={({ field }) => (<DatePicker {...field} label="Дата начала *" value={field.value ? dayjs(field.value) : null} onChange={(date) => field.onChange(date)} disablePast slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.startDate, helperText: errors.startDate?.message, size:'small' } }} />)} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller name="endDate" control={control} render={({ field }) => (<DatePicker {...field} label="Дата окончания (необязательно)" value={field.value ? dayjs(field.value) : null} onChange={(date) => field.onChange(date)} minDate={watch('startDate') || undefined} slotProps={{ textField: { fullWidth: true, error: !!errors.endDate, helperText: errors.endDate?.message, size:'small' } }} />)} />
                        </Grid>
                         <Grid item xs={12}>
                             <Controller name="description" control={control} render={({ field }) => <TextField {...field} label="Описание (мин. 100 символов) *" required fullWidth multiline rows={4} size="small" error={!!errors.description} helperText={errors.description?.message} />} />
                         </Grid>

                        {/* Опциональные поля мероприятия */}
                        <Grid item xs={12}><Divider sx={{my:1}}><Chip label="Дополнительные детали мероприятия (необязательно)" size="small"/></Divider></Grid>
                        <Grid item xs={12} sm={6} md={4}><Controller name="locationText" control={control} render={({ field }) => <TextField {...field} label="Место проведения" fullWidth size="small"/>} /></Grid>
                        <Grid item xs={12} sm={6} md={4}><Controller name="addressText" control={control} render={({ field }) => <TextField {...field} label="Адрес" fullWidth size="small"/>} /></Grid>
                        <Grid item xs={12} sm={6} md={4}><Controller name="responsibleFullName" control={control} render={({ field }) => <TextField {...field} label="ФИО ответственного (если не куратор)" fullWidth size="small" helperText="Если пусто, будет ФИО куратора"/>} /></Grid>
                        {/* TODO: Добавить Select для directionId, levelId, formatId, если нужно их здесь задавать */}


                         <Grid item xs={12} sx={{mt:1}}>
                            <Typography variant="subtitle1" gutterBottom>Выберите кураторов для назначения</Typography>
                             <Controller
                                 name="targetUserIds"
                                 control={control}
                                 defaultValue={[]}
                                 render={({ field }) => (
                                     <Autocomplete multiple id="curator-select-assign-autocomplete"
                                         options={curatorsList}
                                         disabled={loadingLookups || curatorsList.length === 0}
                                         getOptionLabel={(option) => `${option.fullName} (${option.email})` || ''}
                                         isOptionEqualToValue={(option, value) => option.userId === value.userId}
                                         value={curatorsList.filter(c => field.value?.includes(c.userId))}
                                         onChange={(_, newValue) => field.onChange(newValue ? newValue.map(item => item.userId) : [])}
                                         renderInput={(params) => <TextField {...params} label="Кураторы *" required placeholder={loadingLookups ? "Загрузка..." : (curatorsList.length === 0 ? "Нет кураторов для выбора" : "Выберите кураторов...")} error={!!errors.targetUserIds} helperText={errors.targetUserIds?.message}/>}
                                         renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option.fullName} {...getTagProps({ index })} size="small"/>))}
                                         ListboxProps={{ style: { maxHeight: 200, overflow: 'auto' } }}
                                     />
                                )}
                             />
                             {curatorsList.length > 0 && !loadingLookups &&
                                <Button
                                    size="small"
                                    onClick={handleSelectAllCurators}
                                    sx={{ mt: 1 }}
                                    disabled={watch('targetUserIds')?.length === curatorsList.length} // Деактивируем, если все уже выбраны
                                >
                                    Выбрать всех кураторов
                                </Button>
                             }
                             <FormHelperText>Для каждого выбранного куратора будет создано отдельное мероприятие.</FormHelperText>
                         </Grid>

                         <Grid item xs={12}>
                             <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                  <Button type="submit" variant="contained" disabled={isSubmitting || loadingLookups}>
                                     {isSubmitting ? <CircularProgress size={24} /> : 'Назначить мероприятие'}
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

export default AssignEventPage;
