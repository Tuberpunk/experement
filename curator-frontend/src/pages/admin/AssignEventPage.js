// Полный путь: src/pages/admin/AssignEventPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Container, Typography, TextField, Button, Grid, Box, Paper, CircularProgress, Alert, Snackbar,
    Autocomplete, Chip, FormHelperText // Autocomplete для выбора кураторов
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext'; // Для проверки роли (дублирование PrivateRoute)
import { getCurators } from '../../api/studentGroups'; // Используем существующую функцию API для получения кураторов
import { assignEventToCurators } from '../../api/admin'; // Наша новая API функция

// Схема валидации
const assignSchema = yup.object().shape({
    title: yup.string().required('Название обязательно').max(500),
    startDate: yup.date().required('Дата начала обязательна').typeError('Неверный формат').min(dayjs().startOf('day'), 'Дата не может быть в прошлом'),
    description: yup.string().required('Описание обязательно').min(100, 'Минимум 100 символов'),
    targetUserIds: yup.array().of(yup.number().integer()).min(1, 'Выберите хотя бы одного куратора').required(),
    // Добавить валидацию для других опциональных полей, если они есть в форме
});

function AssignEventPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loadingLookups, setLoadingLookups] = useState(true);
    const [formError, setFormError] = useState('');
    const [curatorsList, setCuratorsList] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    const { control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(assignSchema),
        defaultValues: { title: '', startDate: dayjs(), description: '', targetUserIds: [] }
    });

    // Загрузка списка кураторов
    const loadCuratorsList = useCallback(async () => {
        setLoadingLookups(true); setFormError('');
        try {
            const curatorsData = await getCurators(); // Получаем кураторов
            setCuratorsList(curatorsData || []);
            if (!curatorsData || curatorsData.length === 0) {
                 setFormError('Не найдено ни одного куратора для назначения.');
            }
        } catch (err) {
             setFormError('Не удалось загрузить список кураторов.');
             console.error("Load curators error:", err);
        } finally {
             setLoadingLookups(false);
        }
    }, []);

    useEffect(() => { loadCuratorsList(); }, [loadCuratorsList]);

    // Отправка формы
    const onSubmit = async (data) => {
        setFormError('');
        const assignmentData = {
            ...data,
            startDate: dayjs(data.startDate).format('YYYY-MM-DD'),
             // Можно добавить другие поля Event, если они есть в форме
             // otherEventData: { ... }
        };
        try {
            const response = await assignEventToCurators(assignmentData);
            setSnackbar({ open: true, message: response.message || 'Мероприятия успешно назначены!', severity: 'success' });
            reset(); // Очистить форму
             setTimeout(() => navigate('/events'), 2000); // Переход к списку мероприятий
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

    // Доступ только для админа (дублирует PrivateRoute, но для ясности)
    if (user?.role !== 'administrator') return <navigate to="/forbidden" replace />;

    return (
         <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
             <Paper sx={{ p: 3 }}>
                 <Typography variant="h4" component="h1" gutterBottom> Назначить мероприятие кураторам </Typography>
                 {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

                 <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                     <Grid container spacing={3}>
                         <Grid item xs={12}>
                             <Controller name="title" control={control} render={({ field }) => <TextField {...field} label="Название/Тема мероприятия *" required fullWidth error={!!errors.title} helperText={errors.title?.message} />} />
                         </Grid>
                         <Grid item xs={12} sm={6}>
                            <Controller name="startDate" control={control} render={({ field }) => (<DatePicker {...field} label="Дата начала *" value={field.value ? dayjs(field.value) : null} onChange={(date) => field.onChange(date)} disablePast slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.startDate, helperText: errors.startDate?.message } }} />)} />
                        </Grid>
                        {/* TODO: Добавить другие необязательные поля: дата окончания, формат, уровень и т.д. */}
                         <Grid item xs={12}>
                             <Controller name="description" control={control} render={({ field }) => <TextField {...field} label="Описание (мин. 100 симв.) *" required fullWidth multiline rows={4} error={!!errors.description} helperText={errors.description?.message} />} />
                         </Grid>
                         <Grid item xs={12}>
                             <Controller
                                 name="targetUserIds"
                                 control={control}
                                 defaultValue={[]}
                                 render={({ field }) => (
                                     <Autocomplete multiple id="curator-select-autocomplete" options={curatorsList} disabled={loadingLookups} getOptionLabel={(option) => option.fullName || ''} isOptionEqualToValue={(option, value) => option.userId === value.userId}
                                         value={curatorsList.filter(c => field.value?.includes(c.userId))}
                                         onChange={(_, newValue) => field.onChange(newValue ? newValue.map(item => item.userId) : [])}
                                         renderInput={(params) => <TextField {...params} label="Выберите кураторов для назначения *" required error={!!errors.targetUserIds} helperText={errors.targetUserIds?.message || (curatorsList.length === 0 && !loadingLookups ? 'Кураторы не найдены' : '')}/>}
                                         renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option.fullName} {...getTagProps({ index })} size="small"/>))}
                                     />
                                )}
                             />
                             <FormHelperText>Можно выбрать несколько кураторов. Для каждого будет создано отдельное мероприятие.</FormHelperText>
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