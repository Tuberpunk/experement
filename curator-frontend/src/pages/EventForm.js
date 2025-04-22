// Полный путь: src/pages/EventForm.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Navigate, Link as RouterLink } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Container, Typography, TextField, Button, Grid, Box, Paper, CircularProgress, Alert, Snackbar,
    Select, MenuItem, FormControl, InputLabel, FormHelperText, Checkbox, FormControlLabel, Autocomplete, Chip,
    IconButton, List, ListItem, ListItemText, Divider, Tooltip // Добавлены Divider, Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
// Иконки
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
// Контекст, API, Компоненты
import { useAuth } from '../contexts/AuthContext';
import { getEventById, createEvent, updateEvent } from '../api/events'; // Путь к API мероприятий
import { getEventDirections, getEventLevels, getEventFormats, getParticipantCategories, getFundingSources } from '../api/lookups'; // Путь к API справочников
import { getMyStudentsForReport } from '../api/curatorReports'; // Путь к API отчетов для студентов куратора
import FileUploader from '../components/FileUploader'; // Компонент загрузчика

// Схема валидации Yup
const eventSchema = yup.object().shape({
    title: yup.string().required('Название обязательно').max(500, 'Слишком длинное название'),
    description: yup.string().required('Описание обязательно').min(100, 'Описание должно быть не менее 100 символов'),
    startDate: yup.date().required('Дата начала обязательна').typeError('Неверный формат даты'),
    endDate: yup.date().nullable().typeError('Неверный формат даты')
        .min(yup.ref('startDate'), 'Дата окончания не может быть раньше даты начала'),
    responsibleFullName: yup.string().required('ФИО ответственного обязательно'),
    responsibleEmail: yup.string().email('Неверный формат email').nullable().transform(value => value || null),
    responsiblePhone: yup.string().nullable().transform(value => value || null),
    locationText: yup.string().nullable().transform(value => value || null),
    addressText: yup.string().nullable().transform(value => value || null),
    participantsInfo: yup.string().nullable().transform(value => value || null),
    status: yup.string().oneOf(['Запланировано', 'Проведено', 'Не проводилось (Отмена)']), // Статус не редактируется здесь, но нужен в схеме для edit mode

    directionId: yup.number().nullable().positive().integer(),
    levelId: yup.number().nullable().positive().integer(),
    formatId: yup.number().nullable().positive().integer(),

    participantCount: yup.number().nullable().integer('Должно быть целое число').min(0, 'Не может быть отрицательным').typeError('Введите число').transform(value => (isNaN(value) || value === null || value === '' ? null : value)),
    hasForeigners: yup.boolean(),
    foreignerCount: yup.number().nullable().when('hasForeigners', {
        is: true,
        then: schema => schema.min(0).integer().typeError('Введите число'), // Не делаем обязательным, если флаг стоит
        otherwise: schema => schema.nullable().transform(() => null)
    }).transform(value => (isNaN(value) || value === null || value === '' ? 0 : value)), // По умолчанию 0, если не число
    hasMinors: yup.boolean(),
    minorCount: yup.number().nullable().when('hasMinors', {
        is: true,
        then: schema => schema.min(0).integer().typeError('Введите число'),
        otherwise: schema => schema.nullable().transform(() => null)
    }).transform(value => (isNaN(value) || value === null || value === '' ? 0 : value)),

    fundingAmount: yup.number().nullable().min(0, 'Не может быть отрицательным').typeError('Введите число').transform(value => (isNaN(value) || value === null || value === '' ? null : value)),

    participantCategoryIds: yup.array().of(yup.number().integer()).nullable(),
    fundingSourceIds: yup.array().of(yup.number().integer()).nullable(),

    mediaLinks: yup.array().of(yup.object().shape({
        id: yup.number().nullable(), // ID для существующих ссылок
        url: yup.string().url("Неверный URL").required("URL обязателен"),
        description: yup.string().nullable()
    })).nullable(),
    eventMedias: yup.array().of(yup.object().shape({
        id: yup.number().nullable(),
        mediaUrl: yup.string().required(),
        mediaType: yup.string().required(),
        description: yup.string().nullable(),
        author: yup.string().nullable(),
    })).nullable(),
    invitedGuests: yup.array().of(yup.object().shape({
        id: yup.number().nullable(),
        fullName: yup.string().required("ФИО гостя обязательно"),
        position: yup.string().nullable(),
        organization: yup.string().nullable(),
    })).nullable(),

});


function EventForm({ mode }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(mode === 'edit');
    const [loadingLookups, setLoadingLookups] = useState(true); // Отдельная загрузка для справочников
    const [formError, setFormError] = useState('');
    const [lookups, setLookups] = useState({ directions: [], levels: [], formats: [], categories: [], sources: [] });
    const [studentsList, setStudentsList] = useState([]); // Для выбора гостей-студентов
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const isEditMode = mode === 'edit';

    // === ВЫЗОВ ХУКОВ ===
    const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(eventSchema),
        defaultValues: {
            title: '', description: '', directionId: '', levelId: '', formatId: '',
            startDate: null, endDate: null, locationText: '', addressText: '',
            participantsInfo: '', participantCount: '', hasForeigners: false, foreignerCount: '',
            hasMinors: false, minorCount: '', responsibleFullName: '', responsiblePosition: '',
            responsiblePhone: '', responsibleEmail: '', fundingAmount: '',
            participantCategoryIds: [], fundingSourceIds: [],
            mediaLinks: [], eventMedias: [], invitedGuests: [],
            status: 'Запланировано' // Статус по умолчанию для новых
        }
    });

    // Динамические списки
    const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray({ control, name: "mediaLinks" });
    const { fields: mediaFields, append: appendMedia, remove: removeMedia } = useFieldArray({ control, name: "eventMedias" });
    const { fields: guestFields, append: appendGuest, remove: removeGuest } = useFieldArray({ control, name: "invitedGuests" });

    // Наблюдение за чекбоксами
    const watchHasForeigners = watch('hasForeigners');
    const watchHasMinors = watch('hasMinors');

    // --- Загрузка данных ---
    const loadLookupsAndStudents = useCallback(async () => {
        setLoadingLookups(true);
        setFormError('');
        try {
            const [dirs, levels, formats, cats, srcs, myStudents] = await Promise.all([
                getEventDirections(),
                getEventLevels(),
                getEventFormats(),
                getParticipantCategories(),
                getFundingSources(),
                getMyStudentsForReport() // Загружаем студентов куратора
            ]);
            setLookups({
                directions: dirs || [], levels: levels || [], formats: formats || [],
                categories: cats || [], sources: srcs || []
            });
            setStudentsList(myStudents || []);
             if (!myStudents) {
                 console.warn("getMyStudentsForReport returned null or failed.");
             }

        } catch (err) {
            console.error("Failed to load lookups/students for event form:", err);
            setFormError('Не удалось загрузить справочные данные или список студентов.');
        } finally {
            setLoadingLookups(false);
        }
    }, []); // Пустые зависимости

    const loadEventData = useCallback(async () => {
        if (isEditMode && id) {
            setLoading(true);
            setFormError('');
            try {
                const eventData = await getEventById(id);
                 // Проверка прав на редактирование (админ или создатель)
                 if (user?.role !== 'administrator' && user?.id !== eventData.createdByUserId) {
                     return navigate('/forbidden', { replace: true });
                 }

                reset({
                    title: eventData.title || '',
                    description: eventData.description || '',
                    directionId: eventData.directionId || '',
                    levelId: eventData.levelId || '',
                    formatId: eventData.formatId || '',
                    startDate: eventData.startDate ? dayjs(eventData.startDate) : null,
                    endDate: eventData.endDate ? dayjs(eventData.endDate) : null,
                    locationText: eventData.locationText || '',
                    addressText: eventData.addressText || '',
                    participantsInfo: eventData.participantsInfo || '',
                    participantCount: eventData.participantCount ?? '',
                    hasForeigners: eventData.hasForeigners || false,
                    foreignerCount: eventData.foreignerCount ?? '',
                    hasMinors: eventData.hasMinors || false,
                    minorCount: eventData.minorCount ?? '',
                    responsibleFullName: eventData.responsibleFullName || '',
                    responsiblePosition: eventData.responsiblePosition || '',
                    responsiblePhone: eventData.responsiblePhone || '',
                    responsibleEmail: eventData.responsibleEmail || '',
                    fundingAmount: eventData.fundingAmount ?? '',
                    status: eventData.status || 'Запланировано', // Важно для логики (хотя не редактируем)
                    participantCategoryIds: eventData.ParticipantCategories?.map(cat => cat.categoryId) || [],
                    fundingSourceIds: eventData.FundingSources?.map(src => src.sourceId) || [],
                    // Преобразуем данные для динамических списков
                    mediaLinks: eventData.MediaLinks?.map(link => ({ id: link.linkId, url: link.url || '', description: link.description || '' })) || [],
                    eventMedias: eventData.EventMedias?.map(media => ({ id: media.mediaId, mediaUrl: media.mediaUrl || '', mediaType: media.mediaType || '', description: media.description || '', author: media.author || '' })) || [],
                    invitedGuests: eventData.InvitedGuests?.map(guest => ({ id: guest.guestId, fullName: guest.fullName || '', position: guest.position || '', organization: guest.organization || '' })) || [],
                });
            } catch (err) {
                setFormError(err.response?.data?.message || err.message || 'Не удалось загрузить данные мероприятия.');
                console.error("Fetch event for edit error:", err);
                if (err.response?.status === 403 || err.response?.status === 404) {
                     navigate('/events', { replace: true });
                }
            } finally {
                setLoading(false);
            }
        } else {
             // Для режима создания можем подставить ответственного из данных пользователя
             if (user) {
                 setValue('responsibleFullName', user.fullName || '');
                 setValue('responsibleEmail', user.email || '');
                 // Поля position и phone опциональны, берем из данных пользователя, если есть
                 // setValue('responsiblePosition', user.position || '');
                 // setValue('responsiblePhone', user.phoneNumber || '');
             }
        }
    }, [id, isEditMode, reset, navigate, user, setValue]); // Добавили user и setValue

    useEffect(() => {
        loadLookupsAndStudents();
        loadEventData();
    }, [loadLookupsAndStudents, loadEventData]);

    // --- Обработчики ---
    const onSubmit = async (data) => {
        setFormError('');
        const eventDataToSend = {
            ...data,
            startDate: data.startDate ? dayjs(data.startDate).format('YYYY-MM-DD') : null,
            endDate: data.endDate ? dayjs(data.endDate).format('YYYY-MM-DD') : null,
            participantCount: data.participantCount === '' ? null : parseInt(data.participantCount, 10),
            fundingAmount: data.fundingAmount === '' ? null : parseFloat(data.fundingAmount),
            foreignerCount: data.hasForeigners && data.foreignerCount !== '' ? parseInt(data.foreignerCount, 10) : 0,
            minorCount: data.hasMinors && data.minorCount !== '' ? parseInt(data.minorCount, 10) : 0,
            // Убедимся что массивы ID передаются
            participantCategoryIds: data.participantCategoryIds || [],
            fundingSourceIds: data.fundingSourceIds || [],
            // Обработка массивов объектов: убираем временный 'id' если он есть, передаем остальное
            mediaLinks: data.mediaLinks?.map(({ id, ...rest }) => rest) || [],
            eventMedias: data.eventMedias?.map(({ id, ...rest }) => rest) || [],
            invitedGuests: data.invitedGuests?.map(({ id, ...rest }) => rest) || [],
        };
         // Удаляем пустые необязательные строки, чтобы отправить null
         for (const key of ['responsiblePosition', 'responsiblePhone', 'responsibleEmail', 'locationText', 'addressText', 'participantsInfo']) {
            if (!eventDataToSend[key]) eventDataToSend[key] = null;
         }
         // Удаляем статус, т.к. он меняется отдельным эндпоинтом
         delete eventDataToSend.status;

        console.log("Data to send:", eventDataToSend);

        try {
            let result;
            if (isEditMode) {
                result = await updateEvent(id, eventDataToSend);
            } else {
                result = await createEvent(eventDataToSend);
            }
            setSnackbar({ open: true, message: `Мероприятие успешно ${isEditMode ? 'обновлено' : 'создано'}!`, severity: 'success' });
            // Редирект на страницу просмотра
            setTimeout(() => navigate(`/events/${isEditMode ? id : result.eventId}`), 1500);
        } catch (err) {
            const message = err.response?.data?.message || err.message || `Не удалось ${isEditMode ? 'обновить' : 'создать'} мероприятие.`;
            setFormError(message);
            setSnackbar({ open: true, message: message, severity: 'error' });
            console.error("Event form submission error:", err);
        }
    };

     const handleMediaUploadSuccess = useCallback((fileData, index) => {
         // Эта функция теперь вызывается изнутри цикла map для mediaFields
         if (fileData?.mediaUrl && fileData?.mediaType) {
             setValue(`eventMedias.${index}.mediaUrl`, fileData.mediaUrl);
             setValue(`eventMedias.${index}.mediaType`, fileData.mediaType);
             // Очищаем FileUploader (опционально)
             setSnackbar({ open: true, message: `Файл "${fileData.filename || 'файл'}" загружен для медиа ${index + 1}`, severity: 'info' });
         } else {
              setSnackbar({ open: true, message: `Ошибка при обработке загруженного файла для медиа ${index + 1}`, severity: 'warning' });
         }
     }, [setValue]);

    const handleCloseSnackbar = useCallback((event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);


    // --- Рендеринг ---
    // Показываем загрузку, пока не загружены справочники или данные для редактирования
    if (loadingLookups || (loading && isEditMode)) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    {isEditMode ? 'Редактировать мероприятие' : 'Создать новое мероприятие'}
                </Typography>

                {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <Grid container spacing={3}>

                        {/* --- Название и Описание --- */}
                        <Grid item xs={12}>
                            <Controller name="title" control={control} render={({ field }) => <TextField {...field} label="Название мероприятия" required fullWidth error={!!errors.title} helperText={errors.title?.message} />} />
                        </Grid>
                        <Grid item xs={12}>
                            <Controller name="description" control={control} render={({ field }) => <TextField {...field} label="Описание (не менее 100 симв.)" required fullWidth multiline rows={5} error={!!errors.description} helperText={errors.description?.message} />} />
                        </Grid>

                        {/* --- Справочники: Направление, Уровень, Формат --- */}
                         <Grid item xs={12} sm={6} md={4}>
                            <FormControl fullWidth error={!!errors.directionId}>
                                <InputLabel id="direction-label">Направление</InputLabel>
                                <Controller name="directionId" control={control} defaultValue="" render={({ field }) => (
                                    <Select {...field} labelId="direction-label" label="Направление">
                                        <MenuItem value=""><em>Не выбрано</em></MenuItem>
                                        {lookups.directions.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                                    </Select>
                                )} />
                                <FormHelperText>{errors.directionId?.message}</FormHelperText>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <FormControl fullWidth error={!!errors.levelId}>
                                <InputLabel id="level-label">Уровень</InputLabel>
                                <Controller name="levelId" control={control} defaultValue="" render={({ field }) => (
                                    <Select {...field} labelId="level-label" label="Уровень">
                                        <MenuItem value=""><em>Не выбрано</em></MenuItem>
                                        {lookups.levels.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
                                    </Select>
                                )} />
                                <FormHelperText>{errors.levelId?.message}</FormHelperText>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                             <FormControl fullWidth error={!!errors.formatId}>
                                <InputLabel id="format-label">Формат</InputLabel>
                                <Controller name="formatId" control={control} defaultValue="" render={({ field }) => (
                                    <Select {...field} labelId="format-label" label="Формат">
                                        <MenuItem value=""><em>Не выбрано</em></MenuItem>
                                        {lookups.formats.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                                    </Select>
                                )} />
                                <FormHelperText>{errors.formatId?.message}</FormHelperText>
                            </FormControl>
                        </Grid>

                        {/* --- Даты --- */}
                        <Grid item xs={12} sm={6}>
                            <Controller name="startDate" control={control} render={({ field }) => (<DatePicker {...field} label="Дата начала *" value={field.value ? dayjs(field.value) : null} onChange={(date) => field.onChange(date)} slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.startDate, helperText: errors.startDate?.message } }} />)} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller name="endDate" control={control} render={({ field }) => (<DatePicker {...field} label="Дата окончания" value={field.value ? dayjs(field.value) : null} onChange={(date) => field.onChange(date)} minDate={watch('startDate') ? dayjs(watch('startDate')) : undefined} slotProps={{ textField: { fullWidth: true, error: !!errors.endDate, helperText: errors.endDate?.message } }} />)} />
                        </Grid>

                        {/* --- Место проведения --- */}
                        <Grid item xs={12} sm={6}>
                            <Controller name="locationText" control={control} render={({ field }) => <TextField {...field} label="Место проведения" fullWidth />} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller name="addressText" control={control} render={({ field }) => <TextField {...field} label="Адрес" fullWidth />} />
                        </Grid>

                         {/* --- Участники --- */}
                         <Grid item xs={12}><Divider><Chip label="Участники" /></Divider></Grid>
                         <Grid item xs={12} md={6}>
                           <Controller name="participantCategoryIds" control={control} defaultValue={[]} render={({ field }) => (
                                <Autocomplete multiple options={lookups.categories} getOptionLabel={(o) => o.name} isOptionEqualToValue={(o, v) => o.id === v.id}
                                    value={lookups.categories.filter(cat => field.value?.includes(cat.id))}
                                    onChange={(_, newValue) => field.onChange(newValue.map(item => item.id))}
                                    renderInput={(params) => <TextField {...params} label="Категории участников" error={!!errors.participantCategoryIds} helperText={errors.participantCategoryIds?.message}/>}
                                    renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option.name} {...getTagProps({ index })} size="small"/>))}
                                />
                           )} />
                         </Grid>
                         <Grid item xs={12} sm={6} md={3}>
                            <Controller name="participantCount" control={control} render={({ field }) => <TextField {...field} label="Общее кол-во уч." type="number" fullWidth error={!!errors.participantCount} helperText={errors.participantCount?.message} InputProps={{ inputProps: { min: 0 } }} />} />
                         </Grid>
                         <Grid item xs={6} sm={3} md={1.5}>
                            <Controller name="hasForeigners" control={control} render={({ field }) => <FormControlLabel control={<Checkbox {...field} checked={field.value || false} />} label="Иностр." />} />
                         </Grid>
                         <Grid item xs={6} sm={3} md={1.5}>
                            <Controller name="foreignerCount" control={control} render={({ field }) => <TextField {...field} label="Кол-во" type="number" size="small" disabled={!watchHasForeigners} error={!!errors.foreignerCount} helperText={errors.foreignerCount?.message} InputProps={{ inputProps: { min: 0 } }} />} />
                         </Grid>
                         <Grid item xs={6} sm={3} md={1.5}>
                            <Controller name="hasMinors" control={control} render={({ field }) => <FormControlLabel control={<Checkbox {...field} checked={field.value || false} />} label="Несоверш." />} />
                         </Grid>
                         <Grid item xs={6} sm={3} md={1.5}>
                            <Controller name="minorCount" control={control} render={({ field }) => <TextField {...field} label="Кол-во" type="number" size="small" disabled={!watchHasMinors} error={!!errors.minorCount} helperText={errors.minorCount?.message} InputProps={{ inputProps: { min: 0 } }} />} />
                         </Grid>
                         <Grid item xs={12}>
                           <Controller name="participantsInfo" control={control} render={({ field }) => <TextField {...field} label="Доп. информация об участниках" fullWidth multiline rows={2} />} />
                         </Grid>


                        {/* --- Ответственный --- */}
                        <Grid item xs={12}><Divider><Chip label="Ответственное лицо" /></Divider></Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller name="responsibleFullName" control={control} render={({ field }) => <TextField {...field} label="ФИО ответственного" required fullWidth error={!!errors.responsibleFullName} helperText={errors.responsibleFullName?.message}/>} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                             <Controller name="responsiblePosition" control={control} render={({ field }) => <TextField {...field} label="Должность ответственного" fullWidth />} />
                        </Grid>
                         <Grid item xs={12} sm={6}>
                             <Controller name="responsiblePhone" control={control} render={({ field }) => <TextField {...field} label="Телефон отв." fullWidth />} />
                         </Grid>
                        <Grid item xs={12} sm={6}>
                             <Controller name="responsibleEmail" control={control} render={({ field }) => <TextField {...field} label="Email отв." type="email" fullWidth error={!!errors.responsibleEmail} helperText={errors.responsibleEmail?.message}/>} />
                         </Grid>

                         {/* --- Финансирование --- */}
                         <Grid item xs={12}><Divider><Chip label="Финансирование" /></Divider></Grid>
                         <Grid item xs={12} md={6}>
                            <Controller name="fundingSourceIds" control={control} defaultValue={[]} render={({ field }) => (
                                <Autocomplete multiple options={lookups.sources} getOptionLabel={(o) => o.name} isOptionEqualToValue={(o, v) => o.id === v.id}
                                    value={lookups.sources.filter(src => field.value?.includes(src.id))}
                                    onChange={(_, newValue) => field.onChange(newValue.map(item => item.id))}
                                    renderInput={(params) => <TextField {...params} label="Источники финансирования" error={!!errors.fundingSourceIds} helperText={errors.fundingSourceIds?.message}/>}
                                    renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option.name} {...getTagProps({ index })} size="small"/>))}
                                />
                           )} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                              <Controller name="fundingAmount" control={control} render={({ field }) => <TextField {...field} label="Объем финансирования (тыс. руб.)" type="number" fullWidth error={!!errors.fundingAmount} helperText={errors.fundingAmount?.message} InputProps={{ inputProps: { min: 0, step: 0.01 } }} />} />
                        </Grid>

                        {/* --- Ссылки, Медиа, Гости --- */}
                        <Grid item xs={12}><Divider><Chip label="Дополнительные материалы и участники" /></Divider></Grid>

                        {/* Ссылки */}
                        <Grid item xs={12}>
                           <Typography variant="subtitle1" gutterBottom>Ссылки СМИ / Соцсети</Typography>
                           <List dense disablePadding sx={{mb: 1}}>
                           {linkFields.map((item, index) => (
                               <ListItem key={item.id} disableGutters sx={{display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1}}>
                                   <Controller name={`mediaLinks.${index}.url`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="URL *" size="small" sx={{ flexGrow: 1 }} error={!!errors.mediaLinks?.[index]?.url} helperText={errors.mediaLinks?.[index]?.url?.message}/>} />
                                   <Controller name={`mediaLinks.${index}.description`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="Описание (VK, сайт...)" size="small" sx={{ width: {xs: '100%', sm:'30%'} }} />} />
                                   <Tooltip title="Удалить ссылку"><IconButton onClick={() => removeLink(index)} color="error" size="small" sx={{mt: 0.5}}><DeleteIcon fontSize='small'/></IconButton></Tooltip>
                               </ListItem>
                           ))}
                           </List>
                           <Button onClick={() => appendLink({ url: '', description: '' })} size="small" startIcon={<AddCircleOutlineIcon />} variant="outlined">Добавить ссылку</Button>
                        </Grid>

                        {/* Медиа */}
                        <Grid item xs={12}>
                           <Typography variant="subtitle1" gutterBottom>Медиафайлы</Typography>
                           <List dense disablePadding sx={{mb: 1}}>
                            {mediaFields.map((item, index) => (
                                <ListItem key={item.id} disableGutters sx={{border: '1px dashed lightgrey', p: 1, mb: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                     {/* Отображение + Поля для description, author */}
                                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: '150px', flexWrap: 'wrap' }}>
                                          {item.mediaUrl ? // Если URL уже есть (загружено)
                                              (item.mediaType === 'photo'
                                                  ? <img src={item.mediaUrl} alt={`Медиа ${index + 1}`} style={{ width: 'auto', height: '50px', objectFit: 'cover' }}/>
                                                  : <video src={item.mediaUrl} style={{ width: 'auto', height: '50px' }} />
                                              ) : ( // Иначе показываем загрузчик для этого элемента
                                                 <FileUploader
                                                     onUploadSuccess={(fileData) => handleMediaUploadSuccess(fileData, index)} // Передаем индекс!
                                                     buttonText={`Загрузить файл #${index + 1}`}
                                                 />
                                              )
                                          }
                                          {item.mediaUrl && <Typography variant="caption" sx={{wordBreak: 'break-all'}}>{item.mediaUrl?.substring(item.mediaUrl.lastIndexOf('/') + 1)}</Typography>}
                                     </Box>
                                     {/* Поля доступны только если файл загружен */}
                                     <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, flexWrap: {xs: 'wrap', sm: 'nowrap'} }}>
                                         <Controller name={`eventMedias.${index}.description`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="Описание медиа" size="small" fullWidth sx={{minWidth: '150px'}} disabled={!item.mediaUrl} />} />
                                         <Controller name={`eventMedias.${index}.author`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="Автор медиа" size="small" fullWidth sx={{minWidth: '150px'}} disabled={!item.mediaUrl}/>} />
                                     </Box>
                                    <Tooltip title="Удалить медиа"><IconButton onClick={() => removeMedia(index)} color="error" size="small"><DeleteIcon fontSize='small'/></IconButton></Tooltip>
                                     {/* Скрытые поля */}
                                     <Controller name={`eventMedias.${index}.mediaUrl`} control={control} render={({ field }) => <input type="hidden" {...field} />} />
                                     <Controller name={`eventMedias.${index}.mediaType`} control={control} render={({ field }) => <input type="hidden" {...field} />} />
                                </ListItem>
                            ))}
                            </List>
                           {/* Кнопка добавления нового слота для медиа */}
                           <Button onClick={() => appendMedia({ mediaUrl: '', mediaType: '', description: '', author: '' })} size="small" startIcon={<AddCircleOutlineIcon />} variant="outlined">Добавить слот медиа</Button>
                        </Grid>

                        {/* Гости */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>Приглашенные лекторы / эксперты</Typography>
                             <List dense disablePadding sx={{mb: 1}}>
                             {guestFields.map((item, index) => (
                                <ListItem key={item.id} disableGutters sx={{display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap', mb: 1}}>
                                    {/* Autocomplete для ФИО */}
                                     <Controller
                                        name={`invitedGuests.${index}.fullName`}
                                        control={control}
                                        defaultValue=""
                                        render={({ field: { onChange, value, ...restField } }) => (
                                            <Autocomplete freeSolo options={studentsList} getOptionLabel={(option) => (typeof option === 'object' ? option.fullName : option) || ''} isOptionEqualToValue={(option, val) => option.studentId === val?.studentId}
                                                // Обработчик изменения
                                                onChange={(_, newValue) => {
                                                    let nameToSet = ''; let positionToSet = watch(`invitedGuests.${index}.position`); // Сохраняем старое значение
                                                    if (typeof newValue === 'object' && newValue !== null && newValue.studentId) { // Выбрали студента
                                                        nameToSet = newValue.fullName;
                                                        positionToSet = newValue.groupName || ''; // Ставим группу в должность
                                                        setValue(`invitedGuests.${index}.organization`, ''); // Очищаем организацию
                                                    } else if (typeof newValue === 'string') { // Ввели текст
                                                        nameToSet = newValue;
                                                        // Должность не меняем при ручном вводе ФИО
                                                    } else { // Очистили поле
                                                        nameToSet = '';
                                                        // Можно очистить и должность/организацию или оставить
                                                        // positionToSet = '';
                                                        // setValue(`invitedGuests.${index}.organization`, '');
                                                    }
                                                    onChange(nameToSet); // Обновляем поле ФИО
                                                    setValue(`invitedGuests.${index}.position`, positionToSet); // Обновляем поле Должность
                                                }}
                                                value={value} // Текущее значение ФИО из формы
                                                 // Обработчик ввода текста (для freeSolo)
                                                onInputChange={(_, newInputValue, reason) => {
                                                    if (reason === 'input') { onChange(newInputValue); }
                                                  }}
                                                renderInput={(params) => ( <TextField {...params} {...restField} label="ФИО гостя / Выберите студента *" size="small" required error={!!errors.invitedGuests?.[index]?.fullName} helperText={errors.invitedGuests?.[index]?.fullName?.message} sx={{ flexGrow: 1, minWidth: '200px' }} /> )}
                                            />
                                        )}
                                    />
                                    {/* Поля Должность и Организация */}
                                     <Controller name={`invitedGuests.${index}.position`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="Должность / Группа" size="small" sx={{ width: {xs: '100%', sm: '25%'}, minWidth: '150px' }} />} />
                                     <Controller name={`invitedGuests.${index}.organization`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="Организация" size="small" sx={{ width: {xs: '100%', sm: '25%'}, minWidth: '150px' }} />} />
                                     <Tooltip title="Удалить гостя"><IconButton onClick={() => removeGuest(index)} color="error" size="small" sx={{mt: 0.5}}><DeleteIcon fontSize='small'/></IconButton></Tooltip>
                                 </ListItem>
                             ))}
                             </List>
                            <Button onClick={() => appendGuest({ fullName: '', position: '', organization: '' })} size="small" startIcon={<AddCircleOutlineIcon />} variant="outlined">Добавить гостя</Button>
                         </Grid>


                        {/* --- Кнопки --- */}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 2 }}>
                                <Button variant="outlined" onClick={() => navigate(isEditMode ? `/events/${id}` : '/events')} disabled={isSubmitting}>
                                    Отмена
                                </Button>
                                <Button type="submit" variant="contained" disabled={isSubmitting || loading || loadingLookups}>
                                    {isSubmitting ? <CircularProgress size={24} /> : (isEditMode ? 'Сохранить изменения' : 'Создать мероприятие')}
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

export default EventForm;