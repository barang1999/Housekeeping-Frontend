import React, { useEffect, useMemo, useState } from 'react';
import { Box, Grid, Card, CardContent, Chip, Typography, Stack, Tooltip, Divider, Fab } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

const ALL_ROOMS = [
  '001','002','003','004','005','006','007',
  '011','012','013','014','015','016','017',
  '101','102','103','104','105','106','107','108','109','110',
  '111','112','113','114','115','116','117',
  '201','202','203','204','205','208','209','210','211','212','213','214','215','216','217'
];

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
    let result = logs;
    if (scoreFilter === 'ok') result = logs.filter(l => (l.overallScore || 0) >= 70);
    if (scoreFilter === 'low') result = logs.filter(l => (l.overallScore || 0) < 70);
    return [...result].sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
  }, [logs, scoreFilter]);

  const summary = useMemo(() => {
    const inspectedSet = new Set(logs.map(l => String(l.roomNumber).padStart(3, '0')));
    const notInspected = ALL_ROOMS.filter(r => !inspectedSet.has(r)).sort((a,b) => Number(a)-Number(b));
    return {
      totalRooms: ALL_ROOMS.length,
      inspectedCount: inspectedSet.size,
      notInspected,
    };
  }, [logs]);

  const handleExport = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });

      // Header with today's date (Asia/Phnom_Penh)
      const dateTop = new Date();
      const dateStr = dateTop.toLocaleDateString(undefined, { timeZone: 'Asia/Phnom_Penh' });
      doc.setFontSize(12);
      doc.text(`${t('inspection.export.title', 'Inspection Summary')} — ${dateStr}`, 14, 14);

      // Build columns: fixed meta + dynamic item columns (use ITEM_META order and include any extra keys)
      const knownKeys = ITEM_META.map(i => i.key);
      const dynamicKeys = Array.from(new Set(
        filtered.flatMap(l => Object.keys(l.items || {}))
      ));
      const extraKeys = dynamicKeys.filter(k => !knownKeys.includes(k));
      const allItemKeys = [...knownKeys, ...extraKeys];

      const head = [[
        t('inspection.export.room', 'Room'),
        t('inspection.export.updatedBy', 'Updated By'),
        t('inspection.export.updatedAt', 'Updated At'),
        t('inspection.export.overall', 'Overall %'),
        ...allItemKeys.map(k => (itemMetaByKey[k]?.label || k))
      ]];

      const body = filtered.map(log => {
        const updatedAt = log.updatedAt ? new Date(log.updatedAt) : null;
        const base = [
          log.roomNumber,
          log.updatedBy || '-',
          updatedAt ? updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-',
          typeof log.overallScore === 'number' ? Math.round(log.overallScore) : '-'
        ];
        const rowItems = allItemKeys.map(k => {
          const v = (log.items || {})[k];
          if (v === 'passed') return 'Yes';
          if (v === 'failed') return 'No';
          if (v === 'na' || v === 'n/a' || v === 'skip') return '–';
          return v ? String(v) : '-';
        });
        return [...base, ...rowItems];
      });

      const colStyles = {
        0: { cellWidth: 18, halign: 'left' }, // Room
        1: { cellWidth: 28, halign: 'left' }, // Updated By
        2: { cellWidth: 28, halign: 'left' }, // Updated At (time)
        3: { cellWidth: 16, halign: 'center' }, // Overall
      };
      const itemStartIndex = 4;
      allItemKeys.forEach((_, idx) => {
        colStyles[itemStartIndex + idx] = { cellWidth: 14, halign: 'center' };
      });

      autoTable(doc, {
        head,
        body,
        styles: { fontSize: 7, halign: 'center' },
        headStyles: {
          fillColor: [220, 220, 220], // slightly darker gray
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8,
        },
        margin: { top: 18 },
        columnStyles: colStyles,
        didParseCell: (data) => {
          if (data.section === 'body') {
            const raw = (data.cell.raw ?? '').toString();
            // Highlight item cells that are No/N
            if (data.column.index >= itemStartIndex && (raw === 'N' || raw.toLowerCase() === 'no')) {
              data.cell.styles.textColor = [200, 0, 0];
              data.cell.styles.fontStyle = 'bold';
            }
            // Highlight Overall % column if below 100
            if (data.column.index === 3) {
              const num = Number(raw);
              if (!Number.isNaN(num) && num < 100) {
                data.cell.styles.textColor = [200, 0, 0];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            const raw = (data.cell.raw ?? '').toString();
            if (data.column.index >= itemStartIndex && (raw === 'N' || raw.toLowerCase() === 'no')) {
              const x = data.cell.x;
              const y = data.cell.y;
              const w = data.cell.width;
              const h = data.cell.height;
              const cx = x + w / 2;
              const cy = y + h / 2;
              const r = Math.min(w, h) * 0.35;
              doc.setDrawColor(200, 0, 0);
              doc.setLineWidth(0.6);
              doc.circle(cx, cy, r);
            }
          }
        }
      });

      // Summary footer
      const afterTableY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 8 : 24;
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(t('inspection.export.summary', 'Summary (today)'), 14, afterTableY);
      doc.setFont(undefined, 'normal');
      const line1 = `${t('inspection.export.summaryCounts', 'Inspected')}: ${summary.inspectedCount}/${summary.totalRooms}`;
      doc.text(line1, 14, afterTableY + 6);
      const missingLabel = t('inspection.export.missing', 'Not inspected');
      const missingText = summary.notInspected.length ? summary.notInspected.join(', ') : t('inspection.export.none', 'None');
      const wrapped = doc.splitTextToSize(`${missingLabel}: ${missingText}`, doc.internal.pageSize.getWidth() - 28);
      doc.text(wrapped, 14, afterTableY + 12);

      const filename = t('inspection.export.filename', 'inspection_logs_today.pdf');
      doc.save(filename);
    } catch (e) {
      console.error('Export PDF failed:', e);
    }
  };

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
      <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.04)', border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{t('inspection.summary.title', 'Summary (today)')}</Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          {t('inspection.summary.counts', 'Inspected')}: {summary.inspectedCount}/{summary.totalRooms}
        </Typography>
        <Typography variant="body2">
          {t('inspection.summary.missing', 'Not inspected')}: {summary.notInspected.length ? summary.notInspected.join(', ') : t('inspection.summary.none', 'None')}
        </Typography>
      </Box>
      <Fab
        color="primary"
        aria-label={t('inspection.export.aria', 'export')}
        sx={{ position: 'fixed', bottom: 80, right: 16 }}
        onClick={handleExport}
      >
        <FileDownloadIcon />
      </Fab>
    </Box>
  );
}