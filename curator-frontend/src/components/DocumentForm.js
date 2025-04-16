// src/components/DocumentForm.js
import React, { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    TextField, Button, Grid, Box, CircularProgress, Alert, Typography
} from '@mui/material';
import PropTypes from 'prop-types';
import { createDocument } from '../api/documents';
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
    const [uploadedFileData, setUploadedFileData] = useState(null); // Храним данные загруженного файла
    const [isUploading, setIsUploading] = useState(false); // Для блокировки кнопки во время загрузки файла

    const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(documentSchema),
        defaultValues: { title: '', category: '', description: '' }
    });

    const handleUploadSuccess = useCallback((fileData) => {
        // fileData = { success: true, mediaUrl: '...', filename: '...' }
        if (fileData?.mediaUrl) {
            setUploadedFileData(fileData); // Сохраняем данные
            setFormError(''); // Сбрасываем ошибку, если была
        } else {
            setFormError("Ошибка: не удалось получить URL файла после загрузки.");
        }
         setIsUploading(false); // Разблокируем кнопку отправки
    }, []);

    const handleUploadStart = useCallback(() => {
         setIsUploading(true);
         setFormError(''); // Сбрасываем предыдущие ошибки
         setUploadedFileData(null); // Сбрасываем старый файл при начале новой загрузки
    }, []);


    const onSubmit = async (data) => {
        if (!uploadedFileData?.mediaUrl) {
            setFormError('Пожалуйста, загрузите файл документа.');
            return;
        }
        setFormError('');

        const documentDataToSend = {
            ...data,
            docUrl: uploadedFileData.mediaUrl, // Берем URL из данных загруженного файла
            // category и description могут быть пустыми строками, бэкенд сохранит их или null
            category: data.category || null,
            description: data.description || null,
        };

        try {
            const newDocument = await createDocument(documentDataToSend);
            onSuccess(newDocument); // Вызываем колбэк об успехе (передаем новый документ)
            reset(); // Очищаем форму
            setUploadedFileData(null); // Сбрасываем данные файла
            onClose(); // Закрываем модальное окно/форму
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Не удалось загрузить документ.';
            setFormError(message);
            console.error("Document form submission error:", err);
        }
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
                    <Controller name="category" control={control} render={({ field }) => <TextField {...field} label="Категория (напр., Положение, Приказ)" fullWidth />} />
                </Grid>
                 <Grid item xs={12} sm={6}>
                     {/* Поле для загрузки файла */}
                     <FileUploader
                         onUploadSuccess={handleUploadSuccess}
                         buttonText="Выбрать и загрузить файл"
                         // Можно ограничить типы файлов, например, PDF, DOCX
                         // accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                     />
                     {/* Отображение имени загруженного файла */}
                     {uploadedFileData && (
                         <Typography variant="caption" display="block" sx={{mt: 1}}>
                             Загружен: {uploadedFileData.filename}
                         </Typography>
                     )}
                 </Grid>
                 <Grid item xs={12}>
                     <Controller name="description" control={control} render={({ field }) => <TextField {...field} label="Краткое описание" fullWidth multiline rows={2} />} />
                 </Grid>
                 <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 1 }}>
                        <Button onClick={onClose} disabled={isSubmitting || isUploading}>Отмена</Button>
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