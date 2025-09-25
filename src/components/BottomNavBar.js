import React, { useState } from 'react';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { Home, ClipboardList, CheckSquare, Award } from 'lucide-react';
import BoltIcon from '@mui/icons-material/Bolt';

const BottomNavBar = ({ onTabChange }) => {
  const [value, setValue] = useState(0);

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      <BottomNavigation
        showLabels
        value={value}
        onChange={(event, newValue) => {
          setValue(newValue);
          onTabChange(newValue);
        }}
        sx={{
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            flex: 1,
            padding: '4px 0',
            margin: 0,
          },
        }}
      >
        <BottomNavigationAction label="Floor" icon={<Home />} />
        <BottomNavigationAction label="Log" icon={<ClipboardList />} />
        <BottomNavigationAction label="Live" icon={<BoltIcon />} />
        <BottomNavigationAction label="Task" icon={<CheckSquare />} />
        <BottomNavigationAction label="Rank" icon={<Award />} />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNavBar;