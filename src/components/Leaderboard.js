import React, { useState, useEffect } from 'react';

import apiUrl from '../api/baseApiClient';

import { Box, Typography, List, ListItem, ListItemText, Paper } from '@mui/material';

const Leaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${apiUrl}/score/leaderboard`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const data = await response.json();
                setLeaderboard(data);
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
            }
        };

        fetchLeaderboard();

        // Optional: Poll for new leaderboard data every minute
        const interval = setInterval(fetchLeaderboard, 60000);

        return () => clearInterval(interval);
    }, []);

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h4" component="h2" gutterBottom>
                Leaderboard
            </Typography>
            <Paper elevation={3} sx={{ mt: 2 }}>
                <List>
                    {leaderboard.map((user, index) => (
                        <ListItem key={user._id}>
                            <ListItemText primary={`${index + 1}. ${user._id} - ${user.count} points`} />
                        </ListItem>
                    ))}
                </List>
            </Paper>
        </Box>
    );
};

export default Leaderboard;