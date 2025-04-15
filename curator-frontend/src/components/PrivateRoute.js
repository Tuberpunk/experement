// src/components/PrivateRoute.js
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

// allowedRoles - массив ролей, которым разрешен доступ (опционально)
const PrivateRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation(); // Для сохранения пути при редиректе на логин

  if (loading) {
    // Показываем индикатор загрузки, пока проверяется статус аутентификации
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
        </Box>
    );
  }

  if (!isAuthenticated) {
    // Если не аутентифицирован, перенаправляем на страницу входа
    // state={{ from: location }} позволяет вернуться назад после входа
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Проверка ролей, если параметр allowedRoles передан
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Если роль пользователя не входит в список разрешенных,
    // показываем страницу "Доступ запрещен" или перенаправляем на главную
    console.warn(`Access denied for role "${user?.role}". Allowed roles: ${allowedRoles.join(', ')}`);
    // TODO: Создать компонент ForbiddenPage или редиректить на другую страницу
    return <Navigate to="/forbidden" replace />; // Пример редиректа на страницу 403
  }

  // Если аутентифицирован и (роль подходит или проверка ролей не требуется),
  // рендерим дочерний компонент (страницу)
  return <Outlet />; // Outlet рендерит вложенный маршрут
};

export default PrivateRoute;