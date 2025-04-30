// Полный путь: src/pages/admin/ManageUsersPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Container, Typography, Box, CircularProgress, Alert, Paper, IconButton, Tooltip, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Switch, Modal, Snackbar // Добавили Modal, Snackbar
} from '@mui/material';
// Иконки
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
// Контекст, API, Компоненты
import { useAuth } from '../../contexts/AuthContext';
import { getUsers, deleteUser } from '../../api/users'; // Добавили deleteUser
import ConfirmationDialog from '../../components/ConfirmationDialog';
import UserEditForm from '../../components/admin/UserEditForm'; // Импорт формы редактирования
// Форматирование даты
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Стили для модального окна (как в DocumentsPage)
const modalStyle = {
  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: '80%', md: '60%', lg: '50%' }, maxWidth: '600px',
  bgcolor: 'background.paper', border: '1px solid #ccc', boxShadow: 24, p: 4, borderRadius: 2,
  maxHeight: '90vh', overflowY: 'auto'
};

// Вспомогательный компонент RoleChip (можно вынести)
const RoleChip = ({ roleName }) => { /* ... как было ... */ };

function ManageUsersPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [totalItems, setTotalItems] = useState(0);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    // Состояния для модальных окон
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    // Загрузка пользователей
    const fetchUsers = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = { page: page + 1, limit: rowsPerPage };
            // TODO: Фильтры
            const data = await getUsers(params);
            setUsers(data.users || []);
            setTotalItems(data.totalItems || 0);
        } catch (err) { /* ... обработка ошибки ... */ }
        finally { setLoading(false); }
    }, [page, rowsPerPage]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Пагинация
    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => { /* ... */ };

    // --- Редактирование ---
    const handleEditClick = (userToEditData) => {
        setUserToEdit(userToEditData); // Передаем данные пользователя в форму
        setEditModalOpen(true); // Открываем модальное окно
    };
    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setUserToEdit(null); // Сбрасываем пользователя
    };
    const handleEditSuccess = () => {
        fetchUsers(); // Перезагружаем список после успешного редактирования
        setSnackbar({ open: true, message: 'Данные пользователя обновлены', severity: 'success' });
        // handleCloseEditModal() вызовется из формы
    };

    // --- Удаление ---
    const handleDeleteClick = (userToDeleteData) => {
        setUserToDelete({ userId: userToDeleteData.userId, fullName: userToDeleteData.fullName });
        setDeleteDialogOpen(true);
    };
    const handleCloseDeleteDialog = () => { setDeleteDialogOpen(false); setUserToDelete(null); };
    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        setError(''); // Сброс ошибки
        try {
            await deleteUser(userToDelete.userId); // Вызов API удаления
            setSnackbar({ open: true, message: `Пользователь ${userToDelete.fullName} удален`, severity: 'success' });
            // Обновляем список и пагинацию
            const newTotalItems = totalItems - 1;
            setTotalItems(newTotalItems);
            setUsers(prev => prev.filter(u => u.userId !== userToDelete.userId));
            const newTotalPages = Math.ceil(newTotalItems / rowsPerPage);
            if (page > 0 && page >= newTotalPages) { setPage(Math.max(0, newTotalPages - 1)); }

            handleCloseDeleteDialog();
        } catch (err) {
             const message = err.response?.data?.message || err.message || 'Не удалось удалить пользователя';
             setSnackbar({ open: true, message: message, severity: 'error' }); // Показываем ошибку в Snackbar
             console.error("Delete user error:", err);
             handleCloseDeleteDialog();
        }
    };

    // Закрытие Snackbar
    const handleCloseSnackbar = useCallback((event, reason) => { /* ... */ }, []);

    return (
         <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* ... Заголовок ... */}
            {/* ... Фильтры ... */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Условный рендеринг: Загрузка / Нет данных / Таблица */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                </Box>
            ) : !users.length ? (
                <Typography sx={{ textAlign: 'center', p: 3 }}>
                    Пользователи не найдены.
                </Typography>
            ) : (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 650 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                {/* ... Заголовки таблицы ... */}
                                <TableRow>
                                    <TableCell>ID</TableCell>
                                    <TableCell>ФИО</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Роль</TableCell>
                                    <TableCell>Должность</TableCell>
                                    <TableCell>Подразделение</TableCell>
                                    <TableCell>Статус</TableCell>
                                    <TableCell>Дата регистрации</TableCell>
                                    <TableCell align="right">Действия</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {/* ... Маппинг users и рендеринг TableRow ... */}
                                {users.map((u) => (
                                     <TableRow hover key={u.userId}>
                                        {/* ... Ячейки с данными ... */}
                                        <TableCell>{u.userId}</TableCell>
                                        <TableCell>{u.fullName}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell><RoleChip roleName={u.Role?.roleName} /></TableCell>
                                        <TableCell>{u.position || '-'}</TableCell>
                                        <TableCell>{u.department || '-'}</TableCell>
                                        <TableCell> <Tooltip title={u.isActive ? 'Активен' : 'Неактивен'}><span>{u.isActive ? <CheckCircleIcon color="success" fontSize="small"/> : <CancelIcon color="action" fontSize="small"/>}</span></Tooltip> </TableCell>
                                        <TableCell>{u.createdAt ? format(new Date(u.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru }) : '-'}</TableCell>
                                         <TableCell align="right">
                                              <Tooltip title="Редактировать">
                                                  <IconButton size="small" sx={{ ml: 1 }} onClick={() => handleEditClick(u)}>
                                                      <EditIcon fontSize="small"/>
                                                  </IconButton>
                                              </Tooltip>
                                               <Tooltip title={u.userId === user.id ? "Нельзя удалить себя" : "Удалить"}>
                                                   <span> {/* Обертка для disabled IconButton */}
                                                      <IconButton size="small" color="error" sx={{ ml: 1 }} onClick={() => handleDeleteClick(u)} disabled={u.userId === user.id}>
                                                          <DeleteIcon fontSize="small"/>
                                                      </IconButton>
                                                   </span>
                                               </Tooltip>
                                         </TableCell>
                                     </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {/* ... Пагинация ... */}
                    <TablePagination
                         rowsPerPageOptions={[15, 30, 50, 100]} component="div" count={totalItems}
                         rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage}
                         labelRowsPerPage="Пользователей на странице:" labelDisplayedRows={({ from, to, count }) => `<span class="math-inline">\{from\}–</span>{to} из ${count !== -1 ? count : `больше чем ${to}`}`}
                    />
                </Paper>
            )}

            {/* Модальное окно редактирования */}
             <Modal open={editModalOpen} onClose={handleCloseEditModal} aria-labelledby="edit-user-modal-title">
                <Box sx={modalStyle}>
                     <Typography id="edit-user-modal-title" variant="h6" component="h2" sx={{mb: 2}}>
                         Редактировать пользователя
                     </Typography>
                     {/* Рендерим форму только если есть userToEdit */}
                     {userToEdit && (
                         <UserEditForm
                            userToEdit={userToEdit}
                            onSuccess={handleEditSuccess}
                            onClose={handleCloseEditModal}
                         />
                     )}
                 </Box>
             </Modal>

             {/* Диалог подтверждения удаления */}
             <ConfirmationDialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} onConfirm={handleConfirmDelete} title="Удалить пользователя?" message={`Вы уверены, что хотите удалить пользователя "${userToDelete?.fullName || ''}"? Это действие необратимо.`} />
             {/* Snackbar */}
             <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}><Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert></Snackbar>
         </Container>
    );
}

export default ManageUsersPage;