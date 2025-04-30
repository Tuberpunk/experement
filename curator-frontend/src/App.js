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
import StudentGroupsPage from './pages/StudentGroupsPage';
import StudentGroupDetailPage from './pages/StudentGroupDetailPage';
import StudentGroupForm from './pages/StudentGroupForm';
import DocumentsPage from './pages/DocumentsPage';
import StudentListPage from './pages/StudentListPage';
import StudentDetailPage from './pages/StudentDetailPage';
import StudentForm from './pages/StudentForm';
import ManageTagsPage from './pages/admin/ManageTagsPage';
import CuratorReportsPage from './pages/CuratorReportsPage';
import CuratorReportDetailPage from './pages/CuratorReportDetailPage';
import CuratorReportForm from './pages/CuratorReportForm';
import ProfilePage from './pages/ProfilePage';
import ManageUsersPage from './pages/admin/ManageUsersPage';
import AssignEventPage from './pages/admin/AssignEventPage'; 
import ProfileEditPage from './pages/ProfileEditPage';
// Для MUI Date Pickers
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ru'; 
import CalendarPage from './pages/CalendarPage';
function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
      <AuthProvider>
        <Router>
          <Routes>
            {/* ... Публичные роуты ... */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Приватные роуты */}
            <Route element={<PrivateRoute />}>
               <Route element={<MainLayout />}>
                   <Route path="/" element={<Navigate to="/events" replace />} />
                   {/* Мероприятия */}
                   <Route path="/events" element={<EventsPage />} />
                   <Route path="/events/new" element={<EventForm mode="create" />} />
                   <Route path="/events/:id" element={<EventDetailPage />} />
                   <Route path="/events/:id/edit" element={<EventForm mode="edit" />} />
                   {/* Группы */}
                   <Route path="/groups" element={<StudentGroupsPage />} />
                   <Route path="/groups/:id" element={<StudentGroupDetailPage />} />
                   {/* Документы */}
                   <Route path="/documents" element={<DocumentsPage />} />
                   {/* Профиль*/}
                   <Route path="/profile" element={<ProfilePage />} />
                    {/* --- НОВЫЕ РОУТЫ ДЛЯ СТУДЕНТОВ --- */}
                    <Route path="/curator-reports" element={<CuratorReportsPage />} />
                    <Route path="/curator-reports/new" element={<CuratorReportForm />} />
                    <Route path="/curator-reports/:id" element={<CuratorReportDetailPage />} />
                    <Route path="/students" element={<StudentListPage />} />
                    <Route path="/students/:id" element={<StudentDetailPage />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    {/* --- КОНЕЦ РОУТОВ ДЛЯ СТУДЕНТОВ --- */}

                    {/* --- Админские роуты --- */}
                    <Route element={<PrivateRoute allowedRoles={['administrator']} />}>
                         <Route path="/groups/new" element={<StudentGroupForm mode="create" />} />
                         <Route path="/groups/:id/edit" element={<StudentGroupForm mode="edit" />} />
                         <Route path="/admin/users" element={<ManageUsersPage />} />
                         <Route path="/profile/edit" element={<ProfileEditPage />} />
                         {/* Админские роуты для студентов */}
                         <Route path="/students/new" element={<StudentForm mode="create" />} />
                         <Route path="/admin/tags" element={<ManageTagsPage />} />
                         <Route path="/students/:id/edit" element={<StudentForm mode="edit" />} />
                         {/* Другие админские роуты */}
                         <Route path="/admin/assign-event" element={<AssignEventPage />} />
                         {/* <Route path="/admin/users" element={...} /> */}
                         {/* <Route path="/admin/tags" element={...} /> // Возможно, для управления тегами */}
                    </Route>
                    {/* --- Конец Админских роутов --- */}

                   <Route path="/forbidden" element={<ForbiddenPage />} />
               </Route> {/* Конец MainLayout */}
            </Route> {/* Конец PrivateRoute */}

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </LocalizationProvider>
  );
}

export default App;