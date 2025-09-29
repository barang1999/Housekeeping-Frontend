import React, { useState, useEffect, useMemo } from 'react';
import { startCleaning as apiStartCleaning, finishCleaning as apiFinishCleaning, checkRoom as apiCheckRoom, setRoomDNDStatus, updateRoomNotes } from '../api/logsApiClient';
import ConfirmationModal from '../ui/ConfirmationModal';

// MUI Imports
import { Card, Typography, Button, Box, IconButton, Dialog, DialogTitle, DialogContent, Tooltip } from '@mui/material';
import ClipboardEditIcon from '@mui/icons-material/EditNote';
import BanIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import DoNotDisturbOnOutlinedIcon from '@mui/icons-material/DoNotDisturbOnOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CloseIcon from '@mui/icons-material/Close';
import RoomNotesMenu from './RoomNotesMenu';
import { useTranslation } from '../i18n/LanguageProvider';

const Room = ({ roomNumber, cleaningStatus, startTime, dndStatus = 'available', priority, inspectionLog, roomNote, socket, onOpenInspection, onRoomStatusChange }) => {
    console.log(`Room ${roomNumber} re-rendering with inspectionLog:`, inspectionLog);
    const [isStarting, setIsStarting] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [roomToConfirm, setRoomToConfirm] = useState(null);
    const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);
    const [roomToConfirmFinish, setRoomToConfirmFinish] = useState(null);
    const [showCheckConfirmModal, setShowCheckConfirmModal] = useState(false);
    const [roomToConfirmCheck, setRoomToConfirmCheck] = useState(null);
    const [notes, setNotes] = useState(roomNote || null);
    const username = localStorage.getItem('username');
    const [activeNoteIcon, setActiveNoteIcon] = useState(null);
    const [isChecking, setIsChecking] = useState(false);
    const [previousStatusBeforeCheck, setPreviousStatusBeforeCheck] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        let interval;
        if (cleaningStatus === 'in_progress' && startTime) {
            const start = new Date(startTime).getTime();
            const updateElapsedTime = () => {
                const now = Date.now();
                const seconds = Math.floor((now - start) / 1000);
                setElapsedTime(seconds);
            };

            updateElapsedTime(); // Update immediately
            interval = setInterval(updateElapsedTime, 1000); // Then update every second
        } else {
            setElapsedTime(0);
        }

        return () => clearInterval(interval);
    }, [cleaningStatus, startTime]);

    const hasInspectionData = !!inspectionLog;
    const inspectionScore = typeof inspectionLog?.overallScore === 'number' ? inspectionLog.overallScore : null;
    const inspectionIconColor = inspectionScore !== null && inspectionScore > 0
        ? (inspectionScore > 90 ? 'success' : inspectionScore < 50 ? 'error' : 'warning')
        : 'default';

    const statusColor = dndStatus === 'dnd'
        ? 'error.main'
        : cleaningStatus === 'in_progress'
        ? 'warning.main'
        : cleaningStatus === 'finished'
        ? 'info.main'
        : cleaningStatus === 'checked'
        ? 'success.main'
        : 'text.secondary';

    const noteIconMap = {
      'Early arrival': BoltOutlinedIcon,
      'Sunrise': WbSunnyOutlinedIcon,
      'No arrival': DoNotDisturbOnOutlinedIcon,
      'Allow after time': ScheduleOutlinedIcon,
    };

    const isTodayInPhnomPenh = (timestamp) => {
        if (!timestamp) return false;
        try {
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Phnom_Penh',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
            const today = formatter.format(new Date());
            const noteDate = formatter.format(new Date(timestamp));
            return today === noteDate;
        } catch (error) {
            console.error('Error comparing note date:', error);
            return false;
        }
    };

    const todayNote = useMemo(() => {
        if (!notes || !isTodayInPhnomPenh(notes.updatedAt)) {
            return null;
        }
        return notes;
    }, [notes]);

    const getActiveNoteIcon = () => {
        if (!todayNote) return { Icon: null, color: 'default' };
        if (todayNote.afterTime) return { Icon: ScheduleOutlinedIcon, color: 'info' }; // blue
        if (todayNote.tags?.includes('Early arrival')) return { Icon: BoltOutlinedIcon, color: 'warning' }; // orange
        if (todayNote.tags?.includes('Sunrise')) return { Icon: WbSunnyOutlinedIcon, color: 'error' }; // red
        if (todayNote.tags?.includes('No arrival')) return { Icon: DoNotDisturbOnOutlinedIcon, color: 'default' }; // black
        return { Icon: null, color: 'default' };
      };

      useEffect(() => {
        const { Icon, color } = getActiveNoteIcon();
        setActiveNoteIcon(Icon ? <Icon fontSize="small" color={color} /> : null);
      }, [todayNote]);

      useEffect(() => {
        setNotes(roomNote || null);
      }, [roomNote]);

      const handleOpenNoteDialog = () => {
        if (todayNote?.note || todayNote?.afterTime) {
            setIsNoteDialogOpen(true);
        }
      };

      const handleCloseNoteDialog = () => {
        setIsNoteDialogOpen(false);
      };
    
      const handleNoteSave = async (payload) => {
        setNotes(prev => ({
            ...prev,
            ...payload,
            lastUpdatedBy: username || prev?.lastUpdatedBy || '',
            updatedAt: new Date().toISOString(),
        })); // optimistic local update with metadata
        try {
            const updated = await updateRoomNotes(roomNumber, payload);
            setNotes(updated);
        } catch (error) {
            console.error('Error updating room notes:', error);
            // Optionally, revert the state if the API call fails
        }
      };

    const handleStartClick = () => {
        if (!username || cleaningStatus === 'in_progress' || cleaningStatus === 'finished' || cleaningStatus === 'checked' || dndStatus === 'dnd') {
            return;
        }
        setRoomToConfirm(roomNumber);
        setShowConfirmModal(true);
    };

    const confirmStartCleaning = async () => {
        setShowConfirmModal(false);
        if (isStarting) {
            return;
        }

        setIsStarting(true);
        const previousStatus = cleaningStatus; // Store current status for potential revert

        try {
            onRoomStatusChange(roomToConfirm, 'in_progress'); // Optimistic UI update
            await apiStartCleaning(roomToConfirm);
        } catch (error) {
            console.error('Error starting cleaning:', error);
            // Revert UI on error
            onRoomStatusChange(roomToConfirm, previousStatus);
            if (error.message && !error.message.includes('already being cleaned')) {
                setIsStarting(false);
            }
        } finally {
            setIsStarting(false); // Ensure button is re-enabled after API call (success or failure)
        }
    };

    const cancelStartCleaning = () => {
        setShowConfirmModal(false);
        setRoomToConfirm(null);
    };

    const handleFinishClick = () => {
        if (isFinishing || cleaningStatus !== 'in_progress' || dndStatus === 'dnd') {
            return;
        }
        setRoomToConfirmFinish(roomNumber);
        setShowFinishConfirmModal(true);
    };

    const confirmFinishCleaning = async () => {
        setShowFinishConfirmModal(false);
        if (isFinishing) {
            return;
        }
        setIsFinishing(true);
        const previousStatus = cleaningStatus; // Store current status for potential revert

        try {
            onRoomStatusChange(roomToConfirmFinish, 'finished'); // Optimistic UI update
            await apiFinishCleaning(roomToConfirmFinish, username);
        } catch (error) {
            console.error('Error finishing cleaning:', error);
            // Revert UI on error
            onRoomStatusChange(roomToConfirmFinish, previousStatus);
            if (error.message && !error.message.includes('already finished')) {
                setIsFinishing(false);
            }
        } finally {
            setIsFinishing(false); // Ensure button is re-enabled after API call (success or failure)
        }
    };

    const cancelFinishCleaning = () => {
        setShowFinishConfirmModal(false);
        setRoomToConfirmFinish(null);
    };

    const toggleDND = async () => {
        console.log('toggleDND called for room:', roomNumber);
        const newDndStatus = dndStatus !== 'dnd'; // Toggle DND status

        try {
            await setRoomDNDStatus(roomNumber, newDndStatus, username);
            // The backend will emit a websocket event, which App.js will catch and update state.
        } catch (error) {
            console.error('Error toggling DND status:', error);
            alert(t('room.alert.dndFail', 'Failed to update DND status.'));
        }
    };

    const updatePriority = (newPriority) => {
        if (socket) {
            socket.emit('updatePriority', { roomNumber, priority: newPriority });
        }
    };

    const handleCheckClick = () => {
        if (!username || cleaningStatus !== 'finished' || hasInspectionData || dndStatus === 'dnd') {
            return;
        }
        setRoomToConfirmCheck(roomNumber);
        setPreviousStatusBeforeCheck(cleaningStatus);
        setShowCheckConfirmModal(true);
    };

    const confirmCheckRoom = async () => {
        setShowCheckConfirmModal(false);
        if (isChecking || !roomToConfirmCheck) {
            return;
        }

        setIsChecking(true);
        const targetRoom = roomToConfirmCheck;
        const previousStatus = previousStatusBeforeCheck ?? cleaningStatus;

        try {
            onRoomStatusChange(targetRoom, 'checked'); // Optimistic UI update
            await apiCheckRoom(targetRoom, username);
        } catch (error) {
            console.error('Error checking room:', error);
            onRoomStatusChange(targetRoom, previousStatus); // Revert UI on error
        } finally {
            setIsChecking(false);
            setRoomToConfirmCheck(null);
            setPreviousStatusBeforeCheck(null);
        }
    };

    const cancelCheckRoom = () => {
        setShowCheckConfirmModal(false);
        setRoomToConfirmCheck(null);
        setPreviousStatusBeforeCheck(null);
    };

    const bottomBorderStyle = useMemo(() => {
        if (hasInspectionData && inspectionScore !== null) {
            const score = inspectionScore || 0;
            const red = '#d32f2f';
            const yellow = '#f57c00';
            const green = '#43a047';

            const inspectedCount = inspectionLog.items ? Object.keys(inspectionLog.items).length : 0;
            const totalItems = 10; // Assuming 10 total items as in InspectionPopup.js
            const widthPercentage = totalItems > 0 ? (inspectedCount / totalItems) * 100 : 0;

            let background;
            if (score === 100) {
                const lighterGreen = '#66bb6a';
                background = `linear-gradient(to right, ${green}, ${lighterGreen}, ${green})`;
            } else if (score === 0) {
                const lighterRed = '#ef5350';
                background = `linear-gradient(to right, ${red}, ${lighterRed}, ${red})`;
            } else if (score < 50) {
                const percentage = (score / 50) * 100;
                background = `linear-gradient(to right, ${red}, ${yellow} ${percentage}%)`;
            } else { // 50 <= score < 100
                const percentage = ((score - 50) / 50) * 100;
                background = `linear-gradient(to right, ${yellow}, ${green} ${percentage}%)`;
            }

            return {
                width: `${widthPercentage}%`,
                background: background,
                animation: 'gradient 2s linear infinite',
                backgroundSize: '200% 100%',
            };
        }

        // Fallback for no inspection data
        return {
            width: '0%',
            background: 'transparent',
            animation: 'none',
        };
    }, [hasInspectionData, inspectionScore, inspectionLog]);

    return (
        <>
            <Card
                sx={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: 0.75,
                    p: 1.5,
                    mb: 0.75,
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12), 0 2px 10px rgba(15, 23, 42, 0.06)',
                    borderRadius: 2,
                    borderLeft: cleaningStatus === 'in_progress' ? 0 : 4,
                    borderColor: cleaningStatus === 'in_progress' ? 'transparent' : (
                        dndStatus === 'dnd' ? 'error.main' :
                        cleaningStatus === 'finished' ? 'info.main' :
                        (cleaningStatus === 'checked' || hasInspectionData) ? 'success.main' :
                        'grey.200'
                    ),
                    bgcolor: 'rgba(255, 255, 255, 0.64)',
                    // border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(12)',
                    WebkitBackdropFilter: 'blur(12px)',
                    transition: 'box-shadow 0.2s ease, transform 0.15s ease',
                    '&:hover': { boxShadow: '0 12px 40px rgba(15, 23, 42, 0.14), 0 4px 16px rgba(15, 23, 42, 0.08)' },
                    position: 'relative',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: '-2px', left: '-2px', right: '-2px', bottom: '-2px',
                        borderRadius: 'inherit',
                        background: 'linear-gradient(to right, #ffab00, #ffea00, #ffab00)',
                        backgroundSize: '200% 100%',
                        animation: 'gradient 3s linear infinite',
                        zIndex: -1,
                        display: cleaningStatus === 'in_progress' ? 'block' : 'none',
                    },
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        height: '2px',
                        borderBottomLeftRadius: '2px',
                        borderBottomRightRadius: '2px',
                        ...bottomBorderStyle,
                    },
                    '@keyframes gradient': {
                        '0%': {
                            backgroundPosition: '0% 50%',
                        },
                        '50%': {
                            backgroundPosition: '100% 50%',
                        },
                        '100%': {
                            backgroundPosition: '0% 50%',
                        },
                    },
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography
                            variant="body1"
                            component="div"
                            sx={{ fontWeight: 600, letterSpacing: 0.2, color: statusColor }}
                        >
                            {roomNumber}
                        </Typography>
                        <RoomNotesMenu
                            roomNumber={roomNumber}
                            value={todayNote}
                            iconSize="small"
                            triggerIcon={activeNoteIcon}
                            onSave={handleNoteSave}
                        />
                        {cleaningStatus === 'in_progress' && (
                            <Typography variant="caption" sx={{ ml: 1 }}>
                                {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Button
                        variant="outlined" // Outlined for a cleaner look
                        color="info" // Changed to info for light blue
                        size="small" // Smaller buttons
                        onClick={handleStartClick}
                        disabled={isStarting || !username || cleaningStatus === 'in_progress' || cleaningStatus === 'finished' || cleaningStatus === 'checked' || dndStatus === 'dnd'}
                        sx={{ minWidth: 68, px: 1, py: 0.25, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    >
                        {t('room.button.start', 'Start')}
                    </Button>
                    <Button
                        variant="outlined"
                        color="success"
                        size="small"
                        onClick={handleFinishClick}
                        disabled={isFinishing || cleaningStatus !== 'in_progress' || dndStatus === 'dnd'}
                        sx={{ minWidth: 68, px: 1, py: 0.25, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    >
                        {t('room.button.finish', 'Finish')}
                    </Button>
                    <IconButton
                        color={inspectionIconColor}
                        size="small"
                        onClick={() => onOpenInspection(roomNumber)}
                        aria-label={t('room.aria.openInspection', 'Open Inspection')}
                        sx={{ width: 30, height: 30, '&:hover': { bgcolor: 'action.hover' } }}
                    >
                        <ClipboardEditIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                    <IconButton
                        color="success"
                        size="small"
                        onClick={handleCheckClick}
                        disabled={isChecking || cleaningStatus !== 'finished' || dndStatus === 'dnd'}
                        aria-label={t('room.aria.quickCheck', 'Quick Check Room')}
                        sx={{ width: 30, height: 30, '&:hover': { bgcolor: 'action.hover' } }}
                    >
                        <CheckIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                    
                    <IconButton
                        color={dndStatus === 'dnd' ? 'error' : 'default'}
                        size="small"
                        onClick={toggleDND}
                        aria-label={t('room.aria.toggleDnd', 'Toggle Do Not Disturb')}
                        sx={{
                            width: 30,
                            height: 30,
                            '&:hover': { bgcolor: 'action.hover' },
                        }}
                    >
                        <BanIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                    </Box>
                </Box>
                {(todayNote?.afterTime || todayNote?.note) && (
                    <Box
                        sx={{
                            bgcolor: 'rgba(15, 23, 42, 0.03)',
                            borderRadius: 1.5,
                            px: 1,
                            py: 0.75,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.4,
                        }}
                    >
                        {todayNote.afterTime && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontSize: '0.7rem', letterSpacing: 0.2 }}
                            >
                                {new Date(`1970-01-01T${todayNote.afterTime}:00`).toLocaleTimeString([], {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                })}
                            </Typography>
                        )}
                        {todayNote.note && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                <Typography
                                    variant="caption"
                                    color="text.primary"
                                    sx={{ fontSize: '0.8rem', lineHeight: 1.3, flexGrow: 1 }}
                                >
                                    {todayNote.note}
                                </Typography>
                                <Tooltip title={t('room.note.view', 'View')} arrow>
                                    <IconButton size="small" onClick={handleOpenNoteDialog}>
                                        <VisibilityOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}
                    </Box>
                )}
            </Card>
            <Dialog
                open={isNoteDialogOpen}
                onClose={handleCloseNoteDialog}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        backdropFilter: 'blur(18px)',
                        WebkitBackdropFilter: 'blur(18px)',
                        background: 'rgba(255,255,255,0.82)',
                        border: '1px solid rgba(255,255,255,0.4)',
                        boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
                        overflow: 'hidden',
                    },
                }}
            >
                <DialogTitle sx={{ position: 'relative', pb: 0.5 }}>
                    <Box>
                        <Typography variant="overline" sx={{ letterSpacing: 1.2, color: 'text.secondary' }}>
                            {t('room.note.heading', 'Room')}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {roomNumber}
                        </Typography>
                    </Box>
                    <IconButton
                        edge="end"
                        onClick={handleCloseNoteDialog}
                        aria-label={t('common.close', 'Close')}
                        sx={{ position: 'absolute', top: 8, right: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {todayNote?.afterTime && (
                        <Typography variant="body2" color="text.secondary">
                            {t('room.note.availableAfter', 'Available after {time}', {
                                time: new Date(`1970-01-01T${todayNote.afterTime}:00`).toLocaleTimeString([], {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                }),
                            })}
                        </Typography>
                    )}
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {todayNote?.note || t('room.note.empty', 'No note provided.')}
                    </Typography>
                    {todayNote?.lastUpdatedBy && (
                        <Typography variant="caption" color="text.secondary">
                            {t('room.note.lastUpdatedBy', 'Last updated by {user}', { user: todayNote.lastUpdatedBy })}
                        </Typography>
                    )}
                </DialogContent>
            </Dialog>
            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={cancelStartCleaning}
                onConfirm={confirmStartCleaning}
                title={t('room.confirm.start.title', 'Confirm Cleaning Start')}
                message={t('room.confirm.start.message', 'You are starting to clean room {room}!', { room: roomToConfirm || roomNumber })}
            />
            <ConfirmationModal
                isOpen={showFinishConfirmModal}
                onClose={cancelFinishCleaning}
                onConfirm={confirmFinishCleaning}
                title={t('room.confirm.finish.title', 'Confirm Cleaning Finish')}
                message={t('room.confirm.finish.message', 'You are finishing cleaning room {room}!', { room: roomToConfirmFinish || roomNumber })}
            />
            <ConfirmationModal
                isOpen={showCheckConfirmModal}
                onClose={cancelCheckRoom}
                onConfirm={confirmCheckRoom}
                title={t('room.confirm.check.title', 'Confirm Room Check')}
                message={t('room.confirm.check.message', 'You are marking room {room} as checked!', { room: roomToConfirmCheck || roomNumber })}
            />
        </>
    );
};

export default Room;
