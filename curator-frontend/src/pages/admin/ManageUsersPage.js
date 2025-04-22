// Полный путь: src/pages/admin/ManageUsersPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom'; // Для возможных ссылок
import {
    Container, Typography, Box, CircularProgress, Alert, Paper, IconButton, Tooltip, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Switch // Switch для статуса
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import EditIcon from '@mui/icons-material/Edit'; // Для будущих действий
import DeleteIcon from '@mui/icons-material/Delete'; // Для будущих действий
import { useAuth } from '../../contexts/AuthContext'; // Для проверки роли, если нужно
 // Импорт API функции
// import ConfirmationDialog from '../../components/ConfirmationDialog'; // Если будет удаление
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getUsers } from '../../api/users';

// Вспомогательная функция для отображения роли (можно вынести в utils)
const RoleChip = ({ roleName }) => {
    let color = 'default';
    let icon = null;
    let label = roleName;

    if (roleName === 'administrator') {
        color = 'warning';
        icon = <AdminPanelSettingsIcon fontSize="small" />;
        label = 'Администратор';
    } else if (roleName === 'curator') {
        color = 'info';
        icon = <SupervisorAccountIcon fontSize="small" />;
        label = 'Куратор';
    }
    // Добавить другие роли при необходимости

    return <Chip icon={icon} label={label} color={color} size="small" variant="outlined" />;
};


function ManageUsersPage() {
    const { user } = useAuth(); // Текущий пользователь (админ)
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Пагинация
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [totalItems, setTotalItems] = useState(0);

    // TODO: Добавить состояние для фильтров, если нужно

    // Загрузка пользователей
    const fetchUsers = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = { page: page + 1, limit: rowsPerPage };
            // TODO: Добавить фильтры (по имени, email, роли, статусу...)
            const data = await getUsers(params); // Вызываем API getUsers
            setUsers(data.users || []);
            setTotalItems(data.totalItems || 0);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Не удалось загрузить список пользователей');
            console.error("Fetch users error:", err);
        } finally { setLoading(false); }
    }, [page, rowsPerPage]); // Зависимости пагинации и фильтров

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Обработчики пагинации
    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // TODO: Обработчики для редактирования статуса, роли, удаления...

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1"> Управление Пользователями </Typography>
                {/* TODO: Кнопка "Добавить пользователя", если админ может их создавать */}
                {/* <Button variant="contained" startIcon={<AddIcon />}> Добавить </Button> */}
            </Box>

            {/* TODO: Панель фильтров */}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? ( <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
            ) : !users.length ? ( <Typography sx={{ textAlign: 'center', p: 3 }}>Пользователи не найдены.</Typography>
            ) : (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 650 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
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
                                {users.map((u) => (
                                    <TableRow hover key={u.userId}>
                                        <TableCell>{u.userId}</TableCell>
                                        <TableCell>{u.fullName}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell><RoleChip roleName={u.Role?.roleName} /></TableCell>
                                        <TableCell>{u.position || '-'}</TableCell>
                                        <TableCell>{u.department || '-'}</TableCell>
                                        <TableCell>
                                            <Tooltip title={u.isActive ? 'Активен' : 'Неактивен'}>
                                                 {/* TODO: Сделать Switch для изменения статуса? */}
                                                 {u.isActive
                                                     ? <CheckCircleIcon color="success" fontSize="small"/>
                                                     : <CancelIcon color="action" fontSize="small"/>}
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>{u.createdAt ? format(new Date(u.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru }) : '-'}</TableCell>
                                        <TableCell align="right">
                                             {/* TODO: Добавить кнопки действий (Редактировать роль/статус, Удалить) */}
                                            <Tooltip title="Редактировать (не реализовано)">
                                                <span> {/* Обертка для disabled IconButton */}
                                                     <IconButton size="small" sx={{ ml: 1 }} disabled>
                                                         <EditIcon />
                                                     </IconButton>
                                                 </span>
                                             </Tooltip>
                                             <Tooltip title="Удалить (не реализовано)">
                                                  <span>
                                                     <IconButton size="small" color="error" sx={{ ml: 1 }} disabled>
                                                         <DeleteIcon />
                                                     </IconButton>
                                                  </span>
                                             </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[15, 30, 50, 100]} component="div" count={totalItems}
                        rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Пользователей на странице:" labelDisplayedRows={({ from, to, count }) => `<span class="math-inline">\{from\}–</span>{to} из ${count !== -1 ? count : `больше чем ${to}`}`}
                    />
                </Paper>
            )}
            {/* TODO: ConfirmationDialog для удаления */}
        </Container>
    );
}

export default ManageUsersPage;