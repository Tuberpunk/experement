// Полный путь: src/pages/admin/ManageLookupsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Typography, Box, Paper, Tabs, Tab, Button, List, ListItem, ListItemText,
    IconButton, TextField, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    CircularProgress, Alert, Snackbar, Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

import {
    getEventDirections, createEventDirection, updateEventDirection, deleteEventDirection,
    getEventLevels, createEventLevel, updateEventLevel, deleteEventLevel,
    getEventFormats, createEventFormat, updateEventFormat, deleteEventFormat,
    getParticipantCategories, createParticipantCategory, updateParticipantCategory, deleteParticipantCategory,
    getFundingSources, createFundingSource, updateFundingSource, deleteFundingSource,
    getStudentTags, createStudentTag, updateStudentTag, deleteStudentTag // <-- API для Тегов Студентов
} from '../../api/lookups'; // Убедитесь, что путь правильный
import ConfirmationDialog from '../../components/ConfirmationDialog';

// Универсальный компонент для одного элемента справочника в модальном окне
function LookupItemForm({ open, onClose, onSubmit, item, itemName, nameKey = "name" }) {
    const [currentName, setCurrentName] = useState(''); // Используем currentName для избежания конфликта с пропсом name
    const [currentError, setCurrentError] = useState('');

    useEffect(() => {
        if (open) {
            setCurrentName(item ? item[nameKey] : ''); // Используем nameKey
            setCurrentError('');
        }
    }, [open, item, nameKey]);

    const handleSubmitForm = (e) => {
        e.preventDefault();
        if (!currentName.trim()) {
            setCurrentError(`Название ${itemName.toLowerCase()} не может быть пустым.`);
            return;
        }
        onSubmit({ id: item?.id, [nameKey]: currentName.trim() }); // Используем nameKey
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>{item ? 'Редактировать' : 'Добавить'} {itemName.toLowerCase()}</DialogTitle>
            <Box component="form" onSubmit={handleSubmitForm}>
                <DialogContent>
                    {currentError && <Alert severity="error" sx={{ mb: 2 }}>{currentError}</Alert>}
                    <TextField
                        autoFocus
                        margin="dense"
                        label={`Название ${itemName.toLowerCase()}`}
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={currentName}
                        onChange={(e) => setCurrentName(e.target.value)}
                        required
                    />
                </DialogContent>
                <DialogActions sx={{ pb: 2, pr: 2 }}>
                    <Button onClick={onClose}>Отмена</Button>
                    <Button type="submit" variant="contained">Сохранить</Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}

// Универсальный компонент для управления одним типом справочника
function LookupSection({
    title,
    itemName,
    fetchItemsFn,
    createItemFn,
    updateItemFn,
    deleteItemFn,
    itemKey = "id",
    nameKey = "name" // Поле для отображения имени (например, 'name' или 'tagName')
}) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [formOpen, setFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const loadItems = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await fetchItemsFn();
            // Убедимся, что данные приходят в формате { id, name }
            // getLookupData уже должен это делать, но для StudentTag имя поля другое
            const mappedData = data.map(d => ({
                id: d.id || d[itemKey], // На случай если ID приходит под другим ключом
                name: d.name || d[nameKey] // Используем nameKey
            }));
            setItems(mappedData || []);
        } catch (err) {
            setError(`Ошибка загрузки списка "${itemName.toLowerCase()}": ` + (err.response?.data?.message || err.message));
            console.error(`Error fetching ${itemName}s:`, err);
        } finally {
            setLoading(false);
        }
    }, [fetchItemsFn, itemName, itemKey, nameKey]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const handleOpenForm = (item = null) => {
        setEditingItem(item);
        setFormOpen(true);
    };
    const handleCloseForm = () => {
        setFormOpen(false);
        setEditingItem(null);
    };

    const handleFormSubmit = async (formData) => {
        setError('');
        try {
            // Для StudentTag API ожидает { tagName: ... }
            const dataToSend = { [nameKey]: formData[nameKey] };

            if (editingItem && formData.id) {
                await updateItemFn(formData.id, dataToSend);
                setSnackbar({ open: true, message: `${itemName} успешно обновлено!`, severity: 'success' });
            } else {
                await createItemFn(dataToSend);
                setSnackbar({ open: true, message: `${itemName} успешно добавлено!`, severity: 'success' });
            }
            loadItems();
            handleCloseForm();
        } catch (err) {
            const message = err.response?.data?.message || err.message || `Не удалось сохранить ${itemName.toLowerCase()}.`;
            setSnackbar({ open: true, message: message, severity: 'error' });
            console.error("Lookup form submit error:", err);
        }
    };

    const handleDeleteClick = (item) => {
        setItemToDelete(item);
        setDeleteDialogOpen(true);
    };
    const handleCloseDeleteDialog = () => { setItemToDelete(null); setDeleteDialogOpen(false);};
    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteItemFn(itemToDelete.id); // Используем .id, т.к. itemKey может быть другим
            setSnackbar({ open: true, message: `${itemName} "${itemToDelete.name}" удалено.`, severity: 'success' });
            loadItems();
        } catch (err) {
            setSnackbar({ open: true, message: `Ошибка удаления ${itemName.toLowerCase()} "${itemToDelete.name}": ` + (err.response?.data?.message || err.message), severity: 'error' });
            console.error(`Error deleting ${itemName}:`, err);
        } finally {
            handleCloseDeleteDialog();
        }
    };

    const handleCloseSnackbar = useCallback((event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">{title}</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenForm()}>
                    Добавить {itemName.toLowerCase()}
                </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {loading ? <CircularProgress sx={{display: 'block', margin: '20px auto'}}/> : (
                <List dense>
                    {items.map((item) => (
                        <ListItem
                            key={item.id} // Используем item.id, т.к. мы его мапим
                            secondaryAction={
                                <>
                                    <Tooltip title="Редактировать">
                                        <IconButton edge="end" aria-label="edit" onClick={() => handleOpenForm(item)} sx={{mr: 0.5}}>
                                            <EditIcon fontSize="small"/>
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Удалить">
                                        <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(item)}>
                                            <DeleteIcon fontSize="small" color="error"/>
                                        </IconButton>
                                    </Tooltip>
                                </>
                            }
                            sx={{borderBottom: '1px solid #eee', '&:last-child': {borderBottom: 0}}}
                        >
                            <ListItemText primary={item.name} secondary={`ID: ${item.id}`} /> {/* Используем item.name */}
                        </ListItem>
                    ))}
                     {items.length === 0 && !loading && <Typography sx={{p:2, textAlign: 'center', color: 'text.secondary'}}>Список пуст.</Typography>}
                </List>
            )}
            <LookupItemForm open={formOpen} onClose={handleCloseForm} onSubmit={handleFormSubmit} item={editingItem} itemName={itemName} nameKey={nameKey} />
            <ConfirmationDialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} onConfirm={handleConfirmDelete} title={`Удалить ${itemName.toLowerCase()}?`} message={`Вы уверены, что хотите удалить ${itemName.toLowerCase()} "${itemToDelete?.name || ''}"? элемент может использоваться в других записях.`} />
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}

function ManageLookupsPage() {
    const [tabIndex, setTabIndex] = useState(0);
    const handleChangeTab = (event, newValue) => {
        setTabIndex(newValue);
    };

    const lookupSections = [
        { label: "Направления мероприятий", title: "Управление направлениями", itemName: "Направление", fetchItemsFn: getEventDirections, createItemFn: createEventDirection, updateItemFn: updateEventDirection, deleteItemFn: deleteEventDirection, itemKey: 'directionId', nameKey: 'name' }, // Указываем itemKey для старых моделей
        { label: "Уровни мероприятий", title: "Управление уровнями", itemName: "Уровень", fetchItemsFn: getEventLevels, createItemFn: createEventLevel, updateItemFn: updateEventLevel, deleteItemFn: deleteEventLevel, itemKey: 'levelId', nameKey: 'name' },
        { label: "Форматы мероприятий", title: "Управление форматами", itemName: "Формат", fetchItemsFn: getEventFormats, createItemFn: createEventFormat, updateItemFn: updateEventFormat, deleteItemFn: deleteEventFormat, itemKey: 'formatId', nameKey: 'name' },
        { label: "Категории участников", title: "Управление категориями участников", itemName: "Категория", fetchItemsFn: getParticipantCategories, createItemFn: createParticipantCategory, updateItemFn: updateParticipantCategory, deleteItemFn: deleteParticipantCategory, itemKey: 'categoryId', nameKey: 'name' },
        { label: "Источники финансирования", title: "Управление источниками финансирования", itemName: "Источник", fetchItemsFn: getFundingSources, createItemFn: createFundingSource, updateItemFn: updateFundingSource, deleteItemFn: deleteFundingSource, itemKey: 'sourceId', nameKey: 'name' },
        // --- НОВАЯ КОНФИГУРАЦИЯ ДЛЯ ТЕГОВ СТУДЕНТОВ ---
        {
            label: "Теги студентов",
            title: "Управление тегами студентов",
            itemName: "Тег",
            fetchItemsFn: getStudentTags,       // API для получения списка тегов
            createItemFn: createStudentTag,     // API для создания тега
            updateItemFn: updateStudentTag,     // API для обновления тега
            deleteItemFn: deleteStudentTag,     // API для удаления тега
            itemKey: 'tagId',                   // Поле ID в модели StudentTag
            nameKey: 'name'                     // Поле имени в модели StudentTag (getLookupData возвращает как 'name')
                                                // Если getLookupData для тегов возвращает 'tagName', то здесь должно быть 'tagName'
                                                // Но мы стандартизировали вывод getLookupData на {id, name}
        },
        // ---------------------------------------------
    ];

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom component="h1"> Управление Справочниками </Typography>
            <Paper>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabIndex} onChange={handleChangeTab} variant="scrollable" scrollButtons="auto" aria-label="Справочники">
                        {lookupSections.map((section, index) => ( <Tab label={section.label} key={section.label} id={`lookup-tab-${index}`} aria-controls={`lookup-tabpanel-${index}`} /> ))}
                    </Tabs>
                </Box>
                {lookupSections.map((section, index) => ( <TabPanel key={section.label} value={tabIndex} index={index}> <LookupSection {...section} /> </TabPanel> ))}
            </Paper>
        </Container>
    );
}

// Вспомогательный компонент TabPanel
function TabPanel(props) { const { children, value, index, ...other } = props; return ( <div role="tabpanel" hidden={value !== index} id={`lookup-tabpanel-${index}`} aria-labelledby={`lookup-tab-${index}`} {...other}> {value === index && ( <Box sx={{ p: 3 }}> {children} </Box> )} </div> );}

export default ManageLookupsPage;
