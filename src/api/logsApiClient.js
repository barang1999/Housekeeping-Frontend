import { api } from './baseApiClient';

const getAuthToken = () => localStorage.getItem('token');

export const startCleaning = async (roomNumber) => {
    try {
        const response = await fetch(api('/api/logs/start'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ roomNumber: parseInt(roomNumber, 10) }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error starting cleaning log:', error);
        throw error;
    }
};

export const finishCleaning = async (roomNumber, username) => {
    try {
        const response = await fetch(api('/api/logs/finish'), {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ roomNumber: parseInt(roomNumber, 10), username, status: "finished" }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error finishing cleaning log:', error);
        throw error;
    }
};

export const checkRoom = async (roomNumber, username) => {
    const response = await fetch(api('/api/logs/check'), {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ roomNumber: parseInt(roomNumber, 10), username }),
    });
    return response.json();
};

export const resetCleaning = async (roomNumber) => {
    try {
        const response = await fetch(api('/api/logs/reset-cleaning'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ roomNumber: parseInt(roomNumber, 10) }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error resetting cleaning log:', error);
        throw error;
    }
};

export const clearAllLogs = async () => {
    try {
        const response = await fetch(api('/api/logs/clear'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error clearing all logs:', error);
        throw error;
    }
};

export const fetchLogs = async ({ status = 'all', dateFilter = 'all' }) => {
    try {
        const url = new URL(api('/api/logs'));
        if (status !== 'all') {
            url.searchParams.append('status', status);
        }
        if (dateFilter !== 'all') {
            url.searchParams.append('dateFilter', dateFilter);
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Network response was not ok');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching logs:', error);
        throw error;
    }
};

export const setRoomDNDStatus = async (roomNumber, dndStatus, usernameParam) => {
    try {
        // Allow caller to pass username explicitly; otherwise fall back to localStorage
        const username = usernameParam || localStorage.getItem('username');
        const payload = { roomNumber: parseInt(roomNumber, 10), dndStatus };
        if (username) payload.username = username; // mirror Finish API style

        const response = await fetch(api('/api/logs/dnd'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error setting DND status:', error);
        throw error;
    }
};

export const fetchDNDRooms = async () => {
    try {
        const response = await fetch(api('/api/logs/dnd'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching DND rooms:', error);
        throw error;
    }
};

export const fetchInspectionLogByRoom = async (roomNumber) => {
    try {
        const response = await fetch(api(`/api/logs/inspection/${roomNumber}`), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
        });
        if (response.status === 404) {
            return null; // No log found for this room
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching inspection log for room ${roomNumber}:`, error);
        throw error;
    }
};

export const fetchRoomNotes = async () => {
    try {
        const response = await fetch(api('/api/logs/notes'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching room notes:', error);
        throw error;
    }
};

export const updateRoomNotes = async (roomNumber, notes) => {
    try {
        const response = await fetch(api('/api/logs/notes'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ roomNumber, notes }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error updating room notes:', error);
        throw error;
    }
};

export const fetchLiveFeedActivity = async () => {
    try {
        const response = await fetch(api('/api/logs/live-feed'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching live feed activity:', error);
        throw error;
    }
};
