// src/pages/EventsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Container, Typography, Button, Box, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    TablePagination, Grid, TextField, Select, MenuItem, FormControl, InputLabel, Collapse
    // ... другие компоненты MUI для фильтров (DatePicker, Checkbox etc.)
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import { useAuth } from '../contexts/AuthContext';
import { getEvents, exportMyEvents, exportAllEvents } from '../api/events';
import { getEventDirections, getEventLevels, getEventFormats } from '../api/lookups'; // Загружаем справочники для фильтров
import StatusChip from '../components/StatusChip'; // Пример компонента для статуса
import { format } from 'date-fns'; // Для форматирования дат
import { saveAs } from 'file-saver'; // Для скачивания файлов

function EventsPage() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Состояние для пагинации
    const [page, setPage] = useState(0); // MUI пагинация начинается с 0
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Состояние для фильтров
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        directionId: '',
        levelId: '',
        formatId: '',
        searchTitle: '',
        startDate: null, // Используйте null или dayjs() для DatePicker
        endDate: null,
        // ... другие фильтры
    });
    const [filterLookups, setFilterLookups] = useState({
        directions: [], levels: [], formats: []
    });

    // Функция загрузки данных
    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Собираем параметры запроса
            const params = {
                page: page + 1, // API ожидает страницы с 1
                limit: rowsPerPage,
                // Добавляем фильтры, если они установлены
                ...(filters.status && { status: filters.status }),
                ...(filters.directionId && { directionId: filters.directionId }),
                ...(filters.levelId && { levelId: filters.levelId }),
                ...(filters.formatId && { formatId: filters.formatId }),
                ...(filters.searchTitle && { searchTitle: filters.searchTitle }),
                ...(filters.startDate && { startDate: format(new Date(filters.startDate), 'yyyy-MM-dd') }), // Форматируем дату
                ...(filters.endDate && { endDate: format(new Date(filters.endDate), 'yyyy-MM-dd') }),
            };
            const data = await getEvents(params);
            setEvents(data.events || []);
            setTotalItems(data.totalItems || 0);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Не удалось загрузить мероприятия');
            console.error("Fetch events error:", err);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filters]); // Зависимости для useCallback

    // Загрузка справочников для фильтров при монтировании
    useEffect(() => {
        const loadLookups = async () => {
            try {
                const [dirs, levels, formats] = await Promise.all([
                    getEventDirections(),
                    getEventLevels(),
                    getEventFormats()
                ]);
                setFilterLookups({ directions: dirs, levels: levels, formats: formats });
            } catch (err) {
                console.error("Failed to load filter lookups:", err);
                // Можно показать сообщение об ошибке
            }
        };
        loadLookups();
    }, []);

    // Загрузка мероприятий при изменении страницы, лимита или фильтров
    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]); // Используем useCallback-версию

    // Обработчики пагинации
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0); // Сброс на первую страницу при изменении лимита
    };

    // Обработчики фильтров
    const handleFilterChange = (event) => {
        const { name, value } = event.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (name, date) => {
         setFilters(prev => ({ ...prev, [name]: date ? date.toISOString() : null })); // Сохраняем в ISO формате или null
    };

    const applyFilters = () => {
        setPage(0); // Сброс на первую страницу при применении фильтров
        fetchEvents(); // Повторный вызов fetchEvents не нужен, сработает useEffect
    };

    const resetFilters = () => {
        setFilters({
            status: '', directionId: '', levelId: '', formatId: '', searchTitle: '', startDate: null, endDate: null
        });
        setPage(0);
         // Повторный вызов fetchEvents не нужен, сработает useEffect
    };

    // Обработчик экспорта
    const handleExport = async () => {
        setLoading(true); // Показать индикатор загрузки
        setError('');
        try {
            // Собираем параметры фильтров для экспорта
             const params = {
                ...(filters.status && { status: filters.status }),
                ...(filters.directionId && { directionId: filters.directionId }),
                ...(filters.levelId && { levelId: filters.levelId }),
                ...(filters.formatId && { formatId: filters.formatId }),
                ...(filters.searchTitle && { searchTitle: filters.searchTitle }),
                ...(filters.startDate && { startDate: format(new Date(filters.startDate), 'yyyy-MM-dd') }),
                ...(filters.endDate && { endDate: format(new Date(filters.endDate), 'yyyy-MM-dd') }),
            };

            let response;
            let filename = `events_export_${Date.now()}.xlsx`;

            if (user?.role === 'administrator') {
                response = await exportAllEvents(params);
                filename = `all_${filename}`;
            } else {
                response = await exportMyEvents(params);
                 filename = `my_${filename}`;
            }

            // Скачивание файла
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            saveAs(blob, filename);

        } catch (err) {
             console.error("Export error:", err);
             setError(err.response?.data?.message || err.message || 'Ошибка при экспорте файла');
        } finally {
             setLoading(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1">
                    {user?.role === 'administrator' ? 'Все Мероприятия' : 'Мои Мероприятия'}
                </Typography>
                <Box>
                     <Button
                        variant="outlined"
                        startIcon={<FilterListIcon />}
                        onClick={() => setShowFilters(!showFilters)}
                        sx={{ mr: 1 }}
                    >
                        Фильтры
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={handleExport}
                        disabled={loading}
                        sx={{ mr: 1 }}
                    >
                        Экспорт
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        component={RouterLink}
                        to="/events/new"
                    >
                        Добавить мероприятие
                    </Button>
                </Box>
            </Box>

             {/* Панель фильтров */}
            <Collapse in={showFilters}>
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Фильтры</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                label="Поиск по названию"
                                name="searchTitle"
                                value={filters.searchTitle}
                                onChange={handleFilterChange}
                                fullWidth
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                             <FormControl fullWidth size="small">
                                <InputLabel>Статус</InputLabel>
                                <Select
                                    name="status"
                                    value={filters.status}
                                    label="Статус"
                                    onChange={handleFilterChange}
                                >
                                    <MenuItem value=""><em>Любой</em></MenuItem>
                                    <MenuItem value="Запланировано">Запланировано</MenuItem>
                                    <MenuItem value="Проведено">Проведено</MenuItem>
                                    <MenuItem value="Не проводилось (Отмена)">Не проводилось (Отмена)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                             <FormControl fullWidth size="small">
                                <InputLabel>Направление</InputLabel>
                                <Select
                                    name="directionId"
                                    value={filters.directionId}
                                    label="Направление"
                                    onChange={handleFilterChange}
                                >
                                    <MenuItem value=""><em>Любое</em></MenuItem>
                                    {filterLookups.directions.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                       {/* Добавить остальные фильтры (Level, Format, DatePickers) */}
                        {/*
                         <Grid item xs={12} sm={6} md={4}>
                            <DatePicker
                                label="Дата начала с"
                                value={filters.startDate ? dayjs(filters.startDate) : null}
                                onChange={(date) => handleDateChange('startDate', date)}
                                renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                             />
                        </Grid>
                         <Grid item xs={12} sm={6} md={4}>
                             <DatePicker
                                label="Дата начала по"
                                value={filters.endDate ? dayjs(filters.endDate) : null}
                                onChange={(date) => handleDateChange('endDate', date)}
                                renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                            />
                        </Grid>
                        */}
                    </Grid>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={resetFilters} sx={{ mr: 1 }}>Сбросить</Button>
                        <Button variant="contained" onClick={applyFilters}>Применить</Button>
                    </Box>
                </Paper>
            </Collapse>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading && !events.length ? ( // Показываем индикатор только при первой загрузке
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                </Box>
            ) : !loading && !events.length ? (
                <Typography sx={{ textAlign: 'center', p: 3 }}>Мероприятия не найдены.</Typography>
            ) : (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer>
                        <Table stickyHeader aria-label="Таблица мероприятий">
                            <TableHead>
                                <TableRow>
                                    {/* Заголовки таблицы */}
                                    <TableCell>Название</TableCell>
                                    <TableCell>Статус</TableCell>
                                    <TableCell>Дата начала</TableCell>
                                    <TableCell>Направление</TableCell>
                                    <TableCell>Ответственный</TableCell>
                                    <TableCell>Действия</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {events.map((event) => (
                                    <TableRow hover key={event.eventId}>
                                        <TableCell>
                                            <RouterLink to={`/events/${event.eventId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                {event.title}
                                            </RouterLink>
                                        </TableCell>
                                        <TableCell><StatusChip status={event.status} /></TableCell>
                                        <TableCell>{event.startDate ? format(new Date(event.startDate), 'dd.MM.yyyy') : '-'}</TableCell>
                                        <TableCell>{event.Direction?.name || '-'}</TableCell>
                                        <TableCell>{event.responsibleFullName || '-'}</TableCell>
                                        <TableCell>
                                            <Button size="small" component={RouterLink} to={`/events/${event.eventId}`}>
                                                Просмотр
                                            </Button>
                                            {/* Кнопка редактирования (проверка прав может быть здесь или на странице формы) */}
                                            {(user?.role === 'administrator' || user?.id === event.createdByUserId) && (
                                                <Button size="small" component={RouterLink} to={`/events/${event.eventId}/edit`} sx={{ ml: 1 }}>
                                                    Редакт.
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={totalItems}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Строк на странице:"
                        labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
                    />
                </Paper>
            )}
        </Container>
    );
}

export default EventsPage;