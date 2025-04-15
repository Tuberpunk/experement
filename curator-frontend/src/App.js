// src/App.js (или отдельный файл роутера)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage'; 
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import EventForm from './pages/EventForm'; // Страница с формой (создание/редактирование)
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './layouts/MainLayout'; // Пример обертки для страниц с меню/шапкой
import NotFoundPage from './pages/NotFoundPage'; // Страница 404
import ForbiddenPage from './pages/ForbiddenPage'; // Страница 403

// Для MUI Date Pickers
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'; // или AdapterDateFns
import 'dayjs/locale/ru'; // Локализация для dayjs

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
      <AuthProvider>
        <Router>
          <Routes>
            {/* Публичный роут */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} /> {/* <-- Новый роут */}

            {/* Приватные роуты внутри обертки Layout */}
            <Route element={<PrivateRoute />}> {/* Общий PrivateRoute для всех внутренних */}
               <Route element={<MainLayout />}> {/* Обертка с меню/хедером */}
                   {/* Редирект с корня на страницу мероприятий */}
                   <Route path="/" element={<Navigate to="/events" replace />} />

                   <Route path="/events" element={<EventsPage />} />
                   <Route path="/events/new" element={<EventForm mode="create" />} /> {/* Режим создания */}
                   <Route path="/events/:id" element={<EventDetailPage />} />
                   <Route path="/events/:id/edit" element={<EventForm mode="edit" />} /> {/* Режим редактирования */}

                   {/* Пример роута только для админа */}
                   <Route element={<PrivateRoute allowedRoles={['administrator']} />}>
                       <Route path="/admin/users" element={<div>Страница управления пользователями (Admin Only)</div>} />
                       {/* Другие админские роуты */}
                   </Route>

                   {/* Страница 403 - Доступ запрещен (если не подошла роль) */}
                   <Route path="/forbidden" element={<ForbiddenPage />} />
               </Route> {/* Конец MainLayout */}
            </Route> {/* Конец PrivateRoute */}


            {/* Страница 404 - Не найдено */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </LocalizationProvider>
  );
}

export default App;