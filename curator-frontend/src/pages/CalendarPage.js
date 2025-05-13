// Полный путь: src/pages/CalendarPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// Компоненты календаря
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
// Функции и локаль для date-fns (для localizer)
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { ru } from 'date-fns/locale';
// Dayjs для удобной работы с датами внутри компонента
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

// Стили календаря (стандартные)
import 'react-big-calendar/lib/css/react-big-calendar.css';
// Ваши кастомные стили (опционально, создайте этот файл в src/pages)
// import './CalendarPage.css';
// Компоненты MUI
import { Container, Paper, Box, CircularProgress, Alert, Typography } from '@mui/material';
// API
import { getEvents } from '../api/events'; // Убедитесь, что путь правильный

// Настройка локали для react-big-calendar
const locales = {
  'ru': ru,
};

// Создаем localizer с date-fns для календаря
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }), // Неделя начинается с Понедельника
  getDay,
  locales,
});

// Сообщения календаря на русском
const messages = {
    allDay: 'Весь день',
    previous: '‹',
    next: '›',
    today: 'Сегодня',
    month: 'Месяц',
    week: 'Неделя',
    day: 'День',
    agenda: 'Повестка дня',
    date: 'Дата',
    time: 'Время',
    event: 'Событие',
    showMore: total => `+ ещё ${total}`,
};

// --- Список фиксированных важных дат ---
// Формат: { month: M, day: D, title: 'Название' } (месяцы с 1 до 12)
const importantFixedDates = [
    { month: 9, day: 3, title: 'День солидарности в борьбе с терроризмом' },
    // { month: 10, day: 19, title: 'День отца (РФ)' }, // Плавающая дата?
    { month: 11, day: 4, title: 'День народного единства' },
    { month: 12, day: 1, title: 'Всемирный день борьбы со СПИДом' },
    { month: 12, day: 3, title: 'День Неизвестного Солдата' },
    { month: 12, day: 5, title: 'День добровольца (волонтёра)' },
    { month: 12, day: 9, title: 'День Героев Отечества / Междунар. день борьбы с коррупцией' },
    { month: 12, day: 12, title: 'День Конституции РФ' },
    { month: 1, day: 25, title: 'День российского студенчества' },
    { month: 1, day: 27, title: 'День снятия блокады Ленинграда' },
    { month: 2, day: 8, title: 'День российской науки' },
    { month: 2, day: 15, title: 'День памяти воинов-интернационалистов' },
    { month: 2, day: 17, title: 'День РСО' },
    { month: 2, day: 21, title: 'Международный день родного языка' },
    { month: 2, day: 23, title: 'День защитника Отечества' },
    { month: 3, day: 18, title: 'День воссоединения Крыма с Россией' },
    { month: 4, day: 7, title: 'Всемирный день здоровья' },
    { month: 4, day: 12, title: 'День космонавтики' },
    { month: 4, day: 19, title: 'День памяти о геноциде' },
    { month: 5, day: 9, title: 'День Победы' },
    { month: 5, day: 15, title: 'Международный день семьи' },
    { month: 5, day: 24, title: 'День славянской письменности' },
    { month: 5, day: 31, title: 'Всемирный день без табака' },
    { month: 6, day: 6, title: 'День русского языка' },
    { month: 6, day: 12, title: 'День России' },
    { month: 6, day: 22, title: 'День памяти и скорби' },
    // Добавьте остальные фиксированные даты из ТЗ
];
// -----------------------------------
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);

// --- Функция для стилизации событий ---
const eventPropGetter = (event, start, end, isSelected) => {
  const type = event.resource?.type; // Тип ('event' или 'fixed')
  const status = event.resource?.status; // Статус для обычных мероприятий
  let style = {
    color: 'white', borderRadius: "4px", border: "none", display: 'block',
    fontSize: '0.75rem', padding: '1px 3px', opacity: 1,
    backgroundColor: "#757575", // Серый по умолчанию
  };

  if (type === 'fixed') { // Стиль для фиксированных дат
    style.backgroundColor = '#4a148c'; // Темно-фиолетовый (пример)
    style.border = '1px dashed #e0e0e0';
  } else if (type === 'event') { // Стили для обычных мероприятий
      switch (status) {
        case 'Запланировано': style.backgroundColor = "#1976d2"; break;
        case 'Проведено': style.backgroundColor = "#2e7d32"; break;
        case 'Не проводилось (Отмена)': style.backgroundColor = "#d32f2f"; style.opacity = 0.65; break;
        default: break;
      }
  }

  if (isSelected) { style.border = '2px solid black'; style.fontWeight = 'bold'; }

  return { style };
};
// ---------------------------------

function CalendarPage() {
    const navigate = useNavigate();
    const [calendarEvents, setCalendarEvents] = useState([]); // События для react-big-calendar
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Состояние для хранения текущего видимого диапазона дат календаря
    const [viewRange, setViewRange] = useState(() => {
        // Устанавливаем начальный диапазон на текущий месяц
        const startOfMonth = dayjs().startOf('month').toDate();
        const endOfMonth = dayjs().endOf('month').toDate();
        return { start: startOfMonth, end: endOfMonth };
    });

    // --- Функция для загрузки и преобразования мероприятий ---
    const fetchCalendarData = useCallback(async (range) => {
        setLoading(true); setError('');
        try {
            // Определяем годы для загрузки фиксированных дат
            const currentYear = dayjs(range.start).year();
            const nextYear = dayjs(range.end).year();
            const yearsToDisplay = [currentYear];
            if (nextYear !== currentYear && !yearsToDisplay.includes(nextYear)) {
                yearsToDisplay.push(nextYear);
            }
             if (currentYear > dayjs().year() && !yearsToDisplay.includes(currentYear-1)) { // Покажем прошлый год, если смотрим будущий
                 yearsToDisplay.push(currentYear-1);
             }


            // Генерируем события для фиксированных дат
            const fixedDateEvents = yearsToDisplay.flatMap(year =>
                importantFixedDates.map(fixedDate => {
                    const start = new Date(year, fixedDate.month - 1, fixedDate.day);
                    if (isNaN(start.getTime())) return null;
                    return { title: fixedDate.title, start, end: start, allDay: true, resource: { isFixedDate: true, type: 'fixed' } };
                }).filter(Boolean)
            );

            // Запрашиваем мероприятия из API для текущего диапазона
            const params = {
                limit: 1000, // Увеличим лимит для захвата всех событий в диапазоне
                sortBy: 'startDate', sortOrder: 'ASC',
                // Передаем диапазон, если он есть
                ...(range?.start && { startDate: dayjs(range.start).format('YYYY-MM-DD') }),
                ...(range?.end && { endDate: dayjs(range.end).add(1,'day').format('YYYY-MM-DD') }), // +1 день для захвата событий в последний день
            };

            console.log("Fetching calendar events with params:", params);
            const data = await getEvents(params);
            const eventsData = data.events || [];

            const formattedApiEvents = eventsData.map(event => {
                const start = new Date(event.startDate);
                const end = event.endDate && dayjs(event.endDate).isAfter(event.startDate)
                    ? dayjs(event.endDate).add(1, 'day').toDate() : start;
                const allDay = !event.endDate || event.endDate === event.startDate;
                if (isNaN(start.getTime())) return null;
                return { title: event.title, start, end, allDay, resource: { ...event, type: 'event' } };
            }).filter(Boolean);

            // Объединяем
            setCalendarEvents([...formattedApiEvents, ...fixedDateEvents]);

        } catch (err) { /* ... обработка ошибки ... */ }
        finally { setLoading(false); }
    }, []); // Убираем зависимости, т.к. range передается явно

    // Первичная загрузка и загрузка при смене диапазона
    useEffect(() => {
        if (viewRange) {
            fetchCalendarData(viewRange);
        }
    }, [viewRange, fetchCalendarData]); // Зависим от viewRange

    // Обработчик смены видимого диапазона дат
    const handleRangeChange = useCallback((range) => {
         console.log("Range changed:", range);
         let startDate, endDate;
         if (Array.isArray(range)) { // Month view
             // Находим начало первой недели и конец последней
             startDate = startOfWeek(range[0], { weekStartsOn: 1 });
             endDate = dayjs(range[range.length - 1]).endOf('week').add(1, 'day').toDate(); // Конец последней недели + 1 день
         } else if (range?.start && range?.end) { // Week/Day view
             startDate = range.start;
             endDate = range.end;
         } else { return; } // Неожиданный формат диапазона

         // Обновляем состояние диапазона, что вызовет useEffect -> fetchCalendarData
         setViewRange({ start: startDate, end: endDate });

     }, []); // Нет зависимостей


    // --- Обработчик для добавления события ---
    const handleSelectSlot = useCallback(({ start, end, action }) => {
        if (action === 'click' || action === 'select') {
             const dataToSend = { startDate: start.toISOString() };
             // Если выделен диапазон (не просто клик), передаем и дату окончания
             if (start.getTime() !== end.getTime()) {
                 // Вычитаем 1 день, если это выбор диапазона на весь день
                 const adjustedEnd = dayjs(end).subtract(1, 'millisecond'); // Берем конец предыдущего дня
                  if(adjustedEnd.isAfter(start)) { // Убедимся, что конец после начала
                    dataToSend.endDate = adjustedEnd.toISOString();
                  }
             }
             navigate('/events/new', {
                state: {
                    startDate: start.toISOString(), // Передаем начало
                    endDate: end.toISOString()      // Передаем конец
                }
            });
        }
    }, [navigate]);

    // --- Обработчик клика по событию ---
    const handleSelectEvent = useCallback((calendarEvent) => {
        const resource = calendarEvent.resource;
    
        if (resource?.type === 'event' && resource?.eventId) {
            // Если кликнули на ОБЫЧНОЕ МЕРОПРИЯТИЕ, переходим на его детальную страницу
            navigate(`/events/${resource.eventId}`);
        } else if (resource?.type === 'fixed' && calendarEvent.start) {
            // Если кликнули на ФИКСИРОВАННУЮ ДАТУ
            console.log("Clicked fixed date:", calendarEvent.title, calendarEvent.start);
            // Переходим на страницу СОЗДАНИЯ нового мероприятия,
            // передавая название и дату в state
            navigate('/events/new', {
                state: {
                    // Предзаполняем название из названия фиксированной даты
                    title: calendarEvent.title || '',
                    // Предзаполняем дату начала
                    startDate: calendarEvent.start.toISOString(),
                    // Дату окончания можно не передавать или передать ту же
                    // endDate: calendarEvent.start.toISOString()
                }
            });
        } else {
             console.warn("Clicked calendar event missing necessary resource data", calendarEvent);
        }
    }, [navigate]);

    // --- Форматирование текста для всплывающей подсказки ---
    const tooltipAccessor = useCallback((event) => {
        const res = event.resource;
        if (!res) return event.title;
        if (res.type === 'fixed') return event.title; // Для фикс. дат показываем только название

        let parts = [
            event.title,
            `Статус: ${res.status || '-'}`,
            res.locationText ? `Место: ${res.locationText}` : null,
            res.responsibleFullName ? `Отв.: ${res.responsibleFullName}` : null,
        ].filter(Boolean);
        return parts.join('\n');
    }, []);


    // --- Рендеринг ---
    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
             <Typography variant="h4" component="h1" gutterBottom> Календарь мероприятий </Typography>
             {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
             <Paper sx={{ p: { xs: 1, sm: 2 }, height: '75vh', position: 'relative' }}> {/* Уменьшил паддинг на xs */}
                {/* Индикатор загрузки */}
                {loading && ( <Box sx={{ /* ... стили лоадера ... */ }}><CircularProgress /></Box> )}
                {/* Календарь */}
                <Calendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    culture='ru'
                    messages={messages}
                    onSelectEvent={handleSelectEvent}
                    popup
                    views={['month', 'week', 'day', 'agenda']}
                    // --- УЛУЧШЕНИЯ ---
                    eventPropGetter={eventPropGetter}   // Стилизация
                    tooltipAccessor={tooltipAccessor} // Подсказки
                    selectable={true}                 // Разрешить выделение
                    onSelectSlot={handleSelectSlot}     // Обработчик выделения/клика
                    onRangeChange={handleRangeChange} // Обработчик смены диапазона дат
                    // --------------------
                />
            </Paper>
        </Container>
    );
}

export default CalendarPage;