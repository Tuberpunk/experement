// src/pages/DocumentsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Typography, Button, Box, CircularProgress, Alert, Paper, IconButton, Tooltip, Link,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Modal // Modal для формы
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description'; // Иконка документа
import { useAuth } from '../contexts/AuthContext';
import { getDocuments, deleteDocument } from '../api/documents';
import ConfirmationDialog from '../components/ConfirmationDialog';
import DocumentForm from '../components/DocumentForm'; // Импортируем форму
import { format } from 'date-fns';

// Стили для модального окна (пример)
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: '70%', md: '50%' }, // Адаптивная ширина
  bgcolor: 'background.paper',
  border: '1px solid #ccc',
  boxShadow: 24,
  p: 4,
  borderRadius: 1
};


function DocumentsPage() {
    const { user } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Состояние для модального окна формы
    const [openFormModal, setOpenFormModal] = useState(false);
    // Состояние для диалога удаления
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [docToDelete, setDocToDelete] = useState(null); // { id, title }

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = { page: page + 1, limit: rowsPerPage };
            // TODO: Добавить фильтры?
            const data = await getDocuments(params);
            setDocuments(data.documents || []);
            setTotalItems(data.totalItems || 0);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Не удалось загрузить список документов');
            console.error("Fetch documents error:", err);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    // Пагинация
    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Открытие/закрытие модального окна формы
    const handleOpenFormModal = () => setOpenFormModal(true);
    const handleCloseFormModal = () => setOpenFormModal(false);

    // Обработка успешного добавления документа из формы
    const handleCreateSuccess = (newDocument) => {
         // Добавляем новый документ в начало списка (или перезагружаем)
         setDocuments(prev => [newDocument, ...prev]);
         setTotalItems(prev => prev + 1); // Увеличиваем счетчик
         // Показываем Snackbar об успехе можно здесь или внутри формы
    };

    // Удаление
    const handleDeleteClick = (doc) => {
        setDocToDelete({ id: doc.docId, title: doc.title });
        setOpenDeleteDialog(true);
    };
    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
        setDocToDelete(null);
    };
    const handleConfirmDelete = async () => {
        if (!docToDelete) return;
        try {
            await deleteDocument(docToDelete.id);
            fetchDocuments(); // Перезагружаем список
            handleCloseDeleteDialog();
        } catch (err) {
             setError(err.response?.data?.message || err.message || 'Не удалось удалить документ');
             console.error("Delete document error:", err);
             handleCloseDeleteDialog();
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1">
                    Документы
                </Typography>
                {/* Кнопка добавления видна только админу */}
                {user?.role === 'administrator' && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleOpenFormModal} // Открываем модальное окно
                    >
                        Загрузить документ
                    </Button>
                )}
            </Box>

            {/* TODO: Добавить панель фильтров, если нужно (по категории, названию) */}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
            ) : !documents.length ? (
                 <Typography sx={{ textAlign: 'center', p: 3 }}>Документы не найдены.</Typography>
            ) : (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer>
                        <Table stickyHeader size="small" aria-label="Таблица документов">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{width: '5%'}}></TableCell> {/* Иконка */}
                                    <TableCell>Название</TableCell>
                                    <TableCell>Категория</TableCell>
                                    <TableCell>Кто загрузил</TableCell>
                                    <TableCell>Дата загрузки</TableCell>
                                    <TableCell align="right">Действия</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {documents.map((doc) => (
                                    <TableRow hover key={doc.docId}>
                                         <TableCell>
                                            <Tooltip title={doc.description || 'Нет описания'}>
                                                <DescriptionIcon color="action" />
                                            </Tooltip>
                                         </TableCell>
                                        <TableCell>
                                            {/* Ссылка на документ */}
                                            <Link href={doc.docUrl} target="_blank" rel="noopener noreferrer" underline="hover">
                                                {doc.title}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{doc.category || '-'}</TableCell>
                                        <TableCell>{doc.Uploader?.fullName || 'N/A'}</TableCell>
                                        <TableCell>{doc.uploadedAt ? format(new Date(doc.uploadedAt), 'dd.MM.yyyy HH:mm') : '-'}</TableCell>
                                        <TableCell align="right">
                                            {/* Кнопка удаления видна только админу */}
                                            {user?.role === 'administrator' && (
                                                <Tooltip title="Удалить">
                                                    <IconButton size="small" onClick={() => handleDeleteClick(doc)} color="error">
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
                        labelRowsPerPage="Строк на странице:"
                        labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `больше чем ${to}`}`}
                    />
                </Paper>
            )}

             {/* Модальное окно с формой добавления */}
             <Modal
                open={openFormModal}
                onClose={handleCloseFormModal}
                aria-labelledby="document-form-modal-title"
             >
                <Box sx={modalStyle}>
                    <DocumentForm
                        onSuccess={handleCreateSuccess}
                        onClose={handleCloseFormModal}
                    />
                </Box>
             </Modal>

            {/* Диалог подтверждения удаления */}
            <ConfirmationDialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                title="Удалить документ?"
                message={`Вы уверены, что хотите удалить документ "${docToDelete?.title || ''}"? Сам файл НЕ будет удален с сервера этой операцией.`}
            />
        </Container>
    );
}

export default DocumentsPage;