import React, { useState } from 'react';
import MenuModal from './MenuModal';
import UserProfile from './UserProfile'; // Import UserProfile
import { resetCleaning, clearAllLogs } from '../api/logsApiClient';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '../i18n/LanguageProvider';

// MUI Imports
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Box from '@mui/material/Box';

const Header = ({ onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleCleanLog = async () => {
    const roomNumber = prompt(t('header.prompt.resetRoom', 'Enter room number to reset cleaning status:'));
    if (roomNumber) {
      try {
        await resetCleaning(roomNumber);
        alert(t('header.alert.cleanSuccess', 'Cleaning status for room {room} reset.', { room: roomNumber }));
      } catch (error) {
        alert(t('header.alert.cleanFail', 'Failed to reset cleaning status: {error}', { error: error.message }));
      }
    }
  };

  const handleClearLog = async () => {
    if (window.confirm(t('header.confirm.clearLogs', 'Are you sure you want to clear all logs?'))) {
      try {
        await clearAllLogs();
        alert(t('header.alert.clearSuccess', 'All logs cleared.'));
      } catch (error) {
        alert(t('header.alert.clearFail', 'Failed to clear all logs: {error}', { error: error.message }));
      }
    }
  };

  console.log('[Header Debug] Rendering Header component');

  return (
    <AppBar position="fixed" sx={{ borderRadius: 0, backgroundColor: '#f5f5f5', color: 'black', width: '100%', left: 0, right: 0 }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0, py: 0, minHeight: 5, height: 40, width: '100% !important' }}>
        {console.log('[Header Debug] Toolbar rendering with space-between')}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleMenu}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <UserProfile onLogout={onLogout} />
        </Box>
      </Toolbar>
      <MenuModal
        isOpen={isMenuOpen}
        onClose={toggleMenu}
        onLogout={onLogout}
        onCleanLog={handleCleanLog}
        onClearLog={handleClearLog}
      />
    </AppBar>
  );
};

export default Header;
