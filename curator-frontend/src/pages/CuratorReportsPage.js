// Полный путь: src/pages/CuratorReportsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Container, Typography, Button, Box, CircularProgress, Alert, Paper, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
// Контекст и API
import { useAuth } from '../contexts/AuthContext';
import { getCuratorReports, deleteCuratorReport } from '../api/curatorReports'; // Путь к вашим API функциям
// Вспомогательные компоненты
import ConfirmationDialog from '../components/ConfirmationDialog'; // Диалог подтверждения
// Форматирование даты
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

function CuratorReportsPage() {
    const { user } = useAuth(); // Получаем текущего пользователя
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Состояние пагинации
    const [page, setPage] = useState(0); // MUI пагинация с 0
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Состояние для диалога удаления
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null); // { id, title }

    // Функция загрузки отчетов
    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Бэкенд сам фильтрует по роли/ID куратора
            const params = { page: page + 1, limit: rowsPerPage };
            // TODO: Добавить передачу фильтров в params, если они будут
            const data = await getCuratorReports(params);
            setReports(data.reports || []);
            setTotalItems(data.totalItems || 0);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Не удалось загрузить список отчетов');
            console.error("Fetch curator reports error:", err);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]); // Зависимости - пагинация

    // Загружаем отчеты при монтировании и изменении пагинации
    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    // Обработчики пагинации
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0); // Сброс на первую страницу при изменении лимита
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
            // Обновляем список: можно либо вызвать fetchReports(),
            // либо удалить локально, если записей немного
            setReports(prev => prev.filter(r => r.reportId !== reportToDelete.id));
            setTotalItems(prev => prev -1); // Уменьшаем общее кол-во
            // Проверяем, не стала ли текущая страница пустой
            if (reports.length === 1 && page > 0) {
                 setPage(page - 1); // Переход на предыдущую страницу, если удалили последний элемент
            }

            handleCloseDeleteDialog();
            // Можно добавить Snackbar об успехе
        } catch (err) {
             setError(err.response?.data?.message || err.message || 'Не удалось удалить отчет');
             console.error("Delete report error:", err);
             handleCloseDeleteDialog(); // Закрываем диалог даже при ошибке
        }
    };

    return (
         <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1">
                     {/* Заголовок зависит от роли */}
                     {user?.role === 'administrator' ? 'Отчеты Кураторов' : 'Мои Отчеты'}
                 </Typography>
                 {/* Кнопка добавления отчета */}
                 {(user?.role === 'curator' || user?.role === 'administrator') && ( // Показываем и куратору и админу
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        component={RouterLink}
                        to="/curator-reports/new" // Ссылка на форму создания
                    >
                        Добавить отчет
                    </Button>
                 )}
            </Box>

            {/* TODO: Добавить панель фильтров, если необходимо (по дате, куратору для админа) */}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
            ) : !reports.length ? (
                 <Typography sx={{ textAlign: 'center', p: 3 }}>
                     {user?.role === 'administrator' ? 'Отчеты еще не созданы.' : 'У вас пока нет отчетов.'}
                 </Typography>
            ) : (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 650 }}> {/* Ограничиваем высоту для скролла */}
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{minWidth: 250}}>Название / Тема</TableCell>
                                    <TableCell>Дата проведения</TableCell>
                                    {/* Показываем столбец "Куратор" только для админа */}
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
                                                 {/* Делаем название ссылкой на детальную страницу */}
                                                 <RouterLink to={`/curator-reports/${report.reportId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                    {report.reportTitle}
                                                 </RouterLink>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            {/* Форматируем дату */}
                                            {report.reportDate ? format(new Date(report.reportDate), 'dd.MM.yyyy', { locale: ru }) : '-'}
                                        </TableCell>
                                        {/* Отображаем куратора для админа */}
                                        {user?.role === 'administrator' && (
                                            <TableCell>{report.Curator?.fullName || 'N/A'}</TableCell>
                                        )}
                                        <TableCell sx={{maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                            {report.locationText || '-'}
                                         </TableCell>
                                        <TableCell align="right">
                                            {/* Кнопка просмотра */}
                                            <Tooltip title="Просмотр отчета">
                                                <IconButton size="small" component={RouterLink} to={`/curator-reports/${report.reportId}`}>
                                                    <VisibilityIcon />
                                                </IconButton>
                                            </Tooltip>
                                             {/* Кнопка удаления видна админу ИЛИ автору отчета */}
                                             {(user?.role === 'administrator' || user?.id === report.curatorUserId) && (
                                                <Tooltip title="Удалить отчет">
                                                     <IconButton size="small" onClick={() => handleDeleteClick(report)} color="error" sx={{ ml: 1 }}>
                                                         <DeleteIcon />
                                                     </IconButton>
                                                 </Tooltip>
                                            )}
                                             {/* TODO: Добавить кнопку редактирования (ссылка на /curator-reports/:id/edit), если нужно */}
                                             {/* {(user?.role === 'administrator' || user?.id === report.curatorUserId) && ( <Tooltip title="Редактировать"><IconButton>...</IconButton></Tooltip> )} */}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {/* Пагинация */}
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

             {/* Диалог подтверждения удаления */}
             <ConfirmationDialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                title="Удалить отчет?"
                message={`Вы уверены, что хотите удалить отчет "${reportToDelete?.title || ''}"?`}
             />
         </Container>
    );
}

export default CuratorReportsPage;