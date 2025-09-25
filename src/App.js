import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import UserProfile from './components/UserProfile';
import Header from './components/Header';
import FloorTabs from './components/FloorTabs';
import RoomsContainer from './components/RoomsContainer';
import LogsContainer from './components/LogsContainer';
import LiveFeed from './components/LiveFeed';
import Leaderboard from './components/Leaderboard';
import BottomNavBar from './components/BottomNavBar'; // Import BottomNavBar
import './App.css';

import apiUrl from './api/baseApiClient';

import { refreshToken, ensureValidToken, login, signup } from './api/authApiClient';
import { fetchRoomNotes } from './api/logsApiClient';

// MUI Imports
import { Button, Typography, Box } from '@mui/material'; // Removed Container from import

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState(localStorage.getItem("username"));
  const [selectedFloor, setSelectedFloor] = useState('ground-floor');
  const [socket, setSocket] = useState(null);
  const [cleaningStatus, setCleaningStatus] = useState({});
  const [dndStatus, setDndStatus] = useState({});
  const [priorities, setPriorities] = useState({});
  const [inspectionLogs, setInspectionLogs] = useState([]);
  const [roomNotes, setRoomNotes] = useState({});
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
const [currentView, setCurrentView] = useState(0); // 0: Floor, 1: Live, 2: Log, 3: Task, 4: Rank

  useEffect(() => {
    const validateTokenAndConnect = async () => {
        const validToken = await ensureValidToken();
        if (validToken) {
            setToken(validToken);
            console.log("[socket] connecting", { url: apiUrl, path: "/socketio" });
            const newSocket = io(apiUrl, {
                path: "/socketio",
                auth: { token: validToken },
                reconnection: true,
                reconnectionAttempts: 5,
                timeout: 5000
            });

            setSocket(newSocket);

            newSocket.on("connect", () => {
                console.log("WebSocket connected");
                newSocket.emit("requestInitialData");
            });

            newSocket.on("initialData", (data) => {
                setCleaningStatus(data.cleaningStatus || {});
                setDndStatus(data.dndStatus || {});
                setPriorities(data.priorities || {});
                setInspectionLogs(data.inspectionLogs || []);
                setRoomNotes(data.roomNotes || {});
                setIsLoadingInitialData(false);
            });

            newSocket.on("roomUpdate", ({ roomNumber, status }) => {
                setCleaningStatus(prevStatus => ({ ...prevStatus, [roomNumber]: status }));
            });

            newSocket.on("roomChecked", ({ roomNumber, status }) => {
                setCleaningStatus(prevStatus => ({ ...prevStatus, [roomNumber]: status }));
            });

            newSocket.on("dndUpdate", ({ roomNumber, dndStatus }) => {
                setDndStatus(prevStatus => ({ ...prevStatus, [roomNumber]: dndStatus ? 'dnd' : 'available' }));
            });

            newSocket.on("priorityUpdate", ({ roomNumber, priority }) => {
                setPriorities(prevPriorities => ({ ...prevPriorities, [roomNumber]: priority }));
            });

            newSocket.on("inspectionUpdate", (logs) => {
                setInspectionLogs(logs);
            });

            newSocket.on("noteUpdate", ({ roomNumber, notes }) => {
                setRoomNotes(prevNotes => ({ ...prevNotes, [roomNumber]: notes }));
            });

            // Add this logic to handle day change
            let today = new Date().getDate();
            const dayChangeInterval = setInterval(() => {
                const now = new Date();
                if (now.getDate() !== today) {
                    console.log("New day detected. Fetching new data.");
                    today = now.getDate();
                    // Reset states
                    setCleaningStatus({});
                    setDndStatus({});
                    setPriorities({});
                    setInspectionLogs([]);
                    setRoomNotes({});
                    setIsLoadingInitialData(true);
                    // Request new data
                    newSocket.emit("requestInitialData");
                }
            }, 60000); // Check every minute

            return () => {
                newSocket.disconnect();
                clearInterval(dayChangeInterval); // Clear interval on cleanup
            };
        } else {
            handleLogout();
        }
    };

    validateTokenAndConnect();

  }, [token]);

  // --- Web Push registration & subscription ---
  useEffect(() => {
    async function setupPush() {
      console.log("[push] starting setup", {
        hasSW: "serviceWorker" in navigator,
        hasPM: "PushManager" in window,
        secureContext: typeof window !== "undefined" ? window.isSecureContext : "n/a",
        hasToken: !!token,
        username
      });
      try {
        // Only run in supported browsers and when authenticated
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          console.warn("[push] browser does not support ServiceWorker/PushManager", {
            isSecureContext: typeof window !== "undefined" ? window.isSecureContext : "n/a",
            origin: typeof window !== "undefined" ? window.location.origin : "n/a"
          });
          return;
        }
        if (typeof window !== "undefined" && !window.isSecureContext) {
          console.warn("[push] page is not in a secure context (HTTPS or localhost required)", {
            origin: window.location.origin
          });
          return;
        }
        if (!token || !username) return;

        // Ask user's permission (no-op if previously granted/denied)
        const permission = await Notification.requestPermission();
        console.log("[push] permission =", permission);
        if (permission !== "granted") return;

        // Register service worker (ensure /public/sw.js exists in your CRA build)
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("[push] SW registered:", registration.scope);

        // Fetch VAPID public key from backend
        const resp = await fetch(`${apiUrl}/api/push/public-key`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const { publicKey } = await resp.json();
        console.log("[push] VAPID publicKey =", publicKey && (publicKey.slice(0, 12) + "…"));
        if (!publicKey) {
          console.warn("[push] No VAPID public key from server");
          return;
        }

        // Subscribe (idempotent-ish; will reuse existing subscription if possible)
        const existing = await registration.pushManager.getSubscription();
        const subscription =
          existing ||
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          }));
        console.log("[push] subscription endpoint =", subscription?.endpoint);

        // Send subscription to backend
        const saveResp = await fetch(`${apiUrl}/api/push/subscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            subscription,
            username
          })
        });
        console.log("[push] subscribe response:", saveResp.status);

        // Optional: receive SW messages (e.g., to deep-link to a room)
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event?.data?.type === "NAVIGATE_ROOM") {
            const rn = event?.data?.roomNumber;
            console.log("[push] NAVIGATE_ROOM", rn);
            // TODO: if you later add a router, navigate to the target room here.
          }
        });
      } catch (e) {
        console.warn("[push] setup failed", e?.message || e);
      }
    }
    setupPush();
  }, [token, username]);

  // Helper to convert VAPID key
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    const loginUsername = e.target.username.value;
    const loginPassword = e.target.password.value;

    const result = await login(loginUsername, loginPassword);
    if (result.success) {
      setToken(result.token);
      setUsername(result.username);
      console.log("Login successful");
    } else {
      alert("Login failed: " + result.message);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    const signupUsername = e.target.username.value;
    const signupPassword = e.target.password.value;

    const result = await signup(signupUsername, signupPassword);
    if (result.success) {
      alert("Signup successful! Please log in.");
    } else {
      alert("Signup failed: " + result.message);
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken(null);
    setUsername(null);
    console.log("User logged out.");
  };

  const handleOptimisticRoomStatusUpdate = (roomNumber, newStatus) => {
    setCleaningStatus(prevStatus => ({
      ...prevStatus,
      [roomNumber]: newStatus
    }));
  };

  const handleTabChange = (newValue) => {
    setCurrentView(newValue);
  };

  if (!token) {
    return (
      <div className="auth-container">
        <div id="auth-section" className="auth-card">
          <form id="login-form" onSubmit={handleLogin}>
            <h2>Login</h2>
            <input type="text" name="username" placeholder="Username" id="login-username" required />
            <input type="password" name="password" placeholder="Password" id="login-password" required />
            <button type="submit">Login</button>
          </form>
          <form id="signup-form" onSubmit={handleSignUp} className="hidden">
              <h2>Sign Up</h2>
              <input type="text" name="username" placeholder="Username" id="signup-username" required />
              <input type="password" name="password" placeholder="Password" id="signup-password" required />
              <button type="submit">Sign Up</button>
          </form>
          <button id="toggle-auth" className="toggle-auth-btn" onClick={() => document.getElementById('signup-form').classList.toggle('hidden')}>
              Don't have an account? Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <Box
      id="dashboard"
      sx={{
        pb: 9,
        minHeight: '100vh',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          backgroundColor: 'grey.200',
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.16) 0, rgba(255, 255, 255, 0.14) 2px, transparent 2px, transparent 6px)',
          backgroundSize: '8px 8px'
        }
      }}
    >
      <Header onLogout={handleLogout} />
      <main style={{ paddingTop: '64px', paddingBottom: '20px' }}>
        {currentView === 0 && (
          <>
            <FloorTabs selectedFloor={selectedFloor} setSelectedFloor={setSelectedFloor} />
            {isLoadingInitialData ? (
              <Typography variant="h6" sx={{ textAlign: 'center', mt: 4 }}>Loading rooms data...</Typography>
            ) : (
              <RoomsContainer 
                selectedFloor={selectedFloor} 
                cleaningStatus={cleaningStatus}
                dndStatus={dndStatus}
                priorities={priorities}
                inspectionLogs={inspectionLogs}
                roomNotes={roomNotes}
                socket={socket}
                onRoomStatusChange={handleOptimisticRoomStatusUpdate}
              />
            )}
          </>
        )}
       
        {currentView === 1 && <LogsContainer />}
         {currentView === 2 && <LiveFeed socket={socket} />}
        {currentView === 3 && <Box sx={{ p: 2 }}><Typography variant="h6">Task View (Coming Soon!)</Typography></Box>}
        {currentView === 4 && <Leaderboard />}
      </main>
      <BottomNavBar onTabChange={handleTabChange} />
    </Box>
  );
}

export default App;
