// src/components/FinalReportDialog.js
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField,
    CircularProgress, Alert, Typography
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { ru } from 'date-fns/locale';
import { format } from 'date-fns';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getAggregatedReportData } from '../api/curatorReports';
import { Roboto } from '../assets/fonts/Roboto-Regular';

const FinalReportDialog = ({ open, onClose, forCuratorId }) => {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [deanName, setDeanName] = useState(''); // ИЗМЕНЕНО: Добавлено состояние для ФИО декана
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateReport = async () => {
        if (!startDate || !endDate) {
            setError('Пожалуйста, выберите начальную и конечную дату периода.');
            return;
        }
        setError('');
        setLoading(true);

        try {
            const params = {
                startDate: format(startDate, 'yyyy-MM-dd'),
                endDate: format(endDate, 'yyyy-MM-dd'),
                ...(forCuratorId && { forCuratorId })
            };

            const apiData = await getAggregatedReportData(params);

            const doc = new jsPDF();
            doc.addFileToVFS("Roboto-Regular.ttf", Roboto);
            doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
            doc.addFont("Roboto-Regular.ttf", "Roboto", "bold");
            doc.setFont("Roboto");

            // ИЗМЕНЕНО: Формируем заголовок с датами
            const formattedStartDate = format(startDate, 'dd.MM.yyyy');
            const formattedEndDate = format(endDate, 'dd.MM.yyyy');
            doc.setFontSize(14);
            doc.text('ОТЧЕТ О ДЕЯТЕЛЬНОСТИ КУРАТОРА УЧЕБНОЙ ГРУППЫ', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.text(apiData.groupName, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
            doc.text(`за период с ${formattedStartDate} по ${formattedEndDate}`, doc.internal.pageSize.getWidth() / 2, 36, { align: 'center' });
            
            let yPos = 50; // Начинаем ниже
            doc.setFontSize(11);

            // ИЗМЕНЕНО: Пункт 1
            doc.setFont("Roboto", "bold");
            doc.text(`1. Общее количество обучающихся в группе:`, 15, yPos);
            doc.setFont("Roboto", "normal");
            doc.text(String(apiData.studentCount || '0'), 150, yPos);
            yPos += 10;
            
            // ИЗМЕНЕНО: Пункт 2 (новая Детализация)
            doc.setFont("Roboto", "bold");
            doc.text(`2. Детализация по мероприятиям:`, 15, yPos);
            yPos += 7;
            
            const addBreakdownSection = (title, data, nameKey, countKey) => {
                doc.setFont("Roboto", "bold");
                doc.text(title, 20, yPos);
                yPos += 5;
                doc.setFont("Roboto", "normal");
                if (data && data.length > 0) {
                    data.forEach(item => {
                        doc.text(`- ${item[nameKey]}: ${item[countKey]}`, 25, yPos);
                        yPos += 5;
                    });
                } else {
                    doc.text("- нет данных", 25, yPos);
                    yPos += 5;
                }
            };
            addBreakdownSection("По уровням", apiData.reportsByLevel, 'levelName', 'reportCount');
            yPos += 2;
            addBreakdownSection("По форматам", apiData.reportsByFormat, 'formatName', 'reportCount');
            yPos += 2;
            addBreakdownSection("По направлениям", apiData.reportsByDirection, 'directionName', 'reportCount');
            yPos += 5;
            
            // ИЗМЕНЕНО: Пункт 3 (бывший 5)
            doc.setFont("Roboto", "bold");
            doc.text(`3. Отчет об участии группы в мероприятиях:`, 15, yPos);
            yPos += 6;
            doc.setFont("Roboto", "normal");
            const splitText = doc.splitTextToSize(apiData.eventParticipationReport || '-', 180);
            doc.text(splitText, 15, yPos);
            yPos += (splitText.length * 5) + 5;
            
            // ИЗМЕНЕНО: Увеличено расстояние между подписями
            yPos = doc.internal.pageSize.getHeight() - 50;
            doc.setFont("Roboto", "normal");
            doc.text(`«__» ___________ ${new Date().getFullYear()} г.`, 15, yPos);
            doc.text(`Куратор ______________ / ${apiData.curatorName || ''} /`, 110, yPos, { align: 'right' });
            
            yPos += 20; // Увеличиваем отступ
            doc.text(`УТВЕРЖДЕНО:`, 15, yPos);
            yPos += 7;
            doc.text(`Декан _________________`, 15, yPos);
            doc.text(`______________ / ${deanName || ''} /`, 110, yPos, { align: 'right' });

            doc.save(`Отчет_${apiData.groupName.replace(/\s/g, '_')}_${formattedStartDate}-${formattedEndDate}.pdf`);
            onClose();

        } catch (err) {
            setError(err.response?.data?.message || 'Не удалось сформировать отчет.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>Сформировать итоговый отчет</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <DatePicker
                                label="Дата начала"
                                value={startDate}
                                onChange={setStartDate}
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <DatePicker
                                label="Дата окончания"
                                value={endDate}
                                onChange={setEndDate}
                                minDate={startDate}
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        </Grid>
                        {/* ИЗМЕНЕНО: Добавлено поле для ФИО декана */}
                        <Grid item xs={12}>
                             <TextField
                                fullWidth
                                label="ФИО декана (для подписи)"
                                value={deanName}
                                onChange={(e) => setDeanName(e.target.value)}
                                variant="outlined"
                                size="small"
                            />
                        </Grid>
                        {error && <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid>}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Отмена</Button>
                    <Button onClick={handleGenerateReport} variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : 'Сформировать PDF'}
                    </Button>
                </DialogActions>
            </Dialog>
        </LocalizationProvider>
    );
};

export default FinalReportDialog;