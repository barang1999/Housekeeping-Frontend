import React from 'react';
import { Drawer, Box, Typography, List, ListItemButton, ListItemIcon, ListItemText, Divider, ListItem } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteIcon from '@mui/icons-material/Delete';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import AccountCircleIcon from '@mui/icons-material/AccountCircle'; // For profile icon
import { useTranslation } from '../i18n/LanguageProvider';
import LanguageSwitcher from './LanguageSwitcher';

const MenuModal = ({ isOpen, onClose, onLogout, onCleanLog, onClearLog, user }) => {
  const { t } = useTranslation();
  return (
    <Drawer
      anchor="left" // Or 'left', 'top', 'bottom'
      open={isOpen}
      onClose={onClose}
    >
      <Box
        sx={{ width: 300 }}
        role="presentation"
        onClick={onClose}
        onKeyDown={onClose}
      >
        <List sx={{ pt: 1 }}>
          <ListItem sx={{ px: 2 }}>
            <LanguageSwitcher />
          </ListItem>
        </List>
        <Divider />
        <List>
          <ListItemButton onClick={onCleanLog}>
            <ListItemIcon>
              <CleaningServicesIcon />
            </ListItemIcon>
            <ListItemText primary={t('menu.cleanLog', 'Clean Log')} />
          </ListItemButton>
          <ListItemButton onClick={onClearLog}>
            <ListItemIcon>
              <DeleteIcon />
            </ListItemIcon>
            <ListItemText primary={t('menu.clearLog', 'Clear Log')} />
          </ListItemButton>
        </List>
        <Divider />
        <List>
          <ListItemButton onClick={onLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary={t('menu.logOut', 'Log Out')} />
          </ListItemButton>
        </List>
      </Box>
    </Drawer>
  );
};

export default MenuModal;
