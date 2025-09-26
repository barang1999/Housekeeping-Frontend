import React, { useState, useRef, useEffect } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useTranslation } from '../i18n/LanguageProvider';

const FloorTabs = ({ selectedFloor, setSelectedFloor }) => {
  const [lockedFloor, setLockedFloor] = useState(() => {
    return localStorage.getItem('lockedFloor') || null;
  });
  const timerRef = useRef();
  const { t } = useTranslation();

  useEffect(() => {
    const storedLockedFloor = localStorage.getItem('lockedFloor');
    if (storedLockedFloor) {
      setSelectedFloor(storedLockedFloor);
    }
  }, [setSelectedFloor]);

  useEffect(() => {
    if (lockedFloor) {
      localStorage.setItem('lockedFloor', lockedFloor);
    } else {
      localStorage.removeItem('lockedFloor');
    }
  }, [lockedFloor]);

  const handlePressStart = (floorValue) => {
    timerRef.current = setTimeout(() => {
      if (lockedFloor === floorValue) {
        setLockedFloor(null);
      } else if (lockedFloor === null) {
        setLockedFloor(floorValue);
        setSelectedFloor(floorValue); // Also select the floor when locking
      }
    }, 500); // 500ms for long press
  };

  const handlePressEnd = () => {
    clearTimeout(timerRef.current);
  };

  const handleChange = (event, newValue) => {
    if (lockedFloor === null || lockedFloor === newValue) {
      setSelectedFloor(newValue);
    }
  };

  const floors = [
    { label: t('floor.ground', 'Ground Floor'), value: 'ground-floor' },
    { label: t('floor.second', 'Second Floor'), value: 'second-floor' },
    { label: t('floor.third', 'Third Floor'), value: 'third-floor' },
  ];

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs value={selectedFloor} onChange={handleChange} aria-label={t('floor.tabsAria', 'floor tabs')} centered>
        {floors.map(floor => (
          <Tab
            key={floor.value}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {lockedFloor === floor.value && <LockIcon sx={{ mr: 1 }} fontSize="small" />}
                {floor.label}
              </Box>
            }
            value={floor.value}
            sx={{ fontWeight: 600 }}
            onMouseDown={() => handlePressStart(floor.value)}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={() => handlePressStart(floor.value)}
            onTouchEnd={handlePressEnd}
            disabled={lockedFloor !== null && lockedFloor !== floor.value}
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default FloorTabs;
