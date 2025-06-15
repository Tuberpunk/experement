// Полный путь: src/pages/CuratorReportsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Container, Typography, Button, Box, CircularProgress, Alert, Paper, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
    Grid, Snackbar, Divider, List, ListItem, ListItemText, Chip,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import FilterListIcon from '@mui/icons-material/FilterList';
import GroupIcon from '@mui/icons-material/Group';
import GroupsIcon from '@mui/icons-material/Groups';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CategoryIcon from '@mui/icons-material/Category';
import BarChartIcon from '@mui/icons-material/BarChart';
import DownloadIcon from '@mui/icons-material/Download';

import { useAuth } from '../contexts/AuthContext';
import { getCuratorReports, deleteCuratorReport, getCuratorReportsStatistics } from '../api/curatorReports';
import { getUsers } from '../api/users';
import FinalReportDialog from '../components/FinalReportDialog';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { format, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';

// Компонент для отображения одного блока статистики
const StatCard = ({ title, value, icon, loading }) => (
    <Paper 
        elevation={2} 
        sx={{ 
            p: 1.25,
            display: 'flex', 
            alignItems: 'center', 
            height: '100%',
            minHeight: '70px'
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
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2 
                }}
            >
                {loading ? <CircularProgress size={20} /> : value}
            </Typography>
        </Box>
    </Paper>
);

// Компонент для отображения статистики по категориям
const CategoryStatCard = ({ title, data, itemNameKey, itemCountKey, icon, loading }) => (
    <Grid item xs={12} sm={6} md={4}>
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
    const { user, loading: authLoading } = useAuth();
    
    // Состояния для данных
    const [reports, setReports] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [curators, setCurators] = useState([]);
    
    // Единые состояния для загрузки и ошибок
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState('');
    
    // Состояния для фильтров
    const [filters, setFilters] = useState({
        startDate: null,
        endDate: null,
        selectedCuratorId: ''
    });

    // Состояния для пагинации
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Состояния для диалогов
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [isReportDialogOpen, setReportDialogOpen] = useState(false);

    // Вспомогательные функции для отображения
    const getStudentGroupDisplayValue = () => {
        if (loadingData || !statistics || !statistics.studentGroupInfo) {
            return '...';
        }
        const { type, value } = statistics.studentGroupInfo;
        return type === 'name' ? value : `${value}`;
    };

    const getStudentGroupDisplayTitle = () => {
        if (authLoading || !statistics || !statistics.studentGroupInfo) {
            return "Группа";
        }
        const { type } = statistics.studentGroupInfo;
        if (type === 'name') {
            return (user?.role === 'administrator' && filters.selectedCuratorId) ? "Группа" : "Моя группа";
        }
        if (user?.role === 'administrator' && filters.selectedCuratorId) {
            return "Групп у куратора";
        }
        if (user?.role === 'curator') {
            return "Моих групп";
        }
        return "Всего групп";
    };

    // Загрузка списка кураторов
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
    
    // Единая функция для загрузки всех данных страницы
    const fetchData = useCallback(async () => {
        setLoadingData(true);
        setError('');

        const params = {
            page: page + 1,
            limit: rowsPerPage,
            curatorId: filters.selectedCuratorId || undefined,
            startDate: filters.startDate && isValid(filters.startDate) ? format(filters.startDate, 'yyyy-MM-dd') : undefined,
            endDate: filters.endDate && isValid(filters.endDate) ? format(filters.endDate, 'yyyy-MM-dd') : undefined,
        };

        try {
            const [reportsData, statsData] = await Promise.all([
                getCuratorReports(params),
                getCuratorReportsStatistics(params)
            ]);
            setReports(reportsData.reports || []);
            setTotalItems(reportsData.totalItems || 0);
            setStatistics(statsData);
        } catch (err) {
            console.error("Failed to fetch data:", err);
            setError('Не удалось загрузить данные. Пожалуйста, попробуйте обновить страницу.');
        } finally {
            setLoadingData(false);
        }
    }, [page, rowsPerPage, filters]);

    // Основной хук для вызова загрузки данных
    useEffect(() => {
        if (!authLoading) {
            fetchData();
        }
    }, [authLoading, fetchData]);

    // Обработчики
    const handleFilterChange = (field, value) => {
        // При изменении фильтра сбрасываем на первую страницу
        setPage(0);
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleResetFilters = () => {
        setFilters({ startDate: null, endDate: null, selectedCuratorId: '' });
        setPage(0);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };
    
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleDeleteClick = (report) => {
        const title = report.RelatedEvent?.title ?? report.reportTitle ?? '';
        setReportToDelete({ id: report.reportId, title });
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
            fetchData(); // Перезагружаем все данные после удаления
            handleCloseDeleteDialog();
        } catch (err) {
             const message = err.response?.data?.message || 'Не удалось удалить отчет';
             setSnackbar({ open: true, message: message, severity: 'error' });
             handleCloseDeleteDialog();
        }
    };

    const handleCloseSnackbar = useCallback((event, reason) => { 
        if (reason === 'clickaway') { return; } 
        setSnackbar(prev => ({ ...prev, open: false })); 
    }, []);

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h4" component="h1">
                        {user?.role === 'administrator' ? 'Отчеты Кураторов' : 'Мои Отчеты'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button 
                            variant="outlined" 
                            startIcon={<DownloadIcon />}
                            onClick={() => setReportDialogOpen(true)}
                        >
                            Сформировать отчет
                        </Button>
                        <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/curator-reports/new">
                            Добавить отчет
                        </Button>
                    </Box>
                </Box>

                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Фильтры</Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <DatePicker
                                label="Дата начала"
                                value={filters.startDate}
                                onChange={(newValue) => handleFilterChange('startDate', newValue)}
                                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <DatePicker
                                label="Дата окончания"
                                value={filters.endDate}
                                onChange={(newValue) => handleFilterChange('endDate', newValue)}
                                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                                minDate={filters.startDate || undefined}
                            />
                        </Grid>
                        {user?.role === 'administrator' && (
                            <Grid item xs={12} sm={6} md={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Куратор</InputLabel>
                                    <Select
                                        value={filters.selectedCuratorId}
                                        label="Куратор"
                                        onChange={(e) => handleFilterChange('selectedCuratorId', e.target.value)}
                                    >
                                        <MenuItem value=""><em>Все кураторы</em></MenuItem>
                                        {curators.map((c) => (
                                            <MenuItem key={c.userId} value={c.userId}>{c.fullName}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}
                        <Grid item xs={12} sm={6} md>
                             <Button
                                variant="outlined"
                                onClick={handleResetFilters}
                                fullWidth
                            >
                                Сбросить
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {loadingData ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress size={40} /></Box>
                ) : (
                    <>
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h5" gutterBottom component="div" sx={{ mb: 2 }}>
                                Сводная статистика
                            </Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={12} sm={6} md={4} lg={3}> 
                                    <StatCard title="Всего отчетов" value={statistics?.totalReports ?? '...'} icon={<AssessmentIcon />} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={4} lg={3}>
                                    <StatCard title="Уникальных участников" value={statistics?.totalUniqueParticipants ?? '...'} icon={<PeopleAltIcon />} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={4} lg={3}>
                                    <StatCard title="Всего участий" value={statistics?.totalReportParticipations ?? '...'} icon={<HowToRegIcon />} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={4} lg={3}>
                                    <StatCard 
                                        title={getStudentGroupDisplayTitle()} 
                                        value={getStudentGroupDisplayValue()} 
                                        icon={<GroupsIcon />} 
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={4} lg={3}> 
                                    <StatCard 
                                        title={user?.role === 'administrator' && filters.selectedCuratorId ? "Студентов у куратора" : (user?.role === 'curator' ? "Моих студентов" : "Всего студентов")} 
                                        value={statistics?.totalStudentsInFilteredGroups ?? '...'} 
                                        icon={<GroupIcon />}
                                    />
                                </Grid>
                            </Grid>
                            <Typography variant="h6" gutterBottom component="div" sx={{ mt: 3, mb: 1 }}>
                                Детализация по мероприятиям
                            </Typography>
                            <Grid container spacing={2}>
                                <CategoryStatCard title="По Направлениям" data={statistics?.reportsByDirection} itemNameKey="directionName" itemCountKey="reportCount" icon={<CategoryIcon />} />
                                <CategoryStatCard title="По Уровням" data={statistics?.reportsByLevel} itemNameKey="levelName" itemCountKey="reportCount" icon={<CategoryIcon />} />
                                <CategoryStatCard title="По Форматам" data={statistics?.reportsByFormat} itemNameKey="formatName" itemCountKey="reportCount" icon={<CategoryIcon />} />
                            </Grid>
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        {!reports.length ? (
                             <Typography sx={{ textAlign: 'center', p: 3 }}>
                                 Нет отчетов, соответствующих вашим фильтрам.
                             </Typography>
                        ) : (
                            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                                <TableContainer sx={{ maxHeight: 650 }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{minWidth: 200}}>Название / Тема</TableCell>
                                                <TableCell>Дата проведения</TableCell>
                                                <TableCell sx={{minWidth: 150}}>Направление</TableCell>
                                                <TableCell sx={{minWidth: 150}}>Место проведения</TableCell>
                                                {user?.role === 'administrator' && <TableCell>Куратор</TableCell>}
                                                <TableCell align="right">Действия</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {reports.map((report) => {
                                                const title = report.RelatedEvent?.title ?? report.reportTitle ?? 'Без названия';
                                                const location = report.RelatedEvent?.locationText ?? report.locationText ?? '-';
                                                const direction = report.RelatedEvent?.Direction?.name ?? report.directionText ?? '-';
                                                
                                                return (
                                                    <TableRow hover key={report.reportId}>
                                                        <TableCell sx={{maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                                            <Tooltip title={title}>
                                                                 <RouterLink to={`/curator-reports/${report.reportId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                                    {title}
                                                                 </RouterLink>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell>
                                                            {report.reportDate ? format(new Date(report.reportDate), 'dd.MM.yyyy', { locale: ru }) : '-'}
                                                        </TableCell>
                                                        <TableCell sx={{maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                                            <Chip label={direction} size="small" />
                                                        </TableCell>
                                                        <TableCell sx={{maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                                            {location}
                                                        </TableCell>
                                                        {user?.role === 'administrator' && (
                                                            <TableCell>{report.Curator?.fullName || 'N/A'}</TableCell>
                                                        )}
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
                                                );
                                            })}
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
                    </>
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

                {isReportDialogOpen && (
                    <FinalReportDialog
                        open={isReportDialogOpen}
                        onClose={() => setReportDialogOpen(false)}
                        forCuratorId={user?.role === 'administrator' ? filters.selectedCuratorId : undefined}
                    />
                )} 
            </Container>
        </LocalizationProvider>
    );
}

export default CuratorReportsPage;