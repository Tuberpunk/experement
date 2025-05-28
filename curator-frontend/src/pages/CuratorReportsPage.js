// Полный путь: src/pages/CuratorReportsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Container, Typography, Button, Box, CircularProgress, Alert, Paper, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
    Grid, // Добавлен Grid для статистики
    Snackbar, // Добавлен Snackbar
    Divider // Добавлен Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment'; // Иконка для отчетов/статистики
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'; // Иконка для участников
import EventNoteIcon from '@mui/icons-material/EventNote'; // Иконка для мероприятий

// Контекст и API
import { useAuth } from '../contexts/AuthContext';
import { getCuratorReports, deleteCuratorReport, getCuratorReportsStatistics } from '../api/curatorReports'; // Добавлена getCuratorReportsStatistics
// Вспомогательные компоненты
import ConfirmationDialog from '../components/ConfirmationDialog'; // Диалог подтверждения
// Форматирование даты
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Компонент для отображения одного блока статистики
const StatCard = ({ title, value, icon, loading }) => (
    <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center', height: '100%' }}>
        {icon && <Box sx={{ mr: 2, color: 'primary.main' }}>{React.cloneElement(icon, { fontSize: 'large' })}</Box>}
        <Box>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                {title}
            </Typography>
            <Typography variant="h5" component="div">
                {loading ? <CircularProgress size={24} /> : value}
            </Typography>
        </Box>
    </Paper>
);


function CuratorReportsPage() {
    const { user } = useAuth(); // Получаем текущего пользователя
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true); // Для списка отчетов
    const [loadingStats, setLoadingStats] = useState(true); // Для статистики
    const [error, setError] = useState('');
    const [statsError, setStatsError] = useState(''); // Отдельная ошибка для статистики
    const [page, setPage] = useState(0); // MUI пагинация с 0
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [statistics, setStatistics] = useState(null); // Состояние для статистики

    // Состояние для диалога удаления
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null); // { id, title }
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });


    // Функция загрузки статистики
    const fetchStatistics = useCallback(async () => {
        setLoadingStats(true);
        setStatsError('');
        try {
            const data = await getCuratorReportsStatistics();
            setStatistics(data);
        } catch (err) {
            setStatsError(err.response?.data?.message || err.message || 'Не удалось загрузить статистику');
            console.error("Fetch reports statistics error:", err);
        } finally {
            setLoadingStats(false);
        }
    }, []);

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
        fetchReports();
        fetchStatistics();
    }, [fetchReports, fetchStatistics]);

    // Обработчики пагинации
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
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
         <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <Typography variant="h4" component="h1">
                     {user?.role === 'administrator' ? 'Отчеты Кураторов' : 'Мои Отчеты'}
                 </Typography>
                 {(user?.role === 'curator' || user?.role === 'administrator') && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        component={RouterLink}
                        to="/curator-reports/new"
                    >
                        Добавить отчет
                    </Button>
                 )}
            </Box>

            {/* Секция Статистики */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom component="div" sx={{ mb: 2 }}>
                    Сводная статистика
                </Typography>
                {statsError && <Alert severity="error" sx={{ mb: 2 }}>{statsError}</Alert>}
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="Всего отчетов" value={statistics?.totalReports ?? '...'} icon={<AssessmentIcon />} loading={loadingStats} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="Уникальных участников" value={statistics?.totalUniqueParticipants ?? '...'} icon={<PeopleAltIcon />} loading={loadingStats}/>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="Отчетов в этом месяце" value={statistics?.reportsThisMonth ?? '...'} icon={<EventNoteIcon />} loading={loadingStats}/>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="Мероприятий с отчетами" value={statistics?.distinctEventsLinkedToReports ?? '...'} icon={<EventNoteIcon color="action"/>} loading={loadingStats}/>
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
    );
}

export default CuratorReportsPage;