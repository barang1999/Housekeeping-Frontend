import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Button, IconButton, Slider, Modal, Fade, Backdrop } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { fetchInspectionLogByRoom, submitInspection } from '../api/logsApiClient'; // Import API helpers
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from '../i18n/LanguageProvider';


const InspectionPopup = ({ roomNumber, open, onClose }) => {
    const { t } = useTranslation();
    const inspectionItems = useMemo(() => ([
        { key: 'TV', emoji: '📺', label: t('inspection.item.tv', 'TV') },
        { key: 'Sofa', emoji: '🛋️', label: t('inspection.item.sofa', 'Sofa') },
        { key: 'Lamp', emoji: '💡', label: t('inspection.item.lamp', 'Lamp') },
        { key: 'Light', emoji: '🔆', label: t('inspection.item.light', 'Light') },
        { key: 'Amenity', emoji: '🧴', label: t('inspection.item.amenity', 'Amenity') },
        { key: 'Complimentary', emoji: '🍬', label: t('inspection.item.complimentary', 'Complimentary') },
        { key: 'Balcony', emoji: '🏞️', label: t('inspection.item.balcony', 'Balcony') },
        { key: 'Sink', emoji: '🚿', label: t('inspection.item.sink', 'Sink') },
        { key: 'Door', emoji: '🚪', label: t('inspection.item.door', 'Door') },
        { key: 'Minibar', emoji: '🍾', label: t('inspection.item.minibar', 'Minibar') },
    ]), [t]);
    const [inspectionResults, setInspectionResults] = useState({});
    const [normalizedScore, setNormalizedScore] = useState(0);

    const handleInspection = (itemKey, result) => {
        setInspectionResults(prevResults => {
            const currentResult = prevResults[itemKey];
            if (currentResult === result) {
                const newResults = { ...prevResults };
                delete newResults[itemKey];
                return newResults;
            } else {
                return {
                    ...prevResults,
                    [itemKey]: result
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
            const result = inspectionResults[item.key];
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
        try {
            await submitInspection({
                roomNumber,
                inspectionResults,
                overallScore: normalizedScore,
                timestamp: new Date().toISOString(),
            });
            handleCloseBottomSheet();
        } catch (error) {
            console.error('Error submitting inspection data:', error);
        }
    };

    const handleCloseBottomSheet = () => {
        onClose();
    };

    const handleClear = () => {
        setInspectionResults({});
        setNormalizedScore(0);
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
                        aria-label={t('inspection.aria.close', 'close')}
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
                        {t('inspection.title', 'Inspection for Room {room}', { room: roomNumber })}
                    </Typography>
                    <List sx={{ flexGrow: 1 }}>
                        {inspectionItems.map(item => {
                            const result = inspectionResults[item.key];
                            return (
                                <ListItem key={item.key} disablePadding>
                                    <ListItemText primary={`${item.emoji} ${item.label}`} />
                                    <Box>
                                        <IconButton
                                            onClick={() => handleInspection(item.key, 'passed')}
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
                                            onClick={() => handleInspection(item.key, 'failed')}
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
                                aria-label={t('inspection.sliderLabel', 'Overall Score')}
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
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                        <Button variant="outlined" color="warning" onClick={handleClear}>
                            {t('inspection.button.clear', 'Clear')}
                        </Button>
                        <Button variant="contained" onClick={handleSubmit}>
                            {t('inspection.button.submit', 'Submit')}
                        </Button>
                    </Box>
                </Box>
            </Fade>
        </Modal>
    );
};

export default InspectionPopup;
