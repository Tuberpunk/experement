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
import { Roboto } from '../assets/fonts/Roboto-Regular'; // Убедитесь, что у вас есть этот файл

const FinalReportDialog = ({ open, onClose, forCuratorId }) => {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    
    // Состояние для полей, вводимых вручную
    const [manualData, setManualData] = useState({
        studentsStartCount: '', // Пункт 1
        academicDebtCount: '', // Пункт 3
        deanName: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setManualData(prev => ({ ...prev, [name]: value }));
    };

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

            // --- Заполнение PDF по новому шаблону ---
            doc.setFontSize(14);
            doc.text('ОТЧЕТ О ДЕЯТЕЛЬНОСТИ КУРАТОРА УЧЕБНОЙ ГРУППЫ', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.text(apiData.groupName, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
            
            let yPos = 45;
            doc.setFontSize(11);

            // Функция для простого пункта "заголовок: значение"
            const addReportItem = (number, text, value) => {
                doc.setFont("Roboto", "normal");
                doc.text(`${number}. ${text}:`, 15, yPos);
                doc.text(String(value || '0'), 150, yPos);
                yPos += 8;
            };
            
            // Функция для многострочного пункта
            const addMultiLineItem = (number, title, text) => {
                doc.setFont("Roboto", "normal");
                doc.text(`${number}. ${title}:`, 15, yPos);
                yPos += 6;
                const splitText = doc.splitTextToSize(text || '-', 180);
                doc.text(splitText, 15, yPos);
                yPos += (splitText.length * 5) + 5;
            };

            // 1. Количество студентов на начало периода (вручную)
            addReportItem('1', 'Количество обучающихся в группе на ' + format(startDate, 'dd.MM.yy'), manualData.studentsStartCount);

            // 2. Количество студентов на конец периода (автоматически)
            addReportItem('2', 'Количество обучающихся в группе на ' + format(endDate, 'dd.MM.yy'), apiData.currentStudentCount);

            // 3. Количество должников (вручную)
            addReportItem('3', 'Количество обучающихся, имеющих академ. задолженность', manualData.academicDebtCount);
            
            // 4. Детализация по мероприятиям (автоматически)
            doc.setFont("Roboto", "normal");
            doc.text(`4. Детализация по мероприятиям:`, 15, yPos);
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
                } else { doc.text("- нет данных", 25, yPos); yPos += 5; }
            };
            addBreakdownSection("По уровням", apiData.reportsByLevel, 'levelName', 'reportCount');
            addBreakdownSection("По форматам", apiData.reportsByFormat, 'formatName', 'reportCount');
            addBreakdownSection("По направлениям", apiData.reportsByDirection, 'directionName', 'reportCount');
            yPos += 5;

            // 5. Отчет об участии (автоматически)
            addMultiLineItem('5', 'Отчет об участии группы в мероприятиях', apiData.eventParticipationReport);
            
            // Подписи
            yPos = doc.internal.pageSize.getHeight() - 50;
            doc.setFont("Roboto", "normal");
            doc.text(`«__» ___________ ${new Date().getFullYear()} г.`, 15, yPos);
            doc.text(`Куратор ______________ / ${apiData.curatorName || ''} /`, 200, yPos, { align: 'right' });
            
            yPos += 20;
            doc.text(`УТВЕРЖДЕНО:`, 15, yPos);
            yPos += 7;
            doc.text(`Декан _________________`, 15, yPos);
            doc.text(`______________ / ${manualData.deanName || ''} /`, 110, yPos, { align: 'right' });

            doc.save(`Отчет_${apiData.groupName.replace(/\s/g, '_')}.pdf`);
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
                            <DatePicker label="Дата начала" value={startDate} onChange={setStartDate} slotProps={{ textField: { fullWidth: true } }} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <DatePicker label="Дата окончания" value={endDate} onChange={setEndDate} minDate={startDate} slotProps={{ textField: { fullWidth: true } }} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="studentsStartCount"
                                label="Кол-во студентов на начало периода"
                                value={manualData.studentsStartCount}
                                onChange={handleInputChange}
                                fullWidth
                                type="number"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="academicDebtCount"
                                label="Кол-во студентов с задолженностью"
                                value={manualData.academicDebtCount}
                                onChange={handleInputChange}
                                fullWidth
                                type="number"
                            />
                        </Grid>
                        <Grid item xs={12}>
                             <TextField
                                fullWidth
                                name="deanName"
                                label="ФИО декана (для подписи)"
                                value={manualData.deanName}
                                onChange={handleInputChange}
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