import React, { useState } from 'react';
import Room from './Room';
import InspectionPopup from './InspectionPopup';
import { Box, Grid } from '@mui/material';

const floors = {
    "ground-floor": ["001", "002", "003", "004", "005", "006", "007", "011", "012", "013", "014", "015", "016", "017"],
    "second-floor": ["101", "102", "103", "104", "105", "106", "107", "108", "109", "110", "111", "112", "113", "114", "115", "116", "117"],
    "third-floor": ["201", "202", "203", "204", "205", "208", "209", "210", "211", "212", "213", "214", "215", "216", "217"]
};

const RoomsContainer = ({ selectedFloor, cleaningStatus, dndStatus, priorities, inspectionLogs, roomNotes, socket, onRoomStatusChange }) => {
    console.log('RoomsContainer re-rendering with inspectionLogs:', inspectionLogs);
    const [inspectionRoom, setInspectionRoom] = useState(null);

    const handleOpenInspection = (roomNumber) => {
        setInspectionRoom(roomNumber);
        
    };

    const handleCloseInspection = () => {
        setInspectionRoom(null);
        
    };

    return (
        <Box sx={{ flexGrow: 1, px: 0, py: 2, maxWidth: { xs: '100%', sm: 720 }, mx: 'auto' }}>
            <Grid container spacing={1}>
                {floors[selectedFloor].map(roomNumber => (
                    <Grid item xs={12} key={roomNumber}>
                        <Room 
                            roomNumber={roomNumber} 
                            cleaningStatus={cleaningStatus[roomNumber]?.status}
                            startTime={cleaningStatus[roomNumber]?.startTime}
                            dndStatus={dndStatus[roomNumber]}
                            priority={priorities[roomNumber]}
                            inspectionLog={inspectionLogs.find(log => String(log.roomNumber).padStart(3, '0') === roomNumber)}
                            roomNote={roomNotes[roomNumber]}
                            socket={socket}
                            onOpenInspection={handleOpenInspection}
                            onRoomStatusChange={onRoomStatusChange} // Pass the callback to Room
                        />
                    </Grid>
                ))}
            </Grid>
            {inspectionRoom && (
                <InspectionPopup 
                    open={!!inspectionRoom}
                    key={inspectionRoom} // Add key to force remount on inspectionRoom change
                    roomNumber={inspectionRoom}
                    onClose={handleCloseInspection}
                />
            )}
        </Box>
    );
};

export default RoomsContainer;