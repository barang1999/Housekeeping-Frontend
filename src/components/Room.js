import React, { useState, useEffect, useMemo } from 'react';
import { startCleaning as apiStartCleaning, finishCleaning as apiFinishCleaning, checkRoom as apiCheckRoom, setRoomDNDStatus, updateRoomNotes } from '../api/logsApiClient';
import ConfirmationModal from '../ui/ConfirmationModal';

// MUI Imports
import { Card, CardContent, Typography, Button, Box, IconButton, Divider, Chip } from '@mui/material';
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

const Room = ({ roomNumber, cleaningStatus, dndStatus, priority, inspectionLog, roomNote, socket, onOpenInspection, onRoomStatusChange }) => {
    
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


    const hasInspectionData = !!inspectionLog;
    const inspectionScore = typeof inspectionLog?.overallScore === 'number' ? inspectionLog.overallScore : null;
    const inspectionIconColor = inspectionScore !== null && inspectionScore > 0
        ? (inspectionScore > 90 ? 'success' : inspectionScore < 50 ? 'error' : 'warning')
        : 'default';

    const statusLabel = dndStatus === 'dnd'
        ? 'DND'
        : cleaningStatus === 'in_progress'
        ? 'In progress'
        : cleaningStatus === 'finished'
        ? 'Finished'
        : cleaningStatus === 'checked'
        ? 'Checked'
        : 'Idle';

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
            alert('Failed to update DND status.');
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
                        cleaningStatus === 'in_progress' ? 'warning.main' :
                        cleaningStatus === 'finished' ? 'info.main' :
                        (cleaningStatus === 'checked' || hasInspectionData) ? 'success.main' :
                        'grey.200',
                    bgcolor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    transition: 'box-shadow 0.2s ease, transform 0.15s ease',
                    '&:hover': { boxShadow: 2 },
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
                        Start
                    </Button>
                    <Button
                        variant="outlined"
                        color="success"
                        size="small"
                        onClick={handleFinishClick}
                        disabled={isFinishing || cleaningStatus !== 'in_progress' || dndStatus === 'dnd'}
                        sx={{ minWidth: 68, px: 1, py: 0.25, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    >
                        Finish
                    </Button>
                    <IconButton
                        color={inspectionIconColor}
                        size="small"
                        onClick={() => onOpenInspection(roomNumber)}
                        aria-label="Open Inspection"
                        sx={{ width: 30, height: 30, '&:hover': { bgcolor: 'action.hover' } }}
                    >
                        <ClipboardEditIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                    <IconButton
                        color="success"
                        size="small"
                        onClick={handleCheckClick}
                        disabled={isChecking || cleaningStatus !== 'finished' || hasInspectionData || dndStatus === 'dnd'}
                        aria-label="Quick Check Room"
                        sx={{ width: 30, height: 30, '&:hover': { bgcolor: 'action.hover' } }}
                    >
                        <CheckIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                    
                    <IconButton
                        color={dndStatus === 'dnd' ? 'error' : 'default'}
                        size="small"
                        onClick={toggleDND}
                        disabled={cleaningStatus === 'in_progress' || cleaningStatus === 'finished' || cleaningStatus === 'checked'}
                        aria-label="Toggle Do Not Disturb"
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
                title="Confirm Cleaning Start"
                message={`You are starting to clean room ${roomToConfirm}!`}
            />
            <ConfirmationModal
                isOpen={showFinishConfirmModal}
                onClose={cancelFinishCleaning}
                onConfirm={confirmFinishCleaning}
                title="Confirm Cleaning Finish"
                message={`You are finishing cleaning room ${roomToConfirmFinish}!`}
            />
            <ConfirmationModal
                isOpen={showCheckConfirmModal}
                onClose={cancelCheckRoom}
                onConfirm={confirmCheckRoom}
                title="Confirm Room Check"
                message={`You are marking room ${roomToConfirmCheck || roomNumber} as checked!`}
            />
        </>
    );
};

export default Room;
