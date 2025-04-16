// Полный путь: src/pages/CuratorReportForm.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Container, Typography, TextField, Button, Grid, Box, Paper, CircularProgress, Alert, Snackbar,
    Autocomplete, Chip // Autocomplete для выбора студентов
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { createCuratorReport, getMyStudentsForReport } from '../api/curatorReports';
// import { getEvents } from '../api/events'; // Если нужно будет привязывать к мероприятию

// Схема валидации
const reportSchema = yup.object().shape({
    reportTitle: yup.string().required('Название/тема отчета обязательны'),
    reportDate: yup.date().required('Дата проведения обязательна').typeError('Неверный формат даты').max(dayjs(), 'Дата не может быть в будущем'),
    locationText: yup.string().nullable(),
    directionText: yup.string().nullable(),
    invitedGuestsInfo: yup.string().nullable(),
    foreignerCount: yup.number().nullable().min(0, 'Кол-во >= 0').integer('Должно быть целое число').typeError('Введите число'),
    minorCount: yup.number().nullable().min(0, 'Кол-во >= 0').integer('Должно быть целое число').typeError('Введите число'),
    durationMinutes: yup.number().nullable().min(0, 'Кол-во >= 0').integer('Должно быть целое число').typeError('Введите число'),
    mediaReferences: yup.string().nullable(),
    eventId: yup.number().nullable().positive('ID должен быть > 0').integer('ID должен быть целым числом'),
    studentIds: yup.array().of(yup.number().integer()).min(1, 'Выберите хотя бы одного студента-участника').required('Выберите участников'), // Массив ID студентов
});

function CuratorReportForm() {
    // Пропускаем режим редактирования для простоты этого примера
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loadingLookups, setLoadingLookups] = useState(true);
    const [formError, setFormError] = useState('');
    const [studentsList, setStudentsList] = useState([]); // Список студентов куратора
    // const [eventsList, setEventsList] = useState([]); // Опционально для привязки
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    // --- Права доступа ---
    // Только куратор может создать отчет (админ просматривает/удаляет)
     if (user?.role !== 'curator' && user?.role !== 'administrator') { // Пустим админа на всякий случай, но бэкенд присвоит ID куратора
         console.warn("Non-curator accessed report form, should not happen with proper routing.");
         // return <Navigate to="/forbidden" replace />; // Лучше настроить в роутинге
     }


    const { control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(reportSchema),
        defaultValues: {
            reportTitle: '', reportDate: dayjs(), locationText: '', directionText: '',
            invitedGuestsInfo: '', foreignerCount: '', minorCount: '', durationMinutes: '',
            mediaReferences: '', eventId: '', studentIds: []
        }
    });

    // Загрузка студентов текущего куратора
    const loadInitialData = useCallback(async () => {
        setLoadingLookups(true);
        setFormError('');
        try {
            // !!! ВАЖНО: Используем РЕАЛЬНЫЙ вызов API (если бэкенд готов) !!!
            const myStudents = await getMyStudentsForReport();
            if (!myStudents || myStudents.length === 0) {
                 console.warn("getMyStudentsForReport returned empty or null. No students available for selection.");
                 setFormError('Не удалось загрузить список ваших студентов. Убедитесь, что вы назначены куратором группы со студентами.');
                 // Не прерываем загрузку, позволяем форме отобразиться
            }
            setStudentsList(myStudents || []);

            // Опционально: Загрузка мероприятий для привязки
            // const eventsData = await getEvents({ limit: 100, sortBy: 'startDate', sortOrder: 'DESC'});
            // setEventsList(eventsData.events || []);

        } catch (err) {
            console.error("Failed to load initial data for report form:", err);
            setFormError('Ошибка при загрузке списков студентов или мероприятий.');
        } finally {
            setLoadingLookups(false);
        }
    }, []);

    useEffect(() => { loadInitialData(); }, [loadInitialData]);

    // --- Обработчики ---
    const onSubmit = async (data) => {
        setFormError('');
        const reportDataToSend = {
            ...data,
            reportDate: data.reportDate ? dayjs(data.reportDate).format('YYYY-MM-DD') : null,
            foreignerCount: data.foreignerCount === '' ? 0 : parseInt(data.foreignerCount, 10),
            minorCount: data.minorCount === '' ? 0 : parseInt(data.minorCount, 10),
            durationMinutes: data.durationMinutes === '' ? null : parseInt(data.durationMinutes, 10),
            eventId: data.eventId || null,
            studentIds: data.studentIds || []
        };
        for (const key of ['locationText', 'directionText', 'invitedGuestsInfo', 'mediaReferences']) {
            if (!reportDataToSend[key]) reportDataToSend[key] = null; // Отправляем null если пусто
        }

        console.log("Sending Report Data:", reportDataToSend); // Отладка

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

     const handleCloseSnackbar = useCallback((event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);


    // --- Рендеринг ---
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
                             <Controller name="reportTitle" control={control} render={({ field }) => <TextField {...field} label="Тема беседы / Название мероприятия" required fullWidth error={!!errors.reportTitle} helperText={errors.reportTitle?.message} />} />
                         </Grid>
                         <Grid item xs={12} md={4}>
                              <Controller name="reportDate" control={control} render={({ field }) => (<DatePicker {...field} label="Дата проведения *" value={field.value ? dayjs(field.value) : null} onChange={(date) => field.onChange(date)} disableFuture maxDate={dayjs()} slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.reportDate, helperText: errors.reportDate?.message } }} />)} />
                         </Grid>
                         <Grid item xs={12} sm={6}>
                             <Controller name="locationText" control={control} render={({ field }) => <TextField {...field} label="Место проведения" fullWidth />} />
                         </Grid>
                         <Grid item xs={12} sm={6}>
                              <Controller name="directionText" control={control} render={({ field }) => <TextField {...field} label="Направление работы" fullWidth />} />
                         </Grid>
                          <Grid item xs={12}>
                               <Controller name="invitedGuestsInfo" control={control} render={({ field }) => <TextField {...field} label="Приглашенные (ФИО, должность, организация)" fullWidth multiline rows={2} />} />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                               <Controller name="durationMinutes" control={control} render={({ field }) => <TextField {...field} label="Продолжительность (минут)" type="number" fullWidth error={!!errors.durationMinutes} helperText={errors.durationMinutes?.message} InputProps={{ inputProps: { min: 0 } }} />} />
                          </Grid>
                          <Grid item xs={6} sm={4}>
                              <Controller name="foreignerCount" control={control} render={({ field }) => <TextField {...field} label="Кол-во иностранцев" type="number" fullWidth error={!!errors.foreignerCount} helperText={errors.foreignerCount?.message} InputProps={{ inputProps: { min: 0 } }} />} />
                          </Grid>
                           <Grid item xs={6} sm={4}>
                              <Controller name="minorCount" control={control} render={({ field }) => <TextField {...field} label="Кол-во несоверш." type="number" fullWidth error={!!errors.minorCount} helperText={errors.minorCount?.message} InputProps={{ inputProps: { min: 0 } }} />} />
                           </Grid>

                          {/* --- Студенты-участники --- */}
                          <Grid item xs={12}>
                               <Controller
                                    name="studentIds"
                                    control={control}
                                    render={({ field }) => (
                                        <Autocomplete multiple id="student-participants-autocomplete"
                                            options={studentsList} // Список студентов куратора
                                            disabled={loadingLookups || studentsList.length === 0}
                                            getOptionLabel={(option) => option.fullName || ''} // Отображаем ФИО
                                            isOptionEqualToValue={(option, value) => option.studentId === value.studentId}
                                            // Находим объекты по ID из field.value для отображения выбранных
                                            value={studentsList.filter(s => field.value?.includes(s.studentId))}
                                            onChange={(_, newValue) => {
                                                 // Сохраняем только массив ID выбранных студентов
                                                 field.onChange(newValue.map(item => item.studentId));
                                            }}
                                            renderInput={(params) =>
                                                <TextField {...params} label="Студенты-участники *" required placeholder={loadingLookups ? "Загрузка студентов..." : (studentsList.length === 0 ? "Нет студентов для выбора" : "Выберите из списка...")}
                                                error={!!errors.studentIds} helperText={errors.studentIds?.message}/>
                                            }
                                            renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option.fullName} {...getTagProps({ index })} size="small"/>))}
                                        />
                                   )}
                                />
                                {/* Сообщение, если список студентов пуст */}
                                {studentsList.length === 0 && !loadingLookups && !formError.includes("студентов") &&
                                    <Typography variant="caption" color="text.secondary">Не найдены студенты для выбора. Убедитесь, что вы назначены куратором группы.</Typography>
                                }
                           </Grid>

                           {/* --- Дополнительно --- */}
                           <Grid item xs={12}>
                               <Controller name="mediaReferences" control={control} render={({ field }) => <TextField {...field} label="Ссылки на фото/публикации" fullWidth multiline rows={2} />} />
                           </Grid>
                            {/* Опционально: Выбор связанного мероприятия */}
                           {/* ... (код для Select/Autocomplete eventId) ... */}


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