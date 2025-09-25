import React, { useState, useEffect } from 'react';

import { fetchLogs } from '../api/logsApiClient';

import { Box, Typography, Card, CardContent, Grid, Chip, Stack, Fab } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LogsContainer = () => {
    const [logs, setLogs] = useState([]);
    const [filterStatus, setFilterStatus] = useState('all');
    const [dateFilter, setDateFilter] = useState('today');

    const statusOptions = [
        { label: 'All', value: 'all' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Finished', value: 'finished' },
        { label: 'Checked', value: 'checked' },
        { label: 'Available', value: 'available' },
    ];

    const dateFilterOptions = [
        { label: 'All', value: 'all' },
        { label: 'Today', value: 'today' },
        { label: 'Yesterday', value: 'yesterday' },
        { label: 'This Week', value: 'this_week' },
        { label: 'This Month', value: 'this_month' },
    ];

    useEffect(() => {
        const getLogs = async () => {
            try {
                const data = await fetchLogs({ status: filterStatus, dateFilter });
                setLogs(data);
            } catch (error) {
                console.error("Error fetching logs:", error);
            }
        };

        getLogs();

        // Optional: Poll for new logs every 30 seconds
        const interval = setInterval(getLogs, 30000);

        return () => clearInterval(interval);
    }, [filterStatus, dateFilter]);

    const handleExport = () => {
        const doc = new jsPDF();
        autoTable(doc, {
            head: [['Date', 'Room Number', 'Start Time', 'Started By', 'Finish Time', 'Finished By', 'Duration (minutes)']],
            body: logs.map(log => {
                const startTime = new Date(log.startTime);
                const finishTime = log.finishTime ? new Date(log.finishTime) : null;
                let duration = '-';
                if (finishTime) {
                    const durationInMillis = finishTime - startTime;
                    duration = Math.round(durationInMillis / 60000); // Convert to minutes
                }

                return [
                    startTime.toLocaleDateString(),
                    log.roomNumber,
                    startTime.toLocaleTimeString(),
                    log.startedBy,
                    finishTime ? finishTime.toLocaleTimeString() : '-',
                    log.finishedBy || '-',
                    duration,
                ];
            }),
        });
        doc.save('cleaning_logs.pdf');
    };

    return (
        <Box sx={{ p: 2 }}>
          

            <Stack direction="row" spacing={1} sx={{ mb: 1, overflowX: 'auto' }}>
                {dateFilterOptions.map((option) => (
                    <Chip
                        key={option.value}
                        label={option.label}
                        clickable
                        color={dateFilter === option.value ? 'primary' : 'default'}
                        onClick={() => setDateFilter(option.value)}
                        sx={{ minWidth: '80px' }}
                    />
                ))}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto' }}>
                {statusOptions.map((option) => (
                    <Chip
                        key={option.value}
                        label={option.label}
                        clickable
                        color={filterStatus === option.value ? 'primary' : 'default'}
                        onClick={() => setFilterStatus(option.value)}
                        sx={{ minWidth: '80px' }}
                    />
                ))}
            </Stack>

            <Grid container spacing={2}>
                {logs.map(log => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={log._id}>
                        <Card
                          sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 2,
                            boxShadow: 1,
                            bgcolor: 'background.paper',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            '&:hover': { boxShadow: 2, transform: 'translateY(-2px)' },
                            p: 0.5,
                          }}
                        >
                          <CardContent sx={{
                            flex: 1,
                            px: 1,
                            py: 0,
                            '&:last-child': { pb: 0 }
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                              <Typography variant="subtitle1" fontWeight={600} sx={{ letterSpacing: 0.2 }}>
                                Room {log.roomNumber}
                              </Typography>
                              <Chip
                                label={log.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                color={
                                  log.status === 'in_progress' ? 'warning' :
                                  log.status === 'finished' ? 'info' :
                                  log.status === 'checked' ? 'success' : 'default'
                                }
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            </Box>

                            <Box sx={{ display: 'grid', rowGap: 0.1 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                                <strong>User:</strong> {log.startedBy || log.finishedBy || log.checkedBy || '-'}
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                                  <strong>Start:</strong> {new Date(log.startTime).toLocaleTimeString()}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                                  <strong>Finish:</strong> {log.finishTime ? new Date(log.finishTime).toLocaleTimeString() : '-'}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
            <Fab
                color="primary"
                aria-label="export"
                sx={{
                    position: 'fixed',
                    bottom: 80,
                    right: 16,
                }}
                onClick={handleExport}
            >
                <FileDownloadIcon />
            </Fab>
        </Box>
    );
};

export default LogsContainer;