import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Button, IconButton, Paper, Slider, Modal, Fade, Backdrop } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { fetchInspectionLogByRoom } from '../api/logsApiClient'; // Import the new API function
import CloseIcon from '@mui/icons-material/Close';


const InspectionPopup = ({ roomNumber, open, onClose }) => {
    const inspectionItems = [
        { name: "TV", emoji: "📺" },
        { name: "Sofa", emoji: "🛋️" },
        { name: "Lamp", emoji: "💡" },
        { name: "Light", emoji: "🔆" },
        { name: "Amenity", emoji: "🧴" },
        { name: "Complimentary", emoji: "🍬" },
        { name: "Balcony", emoji: "🏞️" },
        { name: "Sink", emoji: "🚿" },
        { name: "Door", emoji: "🚪" },
        { name: "Minibar", emoji: "🍾" },
    ];
    const [inspectionResults, setInspectionResults] = useState({});
    const [normalizedScore, setNormalizedScore] = useState(0);

    const handleInspection = (itemName, result) => {
        setInspectionResults(prevResults => {
            const currentResult = prevResults[itemName];
            if (currentResult === result) {
                const newResults = { ...prevResults };
                delete newResults[itemName];
                return newResults;
            } else {
                return {
                    ...prevResults,
                    [itemName]: result
                };
            }
        });
    };

    const calculateOverallRate = () => {
        const totalItems = inspectionItems.length;
        if (totalItems === 0) {
            setNormalizedScore(0);
            return;
        }

        let passedCount = 0;
        let failedCount = 0;

        for (const item of inspectionItems) {
            const result = inspectionResults[item.name];
            if (result === 'passed') {
                passedCount++;
            } else if (result === 'failed') {
                failedCount++;
            }
        }

        const inspectedCount = Object.keys(inspectionResults).length;

        if (inspectedCount === 0) {
            setNormalizedScore(0);
            return;
        }

        const rawScore = (passedCount - failedCount) / totalItems;
        const newNormalizedScore = (rawScore + 1) * 50;
        setNormalizedScore(newNormalizedScore);
    };

    useEffect(() => {
        if (open && roomNumber) {
            const fetchInspectionLog = async () => {
                try {
                    const data = await fetchInspectionLogByRoom(roomNumber);
                    if (data) {
                        setInspectionResults(data.items || {});
                        setNormalizedScore(data.overallScore || 0);
                    } else { // data is null if 404
                        setInspectionResults({});
                        setNormalizedScore(0);
                    }
                } catch (error) {
                    console.error('Error fetching inspection log:', error);
                    alert('An error occurred while loading inspection data.');
                    setInspectionResults({});
                    setNormalizedScore(0);
                }
            };

            fetchInspectionLog();
        } else if (!open) {
            // When modal closes, reset state
            setInspectionResults({});
            setNormalizedScore(0);
        }
    }, [open, roomNumber]); // Depend on open and roomNumber

    useEffect(() => {
        calculateOverallRate();
    }, [inspectionResults]);
    console.log('InspectionPopup rendering. roomNumber prop:', roomNumber); // Add this log

    const handleSubmit = async () => {
        const inspectionData = {
            roomNumber,
            inspectionResults,
            overallScore: normalizedScore,
            timestamp: new Date().toISOString(),
        };
        console.log('handleSubmit called. inspectionData.roomNumber:', inspectionData.roomNumber); // Add this log

        const token = localStorage.getItem('token'); // Retrieve token from localStorage
        if (!token) {
            alert('You are not logged in. Please log in to submit inspection data.');
            return;
        }

        try {
            const response = await fetch('/api/inspection/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, // Add Authorization header
                body: JSON.stringify(inspectionData),
            });

            if (response.ok) {
                alert('Inspection data submitted successfully!');
                handleCloseBottomSheet(); // Use the new handler
            } else {
                const errorData = await response.json();
                alert(`Failed to submit inspection data: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Error submitting inspection data:', error);
            alert('An error occurred while submitting inspection data.');
        }
    };

    const handleCloseBottomSheet = () => {
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={handleCloseBottomSheet}
            closeAfterTransition
            BackdropComponent={Backdrop}
            BackdropProps={{
                timeout: 500,
            }}
        >
            <Fade in={open}>
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        maxWidth: 600, // Increased for more flexibility
                        width: '100%',
                        bgcolor: 'rgba(255, 255, 255, 0.94)', // Semi-transparent white for glassy effect
                        boxShadow: 24,
                        p: 4,
                        display: 'flex',
                        backdropFilter: 'blur(30px)', // Apply blur effect
                        flexDirection: 'column',
                        maxHeight: '100vh', // Limit height for scrollable content
                        overflowY: 'auto', // Enable scrolling if content overflows
                    }}
                >
                    <IconButton
                        aria-label="close"
                        onClick={handleCloseBottomSheet} // Use the new handler
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                    <Typography id="inspection-modal-title" variant="h6" component="h2" gutterBottom>
                        Inspection for Room {roomNumber}
                    </Typography>
                    <List sx={{ flexGrow: 1 }}>
                        {inspectionItems.map(item => {
                            const result = inspectionResults[item.name];
                            return (
                                <ListItem key={item.name} disablePadding>
                                    <ListItemText primary={`${item.emoji} ${item.name}`} />
                                    <Box>
                                        <IconButton
                                            onClick={() => handleInspection(item.name, 'passed')}
                                            color={result === 'passed' ? 'success' : 'default'}
                                            sx={{ marginRight: 2 }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 25, // Even smaller width for the circle
                                                    height: 25, // Even smaller height for the circle
                                                    borderRadius: '50%',
                                                    border: result === 'passed' ? '2px solid green' : 'none',
                                                }}
                                            >
                                                <CheckIcon fontSize="small" />
                                            </Box>
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleInspection(item.name, 'failed')}
                                            color={result === 'failed' ? 'error' : 'default'}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 25, // Even smaller width for the circle
                                                    height: 25, // Even smaller height for the circle
                                                    borderRadius: '50%',
                                                    border: result === 'failed' ? '2px solid red' : 'none',
                                                }}
                                            >
                                                <CloseIcon fontSize="small" />
                                            </Box>
                                        </IconButton>
                                    </Box>
                                </ListItem>
                            );
                        })}
                    </List>
                                        <Box sx={{ mt: 2 }}>

                            <Slider
                                value={normalizedScore}
                                aria-label="Overall Score"
                                valueLabelDisplay="auto"
                                valueLabelFormat={(value) => `${value.toFixed(0)}%`}
                                step={1}
                                marks
                                min={0}
                                max={100}
                                disabled
                                sx={{
                                    '& .MuiSlider-track': {
                                        background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00)', // Red to Yellow to Green
                                        border: 'none', // Remove default border
                                    },
                                    '& .MuiSlider-rail': {
                                        background: '#e0e0e0', // Light grey for the rail
                                    },
                                }}
                            />
                        </Box>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" onClick={handleSubmit}>
                            Submit
                        </Button>
                    </Box>
                </Box>
            </Fade>
        </Modal>
    );
};

export default InspectionPopup;