import React, { useState, useEffect } from 'react';

import apiUrl from '../api/baseApiClient';

import { Box, Typography, List, ListItem, ListItemText, Paper } from '@mui/material';
import { useTranslation } from '../i18n/LanguageProvider';

const Leaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const { t } = useTranslation();

    useEffect(() => {
        let mounted = true;
        const POLL_INTERVAL = 300000; // 5 minutes

        const fetchLeaderboard = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${apiUrl}/score/leaderboard`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const data = await response.json();
                if (mounted) {
                    setLeaderboard(data);
                }
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
            }
        };

        fetchLeaderboard();

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchLeaderboard();
            }
        }, POLL_INTERVAL);

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchLeaderboard();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            mounted = false;
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h4" component="h2" gutterBottom>
                {t('leaderboard.title', 'Leaderboard')}
            </Typography>
            <Paper elevation={3} sx={{ mt: 2 }}>
                <List>
                    {leaderboard.map((user, index) => (
                        <ListItem key={user._id}>
                            <ListItemText
                                primary={t('leaderboard.entry', '{rank}. {name} - {points} points', {
                                    rank: index + 1,
                                    name: user._id,
                                    points: user.count,
                                })}
                            />
                        </ListItem>
                    ))}
                </List>
            </Paper>
        </Box>
    );
};

export default Leaderboard;
