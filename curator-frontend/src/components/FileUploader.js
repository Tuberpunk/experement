// src/components/FileUploader.js
import React, { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types'; // Для описания типов props
import apiClient from '../api/apiClient'; // Ваш настроенный axios клиент
import { Box, Button, Typography, CircularProgress, Input } from '@mui/material'; // Импортируем нужные компоненты MUI
import CloudUploadIcon from '@mui/icons-material/CloudUpload'; // Иконка для кнопки

function FileUploader({ onUploadSuccess, accept = "image/*,video/*", buttonText = "Загрузить фото/видео" }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null); // Ссылка на скрытый input

    const handleFileChange = useCallback(async (event) => {
        const file = event.target.files?.[0]; // Безопасный доступ к файлу
        if (!file) return;

        setUploading(true);
        setError('');
        const formData = new FormData();
        // 'mediaFile' - имя поля, которое ожидает ваш бэкенд (например, в multer)
        formData.append('mediaFile', file);

        try {
            // Отправляем на отдельный эндпоинт загрузки
            // Замените '/media/upload' на ваш реальный путь API
            const response = await apiClient.post('/media/upload', formData, {
                headers: {
                    // Axios обычно сам устанавливает правильный Content-Type для FormData,
                    // но можно указать явно, если нужно
                    'Content-Type': 'multipart/form-data',
                },
                 // Можно добавить обработчик прогресса загрузки, если нужно
                 /* onUploadProgress: progressEvent => {
                     const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                     console.log(`Upload Progress: ${percentCompleted}%`);
                 } */
            });

            // Вызываем колбэк с данными от бэкенда
            if (onUploadSuccess && typeof onUploadSuccess === 'function') {
                 // Бэкенд должен вернуть объект с данными о файле, например:
                 // { success: true, mediaUrl: '...', mediaType: 'photo', filename: '...' }
                 // Проверяем успешность и наличие данных
                if (response.data && response.data.success && response.data.mediaUrl) {
                     onUploadSuccess(response.data);
                } else {
                     console.error("Upload response missing success flag or mediaUrl:", response.data);
                     setError('Ошибка ответа сервера после загрузки.');
                }
            }

        } catch (err) {
            console.error("File upload error:", err);
            const message = err.response?.data?.message || err.message || 'Неизвестная ошибка загрузки файла.';
            setError(`Ошибка загрузки: ${message}`);
        } finally {
            setUploading(false);
            // Сброс значения input file, чтобы можно было загрузить тот же файл снова
            if (fileInputRef.current) {
                fileInputRef.current.value = null;
            }
        }
    }, [onUploadSuccess]); // Зависимость для useCallback

    return (
        <Box sx={{ my: 1 }}> {/* Добавлен небольшой отступ */}
            {/* Кнопка, которая активирует скрытый input */}
            <Button
                component="label" // Делает кнопку меткой для input
                variant="outlined"
                startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                disabled={uploading}
                sx={{ textTransform: 'none' }} // Убираем КАПС в тексте кнопки
            >
                {uploading ? 'Загрузка...' : buttonText}
                {/* Скрытый input для выбора файла */}
                <Input
                    type="file"
                    hidden // Скрываем стандартный input
                    onChange={handleFileChange}
                    inputRef={fileInputRef} // Привязываем ref
                    inputProps={{ accept: accept }} // Ограничение типов файлов
                />
            </Button>
             {/* Отображение ошибки */}
            {error && (
                <Typography color="error" variant="caption" display="block" sx={{ mt: 1 }}>
                    {error}
                </Typography>
            )}
        </Box>
    );
}

// Описание типов props для компонента (рекомендуется)
FileUploader.propTypes = {
  onUploadSuccess: PropTypes.func.isRequired, // Колбэк должен быть передан
  accept: PropTypes.string, // Необязательный тип файлов
  buttonText: PropTypes.string // Необязательный текст кнопки
};

export default FileUploader;