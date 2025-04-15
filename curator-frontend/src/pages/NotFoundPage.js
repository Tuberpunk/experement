// src/pages/NotFoundPage.js
import React from 'react';
import { Typography, Container, Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

function NotFoundPage() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h1" component="h1" gutterBottom>
          404
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          Страница не найдена
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          К сожалению, запрошенная вами страница не существует.
        </Typography>
        <Button component={RouterLink} to="/events" variant="contained">
          Вернуться на главную
        </Button>
      </Box>
    </Container>
  );
}
export default NotFoundPage;