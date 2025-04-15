// src/pages/EventForm.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Container, Typography, TextField, Button, Grid, Box, Paper, CircularProgress, Alert,
    Select, MenuItem, FormControl, InputLabel, FormHelperText, Checkbox, FormControlLabel, Autocomplete, Chip,
    Snackbar, IconButton, List, ListItem, ListItemText, Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs'; // Для работы с датами в DatePicker
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../contexts/AuthContext';
import StatusChip from '../components/StatusChip';
import { getEventById, createEvent, updateEvent } from '../api/events';
import { getEventDirections, getEventLevels, getEventFormats, getParticipantCategories, getFundingSources } from '../api/lookups';
import FileUploader from '../components/FileUploader'; // Компонент загрузчика

// --- Схема валидации Yup ---
const eventSchema = yup.object().shape({
    title: yup.string().required('Название обязательно'),
    description: yup.string().required('Описание обязательно').min(100, 'Описание должно быть не менее 100 символов'),
    startDate: yup.date().required('Дата начала обязательна').typeError('Неверный формат даты'),
    endDate: yup.date().nullable().typeError('Неверный формат даты')
        .min(yup.ref('startDate'), 'Дата окончания не может быть раньше даты начала'),
    responsibleFullName: yup.string().required('ФИО ответственного обязательно'),
    responsibleEmail: yup.string().email('Неверный формат email').nullable().transform(value => value || null), // Пустую строку превращаем в null
    responsiblePhone: yup.string().nullable().transform(value => value || null),
    locationText: yup.string().nullable().transform(value => value || null),
    addressText: yup.string().nullable().transform(value => value || null),
    participantsInfo: yup.string().nullable().transform(value => value || null),

    directionId: yup.number().nullable().positive().integer(),
    levelId: yup.number().nullable().positive().integer(),
    formatId: yup.number().nullable().positive().integer(),

    participantCount: yup.number().nullable().integer('Должно быть целое число').min(0, 'Не может быть отрицательным').typeError('Введите число').transform(value => (isNaN(value) || value === null || value === '' ? null : value)),
    hasForeigners: yup.boolean(),
    foreignerCount: yup.number().nullable().when('hasForeigners', { // Условно обязательно
        is: true,
        then: schema => schema.required('Укажите кол-во иностранцев').min(0).integer().typeError('Введите число'),
        otherwise: schema => schema.nullable().transform(() => null) // Обнуляем, если флаг снят
    }).transform(value => (isNaN(value) || value === null || value === '' ? null : value)),
    hasMinors: yup.boolean(),
    minorCount: yup.number().nullable().when('hasMinors', { // Условно обязательно
        is: true,
        then: schema => schema.required('Укажите кол-во несовершеннолетних').min(0).integer().typeError('Введите число'),
        otherwise: schema => schema.nullable().transform(() => null)
    }).transform(value => (isNaN(value) || value === null || value === '' ? null : value)),

    fundingAmount: yup.number().nullable().min(0, 'Не может быть отрицательным').typeError('Введите число').transform(value => (isNaN(value) || value === null || value === '' ? null : value)),

    participantCategoryIds: yup.array().of(yup.number()).nullable(),
    fundingSourceIds: yup.array().of(yup.number()).nullable(),

    mediaLinks: yup.array().of(yup.object().shape({
        url: yup.string().url("Неверный URL").required("URL обязателен"),
        description: yup.string().nullable()
    })).nullable(),
    eventMedias: yup.array().of(yup.object().shape({ // Валидация для медиа (может быть дополнена)
        mediaUrl: yup.string().required(),
        mediaType: yup.string().required(),
        description: yup.string().nullable(),
        author: yup.string().nullable(),
    })).nullable(),
    invitedGuests: yup.array().of(yup.object().shape({
        fullName: yup.string().required("ФИО гостя обязательно"),
        position: yup.string().nullable(),
        organization: yup.string().nullable(),
    })).nullable(),

});

// --- Компонент формы ---
function EventForm({ mode }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(mode === 'edit');
    const [formError, setFormError] = useState(''); // Общая ошибка формы
    const [lookups, setLookups] = useState({
        directions: [], levels: [], formats: [], categories: [], sources: []
    });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const isEditMode = mode === 'edit';

    const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(eventSchema),
        defaultValues: {
            title: '', description: '', directionId: '', levelId: '', formatId: '',
            startDate: null, endDate: null, locationText: '', addressText: '',
            participantsInfo: '', participantCount: '', hasForeigners: false, foreignerCount: '',
            hasMinors: false, minorCount: '', responsibleFullName: '', responsiblePosition: '',
            responsiblePhone: '', responsibleEmail: '', fundingAmount: '',
            participantCategoryIds: [], fundingSourceIds: [],
            mediaLinks: [], eventMedias: [], invitedGuests: []
        }
    });

    // --- Динамические списки ---
    const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray({ control, name: "mediaLinks" });
    const { fields: mediaFields, append: appendMedia, remove: removeMedia } = useFieldArray({ control, name: "eventMedias" });
    const { fields: guestFields, append: appendGuest, remove: removeGuest } = useFieldArray({ control, name: "invitedGuests" });

    // Наблюдение за чекбоксами для условных полей
    const watchHasForeigners = watch('hasForeigners');
    const watchHasMinors = watch('hasMinors');

    // --- Загрузка данных ---
    const loadLookups = useCallback(async () => {
        try {
            const [dirs, levels, formats, cats, srcs] = await Promise.all([
                getEventDirections(), getEventLevels(), getEventFormats(),
                getParticipantCategories(), getFundingSources()
            ]);
            setLookups({ directions: dirs, levels: levels, formats: formats, categories: cats, sources: srcs });
        } catch (err) {
            console.error("Failed to load lookups for form:", err);
            setFormError('Не удалось загрузить справочные данные для формы.');
        }
    }, []);

    const loadEventData = useCallback(async () => {
        if (isEditMode && id) {
            setLoading(true);
            setFormError('');
            try {
                const eventData = await getEventById(id);
                if (user.role !== 'administrator' && eventData.createdByUserId !== user.id) {
                    setFormError('Доступ запрещен: вы не можете редактировать это мероприятие.');
                    navigate('/forbidden');
                    return;
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
                    participantCount: eventData.participantCount ?? '', // Используем ?? для пустой строки вместо null/undefined
                    hasForeigners: eventData.hasForeigners || false,
                    foreignerCount: eventData.foreignerCount ?? '',
                    hasMinors: eventData.hasMinors || false,
                    minorCount: eventData.minorCount ?? '',
                    responsibleFullName: eventData.responsibleFullName || '',
                    responsiblePosition: eventData.responsiblePosition || '',
                    responsiblePhone: eventData.responsiblePhone || '',
                    responsibleEmail: eventData.responsibleEmail || '',
                    fundingAmount: eventData.fundingAmount ?? '',
                    participantCategoryIds: eventData.ParticipantCategories?.map(cat => cat.categoryId) || [],
                    fundingSourceIds: eventData.FundingSources?.map(src => src.sourceId) || [],
                    mediaLinks: eventData.MediaLinks?.map(link => ({ id: link.linkId, url: link.url || '', description: link.description || '' })) || [],
                    eventMedias: eventData.EventMedias?.map(media => ({ id: media.mediaId, mediaUrl: media.mediaUrl || '', mediaType: media.mediaType || '', description: media.description || '', author: media.author || '' })) || [],
                    invitedGuests: eventData.InvitedGuests?.map(guest => ({ id: guest.guestId, fullName: guest.fullName || '', position: guest.position || '', organization: guest.organization || '' })) || [],
                });
            } catch (err) {
                setFormError(err.response?.data?.message || err.message || 'Не удалось загрузить данные мероприятия.');
                console.error("Fetch event for edit error:", err);
            } finally {
                setLoading(false);
            }
        }
    }, [id, isEditMode, reset, user, navigate]);

    useEffect(() => {
        loadLookups();
        loadEventData();
    }, [loadLookups, loadEventData]); // Вызов при монтировании и изменении ID (для edit)

    // --- Обработчики ---
    const onSubmit = async (data) => {
        setFormError('');
        const eventDataToSend = {
            ...data,
            startDate: data.startDate ? dayjs(data.startDate).format('YYYY-MM-DD') : null,
            endDate: data.endDate ? dayjs(data.endDate).format('YYYY-MM-DD') : null,
            participantCount: data.participantCount === '' ? null : parseInt(data.participantCount, 10),
            fundingAmount: data.fundingAmount === '' ? null : parseFloat(data.fundingAmount),
            foreignerCount: data.hasForeigners && data.foreignerCount !== '' ? parseInt(data.foreignerCount, 10) : 0, // Отправляем 0 если флаг снят
            minorCount: data.hasMinors && data.minorCount !== '' ? parseInt(data.minorCount, 10) : 0,
            // Оставляем массивы как есть (react-hook-form их хранит правильно)
        };
         // Удаляем ID из вложенных объектов перед отправкой (если бэкенд не ожидает их для создания/обновления связей)
         // Возможно, бэкенду нужны только ID для many-to-many, а one-to-many он обрабатывает сам
         // eventDataToSend.mediaLinks = data.mediaLinks.map(({id, ...link}) => link); // Пример удаления ID
         // eventDataToSend.eventMedias = data.eventMedias.map(({id, ...media}) => media);
         // eventDataToSend.invitedGuests = data.invitedGuests.map(({id, ...guest}) => guest);

        console.log("Data to send:", eventDataToSend); // Для отладки

        try {
            let result;
            if (isEditMode) {
                result = await updateEvent(id, eventDataToSend);
            } else {
                result = await createEvent(eventDataToSend);
            }
            setSnackbar({ open: true, message: `Мероприятие успешно ${isEditMode ? 'обновлено' : 'создано'}!`, severity: 'success' });
            setTimeout(() => navigate(isEditMode ? `/events/${id}` : `/events/${result.eventId}`), 1500); // Задержка для Snackbar
        } catch (err) {
            const message = err.response?.data?.message || err.message || `Не удалось ${isEditMode ? 'обновить' : 'создать'} мероприятие.`;
            setFormError(message); // Показываем общую ошибку
            setSnackbar({ open: true, message: message, severity: 'error' });
            if (err.response?.data?.errors) {
                console.error("Backend validation errors:", err.response.data.errors);
                // Тут можно попытаться сопоставить ошибки с полями формы, но это сложно
            }
            console.error("Form submission error:", err);
        }
    };

    const handleCloseSnackbar = useCallback((event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    const handleMediaUploadSuccess = useCallback((mediaData) => {
        console.log('File uploaded, data received:', mediaData);
        if (mediaData?.mediaUrl && mediaData?.mediaType) {
             appendMedia({
                mediaUrl: mediaData.mediaUrl,
                mediaType: mediaData.mediaType,
                description: '',
                author: '',
            });
             setSnackbar({ open: true, message: `Файл "${mediaData.filename || 'файл'}" успешно загружен`, severity: 'success' });
        } else {
             console.error("Upload success callback missing data:", mediaData);
             setSnackbar({ open: true, message: `Ошибка при обработке загруженного файла.`, severity: 'warning' });
        }
    }, [appendMedia]);

    // --- Рендеринг ---
    if (loading) {
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

                        {/* --- Основные поля --- */}
                        <Grid item xs={12}>
                            <Controller name="title" control={control} render={({ field }) => <TextField {...field} label="Название мероприятия" required fullWidth error={!!errors.title} helperText={errors.title?.message} />} />
                        </Grid>
                        <Grid item xs={12}>
                            <Controller name="description" control={control} render={({ field }) => <TextField {...field} label="Описание (не менее 100 симв.)" required fullWidth multiline rows={5} error={!!errors.description} helperText={errors.description?.message} />} />
                        </Grid>

                        {/* --- Справочники --- */}
                        <Grid item xs={12} sm={6} md={4}>
                            <FormControl fullWidth error={!!errors.directionId}>
                                <InputLabel>Направление *</InputLabel> {/* Сделаем обязательным для примера */}
                                <Controller name="directionId" control={control} render={({ field }) => (
                                    <Select {...field} label="Направление *">
                                        <MenuItem value=""><em>Не выбрано</em></MenuItem>
                                        {lookups.directions.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                                    </Select>
                                )} />
                                <FormHelperText>{errors.directionId?.message}</FormHelperText>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <FormControl fullWidth error={!!errors.levelId}>
                                <InputLabel>Уровень</InputLabel>
                                <Controller name="levelId" control={control} render={({ field }) => (
                                    <Select {...field} label="Уровень">
                                        <MenuItem value=""><em>Не выбрано</em></MenuItem>
                                        {lookups.levels.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
                                    </Select>
                                )} />
                                <FormHelperText>{errors.levelId?.message}</FormHelperText>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                             <FormControl fullWidth error={!!errors.formatId}>
                                <InputLabel>Формат</InputLabel>
                                <Controller name="formatId" control={control} render={({ field }) => (
                                    <Select {...field} label="Формат">
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
                         <Grid item xs={12}>
                            <Controller name="participantsInfo" control={control} render={({ field }) => <TextField {...field} label="Информация об участниках (дополнительно)" fullWidth multiline rows={2} />} />
                         </Grid>
                        <Grid item xs={12} md={6}>
                           <Controller name="participantCategoryIds" control={control} render={({ field }) => (
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
                        <Grid item xs={12} sm={6} md={3}>
                            <Controller name="hasForeigners" control={control} render={({ field }) => <FormControlLabel control={<Checkbox {...field} checked={field.value || false} />} label="Есть иностранцы" />} />
                             <Controller name="foreignerCount" control={control} render={({ field }) => <TextField {...field} label="Кол-во иностр." type="number" size="small" disabled={!watchHasForeigners} required={watchHasForeigners} error={!!errors.foreignerCount} helperText={errors.foreignerCount?.message} InputProps={{ inputProps: { min: 0 } }} sx={{ ml: 2, width: '100px' }} />} />
                        </Grid>
                         <Grid item xs={12} sm={6} md={3}>
                             <Controller name="hasMinors" control={control} render={({ field }) => <FormControlLabel control={<Checkbox {...field} checked={field.value || false} />} label="Есть несоверш." />} />
                            <Controller name="minorCount" control={control} render={({ field }) => <TextField {...field} label="Кол-во несоверш." type="number" size="small" disabled={!watchHasMinors} required={watchHasMinors} error={!!errors.minorCount} helperText={errors.minorCount?.message} InputProps={{ inputProps: { min: 0 } }} sx={{ ml: 2, width: '100px' }} />} />
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
                             <Controller name="responsibleEmail" control={control} render={({ field }) => <TextField {...field} label="Email отв." fullWidth error={!!errors.responsibleEmail} helperText={errors.responsibleEmail?.message}/>} />
                         </Grid>

                        {/* --- Финансирование --- */}
                        <Grid item xs={12}><Divider><Chip label="Финансирование" /></Divider></Grid>
                        <Grid item xs={12} md={6}>
                            <Controller name="fundingSourceIds" control={control} render={({ field }) => (
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
                            <List dense disablePadding>
                            {linkFields.map((item, index) => (
                                <ListItem key={item.id} disableGutters sx={{display: 'flex', gap: 1, alignItems: 'flex-start'}}>
                                    <Controller name={`mediaLinks.${index}.url`} control={control} render={({ field }) => <TextField {...field} label="URL *" size="small" sx={{ flexGrow: 1 }} error={!!errors.mediaLinks?.[index]?.url} helperText={errors.mediaLinks?.[index]?.url?.message}/>} />
                                    <Controller name={`mediaLinks.${index}.description`} control={control} render={({ field }) => <TextField {...field} label="Описание (VK, сайт...)" size="small" sx={{ width: '30%' }} />} />
                                    <IconButton onClick={() => removeLink(index)} color="error" size="small" sx={{mt: 1}}><DeleteIcon /></IconButton>
                                </ListItem>
                            ))}
                            </List>
                            <Button onClick={() => appendLink({ url: '', description: '' })} size="small" startIcon={<AddCircleOutlineIcon />} sx={{mt:1}}>Добавить ссылку</Button>
                         </Grid>

                         {/* Медиа */}
                         <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>Медиафайлы</Typography>
                            <List dense disablePadding>
                             {mediaFields.map((item, index) => (
                                <ListItem key={item.id} disableGutters sx={{border: '1px dashed lightgrey', p: 1, mb: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: '150px' }}>
                                        {item.mediaUrl && (item.mediaType === 'photo'
                                            ? <img src={item.mediaUrl} alt={`Медиа ${index + 1}`} style={{ width: 'auto', height: '50px', objectFit: 'cover' }}/>
                                            : <video src={item.mediaUrl} style={{ width: 'auto', height: '50px' }} />
                                        )}
                                        <Typography variant="caption" sx={{wordBreak: 'break-all'}}>{item.mediaUrl?.substring(item.mediaUrl.lastIndexOf('/') + 1)}</Typography>
                                     </Box>
                                     <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, flexWrap: {xs: 'wrap', sm: 'nowrap'} }}>
                                         <Controller name={`eventMedias.${index}.description`} control={control} render={({ field }) => <TextField {...field} label="Описание медиа" size="small" fullWidth sx={{minWidth: '150px'}} />} />
                                         <Controller name={`eventMedias.${index}.author`} control={control} render={({ field }) => <TextField {...field} label="Автор медиа" size="small" fullWidth sx={{minWidth: '150px'}}/>} />
                                     </Box>
                                    <IconButton onClick={() => removeMedia(index)} color="error" size="small"><DeleteIcon /></IconButton>
                                     {/* Скрытые поля */}
                                     <Controller name={`eventMedias.${index}.mediaUrl`} control={control} render={({ field }) => <input type="hidden" {...field} />} />
                                     <Controller name={`eventMedias.${index}.mediaType`} control={control} render={({ field }) => <input type="hidden" {...field} />} />
                                </ListItem>
                             ))}
                             </List>
                            <FileUploader onUploadSuccess={handleMediaUploadSuccess} />
                         </Grid>

                         {/* Гости */}
                         <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>Приглашенные лекторы / эксперты</Typography>
                             <List dense disablePadding>
                             {guestFields.map((item, index) => (
                                <ListItem key={item.id} disableGutters sx={{display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap'}}>
                                     <Controller name={`invitedGuests.${index}.fullName`} control={control} render={({ field }) => <TextField {...field} label="ФИО Гостя *" size="small" sx={{ flexGrow: 1, minWidth: '200px' }} error={!!errors.invitedGuests?.[index]?.fullName} helperText={errors.invitedGuests?.[index]?.fullName?.message}/>} />
                                     <Controller name={`invitedGuests.${index}.position`} control={control} render={({ field }) => <TextField {...field} label="Должность" size="small" sx={{ width: {xs: '100%', sm: '25%'}, minWidth: '150px' }} />} />
                                     <Controller name={`invitedGuests.${index}.organization`} control={control} render={({ field }) => <TextField {...field} label="Организация" size="small" sx={{ width: {xs: '100%', sm: '25%'}, minWidth: '150px' }} />} />
                                     <IconButton onClick={() => removeGuest(index)} color="error" size="small" sx={{mt: 1}}><DeleteIcon /></IconButton>
                                </ListItem>
                             ))}
                            </List>
                            <Button onClick={() => appendGuest({ fullName: '', position: '', organization: '' })} size="small" startIcon={<AddCircleOutlineIcon />} sx={{mt:1}}>Добавить гостя</Button>
                         </Grid>

                         {/* --- Кнопки управления --- */}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
                                <Button variant="outlined" onClick={() => navigate(isEditMode ? `/events/${id}` : '/events')} disabled={isSubmitting}>
                                    Отмена
                                </Button>
                                <Button type="submit" variant="contained" disabled={isSubmitting || loading}>
                                    {isSubmitting ? <CircularProgress size={24} /> : (isEditMode ? 'Сохранить изменения' : 'Создать мероприятие')}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>

                 {/* Snackbar для уведомлений */}
                <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
                </Snackbar>

            </Paper>
        </Container>
    );
}

export default EventForm;