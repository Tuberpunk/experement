// Полный путь: src/pages/CuratorReportForm.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Добавляем useLocation
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Container, Typography, TextField, Button, Grid, Box, Paper, CircularProgress, Alert, Snackbar,
    Autocomplete, Chip, FormControl, InputLabel, Select, MenuItem, FormHelperText // Добавили FormControl и т.д.
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { createCuratorReport, getMyStudentsForReport } from '../api/curatorReports';
import { getEvents } from '../api/events'; // Для загрузки списка мероприятий, если нужно выбирать

// Схема валидации для отчета куратора
const reportSchema = yup.object().shape({
    reportTitle: yup.string().required('Название/тема отчета обязательны'),
    reportDate: yup.date().required('Дата проведения обязательна').typeError('Неверный формат даты').max(dayjs(), 'Дата не может быть в будущем'),
    locationText: yup.string().nullable(),
    directionText: yup.string().nullable(),
    invitedGuestsInfo: yup.string().nullable(),
    foreignerCount: yup.number().nullable().min(0, 'Кол-во >= 0').integer('Должно быть целое число').typeError('Введите число').transform(value => (isNaN(value) || value === null || value === '' ? null : Number(value))),
    minorCount: yup.number().nullable().min(0, 'Кол-во >= 0').integer('Должно быть целое число').typeError('Введите число').transform(value => (isNaN(value) || value === null || value === '' ? null : Number(value))),
    durationMinutes: yup.number().nullable().min(0, 'Кол-во >= 0').integer('Должно быть целое число').typeError('Введите число').transform(value => (isNaN(value) || value === null || value === '' ? null : Number(value))),
    mediaReferences: yup.string().nullable(),
    eventId: yup.number().nullable().positive('ID должен быть > 0').integer('ID должен быть целым числом'), // ID связанного мероприятия
    studentIds: yup.array().of(yup.number().integer()).min(1, 'Выберите хотя бы одного студента-участника').required('Выберите участников'),
});

function CuratorReportForm() {
    const navigate = useNavigate();
    const location = useLocation(); // Получаем location для доступа к state
    const { user } = useAuth();
    const [loadingLookups, setLoadingLookups] = useState(true);
    const [formError, setFormError] = useState('');
    const [studentsList, setStudentsList] = useState([]);
    const [eventsList, setEventsList] = useState([]); // Для выбора мероприятия (если нужно)
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    // Получаем данные из location.state для предзаполнения
    const passedEventId = location.state?.eventId;
    const passedEventTitle = location.state?.eventTitle;
    const passedEventDate = location.state?.eventDate;

    const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(reportSchema),
        defaultValues: {
            reportTitle: passedEventTitle ? `Отчет по мероприятию: ${passedEventTitle}` : '',
            reportDate: passedEventDate ? dayjs(passedEventDate) : dayjs(), // Дата мероприятия или сегодня
            locationText: '',
            directionText: '',
            invitedGuestsInfo: '',
            foreignerCount: '',
            minorCount: '',
            durationMinutes: '',
            mediaReferences: '',
            eventId: passedEventId || '', // Предзаполняем ID мероприятия
            studentIds: []
        }
    });

    // Загрузка студентов куратора и, возможно, списка мероприятий
    const loadInitialData = useCallback(async () => {
        setLoadingLookups(true);
        setFormError('');
        try {
            const [myStudents, eventsData] = await Promise.all([
                getMyStudentsForReport(), // Загружаем студентов текущего куратора
                getEvents({ limit: 100, sortBy: 'startDate', sortOrder: 'DESC' }) // Загружаем недавние мероприятия для выбора
            ]);

            setStudentsList(myStudents || []);
            setEventsList(eventsData.events || []);

            if (!myStudents || myStudents.length === 0) {
                 console.warn("getMyStudentsForReport returned empty. No students for selection.");
            }
        } catch (err) {
            console.error("Failed to load initial data for report form:", err);
            setFormError('Не удалось загрузить список студентов или мероприятий.');
        } finally {
            setLoadingLookups(false);
        }
    }, []);

    useEffect(() => {
        loadInitialData();
        // Если данные пришли из state, дополнительно устанавливаем их через setValue,
        // на случай если defaultValues не успели подхватить или форма была сброшена.
        if (passedEventId && !watch('eventId')) {
            setValue('eventId', passedEventId);
        }
        if (passedEventTitle && !watch('reportTitle')) {
            setValue('reportTitle', `Отчет по мероприятию: ${passedEventTitle}`);
        }
        if (passedEventDate && !watch('reportDate')) {
            setValue('reportDate', dayjs(passedEventDate));
        }
    }, [loadInitialData, passedEventId, passedEventTitle, passedEventDate, setValue, watch]);

    // Обработчик отправки формы
    const onSubmit = async (data) => {
        setFormError('');
        const reportDataToSend = {
            ...data,
            reportDate: data.reportDate ? dayjs(data.reportDate).format('YYYY-MM-DD') : null,
            foreignerCount: data.foreignerCount === '' || data.foreignerCount === null ? 0 : parseInt(data.foreignerCount, 10),
            minorCount: data.minorCount === '' || data.minorCount === null ? 0 : parseInt(data.minorCount, 10),
            durationMinutes: data.durationMinutes === '' || data.durationMinutes === null ? null : parseInt(data.durationMinutes, 10),
            eventId: data.eventId || null,
            studentIds: data.studentIds || []
        };
        for (const key of ['locationText', 'directionText', 'invitedGuestsInfo', 'mediaReferences']) {
            if (!reportDataToSend[key]) reportDataToSend[key] = null;
        }

        console.log("Sending Curator Report Data:", reportDataToSend);

        try {
            const newReport = await createCuratorReport(reportDataToSend);
            setSnackbar({ open: true, message: `Отчет "${newReport.reportTitle}" успешно создан!`, severity: 'success' });
            setTimeout(() => navigate('/curator-reports'), 1500); // Переход к списку отчетов
        } catch (err) {
            const message = err.response?.data?.message || err.message || `Не удалось создать отчет.`;
            setFormError(message);
            setSnackbar({ open: true, message: message, severity: 'error' });
            console.error("Curator report form submission error:", err);
        }
    };

     const handleCloseSnackbar = useCallback((event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    // --- Рендеринг ---
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
                                        <Autocomplete multiple id="student-participants-report-autocomplete"
                                            options={studentsList}
                                            disabled={loadingLookups || studentsList.length === 0}
                                            getOptionLabel={(option) => option.fullName || ''}
                                            isOptionEqualToValue={(option, value) => option.studentId === value.studentId}
                                            value={studentsList.filter(s => field.value?.includes(s.studentId))}
                                            onChange={(_, newValue) => field.onChange(newValue ? newValue.map(item => item.studentId) : [])}
                                            renderInput={(params) => <TextField {...params} label="Студенты-участники *" required placeholder={loadingLookups ? "Загрузка..." : (studentsList.length === 0 ? "Нет студентов для выбора" : "Выберите из списка...")} error={!!errors.studentIds} helperText={errors.studentIds?.message}/>}
                                            renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option.fullName} {...getTagProps({ index })} size="small"/>))}
                                        />
                                   )}
                                />
                                {studentsList.length === 0 && !loadingLookups && !formError.includes("студентов") &&
                                    <Typography variant="caption" color="text.secondary">Не найдены студенты в ваших группах. Выбор участников невозможен.</Typography>
                                }
                           </Grid>

                           {/* --- Ссылки и опциональная привязка к мероприятию --- */}
                           <Grid item xs={12}>
                                <FormControl fullWidth error={!!errors.eventId} size="small" disabled={loadingLookups}>
                                    <InputLabel id="event-link-report-label">Связать с мероприятием (необязательно)</InputLabel>
                                    <Controller name="eventId" control={control} defaultValue={passedEventId || ""} render={({ field }) => (
                                        <Select {...field} labelId="event-link-report-label" label="Связать с мероприятием">
                                            <MenuItem value=""><em>Не связано</em></MenuItem>
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