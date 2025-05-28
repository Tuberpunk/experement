// Полный путь: src/pages/EventForm.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Navigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Container, Typography, TextField, Button, Grid, Box, Paper, CircularProgress, Alert, Snackbar,
    Select, MenuItem, FormControl, InputLabel, FormHelperText, Checkbox, FormControlLabel, Autocomplete, Chip,
    IconButton, List, ListItem, ListItemText, Divider, Tooltip,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Accordion, AccordionSummary, AccordionDetails 
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
// Иконки MUI
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelScheduleSendIcon from '@mui/icons-material/CancelScheduleSend';
import SaveIcon from '@mui/icons-material/Save';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// Контекст, API, Компоненты
import { useAuth } from '../contexts/AuthContext';
import { getEventById, createEvent, updateEvent, updateEventStatus } from '../api/events';
import { getUsers } from '../api/users';
import { getEventDirections, getEventLevels, getEventFormats, getParticipantCategories, getFundingSources } from '../api/lookups';
import { getMyStudentsForReport } from '../api/curatorReports';
import FileUploader from '../components/FileUploader';

// --- Данные для подсказок ---
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
];
// ---------------------------

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
    participantCount: yup.number().nullable().integer('Должно быть целое число').min(0).typeError('Введите число').transform(value => (isNaN(value) || value === null || value === '' ? null : value)),
    hasForeigners: yup.boolean(),
    foreignerCount: yup.number().nullable().when('hasForeigners', {
        is: true, then: schema => schema.min(0).integer().typeError('Введите число'),
        otherwise: schema => schema.nullable().transform(() => null)
    }).transform(value => (isNaN(value) || value === null || value === '' ? 0 : Number(value))),
    hasMinors: yup.boolean(),
    minorCount: yup.number().nullable().when('hasMinors', {
        is: true, then: schema => schema.min(0).integer().typeError('Введите число'),
        otherwise: schema => schema.nullable().transform(() => null)
    }).transform(value => (isNaN(value) || value === null || value === '' ? 0 : Number(value))),
    fundingAmount: yup.number().nullable().min(0).typeError('Введите число').transform(value => (isNaN(value) || value === null || value === '' ? null : value)),
    participantCategoryIds: yup.array().of(yup.number().integer()).nullable(),
    fundingSourceIds: yup.array().of(yup.number().integer()).nullable(),
    mediaLinks: yup.array().of(yup.object().shape({ id: yup.number().nullable(), url: yup.string().url("URL некорректен").required("URL обязателен"), description: yup.string().nullable() })).nullable(),
    eventMedias: yup.array().of(yup.object().shape({ id: yup.number().nullable(), mediaUrl: yup.string().required('URL медиафайла обязателен (загрузите файл)'), mediaType: yup.string().required('Тип медиафайла не определен'), description: yup.string().nullable(), author: yup.string().nullable() })).nullable(),
    invitedGuests: yup.array().of(yup.object().shape({ id: yup.number().nullable(), fullName: yup.string().required("ФИО гостя обязательно"), position: yup.string().nullable(), organization: yup.string().nullable() })).nullable(),
});
// ------------------------

function EventForm({ mode }) {
    const { id: paramIdFromUrl } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const isCompletingMode = !!location.state?.isCompleting;
    const isEditModeOnly = mode === 'edit' && !isCompletingMode;
    const isCreateMode = mode === 'create' && !isCompletingMode;
    const eventIdToLoadOrUpdate = paramIdFromUrl || location.state?.eventId;

    const [loading, setLoading] = useState(isEditModeOnly || isCompletingMode);
    const [loadingLookups, setLoadingLookups] = useState(true);
    const [formError, setFormError] = useState('');
    const [lookups, setLookups] = useState({ directions: [], levels: [], formats: [], categories: [], sources: [] });
    const [studentsList, setStudentsList] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [openCancelDialog, setOpenCancelDialog] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [initialEventData, setInitialEventData] = useState(null);

    const { control, handleSubmit, reset, setValue, watch, getValues, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(eventSchema),
        defaultValues: {
            title: location.state?.title || '',
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

    const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray({ control, name: "mediaLinks" });
    const { fields: mediaFields, append: appendMedia, remove: removeMedia } = useFieldArray({ control, name: "eventMedias" });
    const { fields: guestFields, append: appendGuest, remove: removeGuest } = useFieldArray({ control, name: "invitedGuests" });

    const watchHasForeigners = watch('hasForeigners');
    const watchHasMinors = watch('hasMinors');
    const watchLocationText = watch('locationText');

    const loadInitialData = useCallback(async () => {
        setLoadingLookups(true); setFormError('');
        try {
            const [dirs, levels, formats, cats, srcs, myStudents, usersData] = await Promise.all([
                getEventDirections(), getEventLevels(), getEventFormats(),
                getParticipantCategories(), getFundingSources(),
                (user?.role === 'curator' || user?.role === 'administrator') ? getMyStudentsForReport() : Promise.resolve([]),
                getUsers({ limit: 1000, role: ['curator', 'administrator'], isActive: true })
            ]);
            setLookups({
                directions: dirs || [], levels: levels || [], formats: formats || [],
                categories: cats || [], sources: srcs || []
            });
            setStudentsList(myStudents || []);
            setUsersList(usersData.users || []);
        } catch (err) {
            console.error("Failed to load data for event form:", err);
            setFormError('Не удалось загрузить справочные данные и списки пользователей.');
        } finally { setLoadingLookups(false); }
    }, [user]);

    const loadEventData = useCallback(async () => {
        if ((isEditModeOnly || isCompletingMode) && eventIdToLoadOrUpdate) {
            setLoading(true); setFormError('');
            try {
                const eventData = await getEventById(eventIdToLoadOrUpdate);
                if (!eventData) { setFormError('Мероприятие не найдено.'); setLoading(false); return; }
                if (user?.role !== 'administrator' && user?.id !== eventData.createdByUserId) {
                    return navigate('/forbidden', { replace: true });
                }
                setInitialEventData(eventData);
                const dataToResetInternal = {
                    title: eventData.title || '', description: eventData.description || '',
                    directionId: eventData.directionId || '', levelId: eventData.levelId || '', formatId: eventData.formatId || '',
                    startDate: eventData.startDate ? dayjs(eventData.startDate) : null,
                    endDate: eventData.endDate ? dayjs(eventData.endDate) : null,
                    locationText: eventData.locationText || '', addressText: eventData.addressText || '',
                    participantsInfo: eventData.participantsInfo || '', participantCount: eventData.participantCount ?? '',
                    hasForeigners: eventData.hasForeigners || false, foreignerCount: eventData.foreignerCount ?? '0',
                    hasMinors: eventData.hasMinors || false, minorCount: eventData.minorCount ?? '0',
                    responsibleFullName: eventData.responsibleFullName || '', responsiblePosition: eventData.responsiblePosition || '',
                    responsiblePhone: eventData.responsiblePhone || '', responsibleEmail: eventData.responsibleEmail || '',
                    fundingAmount: eventData.fundingAmount ?? '', status: eventData.status || 'Запланировано',
                    participantCategoryIds: eventData.ParticipantCategories?.map(cat => cat.categoryId) || [],
                    fundingSourceIds: eventData.FundingSources?.map(src => src.sourceId) || [],
                    mediaLinks: eventData.MediaLinks?.map(link => ({ id: link.linkId, url: link.url || '', description: link.description || '' })) || [],
                    eventMedias: eventData.EventMedias?.map(media => ({ id: media.mediaId, mediaUrl: media.mediaUrl || '', mediaType: media.mediaType || '', description: media.description || '', author: media.author || '' })) || [],
                    invitedGuests: eventData.InvitedGuests?.map(guest => ({ id: guest.guestId, fullName: guest.fullName || '', position: guest.position || '', organization: guest.organization || '' })) || [],
                };
                reset(dataToResetInternal);
            } catch (err) {
                 setFormError(err.response?.data?.message || err.message || 'Не удалось загрузить данные мероприятия.');
                 console.error("Fetch event for edit error:", err);
                 if (err.response?.status === 403 || err.response?.status === 404) { navigate('/events', { replace: true });}
            } finally { setLoading(false); }
        }
    }, [eventIdToLoadOrUpdate, isEditModeOnly, isCompletingMode, reset, navigate, user]);

    useEffect(() => {
        loadInitialData().then(() => {
            if (isEditModeOnly || isCompletingMode) { loadEventData(); }
            else if (isCreateMode && user && !location.state?.startDate) {
                 setValue('responsibleFullName', user.fullName || '');
                 setValue('responsibleEmail', user.email || '');
            }
            if (isCreateMode && location.state?.title && !watch('title')) {
                setValue('title', location.state.title);
            }
        });
    }, [loadInitialData, loadEventData, isEditModeOnly, isCompletingMode, isCreateMode, user, setValue, location.state, watch]);

    const onSubmitForm = async (data, newStatusOverride) => {
        setFormError('');
        const currentEventId = eventIdToLoadOrUpdate;
        const isActuallyCreating = isCreateMode;
        const parseOptionalInt = (val) => (val === '' || val === null || isNaN(parseInt(val, 10)) ? null : parseInt(val, 10));
        const parseOptionalFloat = (val) => (val === '' || val === null || isNaN(parseFloat(val)) ? null : parseFloat(val));

        const eventDataToSend = {
            title: data.title, description: data.description,
            startDate: data.startDate ? dayjs(data.startDate).format('YYYY-MM-DD') : null,
            endDate: data.endDate ? dayjs(data.endDate).format('YYYY-MM-DD') : null,
            locationText: data.locationText || null, addressText: data.addressText || null,
            participantsInfo: data.participantsInfo || null,
            participantCount: parseOptionalInt(data.participantCount),
            hasForeigners: data.hasForeigners || false,
            foreignerCount: data.hasForeigners ? (parseOptionalInt(data.foreignerCount) ?? 0) : 0,
            hasMinors: data.hasMinors || false,
            minorCount: data.hasMinors ? (parseOptionalInt(data.minorCount) ?? 0) : 0,
            responsibleFullName: data.responsibleFullName,
            responsiblePosition: data.responsiblePosition || null,
            responsiblePhone: data.responsiblePhone || null,
            responsibleEmail: data.responsibleEmail || null,
            fundingAmount: parseOptionalFloat(data.fundingAmount),
            directionId: data.directionId || null, levelId: data.levelId || null, formatId: data.formatId || null,
            participantCategoryIds: data.participantCategoryIds || [],
            fundingSourceIds: data.fundingSourceIds || [],
            mediaLinks: data.mediaLinks?.map(({ id, ...rest }) => rest) || [],
            eventMedias: data.eventMedias?.filter(m => m.mediaUrl).map(({ id, ...rest }) => rest) || [],
            invitedGuests: data.invitedGuests?.map(({ id, ...rest }) => rest) || [],
        };
        // Статус не отправляем в основном объекте, он меняется отдельным запросом или по умолчанию при создании
        // delete eventDataToSend.status; // Оставляем, если бэкенд ожидает его при updateEvent

        console.log('Submitting data:', eventDataToSend, 'Requested New Status:', newStatusOverride);

        try {
            let savedEvent;
            if (isActuallyCreating) {
                savedEvent = await createEvent(eventDataToSend);
            } else {
                if (!currentEventId) throw new Error("ID мероприятия для обновления не определен.");
                // При обновлении отправляем все данные, включая описание
                savedEvent = await updateEvent(currentEventId, eventDataToSend);
            }

            let finalStatus = savedEvent.status;
            if (newStatusOverride) {
                await updateEventStatus(savedEvent.eventId, newStatusOverride);
                finalStatus = newStatusOverride;
            }

            setSnackbar({ open: true, message: `Мероприятие успешно ${isActuallyCreating ? 'создано' : 'обновлено'}! ${newStatusOverride ? `Статус изменен на "${finalStatus}".` : ''}`, severity: 'success' });

            if (finalStatus === 'Проведено' && isCompletingMode) {
                setTimeout(() => navigate('/curator-reports/new', { state: { eventId: savedEvent.eventId, eventTitle: savedEvent.title, eventDate: savedEvent.startDate } }), 1500);
            } else if (finalStatus === 'Не проводилось (Отмена)') {
                setTimeout(() => navigate('/events'), 1500);
            } else {
                setTimeout(() => navigate(`/events/${savedEvent.eventId}`), 1500);
            }

        } catch (err) {
            const message = err.response?.data?.message || err.message || `Не удалось ${isActuallyCreating ? 'создать' : 'обновить'} мероприятие.`;
            setFormError(message);
            setSnackbar({ open: true, message: message, severity: 'error' });
            console.error("Event form submission error:", err);
        }
    };

    const handleMarkAsConducted = () => {
        handleSubmit((data) => onSubmitForm(data, 'Проведено'))();
    };

    const handleOpenCancelDialog = () => {
        const currentFormData = getValues();
        const baseDescription = initialEventData?.description || currentFormData.description || '';
        // Сохраняем текущие данные формы, чтобы использовать их при подтверждении отмены
        setInitialEventData(prev => ({ ...(prev || {}), ...currentFormData, description: baseDescription }));
        setOpenCancelDialog(true);
    };
    const handleCloseCancelDialog = () => {
        setOpenCancelDialog(false);
        setCancelReason('');
        setFormError(''); // Также сбрасываем ошибку формы
    };

    const handleConfirmCancelEvent = () => { // Убрали async
        if (!cancelReason.trim()) {
            alert('Укажите причину отмены.'); // Или используйте setFormError для диалога
            return;
        }
        handleCloseCancelDialog();

        const currentDescription = initialEventData?.description || ''; // Берем описание из сохраненных initialEventData
        const updatedDescription = `${currentDescription}\n\n--- ОТМЕНЕНО ---\nПричина: ${cancelReason.trim()}`;

        // Вызываем основной обработчик submit, передавая обновленное описание и новый статус
        // Передаем все данные формы (dataWithReason), чтобы сохранились и другие возможные изменения
        const dataWithReason = { ...getValues(), description: updatedDescription };
        handleSubmit((formData) => onSubmitForm(formData, 'Не проводилось (Отмена)'))(dataWithReason);
    };

    const handleMediaUploadSuccess = useCallback((fileData, index) => {
        if (fileData?.mediaUrl && fileData?.mediaType) {
            setValue(`eventMedias.${index}.mediaUrl`, fileData.mediaUrl, { shouldDirty: true });
            setValue(`eventMedias.${index}.mediaType`, fileData.mediaType, { shouldDirty: true });
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
    if (loadingLookups || (loading && (isEditModeOnly || isCompletingMode))) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    {isCompletingMode ? 'Завершение/Отчет по мероприятию' : (isEditModeOnly ? 'Редактировать мероприятие' : 'Создать новое мероприятие')}
                </Typography>
                {isCompletingMode && <Alert severity="info" sx={{mb: 2}}>Проверьте и при необходимости обновите данные мероприятия перед сменой статуса.</Alert>}
                {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

                <Box component="form" onSubmit={handleSubmit(data => onSubmitForm(data, null))} noValidate>
                    {/* Используем общий Grid контейнер для аккордеонов */}
                    <Grid container spacing={0}> {/* Убрал spacing здесь, отступы будут через Accordion/Grid item */}

                        {/* --- Секция 1: Основная информация --- */}
                        <Grid item xs={12} sx={{mb: 2}}>
                            <Accordion defaultExpanded>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="h6">1. Основная информация</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Grid container spacing={2}> {/* Внутренний Grid для полей */}
                                        <Grid item xs={12}><Controller name="title" control={control} render={({ field }) => <TextField {...field} label="Название мероприятия *" required fullWidth error={!!errors.title} helperText={errors.title?.message} />}/></Grid>
                                        <Grid item xs={12}><Controller name="description" control={control} render={({ field }) => <TextField {...field} label="Описание (min 100 символов) *" required fullWidth multiline rows={5} error={!!errors.description} helperText={errors.description?.message} />}/></Grid>
                                        <Grid item xs={12} sm={6} md={4}><FormControl fullWidth error={!!errors.directionId} size="small"><InputLabel>Направление</InputLabel><Controller name="directionId" control={control} defaultValue="" render={({ field }) => (<Select {...field} label="Направление"><MenuItem value=""><em>Не выбрано</em></MenuItem>{lookups.directions.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}</Select>)} /><FormHelperText>{errors.directionId?.message}</FormHelperText></FormControl></Grid>
                                        <Grid item xs={12} sm={6} md={4}><FormControl fullWidth error={!!errors.levelId} size="small"><InputLabel>Уровень</InputLabel><Controller name="levelId" control={control} defaultValue="" render={({ field }) => (<Select {...field} label="Уровень"><MenuItem value=""><em>Не выбрано</em></MenuItem>{lookups.levels.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}</Select>)} /><FormHelperText>{errors.levelId?.message}</FormHelperText></FormControl></Grid>
                                        <Grid item xs={12} sm={6} md={4}><FormControl fullWidth error={!!errors.formatId} size="small"><InputLabel>Формат</InputLabel><Controller name="formatId" control={control} defaultValue="" render={({ field }) => (<Select {...field} label="Формат"><MenuItem value=""><em>Не выбрано</em></MenuItem>{lookups.formats.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}</Select>)} /><FormHelperText>{errors.formatId?.message}</FormHelperText></FormControl></Grid>
                                        <Grid item xs={12} sm={6}><Controller name="startDate" control={control} render={({ field }) => (<DatePicker {...field} label="Дата начала *" value={field.value ? dayjs(field.value) : null} onChange={(date) => field.onChange(date)} slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.startDate, helperText: errors.startDate?.message, size:'small' } }} />)} /></Grid>
                                        <Grid item xs={12} sm={6}><Controller name="endDate" control={control} render={({ field }) => (<DatePicker {...field} label="Дата окончания" value={field.value ? dayjs(field.value) : null} onChange={(date) => field.onChange(date)} minDate={watch('startDate') ? dayjs(watch('startDate')) : undefined} slotProps={{ textField: { fullWidth: true, error: !!errors.endDate, helperText: errors.endDate?.message, size:'small' } }} />)} /></Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>
                        </Grid>

                        {/* --- Секция 2: Место проведения --- */}
                        <Grid item xs={12} sx={{mb: 2}}>
                            <Accordion>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="h6">2. Место проведения</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}> <Controller name="locationText" control={control} defaultValue="" render={({ field: { onChange, value } }) => ( <Autocomplete freeSolo options={ugtuLocations} getOptionLabel={(option) => (typeof option === 'object' ? option.label : option) || ''} isOptionEqualToValue={(option, val) => option.label === val?.label} inputValue={value || ''} onInputChange={(_, newInputValue, reason) => { if (reason === 'input') { onChange(newInputValue); setValue('addressText', ''); } }} onChange={(_, newValue) => { if (typeof newValue === 'object' && newValue !== null) { onChange(newValue.label); setValue('addressText', newValue.address || '', { shouldValidate: true }); } else if (typeof newValue === 'string') { onChange(newValue); setValue('addressText', ''); } else { onChange(''); setValue('addressText', ''); } }} renderInput={(params) => ( <TextField {...params} label="Место проведения (или объект УГТУ)" fullWidth size="small"/> )} /> )} /> </Grid>
                                        <Grid item xs={12} sm={6}> <Controller name="addressText" control={control} render={({ field }) => <TextField {...field} label="Адрес проведения" fullWidth size="small" InputProps={{ readOnly: ugtuLocations.some(loc => loc.label === watchLocationText) }} error={!!errors.addressText} helperText={errors.addressText?.message || (ugtuLocations.some(loc => loc.label === watchLocationText) ? 'Адрес заполнен автоматически' : 'Укажите, если место не объект УГТУ')} />} /> </Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>
                        </Grid>

                        {/* --- Секция 3: Участники --- */}
                        <Grid item xs={12} sx={{mb: 2}}>
                            <Accordion>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="h6">3. Участники</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}><Controller name="participantCategoryIds" control={control} defaultValue={[]} render={({ field }) => ( <Autocomplete multiple options={lookups.categories} getOptionLabel={(o) => o.name} isOptionEqualToValue={(o, v) => o.id === v.id} value={lookups.categories.filter(cat => field.value?.includes(cat.id))} onChange={(_, newValue) => field.onChange(newValue.map(item => item.id))} renderInput={(params) => <TextField {...params} label="Категории участников"/>} renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option.name} {...getTagProps({ index })} size="small"/>))} /> )} /></Grid>
                                        <Grid item xs={12} sm={6} md={3}><Controller name="participantCount" control={control} render={({ field }) => <TextField {...field} label="Общее кол-во уч." type="number" fullWidth size="small" error={!!errors.participantCount} helperText={errors.participantCount?.message} InputProps={{ inputProps: { min: 0 } }} />} /></Grid>
                                        <Grid item xs={12} sm={6} md={3}> <Grid container spacing={1} alignItems="center"> <Grid item xs={6}><Controller name="hasForeigners" control={control} render={({ field }) => <FormControlLabel control={<Checkbox {...field} checked={!!field.value} size="small"/>} label="Иностранцы" sx={{ '& .MuiSvgIcon-root': { fontSize: 20 } }} />} /></Grid> <Grid item xs={6}><Controller name="foreignerCount" control={control} defaultValue="0" render={({ field }) => <TextField {...field} label="Кол-во" type="number" size="small" disabled={!watchHasForeigners} error={!!errors.foreignerCount} helperText={errors.foreignerCount?.message} InputProps={{ inputProps: { min: 0 } }} fullWidth/>} /></Grid> </Grid> </Grid>
                                        <Grid item xs={12} sm={6} md={3}> <Grid container spacing={1} alignItems="center"> <Grid item xs={6}><Controller name="hasMinors" control={control} render={({ field }) => <FormControlLabel control={<Checkbox {...field} checked={!!field.value} size="small"/>} label="Несовершен." sx={{ '& .MuiSvgIcon-root': { fontSize: 20 } }} />} /></Grid> <Grid item xs={6}><Controller name="minorCount" control={control} defaultValue="0" render={({ field }) => <TextField {...field} label="Кол-во" type="number" size="small" disabled={!watchHasMinors} error={!!errors.minorCount} helperText={errors.minorCount?.message} InputProps={{ inputProps: { min: 0 } }} fullWidth/>} /></Grid> </Grid> </Grid>
                                        <Grid item xs={12}><Controller name="participantsInfo" control={control} render={({ field }) => <TextField {...field} label="Доп. информация об участниках" fullWidth multiline rows={2} size="small"/>} /></Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>
                        </Grid>

                        {/* --- Секция 4: Ответственное лицо --- */}
                        <Grid item xs={12} sx={{mb: 2}}>
                            <Accordion>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="h6">4. Ответственное лицо</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}> <Controller name="responsibleFullName" control={control} defaultValue="" render={({ field: { onChange, value } }) => ( <Autocomplete freeSolo options={usersList} disabled={loadingLookups} getOptionLabel={(option) => (typeof option === 'object' ? option.fullName : option) || ''} isOptionEqualToValue={(option, val) => option.userId === val?.userId} inputValue={value || ''} onInputChange={(_, newInputValue, reason) => { if (reason === 'input') { onChange(newInputValue); } }} onChange={(_, newValue) => { let nameToSet = ''; if (typeof newValue === 'object' && newValue !== null && newValue.userId) { nameToSet = newValue.fullName; setValue('responsiblePosition', newValue.position || '', { shouldValidate: true }); setValue('responsiblePhone', newValue.phoneNumber || '', { shouldValidate: true }); setValue('responsibleEmail', newValue.email || '', { shouldValidate: true }); } else if (typeof newValue === 'string') { nameToSet = newValue; } else { nameToSet = ''; } onChange(nameToSet); }} renderInput={(params) => ( <TextField {...params} label="ФИО ответственного *" required fullWidth error={!!errors.responsibleFullName} helperText={errors.responsibleFullName?.message} size="small"/> )} /> )} /> </Grid>
                                        <Grid item xs={12} sm={6}><Controller name="responsiblePosition" control={control} render={({ field }) => <TextField {...field} label="Должность ответственного" fullWidth size="small"/>} /></Grid>
                                        <Grid item xs={12} sm={6}><Controller name="responsiblePhone" control={control} render={({ field }) => <TextField {...field} label="Телефон отв." fullWidth size="small"/>} /></Grid>
                                        <Grid item xs={12} sm={6}><Controller name="responsibleEmail" control={control} render={({ field }) => <TextField {...field} label="Email отв." type="email" fullWidth error={!!errors.responsibleEmail} helperText={errors.responsibleEmail?.message} size="small"/>} /></Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>
                        </Grid>

                        {/* --- Секция 5: Финансирование --- */}
                        <Grid item xs={12} sx={{mb: 2}}>
                            <Accordion>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="h6">5. Финансирование</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}><Controller name="fundingSourceIds" control={control} defaultValue={[]} render={({ field }) => ( <Autocomplete multiple options={lookups.sources} getOptionLabel={(o) => o.name} isOptionEqualToValue={(o, v) => o.id === v.id} value={lookups.sources.filter(src => field.value?.includes(src.id))} onChange={(_, newValue) => field.onChange(newValue.map(item => item.id))} renderInput={(params) => <TextField {...params} label="Источники финансирования"/>} renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option.name} {...getTagProps({ index })} size="small"/>))} /> )} /></Grid>
                                        <Grid item xs={12} md={6}><Controller name="fundingAmount" control={control} render={({ field }) => <TextField {...field} label="Объем (тыс. руб.)" type="number" fullWidth size="small" error={!!errors.fundingAmount} helperText={errors.fundingAmount?.message} InputProps={{ inputProps: { min: 0, step: 0.01 } }} />} /></Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>
                        </Grid>

                        {/* --- Секция 6: Дополнительные материалы --- */}
                        <Grid item xs={12} sx={{mb: 2}}>
                            <Accordion>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="h6">6. Дополнительные материалы и участники</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Grid container spacing={2}>
                                        {/* Ссылки */}
                                        <Grid item xs={12}> <Typography variant="subtitle1" gutterBottom>Ссылки СМИ / Соцсети</Typography> <List dense disablePadding sx={{mb: 1}}> {linkFields.map((item, index) => ( <ListItem key={item.id} disableGutters sx={{display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1}}> <Controller name={`mediaLinks.${index}.url`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="URL *" size="small" sx={{ flexGrow: 1 }} error={!!errors.mediaLinks?.[index]?.url} helperText={errors.mediaLinks?.[index]?.url?.message}/>} /> <Controller name={`mediaLinks.${index}.description`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="Описание (VK, сайт...)" size="small" sx={{ width: {xs: '100%', sm:'30%'} }} />} /> <Tooltip title="Удалить ссылку"><IconButton onClick={() => removeLink(index)} color="error" size="small" sx={{mt: 0.5}}><DeleteIcon fontSize='small'/></IconButton></Tooltip> </ListItem> ))} </List> <Button onClick={() => appendLink({ url: '', description: '' })} size="small" startIcon={<AddCircleOutlineIcon />} variant="outlined">Добавить ссылку</Button> </Grid>
                                        {/* Медиа */}
                                        <Grid item xs={12}> <Typography variant="subtitle1" gutterBottom>Медиафайлы</Typography> <List dense disablePadding sx={{mb: 1}}> {mediaFields.map((item, index) => ( <ListItem key={item.id} disableGutters sx={{border: '1px dashed lightgrey', p: 1, mb: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}> <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: '150px', flexWrap: 'wrap' }}> {watch(`eventMedias.${index}.mediaUrl`) ? ( watch(`eventMedias.${index}.mediaType`) === 'photo' ? <img src={watch(`eventMedias.${index}.mediaUrl`)} alt={`Медиа ${index + 1}`} style={{ width: 'auto', height: '50px', objectFit: 'cover' }}/> : <video src={watch(`eventMedias.${index}.mediaUrl`)} style={{ width: 'auto', height: '50px' }} /> ) : ( <FileUploader onUploadSuccess={(fileData) => handleMediaUploadSuccess(fileData, index)} buttonText={`Загрузить #${index + 1}`} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf"/> )} {watch(`eventMedias.${index}.mediaUrl`) && <Typography variant="caption" sx={{wordBreak: 'break-all'}}>{watch(`eventMedias.${index}.mediaUrl`)?.substring(watch(`eventMedias.${index}.mediaUrl`).lastIndexOf('/') + 1)}</Typography>} </Box> <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, flexWrap: {xs: 'wrap', sm: 'nowrap'} }}> <Controller name={`eventMedias.${index}.description`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="Описание медиа" size="small" fullWidth sx={{minWidth: '150px'}} disabled={!watch(`eventMedias.${index}.mediaUrl`)} />} /> <Controller name={`eventMedias.${index}.author`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="Автор медиа" size="small" fullWidth sx={{minWidth: '150px'}} disabled={!watch(`eventMedias.${index}.mediaUrl`)} />} /> </Box> <Tooltip title="Удалить медиа"><IconButton onClick={() => removeMedia(index)} color="error" size="small"><DeleteIcon fontSize='small'/></IconButton></Tooltip> <Controller name={`eventMedias.${index}.mediaUrl`} control={control} render={({ field }) => <input type="hidden" {...field} />} /> <Controller name={`eventMedias.${index}.mediaType`} control={control} render={({ field }) => <input type="hidden" {...field} />} /> </ListItem> ))} </List> <Button onClick={() => appendMedia({ mediaUrl: '', mediaType: '', description: '', author: '' })} size="small" startIcon={<AddCircleOutlineIcon />} variant="outlined">Добавить слот медиа</Button> </Grid>
                                        {/* Гости */}
                                        <Grid item xs={12}> <Typography variant="subtitle1" gutterBottom>Приглашенные лекторы / эксперты</Typography> <List dense disablePadding sx={{mb: 1}}> {guestFields.map((item, index) => ( <ListItem key={item.id} disableGutters sx={{display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap', mb: 1}}> <Controller name={`invitedGuests.${index}.fullName`} control={control} defaultValue="" render={({ field: { onChange, value } }) => ( <Autocomplete freeSolo options={studentsList} disabled={loadingLookups} getOptionLabel={(option) => (typeof option === 'object' ? option.fullName : option) || ''} isOptionEqualToValue={(option, val) => option.studentId === val?.studentId} inputValue={value || ''} onInputChange={(_, newInputValue, reason) => { if (reason === 'input') { onChange(newInputValue); } }} onChange={(_, newValue) => { let nameToSet = ''; let positionToSet = watch(`invitedGuests.${index}.position`); if (typeof newValue === 'object' && newValue !== null && newValue.studentId) { nameToSet = newValue.fullName; positionToSet = newValue.groupName || ''; setValue(`invitedGuests.${index}.organization`, ''); } else if (typeof newValue === 'string') { nameToSet = newValue; } else { nameToSet = ''; } onChange(nameToSet); setValue(`invitedGuests.${index}.position`, positionToSet); }} renderInput={(params) => ( <TextField {...params} label="ФИО гостя / Выберите студента *" size="small" required error={!!errors.invitedGuests?.[index]?.fullName} helperText={errors.invitedGuests?.[index]?.fullName?.message} sx={{ flexGrow: 1, minWidth: '200px' }} /> )} /> )} /> <Controller name={`invitedGuests.${index}.position`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="Должность / Группа" size="small" sx={{ width: {xs: '100%', sm: '25%'}, minWidth: '150px' }} />} /> <Controller name={`invitedGuests.${index}.organization`} control={control} defaultValue="" render={({ field }) => <TextField {...field} label="Организация" size="small" sx={{ width: {xs: '100%', sm: '25%'}, minWidth: '150px' }} />} /> <Tooltip title="Удалить гостя"><IconButton onClick={() => removeGuest(index)} color="error" size="small" sx={{mt: 0.5}}><DeleteIcon fontSize='small'/></IconButton></Tooltip> </ListItem> ))} </List> <Button onClick={() => appendGuest({ fullName: '', position: '', organization: '' })} size="small" startIcon={<AddCircleOutlineIcon />} variant="outlined">Добавить гостя</Button> </Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>
                        </Grid>

                        {/* --- Кнопки --- */}
                        <Grid item xs={12} sx={{ mt: 1 }}> {/* Уменьшил mt здесь, т.к. аккордеоны уже имеют отступы */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                                <Button variant="outlined" onClick={() => navigate(isEditModeOnly || isCompletingMode ? `/events/${eventIdToLoadOrUpdate}` : '/events')} disabled={isSubmitting}>
                                    {isCompletingMode ? "Назад к мероприятию" : "Отмена"}
                                </Button>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    {isCompletingMode && initialEventData?.status === 'Запланировано' && (
                                        <>
                                            <Button variant="contained" color="error" startIcon={<CancelScheduleSendIcon />} onClick={handleOpenCancelDialog} disabled={isSubmitting}> Мероприятие отменено </Button>
                                            <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={handleMarkAsConducted} disabled={isSubmitting}> Мероприятие проведено </Button>
                                        </>
                                    )}
                                    {(!isCompletingMode || (isCompletingMode && initialEventData?.status !== 'Запланировано')) && (
                                        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={isSubmitting || loading || loadingLookups}>
                                            {isSubmitting ? <CircularProgress size={24} /> : (isEditModeOnly ? 'Сохранить изменения' : 'Создать мероприятие')}
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        </Grid>
                    </Grid> {/* Конец общего Grid контейнера */}
                </Box>
            </Paper>

            {/* Диалог для причины отмены */}
            <Dialog open={openCancelDialog} onClose={handleCloseCancelDialog} fullWidth maxWidth="sm">
                <DialogTitle>Укажите причину отмены</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{mb:2}}> Пожалуйста, опишите причину, по которой мероприятие было отменено. Эта информация будет добавлена к описанию мероприятия. </DialogContentText>
                    <TextField autoFocus margin="dense" id="cancelReason" label="Причина отмены" type="text" fullWidth multiline rows={4} variant="outlined" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                </DialogContent>
                <DialogActions sx={{pb: 2, pr: 2}}>
                    <Button onClick={handleCloseCancelDialog}>Отмена</Button>
                    <Button onClick={handleConfirmCancelEvent} variant="contained" color="primary" disabled={!cancelReason.trim()}>Подтвердить отмену</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                 <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Container>
    );
}

export default EventForm;
