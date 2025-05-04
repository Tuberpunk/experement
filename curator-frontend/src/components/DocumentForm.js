// Полный путь: src/components/DocumentForm.js
import React, { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    TextField, Button, Grid, Box, CircularProgress, Alert, Typography
} from '@mui/material';
import PropTypes from 'prop-types';
import { createDocument } from '../api/documents';// Убедитесь, что путь правильный
import FileUploader from './FileUploader'; // Наш компонент загрузчика

// Схема валидации
const documentSchema = yup.object().shape({
    title: yup.string().required('Название документа обязательно'),
    category: yup.string().nullable(),
    description: yup.string().nullable(),
    // docUrl будет устанавливаться после загрузки файла, напрямую не валидируем
});

function DocumentForm({ onSuccess, onClose }) {
    const [formError, setFormError] = useState('');
    const [uploadedFileData, setUploadedFileData] = useState(null); // Храним данные загруженного файла ({ success, mediaUrl, filename, mediaType })
    const [isUploading, setIsUploading] = useState(false); // Отдельный флаг для процесса ЗАГРУЗКИ ФАЙЛА

    const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(documentSchema),
        defaultValues: { title: '', category: '', description: '' }
    });

    // Обработчик успешной ЗАГРУЗКИ ФАЙЛА через FileUploader
    const handleUploadSuccess = useCallback((fileData) => {
        setIsUploading(false); // Загрузка файла завершена
        if (fileData?.mediaUrl) {
            setUploadedFileData(fileData);
            setFormError(''); // Сбрасываем ошибку выбора файла
        } else {
            setFormError("Ошибка: не удалось получить URL файла после загрузки.");
        }
    }, []);

     // Обработчик начала загрузки файла
     const handleUploadStart = useCallback(() => {
        setIsUploading(true);
        setFormError('');
        setUploadedFileData(null); // Сбрасываем старый файл
    }, []);

    // Обработчик ОТПРАВКИ ФОРМЫ (создание записи документа)
    const onSubmit = async (data) => {
        if (!uploadedFileData?.mediaUrl) {
            setFormError('Пожалуйста, загрузите файл документа.');
            return;
        }
        setFormError('');

        const documentDataToSend = {
            title: data.title,
            docUrl: uploadedFileData.mediaUrl, // Используем URL из загруженного файла
            category: data.category || null,
            description: data.description || null,
        };

        try {
            const newDocument = await createDocument(documentDataToSend);
            onSuccess(newDocument); // Вызываем колбэк родителя об успехе
            handleInternalClose(); // Очищаем форму и закрываем
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Не удалось сохранить документ.';
            setFormError(message);
            console.error("Document form submission error:", err);
        }
    };

    // Функция для очистки и вызова onClose
    const handleInternalClose = () => {
        reset();
        setUploadedFileData(null);
        setFormError('');
        setIsUploading(false);
        onClose(); // Вызываем проп onClose
    };


    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Typography variant="h6" gutterBottom>Загрузка нового документа</Typography>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            <Grid container spacing={2}>
                <Grid item xs={12}>
                     <Controller name="title" control={control} render={({ field }) => <TextField {...field} label="Название документа" required fullWidth error={!!errors.title} helperText={errors.title?.message} />} />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Controller name="category" control={control} render={({ field }) => <TextField {...field} label="Категория (напр., Положение)" fullWidth />} />
                </Grid>
                 <Grid item xs={12} sm={6}>
                     {/* Загрузчик файла */}
                     <FileUploader
                         onUploadSuccess={handleUploadSuccess}
                         onUploadStart={handleUploadStart} // Передаем обработчик начала загрузки
                         buttonText="Выбрать и загрузить файл"
                         accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,image/*,video/*" // Ограничиваем типы
                     />
                     {uploadedFileData && (
                         <Typography variant="caption" display="block" sx={{mt: 1}}> Загружен: {uploadedFileData.filename} </Typography>
                     )}
                 </Grid>
                 <Grid item xs={12}>
                     <Controller name="description" control={control} render={({ field }) => <TextField {...field} label="Краткое описание" fullWidth multiline rows={2} />} />
                 </Grid>
                 <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 1 }}>
                        <Button onClick={handleInternalClose} disabled={isSubmitting || isUploading}>Отмена</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting || isUploading || !uploadedFileData}>
                            {(isSubmitting || isUploading) ? <CircularProgress size={24} /> : 'Сохранить документ'}
                        </Button>
                    </Box>
                 </Grid>
            </Grid>
        </Box>
    );
}

DocumentForm.propTypes = {
  onSuccess: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DocumentForm;