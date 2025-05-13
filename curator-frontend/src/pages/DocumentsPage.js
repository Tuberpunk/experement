// Полный путь: src/pages/DocumentsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Typography, Button, Box, CircularProgress, Alert, Paper, IconButton, Tooltip, Link,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Modal, // Добавлен Modal
    Grid, TextField // Для будущих фильтров
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description'; // Иконка документа
import DownloadIcon from '@mui/icons-material/Download'; // Иконка скачивания
import { useAuth } from '../contexts/AuthContext';
import { getDocuments, deleteDocument } from '../api/documents'; // API для документов
import ConfirmationDialog from '../components/ConfirmationDialog';
import DocumentForm from '../components/DocumentForm'; // Импортируем форму
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'http://localhost:5000';
// Стили для модального окна
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: '80%', md: '60%', lg: '50%' }, // Адаптивная ширина
  maxWidth: '700px', // Макс ширина
  bgcolor: 'background.paper',
  border: '1px solid #ccc',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  maxHeight: '90vh', // Ограничение высоты
  overflowY: 'auto'   // Прокрутка, если контент не помещается
};

function DocumentsPage() {
    const { user } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Пагинация
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Состояние для модального окна формы
    const [openFormModal, setOpenFormModal] = useState(false);
    // Состояние для диалога удаления
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [docToDelete, setDocToDelete] = useState(null); // { id, title }

    // Загрузка документов
    const fetchDocuments = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = { page: page + 1, limit: rowsPerPage };
            // TODO: Добавить фильтры по title, category?
            const data = await getDocuments(params);
            setDocuments(data.documents || []);
            setTotalItems(data.totalItems || 0);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Не удалось загрузить список документов');
            console.error("Fetch documents error:", err);
        } finally { setLoading(false); }
    }, [page, rowsPerPage]);

    useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

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
         setDocuments(prev => [newDocument, ...prev]); // Добавляем в начало
         setTotalItems(prev => prev + 1);
         // Если мы на первой странице, новый документ будет виден
         // Если на других, можно перейти на первую страницу или просто обновить счетчик
         if(page !== 0) setPage(0); // Переход на первую страницу, чтобы увидеть новый
         else fetchDocuments(); // Или просто перезагружаем текущую
    };

    // Удаление
    const handleDeleteClick = (doc) => {
        setDocToDelete({ id: doc.docId, title: doc.title });
        setOpenDeleteDialog(true);
    };
    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false); setDocToDelete(null);
    };
    const handleConfirmDelete = async () => {
        if (!docToDelete) return;
        setError(''); // Сброс ошибки
        try {
            await deleteDocument(docToDelete.id);
            fetchDocuments(); // Перезагружаем список
            handleCloseDeleteDialog();
            // TODO: Snackbar об успехе
        } catch (err) {
             setError(err.response?.data?.message || err.message || 'Не удалось удалить документ');
             console.error("Delete document error:", err);
             handleCloseDeleteDialog();
        }
    };

    // Вспомогательная функция для формирования абсолютного URL (как в EventDetailPage)
     const getAbsoluteUrl = (relativeUrl) => {
         if (!relativeUrl) return '#'; // Возвращаем заглушку, если URL нет
         return relativeUrl.startsWith('http')
             ? relativeUrl
             : `${BACKEND_BASE_URL}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
     };
      const getFilenameFromUrl = (url = '') => {
        try {
            const decodedUrl = decodeURI(url);
            return decodedUrl.substring(decodedUrl.lastIndexOf('/') + 1);
        } catch { return 'download'; }
    };


    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h4" component="h1">
                    Документы
                </Typography>
                {/* Кнопка добавления видна только админу */}
                {user?.role === 'administrator' && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenFormModal}> Загрузить документ </Button>
                )}
            </Box>

            {/* TODO: Добавить панель фильтров */}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? ( <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
            ) : !documents.length ? ( <Typography sx={{ textAlign: 'center', p: 3 }}>Документы не загружены.</Typography>
            ) : (
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 650 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{width: '5%'}}></TableCell>
                                    <TableCell sx={{width: '35%'}}>Название</TableCell>
                                    <TableCell sx={{width: '20%'}}>Категория</TableCell>
                                    <TableCell>Кто загрузил</TableCell>
                                    <TableCell>Дата загрузки</TableCell>
                                    <TableCell align="right">Действия</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {documents.map((doc) => {
                                    const absoluteUrl = getAbsoluteUrl(doc.docUrl);
                                    const filename = getFilenameFromUrl(doc.docUrl);
                                    return (
                                        <TableRow hover key={doc.docId}>
                                            <TableCell>
                                                <Tooltip title={doc.description || 'Нет описания'}>
                                                    <DescriptionIcon color="action" />
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>
                                                {/* Ссылка на документ */}
                                                <Link href={absoluteUrl} target="_blank" rel="noopener noreferrer" underline="hover" title={doc.description || doc.title}>
                                                    {doc.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{doc.category || '-'}</TableCell>
                                            <TableCell>{doc.Uploader?.fullName || 'N/A'}</TableCell>
                                            <TableCell>{doc.uploadedAt ? format(new Date(doc.uploadedAt), 'dd.MM.yyyy HH:mm', { locale: ru }) : '-'}</TableCell>
                                            <TableCell align="right">
                                                 {/* Кнопка скачивания доступна всем */}
                                                 <Tooltip title="Скачать файл">
                                                     <IconButton size="small" href={absoluteUrl} download={filename} target="_blank" rel="noopener noreferrer">
                                                         <DownloadIcon />
                                                     </IconButton>
                                                 </Tooltip>
                                                 {/* Кнопка удаления видна только админу */}
                                                {user?.role === 'administrator' && (
                                                    <Tooltip title="Удалить документ">
                                                        <IconButton size="small" onClick={() => handleDeleteClick(doc)} color="error" sx={{ ml: 1 }}>
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
                        rowsPerPageOptions={[10, 25, 50]} component="div" count={totalItems}
                        rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Документов на странице:" labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `больше чем ${to}`}`}
                    />
                </Paper>
            )}

             {/* Модальное окно с формой добавления/загрузки */}
             <Modal
                open={openFormModal}
                onClose={handleCloseFormModal} // Закрытие по клику вне окна
                aria-labelledby="document-form-modal-title"
             >
                <Box sx={modalStyle}>
                    {/* Передаем колбэки в форму */}
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