// src/pages/ForbiddenPage.js
import React from 'react';
import { Typography, Container, Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

function ForbiddenPage() {
  return (
    <Container maxWidth="sm">
       <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h2" component="h1" gutterBottom color="error">
          403 - Доступ запрещен
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          У вас недостаточно прав для просмотра этой страницы.
        </Typography>
        <Button component={RouterLink} to="/events" variant="contained">
          Вернуться на главную
        </Button>
      </Box>
    </Container>
  );
}
export default ForbiddenPage;