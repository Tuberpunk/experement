// Содержимое файла: src/components/StatusChip.js
import React from 'react';
import Chip from '@mui/material/Chip'; // Импортируем Chip из MUI
import PropTypes from 'prop-types'; // Для описания типов props

const StatusChip = ({ status }) => {
  let color = 'default';
  let label = status || 'Неизвестно';

  switch (status) {
    case 'Запланировано':
      color = 'info'; // Или 'primary', 'secondary'
      break;
    case 'Проведено':
      color = 'success';
      break;
    case 'Не проводилось (Отмена)':
      color = 'error';
      break;
    default:
      color = 'default'; // Например, серый
  }

  // size="small" делает чип компактнее, можно убрать при необходимости
  return <Chip label={label} color={color} size="small" variant="outlined"/>; // Добавлен variant="outlined" для лучшей читаемости
};

// Описание типов props
StatusChip.propTypes = {
  status: PropTypes.oneOf(['Запланировано', 'Проведено', 'Не проводилось (Отмена)', null, undefined, '']),
};

export default StatusChip;