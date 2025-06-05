// Полный путь: src/pages/EventsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
// Компоненты MUI
import {
    Container, Typography, Button, Box, CircularProgress, Alert, Paper, IconButton, Tooltip, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
    Menu, MenuItem, ListItemIcon, ListItemText, Snackbar, Divider,
    Grid, TextField, Select, FormControl, InputLabel, FormHelperText,
    Checkbox, FormControlLabel // Добавлены для фильтров
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker'; // Добавлен DatePicker для фильтра
import dayjs from 'dayjs'; // Нужен для DatePicker
// Плагины Dayjs (нужно установить и расширить)
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import MoreVertIcon from '@mui/icons-material/MoreVert'; // Иконка для меню "три точки"
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'; // Отметить как проведено
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'; // Отметить как отменено
import ReplayIcon from '@mui/icons-material/Replay'; // Вернуть в запланировано (для админа)
import FilterListIcon from '@mui/icons-material/FilterList'; // Иконка для кнопки фильтров
import ClearAllIcon from '@mui/icons-material/ClearAll'; // Иконка для сброса фильтров
import DownloadIcon from '@mui/icons-material/Download'; // Для экспорта
import WarningAmberIcon from '@mui/icons-material/WarningAmber'; // Для просроченных
import UpdateIcon from '@mui/icons-material/Update'; // Для предстоящих скоро
// Контекст, API, Компоненты
import { useAuth } from '../contexts/AuthContext'; // Убедитесь, что путь правильный
import { getEvents, deleteEvent, updateEventStatus, exportEvents } from '../api/events'; // Добавлен exportEvents
import { getEventDirections, getEventLevels, getEventFormats } from '../api/lookups'; // API для справочников
import ConfirmationDialog from '../components/ConfirmationDialog'; // Убедитесь, что путь правильный
import StatusChip from '../components/StatusChip'; // Убедитесь, что путь правильный
// Утилиты
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { saveAs } from 'file-saver'; // Для сохранения файла экспорта

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
// Иконки MUI

// Начальное состояние фильтров
const initialFilters = {
    searchTitle: '',
    status: 'Запланировано', // <-- По умолчанию показываем только "Запланировано"
    directionId: '',
    levelId: '',
    formatId: '',
    startDate: null,
    endDate: null,
};

function EventsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true); // Загрузка основного списка
    const [error, setError] = useState('');
    // Пагинация
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    // Меню действий
    const [anchorEl, setAnchorEl] = useState(null);
    const [currentEventForMenu, setCurrentEventForMenu] = useState(null);
    const openMenu = Boolean(anchorEl);
    // Диалог удаления
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);
    // Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    // Фильтры
    const [filters, setFilters] = useState(initialFilters); // Текущие значения в полях фильтров
    const [appliedFilters, setAppliedFilters] = useState(initialFilters); // Фильтры, по которым реально загружены данные
    const [lookups, setLookups] = useState({ directions: [], levels: [], formats: [] }); // Справочники для фильтров
    const [loadingLookups, setLoadingLookups] = useState(true); // Флаг загрузки справочников
    // Экспорт
    const [isExporting, setIsExporting] = useState(false); // Флаг процесса экспорта
    const [showCompletedAndCancelled, setShowCompletedAndCancelled] = useState(false);
    
    // --- Загрузка справочников для фильтров ---
    const loadLookups = useCallback(async () => {
        setLoadingLookups(true);
        try {
             const [dirs, levels, formats] = await Promise.all([
                getEventDirections(),
                getEventLevels(),
                getEventFormats(),
             ]);
             setLookups({
                 directions: dirs || [], levels: levels || [], formats: formats || [],
             });
        } catch (err) {
             console.error("Failed to load lookups for filters:", err);
             setSnackbar({ open: true, message: 'Не удалось загрузить справочники для фильтров.', severity: 'warning' });
        } finally {
            setLoadingLookups(false);
        }
    }, []); // Выполняется один раз при монтировании

    // --- Загрузка мероприятий ---
    const fetchEvents = useCallback(async (filtersToApply) => { // Принимает фильтры для запроса
        setLoading(true); setError('');
        try {
            const params = {
                page: page + 1,
                limit: rowsPerPage,
                // Добавляем фильтры в параметры, если они не пустые/null
                 ...(filtersToApply.searchTitle && { searchTitle: filtersToApply.searchTitle }),
                 ...(filtersToApply.status && { status: filtersToApply.status }),
                 ...(filtersToApply.directionId && { directionId: filtersToApply.directionId }),
                 ...(filtersToApply.levelId && { levelId: filtersToApply.levelId }),
                 ...(filtersToApply.formatId && { formatId: filtersToApply.formatId }),
                 ...(filtersToApply.startDate && { startDate: dayjs(filtersToApply.startDate).format('YYYY-MM-DD') }),
                 ...(filtersToApply.endDate && { endDate: dayjs(filtersToApply.endDate).format('YYYY-MM-DD') }),
                 // TODO: Добавить другие параметры фильтров
            };
            console.log("Fetching events with params:", params); // Отладка
            const data = await getEvents(params);
            setEvents(data.events || []);
            setTotalItems(data.totalItems || 0);
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Не удалось загрузить список мероприятий';
            if (err.response?.status !== 401 && err.response?.status !== 403) {
                 setError(message);
            }
            console.error("Fetch events error:", err);
        } finally { setLoading(false); }
    }, [page, rowsPerPage]); // Зависим только от пагинации, фильтры передаем явно

    // Загрузка справочников при монтировании
    useEffect(() => { loadLookups(); }, [loadLookups]);

    // Загрузка мероприятий при изменении пагинации или примененных фильтров
    useEffect(() => {
        fetchEvents(appliedFilters); // Используем примененные фильтры
    }, [appliedFilters, fetchEvents]); // Зависимость от примененных фильтров

    // --- Обработчики ---
    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Обработка изменений в полях фильтров
    const handleFilterChange = (event) => {
        const { name, value } = event.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    const handleDateFilterChange = (name, date) => {
        setFilters(prev => ({ ...prev, [name]: date ? dayjs(date) : null }));
    };
    // --- Обработка изменения чекбокса ---
    const handleShowCompletedChange = (event) => {
        const isChecked = event.target.checked;
        setShowCompletedAndCancelled(isChecked);
        // Сразу обновляем и применяем фильтр по статусу
        const newStatusFilter = isChecked ? '' : 'Запланировано'; // Если отмечен - все статусы, если нет - только запланированные
        const newFilters = { ...filters, status: newStatusFilter };
        setFilters(newFilters); // Обновляем временные фильтры
        setAppliedFilters(newFilters); // И сразу применяем
        setPage(0); // Сброс на первую страницу
    };

    // Применение фильтров
    const handleApplyFilters = () => {
        setPage(0);
        // Перед применением, корректируем фильтр статуса на основе чекбокса
        const currentFilters = { ...filters };
        if (!showCompletedAndCancelled) {
            currentFilters.status = 'Запланировано';
        } else {
            // Если чекбокс "показать все" отмечен, и пользователь выбрал какой-то статус,
            // то оставляем его. Если статус не выбран (пустая строка), то так и отправляем (показать все).
            // Если же чекбокс отмечен, а в фильтре статуса стоит 'Запланировано', то очищаем его.
            if (currentFilters.status === 'Запланировано') {
                currentFilters.status = '';
            }
        }
        setAppliedFilters(currentFilters);
    };

    // Сброс фильтров
    const handleResetFilters = () => {
        setShowCompletedAndCancelled(false); // Сбрасываем и чекбокс
        const defaultStatusFilters = { ...initialFilters, status: 'Запланировано' };
        setFilters(defaultStatusFilters);
        setAppliedFilters(defaultStatusFilters);
        setPage(0);
    };

    // Меню действий
    const handleMenuOpen = (event, eventData) => {
         setAnchorEl(event.currentTarget);
         setCurrentEventForMenu(eventData);
    };
    const handleMenuClose = () => { setAnchorEl(null); };

     // Смена статуса
    const handleStatusChange = async (newStatus) => {
        if (!currentEventForMenu) return;
        const eventId = currentEventForMenu.eventId;
        const eventTitle = currentEventForMenu.title;
        const originalStatus = currentEventForMenu.status; // Сохраняем старый статус на случай ошибки
        handleMenuClose();
        // Оптимистичное обновление UI
        setEvents(prevEvents => prevEvents.map(ev =>
            ev.eventId === eventId ? { ...ev, status: newStatus } : ev
        ));
        try {
            await updateEventStatus(eventId, newStatus);
            setSnackbar({ open: true, message: `Статус мероприятия "${eventTitle}" обновлен!`, severity: 'success' });
        } catch (err) {
            // Откат UI в случае ошибки
            setEvents(prevEvents => prevEvents.map(ev =>
                ev.eventId === eventId ? { ...ev, status: originalStatus } : ev
            ));
            const message = err.response?.data?.message || err.message || 'Не удалось обновить статус';
            setSnackbar({ open: true, message: message, severity: 'error' });
            console.error("Update status error:", err);
        }
    };

    // Удаление
    const handleDeleteClick = (eventData) => {
        const targetEvent = eventData || currentEventForMenu;
        if (!targetEvent) return;
        handleMenuClose();
        setEventToDelete({ id: targetEvent.eventId, title: targetEvent.title });
        setOpenDeleteDialog(true);
    };
    const handleCloseDeleteDialog = () => { setOpenDeleteDialog(false); setEventToDelete(null); };
    const handleConfirmDelete = async () => {
        if (!eventToDelete) return;
        console.log('[handleConfirmDelete] Started for event:', eventToDelete); // <-- Лог 1
        setError(''); // Сброс ошибки
    
        try {
            console.log(`[handleConfirmDelete] Calling deleteEvent API for ID: ${eventToDelete.id}`); // <-- Лог 2
            await deleteEvent(eventToDelete.id); // Вызов API удаления
            console.log(`[handleConfirmDelete] API call successful for ID: ${eventToDelete.id}`); // <-- Лог 3
    
            setSnackbar({ open: true, message: 'Мероприятие удалено', severity: 'success' });
    
            // Обновляем список и пагинацию
            const newTotalItems = totalItems - 1;
            const newTotalPages = Math.ceil(newTotalItems / rowsPerPage);
            setTotalItems(newTotalItems);
            setEvents(prev => prev.filter(e => e.eventId !== eventToDelete.id));
            if (page > 0 && page >= newTotalPages) {
                setPage(Math.max(0, newTotalPages - 1));
            }
            console.log('[handleConfirmDelete] State updated.'); // <-- Лог 4
    
            handleCloseDeleteDialog(); // Закрываем диалог
    
        } catch (err) {
            // --- ВАЖНО: Посмотрите, что выводится здесь ---
            console.error("[handleConfirmDelete] Error caught:", err); // <-- Лог 5
            const message = err.response?.data?.message || err.message || 'Не удалось удалить мероприятие';
            setSnackbar({ open: true, message: message, severity: 'error' });
             // setError(message); // Можно также установить общую ошибку
             // -------------------------------------------
             handleCloseDeleteDialog(); // Закрываем диалог даже при ошибке
        }
    };

     // Закрытие Snackbar
     const handleCloseSnackbar = useCallback((event, reason) => {
         if (reason === 'clickaway') return;
         setSnackbar(prev => ({ ...prev, open: false }));
     }, []);

     // --- Обработчик Экспорта ---
     const handleExport = async () => {
        setIsExporting(true);
        setSnackbar({ open: false });
        try {
            // Используем ПРИМЕНЕННЫЕ фильтры
            const paramsToExport = {};
            for (const key in appliedFilters) {
                 if (appliedFilters[key] !== null && appliedFilters[key] !== '') {
                     if (key === 'startDate' || key === 'endDate') {
                         paramsToExport[key] = dayjs(appliedFilters[key]).format('YYYY-MM-DD');
                     } else {
                         paramsToExport[key] = appliedFilters[key];
                     }
                 }
            }
            // Вызываем API функцию экспорта
            const response = await exportEvents(paramsToExport);
            // file-saver обработает blob из response (внутри exportEvents или здесь)
            // saveAs(response.data, `Мероприятия_${...}.xlsx`); // Если exportEvents возвращает response
        } catch (error) {
            console.error('Export failed:', error);
            setSnackbar({ open: true, message: error.message || 'Ошибка при экспорте файла', severity: 'error' });
        } finally {
            setIsExporting(false);
        }
    };

    // --- Рендеринг ---
    return (
         <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h4" component="h1"> Мероприятия </Typography>
                <Box sx={{ display: 'flex', gap: 1}}>
                    <Button variant="outlined" startIcon={isExporting ? <CircularProgress size={20} color="inherit"/> : <DownloadIcon />} onClick={handleExport} disabled={loading || isExporting || !events || events.length === 0}> Экспорт в Excel </Button>
                    <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/events/new"> Добавить мероприятие </Button>
                </Box>
            </Box>

             {/* --- ПАНЕЛЬ ФИЛЬТРОВ --- */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Фильтры</Typography>
                <Grid container spacing={2} alignItems="flex-end">
                    {/* Ряд 1 */}
                    <Grid item xs={12} sm={6} md={4}><TextField label="Поиск по названию" name="searchTitle" value={filters.searchTitle} onChange={handleFilterChange} fullWidth size="small" variant="outlined"/></Grid>
                    <Grid item xs={12} sm={6} md={2}>
                         <FormControl fullWidth size="small" variant="outlined" disabled={!showCompletedAndCancelled}>
                            <InputLabel>Статус</InputLabel>
                            <Select name="status" value={showCompletedAndCancelled ? filters.status : 'Запланировано'} label="Статус" onChange={handleFilterChange}>
                                <MenuItem value=""><em>Все статусы</em></MenuItem>
                                <MenuItem value="Запланировано">Запланировано</MenuItem>
                                <MenuItem value="Проведено">Проведено</MenuItem>
                                <MenuItem value="Не проводилось (Отмена)">Отменено</MenuItem>
                             </Select>
                        </FormControl>
                     </Grid>
                    <Grid item xs={12} sm={6} md={3}><DatePicker label="Дата начала с" views={['year', 'month', 'day']} value={filters.startDate} onChange={(date) => handleDateFilterChange('startDate', date)} slotProps={{ textField: { size: 'small', fullWidth: true, variant: 'outlined', InputLabelProps: { shrink: true } } }} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><DatePicker label="Дата начала по" views={['year', 'month', 'day']} value={filters.endDate} onChange={(date) => handleDateFilterChange('endDate', date)} minDate={filters.startDate || undefined} slotProps={{ textField: { size: 'small', fullWidth: true, variant: 'outlined', InputLabelProps: { shrink: true } } }} /></Grid>
                    
                    {/* Ряд 2 */}
                    <Grid item xs={12} sm={6} md={4}><FormControl fullWidth size="small" variant="outlined" disabled={loadingLookups}><InputLabel>Направление</InputLabel><Select name="directionId" value={filters.directionId} label="Направление" onChange={handleFilterChange}><MenuItem value=""><em>Все</em></MenuItem>{lookups.directions.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}</Select></FormControl></Grid>
                    <Grid item xs={12} sm={6} md={4}><FormControl fullWidth size="small" variant="outlined" disabled={loadingLookups}><InputLabel>Уровень</InputLabel><Select name="levelId" value={filters.levelId} label="Уровень" onChange={handleFilterChange}><MenuItem value=""><em>Все</em></MenuItem>{lookups.levels.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}</Select></FormControl></Grid>
                    <Grid item xs={12} sm={6} md={4}><FormControl fullWidth size="small" variant="outlined" disabled={loadingLookups}><InputLabel>Формат</InputLabel><Select name="formatId" value={filters.formatId} label="Формат" onChange={handleFilterChange}><MenuItem value=""><em>Все</em></MenuItem>{lookups.formats.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}</Select></FormControl></Grid>
                    
                    {/* Ряд 3 - Чекбокс и кнопки */}
                    <Grid item xs={12} sm={6} md={8}> {/* Увеличил md для чекбокса */}
                        <FormControlLabel
                            control={ <Checkbox checked={showCompletedAndCancelled} onChange={handleShowCompletedChange} name="showCompletedAndCancelled" size="small" /> }
                            label="Показать завершенные и отмененные"
                            sx={{pt:1}} // Небольшой отступ сверху для выравнивания с кнопками
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} sx={{ display: 'flex', gap: 1, justifyContent: {xs: 'flex-start', sm: 'flex-end'} }}> {/* Кнопки вправо на sm+ */}
                         <Button variant="contained" onClick={handleApplyFilters} size="medium" startIcon={<FilterListIcon/>} disabled={loading}> Применить </Button>
                         <Button variant="outlined" onClick={handleResetFilters} size="medium" startIcon={<ClearAllIcon/>} disabled={loading}> Сбросить </Button>
                     </Grid>
                </Grid>
            </Paper>
            {/* --- КОНЕЦ ПАНЕЛИ ФИЛЬТРОВ --- */}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>}

            {!loading && !events.length ? ( <Typography sx={{ textAlign: 'center', p: 3 }}>Мероприятия не найдены (с учетом фильтров).</Typography>
            ) : !loading && events.length > 0 ? (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 650 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                     <TableCell sx={{minWidth: 250}}>Название</TableCell>
                                     <TableCell sx={{minWidth: 160}}>Статус</TableCell>
                                     <TableCell>Дата начала</TableCell>
                                     <TableCell>Дата окончания</TableCell>
                                     <TableCell>Уровень</TableCell>
                                     <TableCell>Формат</TableCell>
                                      {user?.role === 'administrator' && <TableCell>Создатель</TableCell>}
                                     <TableCell align="right" sx={{minWidth: 100}}>Действия</TableCell>
                                </TableRow>
                            </TableHead>
                             <TableBody>
                                {events.map((event) => {
                                     const canManageEvent = user?.role === 'administrator' || user?.id === event.createdByUserId;
                                     let indicatorIcon = null;
                                     const today = dayjs().startOf('day');
                                     const startDate = dayjs(event.startDate);
                                     const upcomingDate = today.add(7, 'day');
                                     if (event.status === 'Запланировано') {
                                         if (startDate.isBefore(today)) { indicatorIcon = <Tooltip title="Просрочено"><WarningAmberIcon color="error" fontSize="inherit" sx={{verticalAlign: 'middle'}}/></Tooltip>; }
                                         else if (startDate.isBetween(today, upcomingDate, 'day', '[]')) { indicatorIcon = <Tooltip title="Скоро (в теч. 7 дней)"><UpdateIcon color="warning" fontSize="inherit" sx={{verticalAlign: 'middle'}}/></Tooltip>; }
                                     }

                                     return (
                                         <TableRow hover key={event.eventId} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                             <TableCell component="th" scope="row" sx={{maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}> <Tooltip title={event.title}><RouterLink to={`/events/${event.eventId}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 500 }}> {event.title} </RouterLink></Tooltip> </TableCell>
                                             <TableCell> <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> <StatusChip status={event.status} /> {indicatorIcon} </Box> </TableCell>
                                             <TableCell>{event.startDate ? format(new Date(event.startDate), 'dd.MM.yyyy') : '-'}</TableCell>
                                             <TableCell>{event.endDate ? format(new Date(event.endDate), 'dd.MM.yyyy') : '-'}</TableCell>
                                             <TableCell>{event.Level?.name || '-'}</TableCell>
                                             <TableCell>{event.Format?.name || '-'}</TableCell>
                                             {user?.role === 'administrator' && <TableCell>{event.Creator?.fullName || 'N/A'}</TableCell>}
                                              <TableCell align="right">
                                                  <Tooltip title="Просмотр"><IconButton size="small" component={RouterLink} to={`/events/${event.eventId}`}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                                                  <Tooltip title="Действия"><IconButton size="small" sx={{ ml: 0.5 }} onClick={(e) => handleMenuOpen(e, event)} aria-controls={openMenu && currentEventForMenu?.eventId === event.eventId ? `actions-menu-${event.eventId}` : undefined} aria-haspopup="true" aria-expanded={openMenu && currentEventForMenu?.eventId === event.eventId ? 'true' : undefined}> <MoreVertIcon fontSize="small"/> </IconButton></Tooltip>
                                              </TableCell>
                                          </TableRow>
                                     );
                                 })}
                             </TableBody>
                         </Table>
                    </TableContainer>
                    <TablePagination rowsPerPageOptions={[10, 25, 50, 100]} component="div" count={totalItems} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Строк на странице:" labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `больше чем ${to}`}`} />
                </Paper>
            ) : null }

             {/* Меню действий */}
             <Menu id="actions-menu" anchorEl={anchorEl} open={openMenu && !!currentEventForMenu} onClose={handleMenuClose} MenuListProps={{ 'aria-labelledby': 'basic-button' }} {...(currentEventForMenu && { PaperProps: { style: { minWidth: '220px' } } })}>
                {currentEventForMenu && [
                        <MenuItem key="view" component={RouterLink} to={`/events/${currentEventForMenu.eventId}`} onClick={handleMenuClose}> <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon> <ListItemText>Просмотреть детали</ListItemText> </MenuItem>,
                        (user?.role === 'administrator' || user?.id === currentEventForMenu.createdByUserId) && ( <MenuItem key="edit" component={RouterLink} to={`/events/${currentEventForMenu.eventId}/edit`} onClick={handleMenuClose}> <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon> <ListItemText>Редактировать</ListItemText> </MenuItem> ),
                        currentEventForMenu.status === 'Запланировано' && (user?.role === 'administrator' || user?.id === currentEventForMenu.createdByUserId) && ( <MenuItem key="complete_report" onClick={() => { handleMenuClose(); navigate(`/events/${currentEventForMenu.eventId}/edit`, { state: { isCompleting: true, eventId: currentEventForMenu.eventId } }); }}> <ListItemIcon><AssignmentTurnedInIcon fontSize="small" color="primary" /></ListItemIcon> <ListItemText>Завершить / Отчитаться</ListItemText> </MenuItem> ),
                        user?.role === 'administrator' && currentEventForMenu.status !== 'Не проводилось (Отмена)' && ( <MenuItem key="canceled" onClick={() => handleStatusChange('Не проводилось (Отмена)')}> <ListItemIcon><CancelOutlinedIcon fontSize="small" color="error" /></ListItemIcon> <ListItemText>Отметить "Не проводилось (Отмена)"</ListItemText> </MenuItem> ),
                        user?.role === 'administrator' && currentEventForMenu.status !== 'Запланировано' && ( <MenuItem key="planned" onClick={() => handleStatusChange('Запланировано')}> <ListItemIcon><ReplayIcon fontSize="small" /></ListItemIcon> <ListItemText>Вернуть "Запланировано"</ListItemText> </MenuItem> ),
                        (user?.role === 'administrator') && <Divider key="divider-delete"/>,
                        (user?.role === 'administrator') && ( <MenuItem key="delete" onClick={() => handleDeleteClick(currentEventForMenu)} sx={{ color: 'error.main' }}> <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon> <ListItemText>Удалить</ListItemText> </MenuItem> )
                    ].filter(Boolean)
                }
            </Menu>

             <ConfirmationDialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} onConfirm={handleConfirmDelete} title="Удалить мероприятие?" message={`Вы уверены, что хотите удалить мероприятие "${eventToDelete?.title || ''}"?`} />
             <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}><Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert></Snackbar>
         </Container>
    );
}

export default EventsPage;