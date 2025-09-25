import React, { useState } from 'react';
import { Box, Avatar, Typography, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Divider, ListItemIcon } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout'; // Import LogoutIcon

const UserProfile = ({ onLogout }) => {
  const username = localStorage.getItem('username');
  const [openDrawer, setOpenDrawer] = useState(false);

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setOpenDrawer(open);
  };

  const handleLogoutClick = () => {
    setOpenDrawer(false);
    onLogout();
  };

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      p: 1,
    }}>
      <Typography variant="subtitle1">{username}</Typography>
      <IconButton
        size="large"
        aria-label="account of current user"
        aria-controls="menu-appbar"
        aria-haspopup="true"
        onClick={toggleDrawer(true)}
        color="inherit"
      >
        <AccountCircleIcon />
      </IconButton>
      <Drawer
        anchor="right"
        open={openDrawer}
        onClose={toggleDrawer(false)}
      >
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountCircleIcon fontSize="large" />
            <Typography variant="h6">
              {username ? username : 'Guest'}
            </Typography>
          </Box>
          <Divider />
          <List>
            <ListItemButton onClick={handleLogoutClick}>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Log Out" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
    </Box>
  );
};

export default UserProfile;
