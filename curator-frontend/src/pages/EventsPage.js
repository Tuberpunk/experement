// Полный путь: src/pages/EventsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
// Компоненты MUI
import {
    Container, Typography, Button, Box, CircularProgress, Alert, Paper, IconButton, Tooltip, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
    Menu, MenuItem, ListItemIcon, ListItemText, Snackbar, Divider,
    Grid, TextField, Select, FormControl, InputLabel, FormHelperText // Добавлены для фильтров
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker'; // Добавлен DatePicker для фильтра
import dayjs from 'dayjs'; // Нужен для DatePicker
// Иконки MUI
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import DownloadIcon from '@mui/icons-material/Download'; // Для экспорта
// Контекст, API, Компоненты
import { useAuth } from '../contexts/AuthContext';
import { getEvents, deleteEvent, updateEventStatus, exportEvents } from '../api/events'; // Добавлен exportEvents
import { getEventDirections, getEventLevels, getEventFormats } from '../api/lookups';
import ConfirmationDialog from '../components/ConfirmationDialog';
import StatusChip from '../components/StatusChip';
// Утилиты
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { saveAs } from 'file-saver'; // Для сохранения файла экспорта

// Начальное состояние фильтров
const initialFilters = {
    searchTitle: '',
    status: '',
    directionId: '',
    levelId: '',
    formatId: '',
    startDate: null,
    endDate: null,
};

function EventsPage() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
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
    const [filters, setFilters] = useState(initialFilters);
    const [appliedFilters, setAppliedFilters] = useState(initialFilters); // Фильтры, по которым идет загрузка
    const [lookups, setLookups] = useState({ directions: [], levels: [], formats: [] });
    const [loadingLookups, setLoadingLookups] = useState(true);
    // Экспорт
    const [isExporting, setIsExporting] = useState(false);

    // --- Загрузка справочников ---
    const loadLookups = useCallback(async () => {
        setLoadingLookups(true);
        try {
             const [dirs, levels, formats] = await Promise.all([
                getEventDirections(), getEventLevels(), getEventFormats(),
             ]);
             setLookups({ directions: dirs || [], levels: levels || [], formats: formats || [] });
        } catch (err) {
             console.error("Failed to load lookups for filters:", err);
             setSnackbar({ open: true, message: 'Не удалось загрузить справочники для фильтров.', severity: 'warning' });
        } finally { setLoadingLookups(false); }
    }, []);

    // --- Загрузка мероприятий ---
    const fetchEvents = useCallback(async (currentAppliedFilters) => { // Принимаем фильтры как аргумент
        setLoading(true); setError('');
        try {
            const params = { page: page + 1, limit: rowsPerPage };
            for (const key in currentAppliedFilters) { // Используем переданные фильтры
                if (currentAppliedFilters[key] !== null && currentAppliedFilters[key] !== '') {
                    if (key === 'startDate' || key === 'endDate') {
                        params[key] = dayjs(currentAppliedFilters[key]).format('YYYY-MM-DD');
                    } else {
                        params[key] = currentAppliedFilters[key];
                    }
                }
            }
            console.log("Fetching events with params:", params);
            const data = await getEvents(params);
            setEvents(data.events || []);
            setTotalItems(data.totalItems || 0);
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Не удалось загрузить список мероприятий';
            if (err.response?.status !== 401 && err.response?.status !== 403) { setError(message); }
            console.error("Fetch events error:", err);
        } finally { setLoading(false); }
    }, [page, rowsPerPage]); // Зависим только от пагинации

    // Загрузка справочников при монтировании
    useEffect(() => { loadLookups(); }, [loadLookups]);

    // Загрузка мероприятий при изменении пагинации или примененных фильтров
    useEffect(() => {
        fetchEvents(appliedFilters); // Передаем примененные фильтры
    }, [page, rowsPerPage, appliedFilters, fetchEvents]); // Добавили appliedFilters

    // --- Обработчики ---
    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Фильтры
    const handleFilterChange = (event) => {
        const { name, value } = event.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    const handleDateFilterChange = (name, date) => {
        setFilters(prev => ({ ...prev, [name]: date ? dayjs(date) : null }));
    };
    const handleApplyFilters = () => {
        setPage(0); // Сброс на первую страницу при применении фильтров
        setAppliedFilters(filters); // Устанавливаем новые примененные фильтры
    };
    const handleResetFilters = () => {
        setFilters(initialFilters);
        setAppliedFilters(initialFilters); // Сбрасываем и примененные фильтры
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
        handleMenuClose();
        try {
            await updateEventStatus(eventId, newStatus);
            setSnackbar({ open: true, message: `Статус мероприятия "${eventTitle}" обновлен!`, severity: 'success' });
            setEvents(prevEvents => prevEvents.map(ev => ev.eventId === eventId ? { ...ev, status: newStatus } : ev ));
        } catch (err) {
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
        try {
            await deleteEvent(eventToDelete.id);
            setSnackbar({ open: true, message: 'Мероприятие удалено', severity: 'success' });
             // Пересчет пагинации и обновление списка
             const newTotalItems = totalItems - 1;
             const newTotalPages = Math.ceil(newTotalItems / rowsPerPage);
             setTotalItems(newTotalItems);
             setEvents(prev => prev.filter(e => e.eventId !== eventToDelete.id));
             if (page > 0 && page >= newTotalPages) { setPage(Math.max(0, newTotalPages - 1)); }
            handleCloseDeleteDialog();
        } catch (err) {
             const message = err.response?.data?.message || err.message || 'Не удалось удалить мероприятие';
             setSnackbar({ open: true, message: message, severity: 'error' });
             console.error("Delete event error:", err);
             handleCloseDeleteDialog();
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
        setSnackbar({ open: false }); // Скрыть другие сообщения
        try {
            // Используем ПРИМЕНЕННЫЕ фильтры для экспорта
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
            // file-saver сам обработает blob из response.data
            // Можно добавить сообщение об успехе, если нужно
            // setSnackbar({ open: true, message: `Файл ${response.filename} начал скачиваться`, severity: 'info' });
        } catch (error) {
            console.error('Export failed:', error);
            setSnackbar({ open: true, message: error.message || 'Ошибка при экспорте файла', severity: 'error' });
        } finally {
            setIsExporting(false); // Снимаем индикатор загрузки
        }
    };

    // --- Рендеринг ---
    return (
         <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Заголовок и кнопки */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h4" component="h1"> Мероприятия </Typography>
                <Box sx={{ display: 'flex', gap: 1}}>
                     <Button variant="outlined" startIcon={isExporting ? <CircularProgress size={20} color="inherit"/> : <DownloadIcon />} onClick={handleExport} disabled={loading || isExporting || events.length === 0}>
                        Экспорт в Excel
                     </Button>
                     <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/events/new">
                         Добавить мероприятие
                     </Button>
                </Box>
            </Box>

             {/* Панель фильтров */}
             <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Фильтры</Typography>
                <Grid container spacing={2} alignItems="flex-end">
                     <Grid item xs={12} sm={6} md={4} lg={3}>
                         <TextField label="Поиск по названию" name="searchTitle" value={filters.searchTitle} onChange={handleFilterChange} fullWidth size="small" variant="outlined"/>
                    </Grid>
                     <Grid item xs={6} sm={3} md={2} lg={2}>
                         <FormControl fullWidth size="small" variant="outlined">
                             <InputLabel>Статус</InputLabel>
                             <Select name="status" value={filters.status} label="Статус" onChange={handleFilterChange}>
                                <MenuItem value=""><em>Все</em></MenuItem> <MenuItem value="Запланировано">Запланировано</MenuItem> <MenuItem value="Проведено">Проведено</MenuItem> <MenuItem value="Не проводилось (Отмена)">Отменено</MenuItem>
                             </Select>
                         </FormControl>
                     </Grid>
                     <Grid item xs={6} sm={3} md={2} lg={2}>
                          <DatePicker label="Дата начала с" views={['year', 'month', 'day']} value={filters.startDate} onChange={(date) => handleDateFilterChange('startDate', date)} slotProps={{ textField: { size: 'small', fullWidth: true, variant: 'outlined', InputLabelProps: { shrink: true } } }} />
                     </Grid>
                      <Grid item xs={6} sm={3} md={2} lg={2}>
                           <DatePicker label="Дата начала по" views={['year', 'month', 'day']} value={filters.endDate} onChange={(date) => handleDateFilterChange('endDate', date)} minDate={filters.startDate || undefined} slotProps={{ textField: { size: 'small', fullWidth: true, variant: 'outlined', InputLabelProps: { shrink: true } } }} />
                     </Grid>
                      <Grid item xs={6} sm={3} md={2} lg={3}>
                           <FormControl fullWidth size="small" variant="outlined" disabled={loadingLookups}>
                             <InputLabel>Направление</InputLabel>
                             <Select name="directionId" value={filters.directionId} label="Направление" onChange={handleFilterChange}>
                                 <MenuItem value=""><em>Все</em></MenuItem> {lookups.directions.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                              </Select>
                         </FormControl>
                      </Grid>
                      <Grid item xs={6} sm={3} md={2}>
                           <FormControl fullWidth size="small" variant="outlined" disabled={loadingLookups}>
                             <InputLabel>Уровень</InputLabel>
                             <Select name="levelId" value={filters.levelId} label="Уровень" onChange={handleFilterChange}>
                                 <MenuItem value=""><em>Все</em></MenuItem> {lookups.levels.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
                              </Select>
                         </FormControl>
                      </Grid>
                       <Grid item xs={6} sm={3} md={2}>
                            <FormControl fullWidth size="small" variant="outlined" disabled={loadingLookups}>
                             <InputLabel>Формат</InputLabel>
                             <Select name="formatId" value={filters.formatId} label="Формат" onChange={handleFilterChange}>
                                 <MenuItem value=""><em>Все</em></MenuItem> {lookups.formats.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                              </Select>
                         </FormControl>
                      </Grid>
                       <Grid item xs={12} sm={3} md={'auto'} sx={{ display: 'flex', gap: 1 }}>
                           <Button variant="contained" onClick={handleApplyFilters} size="small" startIcon={<FilterListIcon/>} disabled={loading}> Применить </Button>
                           <Button variant="outlined" onClick={handleResetFilters} size="small" startIcon={<ClearAllIcon/>} disabled={loading}> Сбросить </Button>
                      </Grid>
                </Grid>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Индикатор загрузки */}
            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>}

            {/* Таблица или сообщение "не найдено" */}
            {!loading && !events.length ? ( <Typography sx={{ textAlign: 'center', p: 3 }}>Мероприятия не найдены (с учетом фильтров).</Typography>
            ) : !loading && events.length > 0 ? (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 650 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                     <TableCell sx={{minWidth: 250}}>Название</TableCell>
                                     <TableCell sx={{minWidth: 130}}>Статус</TableCell>
                                     <TableCell>Дата начала</TableCell>
                                     <TableCell>Дата окончания</TableCell>
                                     <TableCell>Уровень</TableCell>
                                     <TableCell>Формат</TableCell>
                                      {user?.role === 'administrator' && <TableCell>Создатель</TableCell>}
                                     <TableCell align="right" sx={{minWidth: 100}}>Действия</TableCell>
                                </TableRow>
                            </TableHead>
                             <TableBody>
                                {events.map((event) => (
                                     <TableRow hover key={event.eventId} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                         <TableCell component="th" scope="row" sx={{maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}> <Tooltip title={event.title}><RouterLink to={`/events/${event.eventId}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 500 }}> {event.title} </RouterLink></Tooltip> </TableCell>
                                         <TableCell><StatusChip status={event.status} /></TableCell>
                                         <TableCell>{event.startDate ? format(new Date(event.startDate), 'dd.MM.yyyy') : '-'}</TableCell>
                                         <TableCell>{event.endDate ? format(new Date(event.endDate), 'dd.MM.yyyy') : '-'}</TableCell>
                                         <TableCell>{event.Level?.name || '-'}</TableCell>
                                         <TableCell>{event.Format?.name || '-'}</TableCell>
                                         {user?.role === 'administrator' && <TableCell>{event.Creator?.fullName || 'N/A'}</TableCell>}
                                          <TableCell align="right">
                                              <Tooltip title="Просмотр"><IconButton size="small" component={RouterLink} to={`/events/${event.eventId}`}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                                              <Tooltip title="Действия">
                                                  <IconButton size="small" sx={{ ml: 0.5 }} onClick={(e) => handleMenuOpen(e, event)} aria-controls={openMenu && currentEventForMenu?.eventId === event.eventId ? `actions-menu-${event.eventId}` : undefined} aria-haspopup="true" aria-expanded={openMenu && currentEventForMenu?.eventId === event.eventId ? 'true' : undefined}> <MoreVertIcon fontSize="small"/> </IconButton>
                                              </Tooltip>
                                          </TableCell>
                                      </TableRow>
                                 ))}
                             </TableBody>
                         </Table>
                    </TableContainer>
                    <TablePagination rowsPerPageOptions={[10, 25, 50, 100]} component="div" count={totalItems} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Строк на странице:" labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `больше чем ${to}`}`} />
                </Paper>
            ) : null }

            {/* Меню действий */}
             <Menu id="actions-menu" anchorEl={anchorEl} open={openMenu && !!currentEventForMenu} onClose={handleMenuClose} MenuListProps={{ 'aria-labelledby': 'basic-button' }} {...(currentEventForMenu && { PaperProps: { style: { minWidth: '200px' } } })}>
                {currentEventForMenu &&
                    [
                        (user?.role === 'administrator' || user?.id === currentEventForMenu.createdByUserId) && ( <MenuItem key="edit" component={RouterLink} to={`/events/${currentEventForMenu.eventId}/edit`} onClick={handleMenuClose}> <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon> <ListItemText>Редактировать</ListItemText> </MenuItem> ),
                        currentEventForMenu.status === 'Запланировано' && (user?.role === 'administrator' || user?.id === currentEventForMenu.createdByUserId) && ( <MenuItem key="conducted" onClick={() => handleStatusChange('Проведено')}> <ListItemIcon><CheckCircleOutlineIcon fontSize="small" color="success" /></ListItemIcon> <ListItemText>Отметить "Проведено"</ListItemText> </MenuItem> ),
                        user?.role === 'administrator' && currentEventForMenu.status !== 'Не проводилось (Отмена)' && ( <MenuItem key="canceled" onClick={() => handleStatusChange('Не проводилось (Отмена)')}> <ListItemIcon><CancelOutlinedIcon fontSize="small" color="error" /></ListItemIcon> <ListItemText>Отметить "Не проводилось (Отмена)"</ListItemText> </MenuItem> ),
                        user?.role === 'administrator' && currentEventForMenu.status !== 'Запланировано' && ( <MenuItem key="planned" onClick={() => handleStatusChange('Запланировано')}> <ListItemIcon><ReplayIcon fontSize="small" /></ListItemIcon> <ListItemText>Вернуть "Запланировано"</ListItemText> </MenuItem> ),
                        (user?.role === 'administrator' || user?.id === currentEventForMenu.createdByUserId) && <Divider key="divider"/>,
                        (user?.role === 'administrator' || user?.id === currentEventForMenu.createdByUserId) && ( <MenuItem key="delete" onClick={() => handleDeleteClick(currentEventForMenu)} sx={{ color: 'error.main' }}> <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon> <ListItemText>Удалить</ListItemText> </MenuItem> )
                    ].filter(Boolean)
                }
            </Menu>

            {/* Диалог удаления */}
             <ConfirmationDialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} onConfirm={handleConfirmDelete} title="Удалить мероприятие?" message={`Вы уверены, что хотите удалить мероприятие "${eventToDelete?.title || ''}"?`} />
             {/* Snackbar */}
             <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                 <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
             </Snackbar>
         </Container>
    );
}

export default EventsPage;