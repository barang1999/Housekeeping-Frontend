import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { fetchLiveFeedActivity, fetchLiveFeedHistory } from '../api/logsApiClient';
import { useTranslation } from '../i18n/LanguageProvider';

const fmt = (d) =>
  new Date(d).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

function Bubble({ icon, title, subtitle, ts, tags = [], note }) {
  const meta = [subtitle, fmt(ts)].filter(Boolean).join(' • ');
  return (
    <Box sx={{ display: 'flex', gap: 0.75, mb: 1 }}>
      <Box sx={{ alignSelf: 'center', lineHeight: 0, fontSize: '1rem' }}>{icon}</Box>
      <Paper
        elevation={1}
        sx={{
          p: 1,
          borderRadius: 1.5,
          bgcolor: 'rgba(255, 255, 255, 0.25)',
          border: '1px solid rgba(255,255,255,0.25)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          flex: 1,
          boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
          {title}
        </Typography>
        {Array.isArray(tags) && tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
            {tags.map((t, i) => (
              <Chip key={i} label={t} size="small" variant="outlined" sx={{ height: 20 }} />
            ))}
          </Box>
        )}
        {meta && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {meta}
          </Typography>
        )}
        {note && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>
            {note}
          </Typography>
        )}
      </Paper>
    </Box>
  );
}

export default function LiveFeed({ socket }) {
  const [items, setItems] = useState([]);
  const { t } = useTranslation();
  const [oldestTs, setOldestTs] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const seedActivity = async () => {
      try {
        console.log('[LiveFeed] fetching initial history from /api/live-feed');
        const { events = [] } = await fetchLiveFeedHistory({ limit: 50 });
        if (!cancelled && events.length) {
          const seeded = events.map((evt, index) => ({
            id: `${evt.type}-${evt.ts || 'seed'}-${index}`,
            type: evt.type,
            payload: evt.payload || {},
            ts: evt.ts || Date.now(),
          }));
          setItems(seeded);
          setOldestTs(events[events.length - 1]?.ts || null);
          return;
        }
      } catch (e) {
        console.warn('[LiveFeed] /api/live-feed not available, falling back', e);
      }

      // Fallback to legacy synthetic seed
      try {
        console.log('[LiveFeed] fetching initial activity (legacy seed)');
        const data = await fetchLiveFeedActivity();
        const events = data?.events || [];
        if (cancelled || events.length === 0) return;
        const seeded = events.map((evt, index) => ({
          id: `${evt.type}-${evt.ts || 'seed'}-${index}`,
          type: evt.type,
          payload: evt.payload,
          ts: evt.ts || Date.now(),
        }));
        setItems(seeded);
        setOldestTs(seeded[seeded.length - 1]?.ts || null);
      } catch (error) {
        console.error('[LiveFeed] failed to fetch initial activity', error);
      }
    };

    seedActivity();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const before = oldestTs || Date.now();
      const { events = [] } = await fetchLiveFeedHistory({ before, limit: 50 });
      if (events.length) {
        const more = events.map((evt, index) => ({
          id: `${evt.type}-${evt.ts || 'seed'}-${index}-${Math.random()}`,
          type: evt.type,
          payload: evt.payload || {},
          ts: evt.ts || Date.now(),
        }));
        setItems((prev) => [...prev, ...more]);
        setOldestTs(events[events.length - 1]?.ts || oldestTs);
      }
    } catch (e) {
      console.error('[LiveFeed] loadMore failed', e);
    } finally {
      setLoadingMore(false);
    }
  };

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
    let tags = [];
    let note;

    if (it.type === 'roomUpdate') {
      if (p.status === 'in_progress') {
        title = t('liveFeed.roomStarted', 'Room {room} started cleaning', { room: rn });
        subtitle = p.startedBy ? t('liveFeed.byUser', 'by {user}', { user: p.startedBy }) : '';
        icon = '🧹';
      } else if (p.status === 'finished') {
        title = t('liveFeed.roomFinished', 'Room {room} finished cleaning', { room: rn });
        const parts = [];
        if (p.finishedBy) parts.push(t('liveFeed.byUser', 'by {user}', { user: p.finishedBy }));
        if (p.duration) parts.push(p.duration);
        subtitle = parts.join(' • ');
        icon = '☑️';
      } else if (p.status === 'available') {
        title = t('liveFeed.roomAvailable', 'Room {room} reset to available', { room: rn });
        icon = '🔁';
      }
    } else if (it.type === 'roomChecked') {
      title = t('liveFeed.roomChecked', 'Room {room} is checked', { room: rn });
      subtitle = p.checkedBy ? t('liveFeed.byUser', 'by {user}', { user: p.checkedBy }) : '';
      icon = '✅';
    } else if (it.type === 'dndUpdate') {
      if (p.dndStatus) {
        title = t('liveFeed.roomNoClean', 'Room {room} not allowed to clean', { room: rn });
        subtitle = p.dndSetBy ? t('liveFeed.byUser', 'by {user}', { user: p.dndSetBy }) : '';
        icon = '🚫';
      } else {
        title = t('liveFeed.roomAllowClean', 'Room {room} allow cleaning', { room: rn });
        subtitle = p.dndSetBy ? t('liveFeed.byUser', 'by {user}', { user: p.dndSetBy }) : '';
        icon = '☀️';
      }
    } else if (it.type === 'priorityUpdate') {
      if (p.allowCleaningTime) {
        title = t('liveFeed.roomAllowAt', 'Room {room} is allowed to clean at {time}', { room: rn, time: p.allowCleaningTime });
        icon = '☀️';
      } else {
        title = t('liveFeed.roomPriority', 'Room {room} priority updated', { room: rn });
        subtitle = p.priority ? `${p.priority}` : '';
        icon = '🚩';
      }
    } else if (it.type === 'noteUpdate') {
      icon = '📝';
      if (p.notes) {
        tags = Array.isArray(p.notes.tags) ? p.notes.tags : [];
        note = p.notes.note || '';
        if (!subtitle && p.notes.lastUpdatedBy) subtitle = t('liveFeed.byUser', 'by {user}', { user: p.notes.lastUpdatedBy });
      }
      title = t('liveFeed.roomNote', 'Room {room} note updated', { room: rn });
    }

    return <Bubble key={it.id} icon={icon} title={title} subtitle={subtitle} ts={it.ts} tags={tags} note={note} />;
  }), [items, t]);

  return (
    <Box sx={{ p: 1.5, minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      </Box>
      {items.length === 0
        ? <Typography variant="body2" color="text.secondary">{t('liveFeed.waiting', 'Waiting for live updates…')}</Typography>
        : (
          <Box>
            {bubbles}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
              <Chip
                label={loadingMore ? t('liveFeed.loading', 'Loading…') : t('liveFeed.loadOlder', 'Load older')}
                onClick={loadingMore ? undefined : loadMore}
                variant="outlined"
                size="small"
              />
            </Box>
          </Box>
        )}
    </Box>
  );
}
