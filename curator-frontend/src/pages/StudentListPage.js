// src/pages/StudentListPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Container, Typography, Button, Box, CircularProgress, Alert, Paper, IconButton, Tooltip, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
    Grid, TextField, Select, MenuItem, FormControl, InputLabel // Для фильтров
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // Для статуса
import CancelIcon from '@mui/icons-material/Cancel'; // Для статуса
import { useAuth } from '../contexts/AuthContext';
import { getStudents, deleteStudent } from '../api/students';
import { getGroups } from '../api/studentGroups'; // Для фильтра
import { getStudentTags } from '../api/lookups'; // Для фильтра
import ConfirmationDialog from '../components/ConfirmationDialog';

function StudentListPage() {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [totalItems, setTotalItems] = useState(0);

    // Фильтры и справочники для них
    const [filters, setFilters] = useState({ fullName: '', groupId: '', tagId: '', isActive: '' });
    const [groupsList, setGroupsList] = useState([]);
    const [tagsList, setTagsList] = useState([]);

    // Диалог удаления
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);

    // Загрузка справочников для фильтров
    const loadLookups = useCallback(async () => {
         try {
            const [groupsData, tagsData] = await Promise.all([
                getGroups({ limit: 1000 }), // Загружаем все группы для фильтра
                getStudentTags()
            ]);
             setGroupsList(groupsData.groups || []);
             setTagsList(tagsData || []);
         } catch (err) {
             console.error("Failed to load lookups for filters:", err);
             // Можно показать некритичную ошибку
         }
    }, []);

    // Загрузка студентов
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = {
                page: page + 1,
                limit: rowsPerPage,
                ...(filters.fullName && { fullName: filters.fullName }),
                ...(filters.groupId && { groupId: filters.groupId }),
                ...(filters.tagId && { tagId: filters.tagId }),
                ...(filters.isActive !== '' && { isActive: filters.isActive === 'true' }), // Преобразуем строку в boolean
            };
            const data = await getStudents(params);
            setStudents(data.students || []);
            setTotalItems(data.totalItems || 0);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Не удалось загрузить список студентов');
            console.error("Fetch students error:", err);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filters]);

    useEffect(() => {
        loadLookups(); // Загружаем справочники один раз
    }, [loadLookups]);

    useEffect(() => {
        fetchStudents(); // Загружаем студентов при изменении пагинации/фильтров
    }, [fetchStudents]);

    // Обработчики
    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const handleFilterChange = (event) => {
        const { name, value } = event.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(0); // Сброс на первую страницу при изменении фильтра
    };
     const handleDeleteClick = (student) => {
        setStudentToDelete({ id: student.studentId, name: student.fullName });
        setOpenDeleteDialog(true);
    };
    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
        setStudentToDelete(null);
    };
    const handleConfirmDelete = async () => {
        if (!studentToDelete) return;
        try {
            await deleteStudent(studentToDelete.id);
            fetchStudents(); // Обновляем список
            handleCloseDeleteDialog();
        } catch (err) {
             setError(err.response?.data?.message || err.message || 'Не удалось удалить студента');
             console.error("Delete student error:", err);
             handleCloseDeleteDialog();
        }
    };

    return (
         <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}> {/* Шире контейнер */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1"> Студенты </Typography>
                {user?.role === 'administrator' && (
                    <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/students/new"> Добавить студента </Button>
                )}
            </Box>

             {/* Панель фильтров */}
             <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4} md={3}>
                        <TextField label="Поиск по ФИО" name="fullName" value={filters.fullName} onChange={handleFilterChange} fullWidth size="small"/>
                    </Grid>
                    <Grid item xs={12} sm={4} md={3}>
                         <FormControl fullWidth size="small">
                            <InputLabel>Группа</InputLabel>
                            <Select name="groupId" value={filters.groupId} label="Группа" onChange={handleFilterChange}>
                                <MenuItem value=""><em>Все группы</em></MenuItem>
                                {groupsList.map(g => <MenuItem key={g.groupId} value={g.groupId}>{g.groupName}</MenuItem>)}
                             </Select>
                        </FormControl>
                     </Grid>
                     <Grid item xs={12} sm={4} md={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Тег</InputLabel>
                            <Select name="tagId" value={filters.tagId} label="Тег" onChange={handleFilterChange}>
                                <MenuItem value=""><em>Все теги</em></MenuItem>
                                {tagsList.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                             </Select>
                        </FormControl>
                     </Grid>
                      <Grid item xs={12} sm={4} md={3}>
                           <FormControl fullWidth size="small">
                            <InputLabel>Статус</InputLabel>
                            <Select name="isActive" value={filters.isActive} label="Статус" onChange={handleFilterChange}>
                                <MenuItem value=""><em>Любой</em></MenuItem>
                                <MenuItem value="true">Активен</MenuItem>
                                <MenuItem value="false">Неактивен</MenuItem>
                             </Select>
                        </FormControl>
                     </Grid>
                     {/* Кнопки Применить/Сбросить не нужны, фильтрация идет при изменении */}
                </Grid>
            </Paper>


            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? ( <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
            ) : !students.length ? ( <Typography sx={{ textAlign: 'center', p: 3 }}>Студенты не найдены.</Typography>
            ) : (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 600 }}> {/* Ограничение высоты */}
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>ФИО</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Группа</TableCell>
                                    <TableCell>Статус</TableCell>
                                     <TableCell>Теги</TableCell>
                                    <TableCell align="right">Действия</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {students.map((student) => (
                                    <TableRow hover key={student.studentId}>
                                        <TableCell>{student.fullName}</TableCell>
                                        <TableCell>{student.email || '-'}</TableCell>
                                        <TableCell>{student.StudentGroup?.groupName || 'N/A'}</TableCell>
                                        <TableCell align="center">
                                             <Tooltip title={student.isActive ? 'Активен' : 'Неактивен'}>
                                                 {student.isActive
                                                    ? <CheckCircleIcon color="success" fontSize="small"/>
                                                    : <CancelIcon color="action" fontSize="small"/>}
                                             </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                             {student.Tags?.map(tag => (
                                                <Chip key={tag.tagId} label={tag.tagName} size="small" sx={{ mr: 0.5, mb: 0.5 }}/>
                                             ))}
                                         </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Просмотр"><IconButton size="small" component={RouterLink} to={`/students/${student.studentId}`}><VisibilityIcon /></IconButton></Tooltip>
                                            {user?.role === 'administrator' && ( <>
                                                <Tooltip title="Редактировать"><IconButton size="small" component={RouterLink} to={`/students/${student.studentId}/edit`} sx={{ ml: 1 }}><EditIcon /></IconButton></Tooltip>
                                                <Tooltip title="Удалить"><IconButton size="small" onClick={() => handleDeleteClick(student)} color="error" sx={{ ml: 1 }}><DeleteIcon /></IconButton></Tooltip>
                                            </> )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[15, 30, 50, 100]} component="div" count={totalItems}
                        rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Студентов на странице:" labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `больше чем ${to}`}`}
                    />
                </Paper>
            )}
             <ConfirmationDialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} onConfirm={handleConfirmDelete}
                title="Удалить студента?" message={`Вы уверены, что хотите удалить студента "${studentToDelete?.name || ''}"? Это действие необратимо.`}
             />
         </Container>
    );
}

export default StudentListPage;