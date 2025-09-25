import React, { useState, useEffect } from 'react';
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
    const [notes, setNotes] = useState(roomNote || null);
    const username = localStorage.getItem('username');
    const [activeNoteIcon, setActiveNoteIcon] = useState(null);


    const hasInspectionData = !!inspectionLog;

    const statusLabel = dndStatus === 'dnd'
        ? 'DND'
        : cleaningStatus === 'in_progress'
        ? 'In progress'
        : cleaningStatus === 'finished'
        ? 'Finished'
        : (cleaningStatus === 'checked' || hasInspectionData)
        ? 'Checked'
        : 'Idle';

    const statusColor = dndStatus === 'dnd'
        ? 'error.main'
        : cleaningStatus === 'in_progress'
        ? 'warning.main'
        : cleaningStatus === 'finished'
        ? 'info.main'
        : (cleaningStatus === 'checked' || hasInspectionData)
        ? 'success.main'
        : 'text.secondary';

    const noteIconMap = {
      'Early arrival': BoltOutlinedIcon,
      'Sunrise': WbSunnyOutlinedIcon,
      'No arrival': DoNotDisturbOnOutlinedIcon,
      'Allow after time': ScheduleOutlinedIcon,
    };

    const getActiveNoteIcon = () => {
        if (!notes) return { Icon: null, color: 'default' };
        if (notes.afterTime) return { Icon: ScheduleOutlinedIcon, color: 'info' }; // blue
        if (notes.tags?.includes('Early arrival')) return { Icon: BoltOutlinedIcon, color: 'warning' }; // orange
        if (notes.tags?.includes('Sunrise')) return { Icon: WbSunnyOutlinedIcon, color: 'error' }; // red
        if (notes.tags?.includes('No arrival')) return { Icon: DoNotDisturbOnOutlinedIcon, color: 'default' }; // black
        return { Icon: null, color: 'default' };
      };
    
      useEffect(() => {
        const { Icon, color } = getActiveNoteIcon();
        setActiveNoteIcon(Icon ? <Icon fontSize="small" color={color} /> : null);
      }, [notes]);

      useEffect(() => {
        setNotes(roomNote || null);
      }, [roomNote]);
    
      const handleNoteSave = async (payload) => {
        setNotes(payload); // optimistic local update
        try {
            await updateRoomNotes(roomNumber, payload);
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

    const checkRoom = async () => {
        console.log('Attempting to check room:', roomNumber, 'by user:', username);
        const previousStatus = cleaningStatus; // Store current status for potential revert
        try {
            onRoomStatusChange(roomNumber, 'checked'); // Optimistic UI update
            await apiCheckRoom(roomNumber, username);
        } catch (error) {
            console.error('Error checking room:', error);
            onRoomStatusChange(roomNumber, previousStatus); // Revert UI on error
        }
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
                    bgcolor: 'background.paper',
                    transition: 'box-shadow 0.2s ease, transform 0.15s ease',
                    '&:hover': { boxShadow: 2 },
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
                    {statusLabel !== 'Idle' && (
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, color: statusColor, fontSize: '0.72rem', mt: 0, pt: 0, lineHeight: 1.1 }}
                      >
                        {statusLabel}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body1" component="div" sx={{ fontWeight: 600, letterSpacing: 0.2 }}>
                        {roomNumber}
                      </Typography>
                      <RoomNotesMenu
                        roomNumber={roomNumber}
                        value={notes}
                        iconSize="small"
                        triggerIcon={activeNoteIcon}
                        onSave={handleNoteSave}
                      />
                    </Box>
                    {(notes?.afterTime || notes?.note) && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mt: -0.25 }}>
                        {notes.afterTime && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }} noWrap>
                            {new Date(`1970-01-01T${notes.afterTime}:00`).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </Typography>
                        )}
                        {notes.note && (
                          <Typography variant="caption" color="text.primary" sx={{ fontSize: '0.8rem', fontWeight: 400 }} noWrap>
                            {notes.note}
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
                        color={hasInspectionData ? "success" : "info"}
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
                        onClick={checkRoom}
                        disabled={cleaningStatus !== 'finished' || hasInspectionData || dndStatus === 'dnd'}
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
        </>
    );
};

export default Room;
