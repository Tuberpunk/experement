// Полный путь: src/pages/StudentGroupsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom'; // Добавлен useNavigate
import {
    Container, Typography, Button, Box, CircularProgress, Alert, Paper, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
    Menu, MenuItem, ListItemIcon, ListItemText, Divider, Snackbar // Добавлены Menu, MenuItem и т.д.
} from '@mui/material';
// Иконки MUI
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MoreVertIcon from '@mui/icons-material/MoreVert'; // Иконка для меню "три точки"
// Контекст, API, Компоненты
import { useAuth } from '../contexts/AuthContext'; // Убедитесь, что путь правильный
import { getGroups, deleteGroup } from '../api/studentGroups'; // Убедитесь, что путь правильный
import ConfirmationDialog from '../components/ConfirmationDialog'; // Убедитесь, что путь правильный
// Форматирование даты (если понадобится для createdAt/updatedAt группы)
// import { format } from 'date-fns';
// import { ru } from 'date-fns/locale';

function StudentGroupsPage() {
    const { user } = useAuth(); // Получаем текущего пользователя для проверки роли
    const navigate = useNavigate(); // Для навигации
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Состояние пагинации
    const [page, setPage] = useState(0); // MUI пагинация начинается с 0
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Состояние для меню действий
    const [anchorEl, setAnchorEl] = useState(null);
    const [currentGroupForMenu, setCurrentGroupForMenu] = useState(null);
    const openMenu = Boolean(anchorEl);

    // Состояние для диалога удаления
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null); // { id, name }

    // Состояние для Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });


    // --- Функция загрузки групп ---
    const fetchGroups = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Бэкенд фильтрует по роли/ID куратора
            const params = {
                page: page + 1, // API ожидает нумерацию с 1
                limit: rowsPerPage,
                // TODO: Добавить параметры фильтрации, если они будут реализованы
                // groupName: filters.groupName, faculty: filters.faculty, ...
            };
            const data = await getGroups(params);
            setGroups(data.groups || []);
            setTotalItems(data.totalItems || 0);
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Не удалось загрузить список групп';
            if (err.response?.status !== 401 && err.response?.status !== 403) {
                setError(message);
            }
            console.error("Fetch groups error:", err);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]); // Зависимости: пагинация (добавить фильтры, если будут)

    // Загрузка данных при монтировании и при смене страницы/лимита
    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    // --- Обработчики ---
    // Пагинация
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0); // Сброс на первую страницу
    };

    // Меню действий
    const handleMenuOpen = (event, group) => {
        setAnchorEl(event.currentTarget);
        setCurrentGroupForMenu(group);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
        // setCurrentGroupForMenu(null); // Можно сбросить здесь, но обычно при выборе пункта
    };

    // Удаление
    const handleDeleteClick = (groupForAction) => {
        const targetGroup = groupForAction || currentGroupForMenu;
        if (!targetGroup) return;
        handleMenuClose(); // Закрываем меню, если было открыто
        setGroupToDelete({ id: targetGroup.groupId, name: targetGroup.groupName });
        setOpenDeleteDialog(true);
    };
    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
        setGroupToDelete(null);
    };
    const handleConfirmDelete = async () => {
        if (!groupToDelete) return;
        try {
            await deleteGroup(groupToDelete.id); // Вызов API
            setSnackbar({ open: true, message: 'Группа удалена', severity: 'success' });
            // Обновляем список
            const newTotalItems = totalItems - 1;
            const newTotalPages = Math.ceil(newTotalItems / rowsPerPage);
            setTotalItems(newTotalItems);
            setGroups(prev => prev.filter(g => g.groupId !== groupToDelete.id));
            if (page > 0 && page >= newTotalPages) {
                setPage(Math.max(0, newTotalPages - 1));
            }
            handleCloseDeleteDialog();
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Не удалось удалить группу';
            setSnackbar({ open: true, message: message, severity: 'error' });
            console.error("Delete group error:", err);
            handleCloseDeleteDialog();
        }
    };

    // Закрытие Snackbar
    const handleCloseSnackbar = useCallback((event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);


    // --- Рендеринг ---
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h4" component="h1">
                    Учебные группы
                </Typography>
                {/* Кнопка добавления видна только админу */}
                {user?.role === 'administrator' && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        component={RouterLink}
                        to="/groups/new" // Ссылка на форму создания группы
                    >
                        Добавить группу
                    </Button>
                )}
            </Box>

            {/* TODO: Добавить панель фильтров (по названию, факультету, куратору) */}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
            ) : !groups.length ? (
                 <Typography sx={{ textAlign: 'center', p: 3 }}>
                     {user?.role === 'administrator' ? 'Группы еще не добавлены.' : 'Вам не назначены группы, или они пока не созданы.'}
                 </Typography>
            ) : (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 650 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Название группы</TableCell>
                                    <TableCell>Факультет/Институт</TableCell>
                                    <TableCell>Год поступления</TableCell>
                                    <TableCell>Куратор</TableCell>
                                    <TableCell>Кол-во студентов</TableCell> {/* Добавим позже, если нужно */}
                                    <TableCell align="right">Действия</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {groups.map((group) => (
                                    <TableRow hover key={group.groupId} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell component="th" scope="row">
                                            {/* Делаем название ссылкой на детальную страницу */}
                                            <RouterLink to={`/groups/${group.groupId}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 500 }}>
                                                {group.groupName}
                                            </RouterLink>
                                        </TableCell>
                                        <TableCell>{group.faculty || '-'}</TableCell>
                                        <TableCell>{group.admissionYear || '-'}</TableCell>
                                        <TableCell>{group.Curator?.fullName || 'Не назначен'}</TableCell>
                                        <TableCell>{group.Students?.length || 0}</TableCell> {/* Отобразит кол-во, если Students включены в include */}
                                        <TableCell align="right">
                                            <Tooltip title="Просмотр">
                                                <IconButton size="small" component={RouterLink} to={`/groups/${group.groupId}`}>
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {/* Меню действий (три точки) видно админу (и куратору для своей группы, если разрешить) */}
                                            {/* Пока оставим действия только для админа */}
                                            {user?.role === 'administrator' && (
                                                <Tooltip title="Действия">
                                                    <IconButton
                                                        size="small" sx={{ ml: 0.5 }}
                                                        onClick={(e) => handleMenuOpen(e, group)}
                                                        aria-controls={openMenu && currentGroupForMenu?.groupId === group.groupId ? `actions-menu-group-${group.groupId}` : undefined}
                                                        aria-haspopup="true"
                                                        aria-expanded={openMenu && currentGroupForMenu?.groupId === group.groupId ? 'true' : undefined}
                                                    >
                                                        <MoreVertIcon fontSize="small"/>
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
                        labelRowsPerPage="Групп на странице:"
                        labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `больше чем ${to}`}`}
                    />
                </Paper>
            )}

             {/* Меню действий для строки таблицы */}
             <Menu
                id="actions-menu-group"
                anchorEl={anchorEl}
                open={openMenu && !!currentGroupForMenu}
                onClose={handleMenuClose}
                MenuListProps={{ 'aria-labelledby': 'actions-group-button' }}
                PaperProps={{ style: { minWidth: '180px' } }}
            >
                {currentGroupForMenu && user?.role === 'administrator' && [ // Пункты для администратора
                        <MenuItem key="edit-group" component={RouterLink} to={`/groups/${currentGroupForMenu.groupId}/edit`} onClick={handleMenuClose}>
                            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                            <ListItemText>Редактировать</ListItemText>
                        </MenuItem>,
                        <Divider key="divider-group" />,
                        <MenuItem key="delete-group" onClick={() => handleDeleteClick(null)} sx={{ color: 'error.main' }}>
                            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                            <ListItemText>Удалить</ListItemText>
                        </MenuItem>
                    ].filter(Boolean)
                }
                {/* TODO: Добавить действия для куратора, если он может редактировать свою группу */}
            </Menu>

            {/* Диалог подтверждения удаления */}
            <ConfirmationDialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                title="Удалить группу?"
                message={`Вы уверены, что хотите удалить группу "${groupToDelete?.name || ''}"? Все связанные студенты также могут быть удалены или откреплены (в зависимости от настроек БД)!`}
            />
            {/* Snackbar для уведомлений */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
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

export default StudentGroupsPage;