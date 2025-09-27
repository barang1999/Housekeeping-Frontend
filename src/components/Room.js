import React, { useState, useEffect, useMemo } from 'react';
import { startCleaning as apiStartCleaning, finishCleaning as apiFinishCleaning, checkRoom as apiCheckRoom, setRoomDNDStatus, updateRoomNotes } from '../api/logsApiClient';
import ConfirmationModal from '../ui/ConfirmationModal';

// MUI Imports
import { Card, CardContent, Typography, Button, Box, IconButton, Chip } from '@mui/material';
import SparklesIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import ClipboardEditIcon from '@mui/icons-material/EditNote';
import BanIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import DoNotDisturbOnOutlinedIcon from '@mui/icons-material/DoNotDisturbOnOutlined';
import RoomNotesMenu from './RoomNotesMenu';
import { useTranslation } from '../i18n/LanguageProvider';

const Room = ({ roomNumber, cleaningStatus, startTime, dndStatus = 'available', priority, inspectionLog, roomNote, socket, onOpenInspection, onRoomStatusChange }) => {
    
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

    return (
        <>
            <Card
                sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 0.75,
                    mb: 0.75,
                    boxShadow: 1,
                    borderRadius: 2,
                    borderLeft: 4,
                    borderColor:
                        dndStatus === 'dnd' ? 'error.main' :
                        cleaningStatus === 'in_progress' ? 'transparent' : // Use transparent for the gradient to show
                        cleaningStatus === 'finished' ? 'info.main' :
                        (cleaningStatus === 'checked' || hasInspectionData) ? 'success.main' :
                        'grey.200',
                    bgcolor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    transition: 'box-shadow 0.2s ease, transform 0.15s ease',
                    '&:hover': { boxShadow: 2 },
                    ...(cleaningStatus === 'in_progress' && {
                        position: 'relative',
                        overflow: 'hidden',
                        borderWidth: '0px',
                        borderStyle: 'solid',
                        borderColor: 'transparent',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            border: '2px solid transparent',
                            borderRadius: '8px',
                            background: 'linear-gradient(to right, #ffab00, #ffea00, #ffab00) border-box',
                            WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                            WebkitMaskComposite: 'destination-out',
                            maskComposite: 'exclude',
                            animation: 'gradient 3s linear infinite',
                            backgroundSize: '200% 100%',
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
                    }),
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
                   
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
                    {(todayNote?.afterTime || todayNote?.note) && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mt: -0.25 }}>
                        {todayNote.afterTime && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }} noWrap>
                            {new Date(`1970-01-01T${todayNote.afterTime}:00`).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </Typography>
                        )}
                        {todayNote.note && (
                          <Typography variant="caption" color="text.primary" sx={{ fontSize: '0.8rem', fontWeight: 400 }} noWrap>
                            {todayNote.note}
                          </Typography>
                        )}
                      </Box>
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
                        disabled={isChecking || cleaningStatus !== 'finished' || hasInspectionData || dndStatus === 'dnd'}
                        aria-label={t('room.aria.quickCheck', 'Quick Check Room')}
                        sx={{ width: 30, height: 30, '&:hover': { bgcolor: 'action.hover' } }}
                    >
                        <CheckIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                    
                    <IconButton
                        color={dndStatus === 'dnd' ? 'error' : 'default'}
                        size="small"
                        onClick={toggleDND}
                        disabled={cleaningStatus === 'in_progress' || cleaningStatus === 'finished' || cleaningStatus === 'checked'}
                        aria-label={t('room.aria.toggleDnd', 'Toggle Do Not Disturb')}
                        sx={{
                            width: 30,
                            height: 30,
                            '&:hover': { bgcolor: 'action.hover' },
                            ...(cleaningStatus === 'in_progress' || cleaningStatus === 'finished' || cleaningStatus === 'checked' ? { color: 'lightgrey' } : {})
                        }}
                    >
                        <BanIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </Box>
            </Card>
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
