import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { fetchLiveFeedActivity } from '../api/logsApiClient';

const fmt = (d) =>
  new Date(d).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

function Bubble({ icon, title, subtitle, ts }) {
  const meta = [subtitle, fmt(ts)].filter(Boolean).join(' • ');
  return (
    <Box sx={{ display: 'flex', gap: 0.75, mb: 1 }}>
      <Box sx={{ alignSelf: 'center', lineHeight: 0, fontSize: '1rem' }}>{icon}</Box>
      <Paper
        elevation={0}
        sx={{
          p: 1,
          borderRadius: 1.5,
          bgcolor: 'rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          flex: 1,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
          {title}
        </Typography>
        {meta && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {meta}
          </Typography>
        )}
      </Paper>
    </Box>
  );
}

export default function LiveFeed({ socket }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const seedActivity = async () => {
      try {
        console.log('[LiveFeed] fetching initial activity');
        const data = await fetchLiveFeedActivity();
        const events = data?.events || [];

        if (cancelled || events.length === 0) {
          if (cancelled) {
            console.log('[LiveFeed] initial fetch aborted');
          }
          return;
        }

        const seeded = events.map((evt, index) => ({
          id: `${evt.type}-${evt.ts || 'seed'}-${index}`,
          type: evt.type,
          payload: evt.payload,
          ts: evt.ts || Date.now(),
        }));

        setItems(seeded);
      } catch (error) {
        console.error('[LiveFeed] failed to fetch initial activity', error);
      }
    };

    seedActivity();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    console.log('[LiveFeed] effect run', { hasSocket: Boolean(socket) });
    if (!socket) return;

    const push = (type, payload) => {
      // Debug: surface socket traffic in the browser console while wiring the feed
      console.log('[LiveFeed] incoming', type, payload);
      setItems((prev) => [{ id: `${type}-${Date.now()}-${Math.random()}`, type, payload, ts: Date.now() }, ...prev.slice(0, 199)]);
    };

    const onRoomUpdate = (p) => push('roomUpdate', p);
    const onRoomChecked = (p) => push('roomChecked', p);
    const onDnd = (p) => push('dndUpdate', p);
    const onPriority = (p) => push('priorityUpdate', p);
    const onNote = (p) => push('noteUpdate', p);

    socket.on('roomUpdate', onRoomUpdate);
    socket.on('roomChecked', onRoomChecked);
    socket.on('dndUpdate', onDnd);
    socket.on('priorityUpdate', onPriority);
    socket.on('noteUpdate', onNote);

    return () => {
      console.log('[LiveFeed] cleanup listeners');
      socket.off('roomUpdate', onRoomUpdate);
      socket.off('roomChecked', onRoomChecked);
      socket.off('dndUpdate', onDnd);
      socket.off('priorityUpdate', onPriority);
      socket.off('noteUpdate', onNote);
    };
  }, [socket]);

  useEffect(() => {
    console.log('[LiveFeed] items state updated', { count: items.length });
  }, [items]);

  const bubbles = useMemo(() => items.map((it) => {
    const p = it.payload || {};
    const rn = p.roomNumber || '—';
    let title = '', subtitle = '';
    let icon = '⚡';

    if (it.type === 'roomUpdate') {
      if (p.status === 'in_progress') {
        title = `Room ${rn} started cleaning`;
        subtitle = p.startedBy ? `by ${p.startedBy}` : '';
        icon = '🧹';
      } else if (p.status === 'finished') {
        title = `Room ${rn} finished cleaning`;
        subtitle = `${p.finishedBy ? `by ${p.finishedBy} ` : ''}${p.duration ? `• ${p.duration}` : ''}`.trim();
        icon = '☑️';
      } else if (p.status === 'available') {
        title = `Room ${rn} reset to available`;
        icon = '🔁';
      }
    } else if (it.type === 'roomChecked') {
      title = `Room ${rn} is checked`;
      subtitle = p.checkedBy ? `by ${p.checkedBy}` : '';
      icon = '✅';
    } else if (it.type === 'dndUpdate') {
      if (p.dndStatus) {
        title = `Room ${rn} not allowed to clean`;
        subtitle = p.dndSetBy ? `by ${p.dndSetBy}` : '';
        icon = '🚫';
      } else {
        title = `Room ${rn} allow cleaning`;
        subtitle = p.dndSetBy ? `by ${p.dndSetBy}` : '';
        icon = '☀️';
      }
    } else if (it.type === 'priorityUpdate') {
      if (p.allowCleaningTime) {
        title = `Room ${rn} is allowed to clean at ${p.allowCleaningTime}`;
        icon = '☀️';
      } else {
        title = `Room ${rn} priority updated`;
        subtitle = p.priority ? `${p.priority}` : '';
        icon = '🚩';
      }
    } else if (it.type === 'noteUpdate') {
      title = `Room ${rn} note updated`;
      subtitle = p.notes?.lastUpdatedBy ? `by ${p.notes.lastUpdatedBy}` : '';
      icon = '📝';
    }

    return <Bubble key={it.id} icon={icon} title={title} subtitle={subtitle} ts={it.ts} />;
  }), [items]);

  return (
    <Box sx={{ p: 1.5, bgcolor: 'grey.200', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      </Box>
      {items.length === 0
        ? <Typography variant="body2" color="text.secondary">Waiting for live updates…</Typography>
        : <Box>{bubbles}</Box>}
    </Box>
  );
}
