import React, { useState } from 'react';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { Home, ClipboardList, CheckSquare, Award } from 'lucide-react';
import BoltIcon from '@mui/icons-material/Bolt';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { useTranslation } from '../i18n/LanguageProvider';

const BottomNavBar = ({ onTabChange }) => {
  const [value, setValue] = useState(0);
  const { t } = useTranslation();

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
        <BottomNavigationAction label={t('nav.floor', 'Floor')} icon={<Home />} />
        <BottomNavigationAction label={t('nav.log', 'Log')} icon={<ClipboardList />} />
        <BottomNavigationAction label={t('nav.live', 'Live')} icon={<BoltIcon />} />
        <BottomNavigationAction label={t('nav.inspection', 'Inspection')} icon={<AssignmentTurnedInIcon />} />
        <BottomNavigationAction label={t('nav.rank', 'Rank')} icon={<Award />} />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNavBar;
