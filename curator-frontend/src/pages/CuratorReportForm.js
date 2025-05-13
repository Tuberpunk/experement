// Полный путь: src/pages/CuratorReportForm.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Container, Typography, TextField, Button, Grid, Box, Paper, CircularProgress, Alert, Snackbar,
    Autocomplete, Chip, Select, MenuItem, FormControl, InputLabel, FormHelperText // Добавили Select и т.д.
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { createCuratorReport, getMyStudentsForReport } from '../api/curatorReports';
import { getEvents } from '../api/events'; // <-- Импорт для получения мероприятий
import { format } from 'date-fns'; // Для форматирования даты в списке мероприятий
import { ru } from 'date-fns/locale';

// Обновленная Схема валидации
const reportSchema = yup.object().shape({
    reportTitle: yup.string().required('Название/тема отчета обязательны'),
    reportDate: yup.date().required('Дата проведения обязательна').typeError('Неверный формат даты').max(dayjs(), 'Дата не может быть в будущем'),
    locationText: yup.string().nullable(),
    directionText: yup.string().nullable(),
    invitedGuestsInfo: yup.string().nullable(),
    foreignerCount: yup.number().nullable().min(0, 'Кол-во >= 0').integer('Должно быть целое число').typeError('Введите число').transform(value => (isNaN(value) || value === null || value === '' ? null : value)),
    minorCount: yup.number().nullable().min(0, 'Кол-во >= 0').integer('Должно быть целое число').typeError('Введите число').transform(value => (isNaN(value) || value === null || value === '' ? null : value)),
    durationMinutes: yup.number().nullable().min(0, 'Кол-во >= 0').integer('Должно быть целое число').typeError('Введите число').transform(value => (isNaN(value) || value === null || value === '' ? null : value)),
    mediaReferences: yup.string().nullable(),
    eventId: yup.number().nullable().positive().integer(), // ID Мероприятия (необязательное)
    studentIds: yup.array().of(yup.number().integer()).min(1, 'Выберите хотя бы одного студента-участника').required('Выберите участников'),
});

function CuratorReportForm() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loadingLookups, setLoadingLookups] = useState(true);
    const [formError, setFormError] = useState('');
    const [studentsList, setStudentsList] = useState([]);
    const [eventsList, setEventsList] = useState([]); // <-- Состояние для списка мероприятий
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    const { control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(reportSchema),
        defaultValues: {
            reportTitle: '', reportDate: dayjs(), locationText: '', directionText: '', invitedGuestsInfo: '',
            foreignerCount: '', minorCount: '', durationMinutes: '', mediaReferences: '',
            eventId: '', // <-- Начальное значение для eventId
            studentIds: []
        }
    });

    // Загрузка студентов куратора и мероприятий
    const loadInitialData = useCallback(async () => {
        setLoadingLookups(true); setFormError('');
        try {
            // Запрашиваем студентов и недавние мероприятия параллельно
            const [myStudents, eventsData] = await Promise.all([
                getMyStudentsForReport(),
                getEvents({ limit: 50, sortBy: 'startDate', sortOrder: 'DESC'}) // Берем 50 последних мероприятий
            ]);

            setStudentsList(myStudents || []);
            setEventsList(eventsData.events || []); // Сохраняем список мероприятий

            if (!myStudents || myStudents.length === 0) {
                 console.warn("getMyStudentsForReport returned empty or null.");
                 // Не устанавливаем ошибку формы, просто показываем сообщение в поле Autocomplete
            }

        } catch (err) {
            console.error("Failed to load initial data for report form:", err);
            setFormError('Не удалось загрузить список студентов или мероприятий.');
        } finally {
            setLoadingLookups(false);
        }
    }, []);

    useEffect(() => { loadInitialData(); }, [loadInitialData]);

    // Обработчик отправки формы
    const onSubmit = async (data) => {
        setFormError('');
        const reportDataToSend = {
            ...data,
            reportDate: data.reportDate ? dayjs(data.reportDate).format('YYYY-MM-DD') : null,
            foreignerCount: data.foreignerCount === '' ? 0 : parseInt(data.foreignerCount, 10),
            minorCount: data.minorCount === '' ? 0 : parseInt(data.minorCount, 10),
            durationMinutes: data.durationMinutes === '' ? null : parseInt(data.durationMinutes, 10),
            eventId: data.eventId || null, // Отправляем null, если не выбрано
            studentIds: data.studentIds || []
        };
        for (const key of ['locationText', 'directionText', 'invitedGuestsInfo', 'mediaReferences']) {
            if (!reportDataToSend[key]) reportDataToSend[key] = null;
        }

        try {
            const newReport = await createCuratorReport(reportDataToSend);
            setSnackbar({ open: true, message: `Отчет "${newReport.reportTitle}" успешно создан!`, severity: 'success' });
            setTimeout(() => navigate('/curator-reports'), 1500);
        } catch (err) {
            const message = err.response?.data?.message || err.message || `Не удалось создать отчет.`;
            setFormError(message);
            setSnackbar({ open: true, message: message, severity: 'error' });
            console.error("Report form submission error:", err);
        }
    };

     const handleCloseSnackbar = useCallback((event, reason) => { /* ... как было ... */ }, []);

    // --- Рендеринг ---
    // Проверка роли не нужна здесь, т.к. доступ к роуту /curator-reports/new должен быть у куратора
    if (loadingLookups) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Создать отчет о мероприятии/беседе
                </Typography>

                {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <Grid container spacing={3}>
                         {/* --- Основные поля отчета --- */}
                         <Grid item xs={12} md={8}>
                             <Controller name="reportTitle" control={control} render={({ field }) => <TextField {...field} label="Тема беседы / Название мероприятия *" required fullWidth error={!!errors.reportTitle} helperText={errors.reportTitle?.message} />} />
                         </Grid>
                         <Grid item xs={12} md={4}>
                              <Controller name="reportDate" control={control} render={({ field }) => (<DatePicker {...field} label="Дата проведения *" value={field.value ? dayjs(field.value) : null} onChange={(date) => field.onChange(date)} disableFuture maxDate={dayjs()} slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.reportDate, helperText: errors.reportDate?.message } }} />)} />
                         </Grid>
                         {/* ... остальные поля: locationText, directionText, etc. ... */}
                          <Grid item xs={12} sm={6}>
                             <Controller name="locationText" control={control} render={({ field }) => <TextField {...field} label="Место проведения" fullWidth />} />
                         </Grid>
                         <Grid item xs={12} sm={6}>
                              <Controller name="directionText" control={control} render={({ field }) => <TextField {...field} label="Направление работы" fullWidth />} />
                         </Grid>
                          <Grid item xs={12}>
                               <Controller name="invitedGuestsInfo" control={control} render={({ field }) => <TextField {...field} label="Приглашенные" fullWidth multiline rows={2} />} />
                          </Grid>
                           <Grid item xs={6} sm={3}>
                               <Controller name="foreignerCount" control={control} render={({ field }) => <TextField {...field} label="Кол-во иностр." type="number" fullWidth error={!!errors.foreignerCount} helperText={errors.foreignerCount?.message} InputProps={{ inputProps: { min: 0 } }} />} />
                          </Grid>
                           <Grid item xs={6} sm={3}>
                              <Controller name="minorCount" control={control} render={({ field }) => <TextField {...field} label="Кол-во несоверш." type="number" fullWidth error={!!errors.minorCount} helperText={errors.minorCount?.message} InputProps={{ inputProps: { min: 0 } }} />} />
                           </Grid>
                            <Grid item xs={12} sm={6}>
                               <Controller name="durationMinutes" control={control} render={({ field }) => <TextField {...field} label="Продолжительность (минут)" type="number" fullWidth error={!!errors.durationMinutes} helperText={errors.durationMinutes?.message} InputProps={{ inputProps: { min: 0 } }} />} />
                           </Grid>


                         {/* --- Выбор студентов-участников --- */}
                         <Grid item xs={12}>
                               <Controller
                                    name="studentIds"
                                    control={control}
                                    defaultValue={[]}
                                    render={({ field }) => (
                                        <Autocomplete multiple id="student-participants-select"
                                            options={studentsList} // Используем загруженный список
                                            disabled={loadingLookups || studentsList.length === 0}
                                            getOptionLabel={(option) => option.fullName || ''}
                                            isOptionEqualToValue={(option, value) => option.studentId === value.studentId}
                                            value={studentsList.filter(s => field.value?.includes(s.studentId))}
                                            onChange={(_, newValue) => field.onChange(newValue ? newValue.map(item => item.studentId) : [])}
                                            renderInput={(params) => <TextField {...params} label="Студенты-участники *" required placeholder={loadingLookups ? "Загрузка..." : (studentsList.length === 0 ? "Нет студентов для выбора" : "Выберите...")} error={!!errors.studentIds} helperText={errors.studentIds?.message}/>}
                                            renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option.fullName} {...getTagProps({ index })} size="small"/>))}
                                        />
                                   )}
                                />
                                {/* Сообщение, если список студентов не загружен */}
                                {studentsList.length === 0 && !loadingLookups && !formError.includes("студентов") &&
                                    <Typography variant="caption" color="text.secondary">Не найдены студенты в ваших группах. Выбор участников невозможен.</Typography>
                                }
                           </Grid>

                         {/* --- Ссылки и опциональная привязка к мероприятию --- */}
                           <Grid item xs={12}>
                               <Controller name="mediaReferences" control={control} render={({ field }) => <TextField {...field} label="Ссылки на фото/публикации" fullWidth multiline rows={2} />} />
                           </Grid>
                           <Grid item xs={12}>
                                <FormControl fullWidth error={!!errors.eventId} size="small" disabled={loadingLookups}>
                                    <InputLabel id="event-link-label">Связать с мероприятием (необязательно)</InputLabel>
                                    <Controller name="eventId" control={control} defaultValue="" render={({ field }) => (
                                        <Select {...field} labelId="event-link-label" label="Связать с мероприятием (необязательно)">
                                            <MenuItem value=""><em>Не связано</em></MenuItem>
                                             {/* Заполняем список мероприятий */}
                                             {eventsList.map(e => (
                                                 <MenuItem key={e.eventId} value={e.eventId}>
                                                     {e.title} ({e.startDate ? format(new Date(e.startDate), 'dd.MM.yyyy') : 'дата?'} )
                                                 </MenuItem>
                                             ))}
                                         </Select>
                                    )} />
                                     <FormHelperText>{errors.eventId?.message}</FormHelperText>
                                </FormControl>
                            </Grid>

                        {/* --- Кнопки --- */}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 2 }}>
                                <Button variant="outlined" onClick={() => navigate('/curator-reports')} disabled={isSubmitting}> Отмена </Button>
                                <Button type="submit" variant="contained" disabled={isSubmitting || loadingLookups}>
                                    {isSubmitting ? <CircularProgress size={24} /> : 'Сохранить отчет'}
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

export default CuratorReportForm;