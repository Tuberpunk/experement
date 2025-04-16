// src/pages/StudentGroupsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Button, Box, CircularProgress, Alert, Paper, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '../contexts/AuthContext';
import { getGroups, deleteGroup } from '../api/studentGroups';
import ConfirmationDialog from '../components/ConfirmationDialog'; // Используем диалог подтверждения

function StudentGroupsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Состояние для диалога удаления
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null); // { id, name }

    const fetchGroups = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = { page: page + 1, limit: rowsPerPage };
            // TODO: Добавить передачу фильтров в params, если они реализованы
            const data = await getGroups(params);
            setGroups(data.groups || []);
            setTotalItems(data.totalItems || 0);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Не удалось загрузить список групп');
            console.error("Fetch groups error:", err);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    // Пагинация
    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Удаление
    const handleDeleteClick = (group) => {
        setGroupToDelete({ id: group.groupId, name: group.groupName });
        setOpenDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
        setGroupToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!groupToDelete) return;
        try {
            await deleteGroup(groupToDelete.id);
            // Обновляем список после удаления
            fetchGroups();
            handleCloseDeleteDialog();
            // Можно добавить Snackbar об успехе
        } catch (err) {
             setError(err.response?.data?.message || err.message || 'Не удалось удалить группу');
             console.error("Delete group error:", err);
             handleCloseDeleteDialog(); // Закрываем диалог даже при ошибке
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1">
                    Учебные группы
                </Typography>
                {/* Кнопка добавления видна только админу */}
                {user?.role === 'administrator' && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        component={RouterLink}
                        to="/groups/new"
                    >
                        Добавить группу
                    </Button>
                )}
            </Box>

            {/* TODO: Добавить панель фильтров, если нужно */}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
            ) : !groups.length ? (
                 <Typography sx={{ textAlign: 'center', p: 3 }}>Группы не найдены.</Typography>
            ) : (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer>
                        <Table stickyHeader aria-label="Таблица учебных групп">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Название группы</TableCell>
                                    <TableCell>Факультет</TableCell>
                                    <TableCell>Год поступления</TableCell>
                                    <TableCell>Куратор</TableCell>
                                    <TableCell align="right">Действия</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {groups.map((group) => (
                                    <TableRow hover key={group.groupId}>
                                        <TableCell>{group.groupName}</TableCell>
                                        <TableCell>{group.faculty || '-'}</TableCell>
                                        <TableCell>{group.admissionYear || '-'}</TableCell>
                                        <TableCell>{group.Curator?.fullName || 'Не назначен'}</TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Просмотр">
                                                <IconButton size="small" component={RouterLink} to={`/groups/${group.groupId}`}>
                                                    <VisibilityIcon />
                                                </IconButton>
                                            </Tooltip>
                                             {/* Кнопки редактирования и удаления видны только админу */}
                                             {user?.role === 'administrator' && (
                                                 <>
                                                    <Tooltip title="Редактировать">
                                                        <IconButton size="small" component={RouterLink} to={`/groups/${group.groupId}/edit`} sx={{ ml: 1 }}>
                                                            <EditIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Удалить">
                                                         <IconButton size="small" onClick={() => handleDeleteClick(group)} color="error" sx={{ ml: 1 }}>
                                                             <DeleteIcon />
                                                         </IconButton>
                                                     </Tooltip>
                                                </>
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
                        labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `больше чем ${to}`}`}
                    />
                </Paper>
            )}
             {/* Диалог подтверждения удаления */}
             <ConfirmationDialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                title="Удалить группу?"
                message={`Вы уверены, что хотите удалить группу "${groupToDelete?.name || ''}"? Все связанные студенты также будут удалены (если настроено каскадное удаление)!`}
            />
        </Container>
    );
}

export default StudentGroupsPage;