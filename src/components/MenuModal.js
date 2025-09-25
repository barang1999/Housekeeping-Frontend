import React from 'react';
import { Drawer, Box, Typography, List, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteIcon from '@mui/icons-material/Delete';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import AccountCircleIcon from '@mui/icons-material/AccountCircle'; // For profile icon

const MenuModal = ({ isOpen, onClose, onLogout, onCleanLog, onClearLog, user }) => {
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
        
     
        <List>
          <ListItemButton onClick={onCleanLog}>
            <ListItemIcon>
              <CleaningServicesIcon />
            </ListItemIcon>
            <ListItemText primary="Clean Log" />
          </ListItemButton>
          <ListItemButton onClick={onClearLog}>
            <ListItemIcon>
              <DeleteIcon />
            </ListItemIcon>
            <ListItemText primary="Clear Log" />
          </ListItemButton>
        </List>
        <Divider />
        <List>
          <ListItemButton onClick={onLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Log Out" />
          </ListItemButton>
        </List>
      </Box>
    </Drawer>
  );
};

export default MenuModal;