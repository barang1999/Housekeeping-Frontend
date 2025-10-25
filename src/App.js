import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Header from './components/Header';
import FloorTabs from './components/FloorTabs';
import RoomsContainer from './components/RoomsContainer';
import LogsContainer from './components/LogsContainer';
import InspectionContainer from './components/InspectionContainer';
import LiveFeed from './components/LiveFeed';
import Leaderboard from './components/Leaderboard';
import BottomNavBar from './components/BottomNavBar'; // Import BottomNavBar
import './App.css';

import apiUrl from './api/baseApiClient';

import { ensureValidToken, login, signup } from './api/authApiClient';
import { Typography, Box, CircularProgress } from '@mui/material'; // Moved to top to satisfy import/first

// Wake the Railway backend before attempting socket connect (autosleep friendly)
async function wakeServer(baseUrl) {
  try {
    await fetch(`${baseUrl}/api/ping`, { method: 'GET', cache: 'no-store' });
  } catch (e) {
    console.warn('[wakeServer] failed', e?.message || e);
  }
}


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
  const [currentView, setCurrentView] = useState(0); // 0: Floor, 1: Logs, 2: Live, 3: Task, 4: Rank, 5: Inspection
  const [isConnecting, setIsConnecting] = useState(true);
  const [wantSocket, setWantSocket] = useState(false); // connect only when tab is visible

  useEffect(() => {
    const onVis = () => {
      const visible = document.visibilityState === 'visible';
      console.log('[debug] visibility changed →', document.visibilityState, 'wantSocket:', visible);
      setWantSocket(visible);
    };
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    console.log('[debug] useEffect(token, wantSocket)', { token: !!token, wantSocket });
    const validateTokenAndConnect = async () => {
      const validToken = await ensureValidToken();
      if (validToken && wantSocket) {
        console.log('[debug] establishing socket connection');
        setToken(validToken);
        console.log("[socket] connecting", { url: apiUrl, path: "/socketio" });
        setIsConnecting(true);
        await wakeServer(apiUrl);
        const newSocket = io(apiUrl, {
          path: "/socketio",
          transports: ["websocket"], // match server config; avoid polling 400s
          auth: { token: validToken },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 500,
          reconnectionDelayMax: 5000,
          timeout: 10000
        });

        newSocket.on("connect_error", (err) => {
          console.warn('[socket] connect_error', err?.message || err);
        });
        newSocket.on("error", (err) => {
          console.warn('[socket] error', err?.message || err);
        });

        setSocket(newSocket);
      } else if (!validToken) {
        console.log('[debug] no valid token → logging out');
        handleLogout();
      } else {
        console.log('[debug] socket disabled due to tab not visible');
      }
    };

    validateTokenAndConnect();
  }, [token, wantSocket]);

  useEffect(() => {
    if (!socket) return;
    console.log('[debug] socket instance exists →', socket.connected, 'wantSocket:', wantSocket);
    // If tab becomes hidden, drop the connection to free resources
    if (!wantSocket) {
      console.log('[debug] disconnecting socket because tab hidden');
      try { socket.disconnect(); } catch {}
      return;
    }

    socket.on("connect", () => {
        console.log("WebSocket connected");
        setIsConnecting(false);
        socket.emit("requestInitialData");
    });

    socket.on("disconnect", (reason) => {
        console.log("WebSocket disconnected", reason);
        setIsConnecting(true);
    });
    socket.on("reconnect_attempt", (n) => {
        console.log('[socket] reconnect_attempt', n);
        setIsConnecting(true);
    });
    socket.on("reconnect", (n) => {
        console.log('[socket] reconnected', n);
        setIsConnecting(false);
    });
    socket.on("connect_error", () => setIsConnecting(true));
    socket.on("error", () => setIsConnecting(true));

    socket.on("initialData", (data) => {
        setCleaningStatus(data.cleaningStatus || {});
        setDndStatus(data.dndStatus || {});
        setPriorities(data.priorities || {});
        setInspectionLogs(data.inspectionLogs || []);
        setRoomNotes(data.roomNotes || {});
        setIsLoadingInitialData(false);
    });

    socket.on("roomUpdate", ({ roomNumber, status, startTime }) => {
        setCleaningStatus(prevStatus => ({ ...prevStatus, [roomNumber]: { status, startTime } }));
    });

    socket.on("roomChecked", ({ roomNumber, status }) => {
        setCleaningStatus(prevStatus => ({
            ...prevStatus,
            [roomNumber]: { ...prevStatus[roomNumber], status }
        }));
    });

    socket.on("dndUpdate", ({ roomNumber, dndStatus }) => {
        console.log('dndUpdate event received:', { roomNumber, dndStatus });
        setDndStatus(prevStatus => ({ ...prevStatus, [roomNumber]: dndStatus ? 'dnd' : 'available' }));
    });

    socket.on("priorityUpdate", ({ roomNumber, priority }) => {
        setPriorities(prevPriorities => ({ ...prevPriorities, [roomNumber]: priority }));
    });

    socket.on("inspectionUpdate", ({ roomNumber, log }) => {
        console.log('inspectionUpdate event received:', { roomNumber, log });
        if (!log) return;
        setInspectionLogs(prevLogs => {
            const existingLogIndex = prevLogs.findIndex(entry => String(entry.roomNumber).padStart(3, '0') === String(roomNumber).padStart(3, '0'));

            if (existingLogIndex !== -1) {
                return prevLogs.map((entry, index) =>
                    index === existingLogIndex ? { ...entry, ...log } : entry
                );
            } else {
                return [...prevLogs, log];
            }
        });
    });

    socket.on("noteUpdate", ({ roomNumber, notes }) => {
        setRoomNotes(prevNotes => ({ ...prevNotes, [roomNumber]: notes }));
    });

    // Listen for the daily reset event from the server
    socket.on('dailyReset', () => {
        console.log('Daily reset triggered from server. Refetching data...');
        // Reset states
        setCleaningStatus({});
        setDndStatus({});
        setPriorities({});
        setInspectionLogs([]);
        setRoomNotes({});
        setIsLoadingInitialData(true);
        // Request new data
        socket.emit("requestInitialData");
    });

    return () => {
        socket.off("connect");
        socket.off("initialData");
        socket.off("roomUpdate");
        socket.off("roomChecked");
        socket.off("dndUpdate");
        socket.off("priorityUpdate");
        socket.off("inspectionUpdate");
        socket.off("noteUpdate");
        socket.off("dailyReset");
        socket.off("disconnect");
        socket.off("reconnect_attempt");
        socket.off("reconnect");
        socket.off("connect_error");
        socket.off("error");
    };
  }, [socket, wantSocket]);

  useEffect(() => {
    const goToInspection = () => setCurrentView(5);
    window.addEventListener('navigateInspection', goToInspection);
    return () => window.removeEventListener('navigateInspection', goToInspection);
  }, []);

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
        [roomNumber]: { ...prevStatus[roomNumber], status: newStatus }
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
  pb: 12,
  minHeight: '100vh',
  position: 'relative',
  // texture layer (furthest back)
  '&::before': {
    content: '""',
    position: 'fixed',
    inset: 0,
    zIndex: -2,
    backgroundColor: 'white.200',
    backgroundImage:
      'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.18), transparent 55%), repeating-linear-gradient(45deg, rgba(255,255,255,0.16) 0, rgba(255,255,255,0.14) 2px, transparent 2px, transparent 6px)',
    backgroundSize: '100% 100%, 8px 8px',
    backgroundBlendMode: 'normal, overlay'
  },
  // logo layer (on top of texture, still behind content)
  '&::after': {
    content: '""',
    position: 'fixed',
    inset: 0,
    zIndex: -1,
    pointerEvents: 'none',
    backgroundImage: 'url(/adaptive-icon.png)',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'min(80vmin, 100%)',
    opacity: 0.07,
    mixBlendMode: 'multiply',
  }
}}
    >
      <Header onLogout={handleLogout} />
      <main style={{ paddingTop: '64px', paddingBottom: '40px' }}>
        {currentView === 0 && (
          <>
            <FloorTabs selectedFloor={selectedFloor} setSelectedFloor={setSelectedFloor} />
            {isLoadingInitialData || Object.keys(cleaningStatus).length === 0 ? (
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
        {currentView === 3 && <InspectionContainer />}
        {currentView === 4 && <Leaderboard />}
      
      </main>
      <BottomNavBar onTabChange={handleTabChange} />
      {isConnecting && (
        <Box
          sx={{
            position: 'fixed', inset: 0, zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)'
          }}
          aria-label="Connecting to server"
        >
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'white', boxShadow: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} thickness={4} />
            <Typography variant="body2" fontWeight={600}>Connecting to server…</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default App;
