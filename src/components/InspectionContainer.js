import React, { useEffect, useMemo, useState } from 'react';
import { Box, Grid, Card, CardContent, Chip, Typography, Stack, Tooltip, Divider } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import { fetchInspectionLogs } from '../api/logsApiClient';
import { useTranslation } from '../i18n/LanguageProvider';

const ITEM_META = [
  { key: 'TV', emoji: '📺', label: 'TV' },
  { key: 'Sofa', emoji: '🛋️', label: 'Sofa' },
  { key: 'Lamp', emoji: '💡', label: 'Lamp' },
  { key: 'Light', emoji: '🔆', label: 'Light' },
  { key: 'Amenity', emoji: '🧴', label: 'Amenity' },
  { key: 'Complimentary', emoji: '🍬', label: 'Complimentary' },
  { key: 'Balcony', emoji: '🏞️', label: 'Balcony' },
  { key: 'Sink', emoji: '🚿', label: 'Sink' },
  { key: 'Door', emoji: '🚪', label: 'Door' },
  { key: 'Minibar', emoji: '🍾', label: 'Minibar' },
];

const itemMetaByKey = ITEM_META.reduce((m, it) => (m[it.key] = it, m), {});

function statusChipColor(score) {
  if (score >= 85) return 'success';
  if (score >= 70) return 'info';
  if (score >= 50) return 'warning';
  return 'error';
}

function ResultPill({ result }) {
  if (result === 'passed') return <CheckIcon fontSize="inherit" />;
  if (result === 'failed') return <CloseIcon fontSize="inherit" color="error" />;
  return <RemoveIcon fontSize="inherit" />;
}

export default function InspectionContainer() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [scoreFilter, setScoreFilter] = useState('all'); // all | ok(>=70) | low(<70)

  const scoreOptions = useMemo(() => ([
    { label: t('inspection.filter.score.all', 'All'), value: 'all' },
    { label: t('inspection.filter.score.ok', '≥ 70%'), value: 'ok' },
    { label: t('inspection.filter.score.low', '< 70%'), value: 'low' },
  ]), [t]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await fetchInspectionLogs();
        // Ensure shapes are friendly for UI:
        const normalized = (Array.isArray(data) ? data : []).map(doc => ({
          ...doc,
          roomNumber: String(doc.roomNumber).padStart(3, '0'),
          items: doc.items || {}, // Map serialized to object by backend
          overallScore: typeof doc.overallScore === 'number' ? doc.overallScore : 0,
        }));
        if (mounted) setLogs(normalized);
      } catch (e) {
        console.error('Inspection load failed:', e);
        if (mounted) setLogs([]);
      }
    };

    load();
    const id = setInterval(load, 30000); // poll every 30s like LogsContainer
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const filtered = useMemo(() => {
    if (scoreFilter === 'ok') return logs.filter(l => (l.overallScore || 0) >= 70);
    if (scoreFilter === 'low') return logs.filter(l => (l.overallScore || 0) < 70);
    return logs;
  }, [logs, scoreFilter]);

  return (
    <Box sx={{ p: 2 }}>
      {/* Filters */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto' }}>
        {scoreOptions.map(opt => (
          <Chip
            key={opt.value}
            label={opt.label}
            clickable
            color={scoreFilter === opt.value ? 'primary' : 'default'}
            onClick={() => setScoreFilter(opt.value)}
            sx={{ minWidth: 80 }}
          />
        ))}
      </Stack>

      {/* Cards */}
      <Grid container spacing={2}>
        {filtered.map((log) => {
          const updatedAt = log.updatedAt ? new Date(log.updatedAt) : null;
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={log._id || `${log.roomNumber}-${log.date}`}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                  boxShadow: 1,
                  bgcolor: 'background.paper',
                  p: 0.5,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': { boxShadow: 2, transform: 'translateY(-2px)' },
                }}
              >
                <CardContent sx={{ flex: 1, px: 1, py: 0, '&:last-child': { pb: 0 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ letterSpacing: 0.2 }}>
                      {t('inspection.card.room', 'Room {room}', { room: log.roomNumber })}
                    </Typography>
                    <Chip
                      label={`${Math.round(log.overallScore || 0)}%`}
                      size="small"
                      color={statusChipColor(log.overallScore || 0)}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2, mb: 0.5, display: 'block' }}>
                    <strong>{t('inspection.card.updatedBy', 'By:')}</strong> {log.updatedBy || '-'}
                    {updatedAt ? ` • ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </Typography>

                  <Divider sx={{ my: 0.5 }} />

                  {/* Items grid */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.5 }}>
                    {Object.entries(log.items || {}).map(([key, result]) => {
                      const meta = itemMetaByKey[key] || { emoji: '🧰', label: key };
                      return (
                        <Tooltip key={key} title={`${meta.label}: ${result || 'n/a'}`}>
                          <Chip
                            variant="outlined"
                            size="small"
                            sx={{
                              justifyContent: 'start',
                              pl: 0.5,
                              borderColor: result === 'failed' ? 'error.main' : undefined,
                              '& .MuiChip-label': { display: 'flex', alignItems: 'center', gap: 0.25 }
                            }}
                            icon={<span aria-hidden style={{ fontSize: 14 }}>{meta.emoji}</span>}
                            label={
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <span>{meta.label}</span>
                                <span style={{ fontSize: 16, display: 'inline-flex' }}>
                                  <ResultPill result={result} />
                                </span>
                              </span>
                            }
                          />
                        </Tooltip>
                      );
                    })}
                    {/* Show placeholders if no items yet */}
                    {(!log.items || Object.keys(log.items).length === 0) && (
                      <Typography variant="caption" color="text.secondary" sx={{ gridColumn: '1 / -1', opacity: 0.7 }}>
                        {t('inspection.card.noItems', 'No items inspected yet')}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}