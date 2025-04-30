// Полный путь: src/pages/EventForm.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Navigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Container, Typography, TextField, Button, Grid, Box, Paper, CircularProgress, Alert, Snackbar,
    Select, MenuItem, FormControl, InputLabel, FormHelperText, Checkbox, FormControlLabel, Autocomplete, Chip,
    IconButton, List, ListItem, ListItemText, Divider, Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
// Иконки MUI
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
// Контекст, API, Компоненты
import { useAuth } from '../contexts/AuthContext';
import { getEventById, createEvent, updateEvent } from '../api/events';
import { getUsers } from '../api/users'; // Для выбора Ответственного
import { getEventDirections, getEventLevels, getEventFormats, getParticipantCategories, getFundingSources } from '../api/lookups';
import { getMyStudentsForReport } from '../api/curatorReports'; // Для выбора Гостя-Студента
import FileUploader from '../components/FileUploader';

// --- Данные для подсказок (можно вынести в отдельный файл) ---
const ugtuLocations = [
    { label: 'Главный корпус (А)', address: 'г. Ухта, ул. Первомайская, д. 13' },
    { label: 'Корпус Б', address: 'г. Ухта, ул. Первомайская, д. 9' },
    { label: 'Корпус В', address: 'г. Ухта, ул. Первомайская, д. 11' },
    { label: 'Корпус Г', address: 'г. Ухта, ул. Октябрьская, д. 13' },
    { label: 'Корпус Д', address: 'г. Ухта, ул. Октябрьская, д. 13' },
    { label: 'Корпус Е', address: 'г. Ухта, ул. Сенюкова, д. 13' },
    { label: 'Корпус К (Колледж)', address: 'г. Ухта, ул. Октябрьская, д. 26' },
    { label: 'Корпус Л', address: 'г. Ухта, ул. Сенюкова, д. 15' },
    { label: 'Корпус Н', address: 'г. Ухта, ул. Первомайская, д. 44а' },
    { label: 'Бизнес-инкубатор', address: 'г. Ухта, ул. Сенюкова, д. 13' },
    { label: 'Спортивный комплекс "Буревестник"', address: 'г. Ухта, ул. Мира, д. 13а' },
    { label: 'Бассейн "Буревестник"', address: 'г. Ухта, ул. Мира, д. 13а' },
    { label: 'Общежитие №1', address: 'г. Ухта, ул. Мира, д. 13' },
    { label: 'Общежитие №2', address: 'г. Ухта, ул. Мира, д. 11' },
    // ... добавьте другие актуальные объекты ...
];
// ---------------------------------------------------------

// --- Схема валидации Yup ---
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
    status: yup.string().oneOf(['Запланировано', 'Проведено', 'Не проводилось (Отмена)']),

    directionId: yup.number().nullable().positive().integer(),
    levelId: yup.number().nullable().positive().integer(),
    formatId: yup.number().nullable().positive().integer(),

    participantCount: yup.number().nullable().integer('Должно быть целое число').min(0, 'Не может быть отрицательным').typeError('Введите число').transform(value => (isNaN(value) || value === null || value === '' ? null : value)),
    hasForeigners: yup.boolean(),
    foreignerCount: yup.number().nullable().when('hasForeigners', {
        is: true,
        then: schema => schema.min(0).integer().typeError('Введите число'),
        otherwise: schema => schema.nullable().transform(() => null)
    }).transform(value => (isNaN(value) || value === null || value === '' ? 0 : value)),
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
        id: yup.number().nullable(),
        url: yup.string().url("Неверный URL").required("URL обязателен"),
        description: yup.string().nullable()
    })).nullable(),
    eventMedias: yup.array().of(yup.object().shape({
        id: yup.number().nullable(),
        mediaUrl: yup.string().required('URL медиафайла обязателен (загрузите файл)'),
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
// ------------------------


function EventForm({ mode }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(mode === 'edit');
    const [loadingLookups, setLoadingLookups] = useState(true);
    const [formError, setFormError] = useState('');
    const [lookups, setLookups] = useState({ directions: [], levels: [], formats: [], categories: [], sources: [] });
    const [studentsList, setStudentsList] = useState([]); // Студенты куратора (для гостей)
    const [usersList, setUsersList] = useState([]); // Пользователи (для ответственного)
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const isEditMode = mode === 'edit';
    const location = useLocation();
    // === ВЫЗОВ ХУКОВ ===
    const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(eventSchema),
        defaultValues: {
            // --- Добавляем проверку для title ---
            title: location.state?.title || '', // Берем title из state или оставляем пустым
            // ---------------------------------
            description: '', directionId: '', levelId: '', formatId: '',
            startDate: location.state?.startDate ? dayjs(location.state.startDate) : null,
            endDate: location.state?.endDate && location.state.startDate !== location.state.endDate
                     ? dayjs(location.state.endDate).subtract(1, 'day')
                     : (location.state?.startDate ? dayjs(location.state.startDate) : null),
            locationText: '', addressText: '',
            participantsInfo: '', participantCount: '', hasForeigners: false, foreignerCount: '0',
            hasMinors: false, minorCount: '0', responsibleFullName: '', responsiblePosition: '',
            responsiblePhone: '', responsibleEmail: '', fundingAmount: '',
            participantCategoryIds: [], fundingSourceIds: [],
            mediaLinks: [], eventMedias: [], invitedGuests: [],
            status: 'Запланировано'
        }
    });

    // Динамические списки
    const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray({ control, name: "mediaLinks" });
    const { fields: mediaFields, append: appendMedia, remove: removeMedia } = useFieldArray({ control, name: "eventMedias" });
    const { fields: guestFields, append: appendGuest, remove: removeGuest } = useFieldArray({ control, name: "invitedGuests" });

    // Наблюдение за чекбоксами и местом
    const watchHasForeigners = watch('hasForeigners');
    const watchHasMinors = watch('hasMinors');
    const watchLocationText = watch('locationText');

    // --- Загрузка данных ---
    const loadInitialData = useCallback(async () => {
        setLoadingLookups(true);
        setFormError('');
        try {
            const [dirs, levels, formats, cats, srcs, myStudents, usersData] = await Promise.all([
                getEventDirections(), getEventLevels(), getEventFormats(),
                getParticipantCategories(), getFundingSources(),
                (user?.role === 'curator' || user?.role === 'administrator') ? getMyStudentsForReport() : Promise.resolve([]),
                getUsers({ limit: 1000, role: ['curator', 'administrator'] }) // Загружаем кураторов и админов
            ]);
            setLookups({
                directions: dirs || [], levels: levels || [], formats: formats || [],
                categories: cats || [], sources: srcs || []
            });
            setStudentsList(myStudents || []);
            setUsersList(usersData.users || []);

        } catch (err) {
            console.error("Failed to load lookups/users/students for event form:", err);
            setFormError('Не удалось загрузить справочные данные, список пользователей или студентов.');
        } finally {
            setLoadingLookups(false);
        }
    }, [user]); // Зависит от роли пользователя

    const loadEventData = useCallback(async () => {
        if (isEditMode && id) {
            setLoading(true);
            setFormError('');
            console.log('[EventForm] Starting loadEventData for ID:', id); // <-- Лог 1: Начало загрузки
            try {
                const eventData = await getEventById(id);
                console.log('[EventForm] Fetched Event Data (Raw):', JSON.stringify(eventData, null, 2)); // <-- Лог 2: Что пришло с API (в виде JSON для читаемости)
    
                if (!eventData) {
                    setFormError('Мероприятие не найдено.');
                    setLoading(false);
                    return;
                }
                // Проверка прав (оставляем)
                if (user?.role !== 'administrator' && user?.id !== eventData.createdByUserId) {
                    console.log('[EventForm] Permission denied check inside loadEventData.'); // Лог 3
                    return navigate('/forbidden', { replace: true });
                }
    
                // Подготовка данных для reset
                const dataToReset = {
                    title: eventData.title || '', description: eventData.description || '',
                    directionId: eventData.directionId || '', levelId: eventData.levelId || '', formatId: eventData.formatId || '',
                    startDate: eventData.startDate ? dayjs(eventData.startDate) : null, // Преобразуем в dayjs
                    endDate: eventData.endDate ? dayjs(eventData.endDate) : null, // Преобразуем в dayjs
                    locationText: eventData.locationText || '', addressText: eventData.addressText || '',
                    participantsInfo: eventData.participantsInfo || '', participantCount: eventData.participantCount ?? '',
                    hasForeigners: eventData.hasForeigners || false, foreignerCount: eventData.foreignerCount ?? '',
                    hasMinors: eventData.hasMinors || false, minorCount: eventData.minorCount ?? '',
                    responsibleFullName: eventData.responsibleFullName || '', responsiblePosition: eventData.responsiblePosition || '',
                    responsiblePhone: eventData.responsiblePhone || '', responsibleEmail: eventData.responsibleEmail || '',
                    fundingAmount: eventData.fundingAmount ?? '', status: eventData.status || 'Запланировано',
                    // Преобразуем массивы связанных объектов в массивы ID
                    participantCategoryIds: eventData.ParticipantCategories?.map(cat => cat.categoryId) || [],
                    fundingSourceIds: eventData.FundingSources?.map(src => src.sourceId) || [],
                    // Оставляем полные объекты для FieldArray (они управляются отдельно)
                    mediaLinks: eventData.MediaLinks?.map(link => ({ id: link.linkId, url: link.url || '', description: link.description || '' })) || [],
                    eventMedias: eventData.EventMedias?.map(media => ({ id: media.mediaId, mediaUrl: media.mediaUrl || '', mediaType: media.mediaType || '', description: media.description || '', author: media.author || '' })) || [],
                    invitedGuests: eventData.InvitedGuests?.map(guest => ({ id: guest.guestId, fullName: guest.fullName || '', position: guest.position || '', organization: guest.organization || '' })) || [],
                };
                console.log('[EventForm] Data prepared for reset:', JSON.stringify(dataToReset, null, 2)); // <-- Лог 4: Данные ПЕРЕД reset (в виде JSON)
    
                reset(dataToReset); // Вызов reset для заполнения формы
                console.log('[EventForm] reset() function called.'); // <-- Лог 5: Убедимся, что вызов был
    
            } catch (err) {
                 setFormError(err.response?.data?.message || err.message || 'Не удалось загрузить данные мероприятия.');
                 console.error("Fetch event for edit error:", err);
                 if (err.response?.status === 403 || err.response?.status === 404) {
                      navigate('/events', { replace: true });
                 }
             } finally { setLoading(false); }
        } else if (!isEditMode && user) { /* ... предзаполнение ... */ }
    }, [id, isEditMode, reset, navigate, user, setValue]); // Убедитесь, что все зависимости на месте

useEffect(() => {
        loadInitialData(); // Загрузка справочников и списков
        // Загружаем данные события ТОЛЬКО в режиме редактирования
        if (isEditMode) {
            loadEventData();
        } else if (user) { // Предзаполнение для НОВОГО события (включая даты из location.state, если они не установлены в defaultValues)
             setValue('responsibleFullName', user.fullName || '');
             setValue('responsibleEmail', user.email || '');
             // Устанавливаем даты, если они пришли и не были установлены в defaultValues
             if (location.state?.startDate && !watch('startDate')) {
                  setValue('startDate', dayjs(location.state.startDate));
             }
              if (location.state?.endDate && location.state.startDate !== location.state.endDate && !watch('endDate')) {
                  setValue('endDate', dayjs(location.state.endDate).subtract(1, 'day'));
              } else if (location.state?.startDate && !watch('endDate')) {
                   setValue('endDate', dayjs(location.state.startDate));
               }
        }
    }, [loadInitialData, loadEventData, isEditMode, user, setValue, location.state, watch]); // Добавили location.state и watch// Используем одну функцию для загрузки

    // --- Обработчики ---
    const onSubmit = async (data) => {
        setFormError('');
        const eventDataToSend = { /* ... как было ... */ };
        // ... удаление пустых полей ...
        delete eventDataToSend.status;
        try {
            let result;
            if (isEditMode) { result = await updateEvent(id, eventDataToSend); }
            else { result = await createEvent(eventDataToSend); }
            setSnackbar({ open: true, message: `Мероприятие успешно ${isEditMode ? 'обновлено' : 'создано'}!`, severity: 'success' });
            setTimeout(() => navigate(`/events/${isEditMode ? id : result.eventId}`), 1500);
        } catch (err) { /* ... обработка ошибки ... */ }
    };

    const handleMediaUploadSuccess = useCallback((fileData, index) => {
        if (fileData?.mediaUrl && fileData?.mediaType) {
             setValue(`eventMedias.${index}.mediaUrl`, fileData.mediaUrl, { shouldDirty: true });
             setValue(`eventMedias.${index}.mediaType`, fileData.mediaType, { shouldDirty: true });
             setSnackbar({ open: true, message: `Файл "${fileData.filename || 'файл'}" загружен для медиа ${index + 1}`, severity: 'info' });
         } else { setSnackbar({ open: true, message: `Ошибка при обработке загруженного файла для медиа ${index + 1}`, severity: 'warning' }); }
     }, [setValue]);

    const handleCloseSnackbar = useCallback((event, reason) => { /* ... */ }, []);

    // === Проверка прав доступа (перенесена из предыдущей версии) ===
    // Для создания доступ должен быть (проверяется роутом),
    // для редактирования права проверяются в loadEventData после загрузки данных
    // const isAdmin = user?.role === 'administrator'; // Можно определить для краткости

    // --- Рендеринг ---
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
                        <Grid item xs={12}><Controller name="title" control={control} render={({ field }) => <TextField {...field} label="Название мероприятия" required fullWidth error={!!errors.title} helperText={errors.title?.message} />}/></Grid>
                        <Grid item xs={12}><Controller name="description" control={control} render={({ field }) => <TextField {...field} label="Описание (min 100) *" required fullWidth multiline rows={5} error={!!errors.description} helperText={errors.description?.message} />}/></Grid>

                         {/* --- Справочники --- */}
                         <Grid item xs={12} sm={6} md={4}><FormControl fullWidth error={!!errors.directionId} size="small"><InputLabel id="direction-label">Направление</InputLabel><Controller name="directionId" control={control} defaultValue="" render={({ field }) => (<Select {...field} labelId="direction-label" label="Направление"><MenuItem value=""><em>Не выбрано</em></MenuItem>{lookups.directions.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}</Select>)} /><FormHelperText>{errors.directionId?.message}</FormHelperText></FormControl></Grid>
                         <Grid item xs={12} sm={6} md={4}><FormControl fullWidth error={!!errors.levelId} size="small"><InputLabel id="level-label">Уровень</InputLabel><Controller name="levelId" control={control} defaultValue="" render={({ field }) => (<Select {...field} labelId="level-label" label="Уровень"><MenuItem value=""><em>Не выбрано</em></MenuItem>{lookups.levels.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}</Select>)} /><FormHelperText>{errors.levelId?.message}</FormHelperText></FormControl></Grid>
                         <Grid item xs={12} sm={6} md={4}><FormControl fullWidth error={!!errors.formatId} size="small"><InputLabel id="format-label">Формат</InputLabel><Controller name="formatId" control={control} defaultValue="" render={({ field }) => (<Select {...field} labelId="format-label" label="Формат"><MenuItem value=""><em>Не выбрано</em></MenuItem>{lookups.formats.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}</Select>)} /><FormHelperText>{errors.formatId?.message}</FormHelperText></FormControl></Grid>

                         {/* --- Даты --- */}
                         <Grid item xs={12} sm={6}><Controller name="startDate" control={control} render={({ field }) => (<DatePicker {...field} label="Дата начала *" value={field.value ? dayjs(field.value) : null} onChange={(date) => field.onChange(date)} slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.startDate, helperText: errors.startDate?.message, size:'small' } }} />)} /></Grid>
                         <Grid item xs={12} sm={6}><Controller name="endDate" control={control} render={({ field }) => (<DatePicker {...field} label="Дата окончания" value={field.value ? dayjs(field.value) : null} onChange={(date) => field.onChange(date)} minDate={watch('startDate') ? dayjs(watch('startDate')) : undefined} slotProps={{ textField: { fullWidth: true, error: !!errors.endDate, helperText: errors.endDate?.message, size:'small' } }} />)} /></Grid>

                         {/* --- Место проведения --- */}
                         <Grid item xs={12} sm={6}> <Controller name="locationText" control={control} defaultValue="" render={({ field: { onChange, value, ...restField } }) => ( <Autocomplete freeSolo options={ugtuLocations} getOptionLabel={(option) => (typeof option === 'object' ? option.label : option) || ''} isOptionEqualToValue={(option, val) => option.label === val?.label} inputValue={value || ''} onInputChange={(_, newInputValue, reason) => { if (reason === 'input') { onChange(newInputValue); setValue('addressText', ''); } }} onChange={(_, newValue) => { if (typeof newValue === 'object' && newValue !== null) { onChange(newValue.label); setValue('addressText', newValue.address || '', { shouldValidate: true }); } else if (typeof newValue === 'string') { onChange(newValue); setValue('addressText', ''); } else { onChange(''); setValue('addressText', ''); } }} renderInput={(params) => ( <TextField {...params} {...restField} label="Место проведения (или объект УГТУ)" fullWidth size="small"/> )} /> )} /> </Grid>
                         <Grid item xs={12} sm={6}> <Controller name="addressText" control={control} render={({ field }) => <TextField {...field} label="Адрес проведения" fullWidth size="small" InputProps={{ readOnly: ugtuLocations.some(loc => loc.label === watchLocationText) }} error={!!errors.addressText} helperText={errors.addressText?.message || (ugtuLocations.some(loc => loc.label === watchLocationText) ? 'Адрес заполнен автоматически' : '')} />} /> </Grid>

                         {/* --- Участники --- */}
                         <Grid item xs={12}><Divider sx={{mt:1}}><Chip label="Участники" size="small"/></Divider></Grid>
                         <Grid item xs={12} md={6}><Controller name="participantCategoryIds" control={control} defaultValue={[]} render={({ field }) => ( <Autocomplete multiple options={lookups.categories} getOptionLabel={(o) => o.name} isOptionEqualToValue={(o, v) => o.id === v.id} value={lookups.categories.filter(cat => field.value?.includes(cat.id))} onChange={(_, newValue) => field.onChange(newValue.map(item => item.id))} renderInput={(params) => <TextField {...params} label="Категории участников" error={!!errors.participantCategoryIds} helperText={errors.participantCategoryIds?.message}/>} renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option.name} {...getTagProps({ index })} size="small"/>))} /> )} /></Grid>
                         <Grid item xs={12} sm={6} md={3}><Controller name="participantCount" control={control} render={({ field }) => <TextField {...field} label="Общее кол-во уч." type="number" fullWidth size="small" error={!!errors.participantCount} helperText={errors.participantCount?.message} InputProps={{ inputProps: { min: 0 } }} />} /></Grid>
                         <Grid item xs={6} sm={3} md={1.5} sx={{pl: {md: 3}}}><Controller name="hasForeigners" control={control} render={({ field }) => <FormControlLabel control={<Checkbox {...field} checked={field.value || false} size="small"/>} label="Иностр." sx={{ '& .MuiSvgIcon-root': { fontSize: 20 } }} />} /></Grid>
                         <Grid item xs={6} sm={3} md={1.5}><Controller name="foreignerCount" control={control} defaultValue={0} render={({ field }) => <TextField {...field} label="Кол-во" type="number" size="small" disabled={!watchHasForeigners} error={!!errors.foreignerCount} helperText={errors.foreignerCount?.message} InputProps={{ inputProps: { min: 0 } }} />} /></Grid>
                         <Grid item xs={6} sm={3} md={1.5} sx={{pl: {md: 3}}}><Controller name="hasMinors" control={control} render={({ field }) => <FormControlLabel control={<Checkbox {...field} checked={field.value || false} size="small"/>} label="Несоверш." sx={{ '& .MuiSvgIcon-root': { fontSize: 20 } }} />} /></Grid>
                         <Grid item xs={6} sm={3} md={1.5}><Controller name="minorCount" control={control} defaultValue={0} render={({ field }) => <TextField {...field} label="Кол-во" type="number" size="small" disabled={!watchHasMinors} error={!!errors.minorCount} helperText={errors.minorCount?.message} InputProps={{ inputProps: { min: 0 } }} />} /></Grid>
                         <Grid item xs={12}><Controller name="participantsInfo" control={control} render={({ field }) => <TextField {...field} label="Доп. информация об участниках" fullWidth multiline rows={2} size="small"/>} /></Grid>

                         {/* --- Ответственный --- */}
                         <Grid item xs={12}><Divider sx={{mt:1}}><Chip label="Ответственное лицо" size="small"/></Divider></Grid>
                         <Grid item xs={12} sm={6}> <Controller name="responsibleFullName" control={control} defaultValue="" render={({ field: { onChange, value, ...restField } }) => ( <Autocomplete freeSolo options={usersList} disabled={loadingLookups} getOptionLabel={(option) => (typeof option === 'object' ? option.fullName : option) || ''} isOptionEqualToValue={(option, val) => option.userId === val?.userId} inputValue={value || ''} onInputChange={(_, newInputValue, reason) => { if (reason === 'input') { onChange(newInputValue); } }} onChange={(_, newValue) => { let nameToSet = ''; if (typeof newValue === 'object' && newValue !== null && newValue.userId) { nameToSet = newValue.fullName; setValue('responsiblePosition', newValue.position || '', { shouldValidate: true }); setValue('responsiblePhone', newValue.phoneNumber || '', { shouldValidate: true }); setValue('responsibleEmail', newValue.email || '', { shouldValidate: true }); } else if (typeof newValue === 'string') { nameToSet = newValue; } else { nameToSet = ''; } onChange(nameToSet); }} renderInput={(params) => ( <TextField {...params} {...restField} label="ФИО ответственного *" required fullWidth error={!!errors.responsibleFullName} helperText={errors.responsibleFullName?.message} size="small"/> )} /> )} /> </Grid>
                         <Grid item xs={12} sm={6}><Controller name="responsiblePosition" control={control} render={({ field }) => <TextField {...field} label="Должность ответственного" fullWidth size="small"/>} /></Grid>
                         <Grid item xs={12} sm={6}><Controller name="responsiblePhone" control={control} render={({ field }) => <TextField {...field} label="Телефон отв." fullWidth size="small"/>} /></Grid>
                         <Grid item xs={12} sm={6}><Controller name="responsibleEmail" control={control} render={({ field }) => <TextField {...field} label="Email отв." type="email" fullWidth error={!!errors.responsibleEmail} helperText={errors.responsibleEmail?.message} size="small"/>} /></Grid>

                         {/* --- Финансирование --- */}
                         <Grid item xs={12}><Divider sx={{mt:1}}><Chip label="Финансирование" size="small"/></Divider></Grid>
                         <Grid item xs={12} md={6}><Controller name="fundingSourceIds" control={control} defaultValue={[]} render={({ field }) => ( <Autocomplete multiple options={lookups.sources} getOptionLabel={(o) => o.name} isOptionEqualToValue={(o, v) => o.id === v.id} value={lookups.sources.filter(src => field.value?.includes(src.id))} onChange={(_, newValue) => field.onChange(newValue.map(item => item.id))} renderInput={(params) => <TextField {...params} label="Источники финансирования" error={!!errors.fundingSourceIds} helperText={errors.fundingSourceIds?.message}/>} renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option.name} {...getTagProps({ index })} size="small"/>))} /> )} /></Grid>
                         <Grid item xs={12} md={6}><Controller name="fundingAmount" control={control} render={({ field }) => <TextField {...field} label="Объем (тыс. руб.)" type="number" fullWidth size="small" error={!!errors.fundingAmount} helperText={errors.fundingAmount?.message} InputProps={{ inputProps: { min: 0, step: 0.01 } }} />} /></Grid>

                        {/* --- Ссылки, Медиа, Гости --- */}
                        <Grid item xs={12}><Divider sx={{mt:1}}><Chip label="Дополнительные материалы и участники" size="small"/></Divider></Grid>

                        {/* Ссылки */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>Ссылки СМИ / Соцсети</Typography>
                           <List dense disablePadding sx={{mb: 1}}> {linkFields.map((item, index) => ( <ListItem key={item.id} disableGutters sx={{display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1}}> <Controller name={`mediaLinks.${index}.url`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="URL *" size="small" sx={{ flexGrow: 1 }} error={!!errors.mediaLinks?.[index]?.url} helperText={errors.mediaLinks?.[index]?.url?.message}/>} /> <Controller name={`mediaLinks.${index}.description`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="Описание (VK, сайт...)" size="small" sx={{ width: {xs: '100%', sm:'30%'} }} />} /> <Tooltip title="Удалить ссылку"><IconButton onClick={() => removeLink(index)} color="error" size="small" sx={{mt: 0.5}}><DeleteIcon fontSize='small'/></IconButton></Tooltip> </ListItem> ))} </List>
                           <Button onClick={() => appendLink({ url: '', description: '' })} size="small" startIcon={<AddCircleOutlineIcon />} variant="outlined">Добавить ссылку</Button>
                        </Grid>

                        {/* Медиа */}
                        <Grid item xs={12}>
                           <Typography variant="subtitle1" gutterBottom>Медиафайлы</Typography>
                           <List dense disablePadding sx={{mb: 1}}>
                            {mediaFields.map((item, index) => (
                                // --- НАЧАЛО БЛОКА ОДНОГО МЕДИА ---
                                <ListItem key={item.id} disableGutters sx={{border: '1px dashed lightgrey', p: 1, mb: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: '150px', flexWrap: 'wrap' }}>
                                        {watch(`eventMedias.${index}.mediaUrl`) ? ( // Если URL уже есть (загружено)
                                            watch(`eventMedias.${index}.mediaType`) === 'photo'
                                                ? <img src={watch(`eventMedias.${index}.mediaUrl`)} alt={`Медиа ${index + 1}`} style={{ width: 'auto', height: '50px', objectFit: 'cover' }}/>
                                                : <video src={watch(`eventMedias.${index}.mediaUrl`)} style={{ width: 'auto', height: '50px' }} />
                                            ) : ( // Иначе показываем загрузчик
                                                <FileUploader
                                                    // Передаем индекс в обработчик!
                                                    onUploadSuccess={(fileData) => handleMediaUploadSuccess(fileData, index)}
                                                    // onUploadStart={() => setIsUploading(true)} // Можно добавить флаг загрузки файла
                                                    buttonText={`Загрузить #${index + 1}`}
                                                    accept="image/*,video/*" // Ограничиваем типы
                                                />
                                            )
                                        }
                                        {/* Отображаем имя файла, если он загружен */}
                                        {watch(`eventMedias.${index}.mediaUrl`) &&
                                            <Typography variant="caption" sx={{wordBreak: 'break-all'}}>
                                                {watch(`eventMedias.${index}.mediaUrl`)?.substring(watch(`eventMedias.${index}.mediaUrl`).lastIndexOf('/') + 1)}
                                            </Typography>
                                        }
                                    </Box>
                                    {/* Поля доступны только если файл загружен */}
                                    <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, flexWrap: {xs: 'wrap', sm: 'nowrap'} }}>
                                        <Controller name={`eventMedias.${index}.description`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="Описание медиа" size="small" fullWidth sx={{minWidth: '150px'}} disabled={!watch(`eventMedias.${index}.mediaUrl`)} />} />
                                        <Controller name={`eventMedias.${index}.author`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="Автор медиа" size="small" fullWidth sx={{minWidth: '150px'}} disabled={!watch(`eventMedias.${index}.mediaUrl`)} />} />
                                    </Box>
                                    <Tooltip title="Удалить медиа">
                                        <IconButton onClick={() => removeMedia(index)} color="error" size="small"><DeleteIcon fontSize='small'/></IconButton>
                                    </Tooltip>
                                    {/* Скрытые поля для URL и типа, чтобы react-hook-form их видел */}
                                    <Controller name={`eventMedias.${index}.mediaUrl`} control={control} render={({ field }) => <input type="hidden" {...field} />} />
                                    <Controller name={`eventMedias.${index}.mediaType`} control={control} render={({ field }) => <input type="hidden" {...field} />} />
                                </ListItem>
                                // --- КОНЕЦ БЛОКА ОДНОГО МЕДИА ---
                           ))}
                           </List>
                           {/* Кнопка добавления нового слота для медиа */}
                           <Button onClick={() => appendMedia({ mediaUrl: '', mediaType: '', description: '', author: '' })} size="small" startIcon={<AddCircleOutlineIcon />} variant="outlined">Добавить слот медиа</Button>
                        </Grid>

                        {/* Гости с автозаполнением */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>Приглашенные лекторы / эксперты</Typography>
                             <List dense disablePadding sx={{mb: 1}}>
                             {guestFields.map((item, index) => (
                                 // --- НАЧАЛО БЛОКА ОДНОГО ГОСТЯ ---
                                 <ListItem key={item.id} disableGutters sx={{display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap', mb: 1}}>
                                     {/* Autocomplete для ФИО */}
                                     <Controller
                                        name={`invitedGuests.${index}.fullName`}
                                        control={control}
                                        defaultValue=""
                                        render={({ field: { onChange, value, ...restField } }) => (
                                            <Autocomplete freeSolo options={studentsList} disabled={loadingLookups} getOptionLabel={(option) => (typeof option === 'object' ? option.fullName : option) || ''} isOptionEqualToValue={(option, val) => option.studentId === val?.studentId} inputValue={value || ''}
                                                onInputChange={(_, newInputValue, reason) => { if (reason === 'input') { onChange(newInputValue); } }}
                                                onChange={(_, newValue) => {
                                                    let nameToSet = ''; let positionToSet = watch(`invitedGuests.${index}.position`);
                                                    if (typeof newValue === 'object' && newValue !== null && newValue.studentId) { nameToSet = newValue.fullName; positionToSet = newValue.groupName || ''; setValue(`invitedGuests.${index}.organization`, ''); }
                                                    else if (typeof newValue === 'string') { nameToSet = newValue; }
                                                    else { nameToSet = ''; }
                                                    onChange(nameToSet); setValue(`invitedGuests.${index}.position`, positionToSet);
                                                }}
                                                renderInput={(params) => ( <TextField {...params} {...restField} label="ФИО гостя / Выберите студента *" size="small" required error={!!errors.invitedGuests?.[index]?.fullName} helperText={errors.invitedGuests?.[index]?.fullName?.message} sx={{ flexGrow: 1, minWidth: '200px' }} /> )}
                                            />
                                        )}
                                    />
                                    {/* Поля Должность и Организация */}
                                     <Controller name={`invitedGuests.${index}.position`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="Должность / Группа" size="small" sx={{ width: {xs: '100%', sm: '25%'}, minWidth: '150px' }} />} />
                                     <Controller name={`invitedGuests.${index}.organization`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="Организация" size="small" sx={{ width: {xs: '100%', sm: '25%'}, minWidth: '150px' }} />} />
                                     {/* Кнопка удаления */}
                                     <Tooltip title="Удалить гостя"><IconButton onClick={() => removeGuest(index)} color="error" size="small" sx={{mt: 0.5}}><DeleteIcon fontSize='small'/></IconButton></Tooltip>
                                 </ListItem>
                                  // --- КОНЕЦ БЛОКА ОДНОГО ГОСТЯ ---
                             ))}
                             </List>
                            <Button onClick={() => appendGuest({ fullName: '', position: '', organization: '' })} size="small" startIcon={<AddCircleOutlineIcon />} variant="outlined">Добавить гостя</Button>
                         </Grid>


                        {/* --- Кнопки --- */}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 2 }}>
                                <Button variant="outlined" onClick={() => navigate(isEditMode ? `/events/${id}` : '/events')} disabled={isSubmitting}> Отмена </Button>
                                <Button type="submit" variant="contained" disabled={isSubmitting || loading || loadingLookups}> {isSubmitting ? <CircularProgress size={24} /> : (isEditMode ? 'Сохранить изменения' : 'Создать мероприятие')} </Button>
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