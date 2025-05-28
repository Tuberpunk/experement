// Полный путь: src/pages/CuratorReportsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Container, Typography, Button, Box, CircularProgress, Alert, Paper, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
    Grid, Snackbar, Divider, List, ListItem, ListItemText,
    TextField, // Для выбора дат
    MenuItem, // Для Select
    Select, // Для выбора куратора
    FormControl, // Для Select
    InputLabel // Для Select
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import EventNoteIcon from '@mui/icons-material/EventNote';
import CategoryIcon from '@mui/icons-material/Category'; // Иконка для категорий/типов
import BarChartIcon from '@mui/icons-material/BarChart'; // Еще одна иконка для статистики
import PublicIcon from '@mui/icons-material/Public'; // Иконка для иностранных участников
import ChildCareIcon from '@mui/icons-material/ChildCare';
import FilterListIcon from '@mui/icons-material/FilterList';
import GroupIcon from '@mui/icons-material/Group'; // Для общего числа студентов
import GroupsIcon from '@mui/icons-material/Groups'; // Для общего числа групп
import HowToRegIcon from '@mui/icons-material/HowToReg';

// Контекст и API
import { useAuth } from '../contexts/AuthContext';
import { getCuratorReports, deleteCuratorReport, getCuratorReportsStatistics } from '../api/curatorReports';
import { getUsers } from '../api/users';
// Вспомогательные компоненты
import ConfirmationDialog from '../components/ConfirmationDialog';
// Форматирование даты
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers'; // Для DatePicker
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3'; // Адаптер для DatePicker
import { format, isValid, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

// Компонент для отображения одного блока статистики
const StatCard = ({ title, value, icon, loading }) => (
    <Paper 
        elevation={2} 
        sx={{ 
            p: 1.25, // Компактные отступы
            display: 'flex', 
            alignItems: 'center', 
            height: '50%',
            minHeight: '65px' // Минимальная высота
        }}
    >
        {icon && (
            <Box sx={{ mr: 1.5, color: 'primary.main', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {React.cloneElement(icon, { fontSize: 'large' })} 
            </Box>
        )}
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}
            >
                {title}
            </Typography>
            <Typography 
                variant="h6" 
                component="div"
                sx={{ 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', // Обрезаем длинное значение
                    lineHeight: 1.2 
                }}
            >
                {loading ? <CircularProgress size={20} /> : value}
            </Typography>
        </Box>
    </Paper>
);

// НОВЫЙ Компонент для отображения статистики по категориям
const CategoryStatCard = ({ title, data, itemNameKey, itemCountKey, icon, loading }) => (
    <Grid item xs={30} sm={30} md={4

    }> {/* md={4} чтобы поместить 3 в ряд */}
        <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {icon && <Box sx={{ mr: 1, color: 'primary.main' }}>{React.cloneElement(icon, { fontSize: 'medium' })}</Box>}
                <Typography variant="h6" component="div">
                    {title}
                </Typography>
            </Box>
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 100 }}>
                    <CircularProgress size={24} />
                </Box>
            ) : (
                data && data.length > 0 ? (
                    <List dense disablePadding>
                        {data.map((item, index) => (
                            <ListItem key={index} disableGutters sx={{py: 0.5}}>
                                <ListItemText 
                                    primary={item[itemNameKey] || 'Не указано'} 
                                    secondary={`Отчетов: ${item[itemCountKey]}`} 
                                />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography variant="body2" color="text.secondary">Нет данных</Typography>
                )
            )}
        </Paper>
    </Grid>
);



function CuratorReportsPage() {
    const { user, loading: authLoading } = useAuth(); // Получаем текущего пользователя
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true); // Для списка отчетов
    const [loadingStats, setLoadingStats] = useState(true); // Для статистики
    const [error, setError] = useState('');
    const [statsError, setStatsError] = useState(''); // Отдельная ошибка для статистики
    const [page, setPage] = useState(0); // MUI пагинация с 0
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [statistics, setStatistics] = useState(null); // Состояние для статистики

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [selectedCuratorId, setSelectedCuratorId] = useState(''); // Для фильтра по куратору (админ)
    const [curators, setCurators] = useState([]); // Список кураторов для Select

    // Состояние для диалога удаления
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null); // { id, title }
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    
    // Загрузка списка кураторов для администратора
useEffect(() => {
    if (user?.role === 'administrator') {
        const fetchCurators = async () => {
            try {
                const usersData = await getUsers({ role: 'curator' }); // API-вызов
                
                // Более надежная проверка и установка состояния
                if (Array.isArray(usersData)) {
                    setCurators(usersData);
                } else if (usersData && Array.isArray(usersData.users)) {
                    // Распространенный случай, если API возвращает объект вида { users: [...] }
                    setCurators(usersData.users);
                } else if (usersData && Array.isArray(usersData.data)) {
                    // Еще один возможный случай, если API возвращает { data: [...] }
                    setCurators(usersData.data);
                }
                else {
                    // Если данные пришли не в формате массива, логируем это и устанавливаем пустой массив
                    console.warn('Ответ API getUsers для кураторов не является массивом. Получено:', usersData);
                    setCurators([]);
                }
            } catch (err) {
                console.error("Не удалось загрузить кураторов:", err);
                setSnackbar({ open: true, message: 'Не удалось загрузить список кураторов для фильтра', severity: 'error' });
                setCurators([]); // В случае ошибки также устанавливаем пустой массив
            }
        };
        fetchCurators();
    }
}, [user?.role, setSnackbar]);

const getStudentGroupDisplayValue = () => {
        if (loadingStats || !statistics || !statistics.studentGroupInfo) {
            return '...';
        }
        const { type, value } = statistics.studentGroupInfo;
        if (type === 'name') {
            return value; // Просто возвращаем название группы
        }
        // Для type === 'count'
        if (user?.role === 'administrator' && selectedCuratorId) {
             return `${value}`; // Просто число, заголовок карточки уточнит контекст
        }
        if (user?.role === 'curator') {
            return `${value}`; // Просто число, заголовок карточки уточнит контекст
        }
        // Админ смотрит всех
        return `${value}`; // Просто число
    };

    const getStudentGroupDisplayTitle = () => {
        if (authLoading || !statistics || !statistics.studentGroupInfo) {
            return "Группы"; // Заголовок по умолчанию или во время загрузки
        }
        const { type } = statistics.studentGroupInfo;

        if (type === 'name') {
            return "Моя группа"; // Если отображается имя, то это одна группа куратора
        }

        // Для type === 'count'
        if (user?.role === 'administrator' && selectedCuratorId) {
            return "Групп у куратора";
        }
        if (user?.role === 'curator') {
            return "Моих групп";
        }
        return "Всего групп"; // Админ смотрит всех
    };

    // Функция загрузки статистики
const fetchStatistics = useCallback(async () => {
        setLoadingStats(true);
        setStatsError('');
        try {
            const params = {};
            if (startDate && isValid(startDate)) {
                params.startDate = format(startDate, 'yyyy-MM-dd');
            }
            if (endDate && isValid(endDate)) {
                // Для корректного включения выбранной даты, если время не указано,
                // бэкенд должен правильно обрабатывать endDate (например, < endDate + 1 день)
                // или можно отправлять endDate как конец дня.
                // Пока отправляем как есть, бэкенд обрабатывает "< endDate + 1 день" для SQL
                params.endDate = format(endDate, 'yyyy-MM-dd');
            }
            if (user?.role === 'administrator' && selectedCuratorId) {
                params.curatorId = selectedCuratorId;
            }
            // Если текущий пользователь куратор, его ID автоматически используется на бэкенде

            const data = await getCuratorReportsStatistics(params);
            setStatistics(data);
        } catch (err) {
            setStatsError(err.response?.data?.message || err.message || 'Не удалось загрузить статистику');
        } finally {
            setLoadingStats(false);
        }
    }, [startDate, endDate, selectedCuratorId, user?.role]); 

    // Функция загрузки отчетов
    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = { page: page + 1, limit: rowsPerPage };
            const data = await getCuratorReports(params);
            setReports(data.reports || []);
            setTotalItems(data.totalItems || 0);
        } catch (err) {
             setError(err.response?.data?.message || err.message || 'Не удалось загрузить список отчетов');
             console.error("Fetch curator reports error:", err);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    
    useEffect(() => {
        fetchReports(); // Загрузка списка отчетов (не зависит от фильтров статистики)
    }, [fetchReports]);

    useEffect(() => {
        fetchStatistics(); // Загрузка статистики (зависит от фильтров)
    }, [fetchStatistics]); // fetchStatistics уже содержит нужные зависимости
 
    useEffect(() => {
        fetchReports();
        fetchStatistics();
    }, [fetchReports, fetchStatistics]);

    const handleApplyFilters = () => {
        fetchStatistics(); // Просто перезапускаем загрузку статистики с текущими значениями фильтров
    };

    // Обработчики пагинации
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleResetFilters = () => {
        setStartDate(null);
        setEndDate(null);
        setSelectedCuratorId('');
        // Немедленный вызов fetchStatistics здесь может быть избыточным,
        // так как useEffect [fetchStatistics] среагирует на изменение состояний.
        // Но для явного сброса можно и вызвать, если useEffect не перехватывает пустые значения так, как нужно.
        // По факту, useEffect [fetchStatistics] сам вызовется из-за изменения selectedCuratorId, startDate, endDate
    };
    
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Обработчики удаления
    const handleDeleteClick = (report) => {
        setReportToDelete({ id: report.reportId, title: report.reportTitle });
        setOpenDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
        setReportToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!reportToDelete) return;
        try {
            await deleteCuratorReport(reportToDelete.id);
            setSnackbar({ open: true, message: `Отчет "${reportToDelete.title}" удален`, severity: 'success' });
            // Обновляем список:
            const newTotalItems = totalItems - 1;
            setTotalItems(newTotalItems);
            setReports(prev => prev.filter(r => r.reportId !== reportToDelete.id));
            const newTotalPages = Math.ceil(newTotalItems / rowsPerPage);
            if (page > 0 && page >= newTotalPages) {
                setPage(Math.max(0, newTotalPages - 1));
            }
            handleCloseDeleteDialog();
        } catch (err) {
             const message = err.response?.data?.message || err.message || 'Не удалось удалить отчет';
             setSnackbar({ open: true, message: message, severity: 'error' });
             console.error("Delete report error:", err);
             handleCloseDeleteDialog();
        }
    };

    const handleCloseSnackbar = useCallback((event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                    <Typography variant="h4" component="h1">
                        {user?.role === 'administrator' ? 'Отчеты Кураторов' : 'Мои Отчеты'}
                    </Typography>
                    {(user?.role === 'curator' || user?.role === 'administrator') && (
                        <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/curator-reports/new">
                            Добавить отчет
                        </Button>
                    )}
                </Box>

                {/* Панель Фильтров для Статистики */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Фильтры статистики</Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <DatePicker
                                label="Дата начала"
                                value={startDate}
                                onChange={(newValue) => setStartDate(newValue)}
                                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <DatePicker
                                label="Дата окончания"
                                value={endDate}
                                onChange={(newValue) => setEndDate(newValue)}
                                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                                minDate={startDate || undefined} // Нельзя выбрать дату окончания раньше даты начала
                            />
                        </Grid>
                        {user?.role === 'administrator' && (
                            <Grid item xs={12} sm={6} md={3}>
                                <FormControl fullWidth size="small">
                                    <InputLabel id="curator-select-label">Куратор</InputLabel>
                                    <Select
                                        labelId="curator-select-label"
                                        value={selectedCuratorId}
                                        label="Куратор"
                                        onChange={(e) => setSelectedCuratorId(e.target.value)}
                                    >
                                        <MenuItem value="">
                                            <em>Все кураторы</em>
                                        </MenuItem>
                                        {curators.map((c) => (
                                            <MenuItem key={c.userId} value={c.userId}>{c.fullName}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}
                        <Grid item xs={12} sm={6} md={user?.role === 'administrator' ? 3 : 6} sx={{display: 'flex', gap: 1}}>
                            <Button
                                variant="contained"
                                onClick={handleApplyFilters}
                                startIcon={<FilterListIcon />}
                                sx={{ flexGrow: 1 }}
                            >
                                Применить
                            </Button>
                             <Button
                                variant="outlined"
                                onClick={handleResetFilters}
                                sx={{ flexGrow: 1 }}
                            >
                                Сбросить
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>

            {/* Секция Статистики */}
            <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" gutterBottom component="div" sx={{ mb: 2 }}>
                        Сводная статистика
                    </Typography>
                    {statsError && <Alert severity="error" sx={{ mb: 2 }}>{statsError}</Alert>}
                    
                    <Grid container spacing={1.5} sx={{ mb: 3 }}> {/* Уменьшен spacing */}
                        {/* Основные 9 StatCard: xs={12} sm={6} (2 в ряд на sm и выше) */}
                        <Grid item xs={12} sm={6}> 
                            <StatCard title="Всего отчетов" value={statistics?.totalReports ?? '...'} icon={<AssessmentIcon />} loading={loadingStats} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <StatCard title="Уникальных участников (в отчетах)" value={statistics?.totalUniqueParticipants ?? '...'} icon={<PeopleAltIcon />} loading={loadingStats}/>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <StatCard title="Всего участий студентов (в отчетах)" value={statistics?.totalReportParticipations ?? '...'} icon={<HowToRegIcon />} loading={loadingStats}/>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <StatCard title="Отчетов в этом месяце" value={statistics?.reportsThisMonth ?? '...'} icon={<EventNoteIcon />} loading={loadingStats}/>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                            <StatCard title="Мероприятий с отчетами" value={statistics?.distinctEventsLinkedToReports ?? '...'} icon={<BarChartIcon />} loading={loadingStats}/>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <StatCard title="Иностранные участники" value={statistics?.totalForeignerParticipants ?? '...'} icon={<PublicIcon />} loading={loadingStats}/>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <StatCard title="Несовершеннолетние" value={statistics?.totalMinorParticipants ?? '...'} icon={<ChildCareIcon />} loading={loadingStats}/>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <StatCard 
                                title={getStudentGroupDisplayTitle()} 
                                value={getStudentGroupDisplayValue()} 
                                icon={<GroupsIcon />} 
                                loading={loadingStats || authLoading} 
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}> 
                            <StatCard 
                                title={user?.role === 'administrator' && selectedCuratorId ? "Студентов у куратора" : (user?.role === 'curator' ? "Моих студентов" : "Всего студентов")} 
                                value={statistics?.totalStudentsInFilteredGroups ?? '...'} 
                                icon={<GroupIcon />} 
                                loading={loadingStats} 
                            />
                        </Grid>
                    </Grid>

                    {/* Детализация по категориям мероприятий */}
                    <Typography variant="h6" gutterBottom component="div" sx={{ mt: 3, mb: 1 }}>
                        Детализация по мероприятиям
                    </Typography>
                     <Grid container spacing={1.5}> {/* Уменьшен spacing */}
                        {/* CategoryStatCard: xs={12} sm={6} md={4} (на md и выше - 3 в ряд) */}
                        <Grid item xs={12} sm={6} md={4}>
                            <CategoryStatCard title="По Направлениям" data={statistics?.reportsByDirection} itemNameKey="directionName" itemCountKey="reportCount" icon={<CategoryIcon />} loading={loadingStats} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <CategoryStatCard title="По Уровням" data={statistics?.reportsByLevel} itemNameKey="levelName" itemCountKey="reportCount" icon={<CategoryIcon />} loading={loadingStats} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <CategoryStatCard title="По Форматам" data={statistics?.reportsByFormat} itemNameKey="formatName" itemCountKey="reportCount" icon={<CategoryIcon />} loading={loadingStats} />
                        </Grid>
                    </Grid>
                </Box>
                <Divider sx={{ mb: 3 }} />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {loading && !statsError ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
            ) : !reports.length && !loading ? (
                 <Typography sx={{ textAlign: 'center', p: 3 }}>
                     {user?.role === 'administrator' ? 'Отчеты еще не созданы.' : 'У вас пока нет отчетов.'}
                 </Typography>
            ) : (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 650 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{minWidth: 250}}>Название / Тема</TableCell>
                                    <TableCell>Дата проведения</TableCell>
                                    {user?.role === 'administrator' && <TableCell>Куратор</TableCell>}
                                    <TableCell sx={{minWidth: 150}}>Место проведения</TableCell>
                                    <TableCell align="right">Действия</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reports.map((report) => (
                                    <TableRow hover key={report.reportId}>
                                        <TableCell sx={{maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                            <Tooltip title={report.reportTitle}>
                                                 <RouterLink to={`/curator-reports/${report.reportId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                    {report.reportTitle}
                                                 </RouterLink>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            {report.reportDate ? format(new Date(report.reportDate), 'dd.MM.yyyy', { locale: ru }) : '-'}
                                        </TableCell>
                                        {user?.role === 'administrator' && (
                                            <TableCell>{report.Curator?.fullName || 'N/A'}</TableCell>
                                        )}
                                        <TableCell sx={{maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                            {report.locationText || '-'}
                                         </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Просмотр отчета">
                                                <IconButton size="small" component={RouterLink} to={`/curator-reports/${report.reportId}`}>
                                                    <VisibilityIcon />
                                                </IconButton>
                                            </Tooltip>
                                             {(user?.role === 'administrator' || user?.id === report.curatorUserId) && (
                                                <Tooltip title="Удалить отчет">
                                                     <IconButton size="small" onClick={() => handleDeleteClick(report)} color="error" sx={{ ml: 1 }}>
                                                         <DeleteIcon />
                                                     </IconButton>
                                                 </Tooltip>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[10, 25, 50]}
                        component="div"
                        count={totalItems}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Отчетов на странице:"
                        labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `больше чем ${to}`}`}
                    />
                </Paper>
            )}

             <ConfirmationDialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                title="Удалить отчет?"
                message={`Вы уверены, что хотите удалить отчет "${reportToDelete?.title || ''}"?`}
             />
             <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
            </Container>
        </LocalizationProvider>
    );
}
export default CuratorReportsPage;