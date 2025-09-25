// RoomNotesMenu.jsx
import { useState } from 'react';
import {
  IconButton, Popover, Stack, Chip, TextField, Button, Typography, Divider, InputAdornment
} from '@mui/material';
import NoteIcon from '@mui/icons-material/StickyNote2Outlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';

const tagConfig = {
  'Early arrival': { icon: <BoltOutlinedIcon fontSize="small" />, color: 'warning' },
  'Sunrise': { icon: <WbSunnyOutlinedIcon fontSize="small" />, color: 'error' },
  'No arrival': { icon: <BlockOutlinedIcon fontSize="small" />, color: 'default' },
  'Allow after time': { icon: <AccessTimeOutlinedIcon fontSize="small" />, color: 'info' },
};

const QUICK_TAGS = Object.keys(tagConfig).filter(key => key !== 'Allow after time');

export default function RoomNotesMenu({ roomNumber, value, onSave, triggerIcon }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [tags, setTags] = useState(value?.tags || []);
  const [afterTimeEnabled, setAfterTimeEnabled] = useState(
    value?.afterTime ? true : false
  );
  const [afterTime, setAfterTime] = useState(value?.afterTime || '');
  const [note, setNote] = useState(value?.note || '');

  const selectedTriggerIcon = (() => {
    if (afterTimeEnabled && afterTime) return <AccessTimeOutlinedIcon fontSize="small" color="info" />;
    if (tags.includes('Early arrival')) return <BoltOutlinedIcon fontSize="small" color="warning" />;
    if (tags.includes('Sunrise')) return <WbSunnyOutlinedIcon fontSize="small" color="error" />;
    if (tags.includes('No arrival')) return <BlockOutlinedIcon fontSize="small" color="default" />;
    return <NoteIcon fontSize="small" />;
  })();

  const open = Boolean(anchorEl);

  const toggleTag = (t) =>
    setTags((prev) => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSave = async () => {
    const payload = {
      tags,
      afterTime: afterTimeEnabled ? afterTime : null,
      note: note.trim() || null,
    };
    onSave?.(payload); // parent does optimistic UI + API call
    setAnchorEl(null);
  };

  const hasAny = tags.length > 0 || (afterTimeEnabled && !!afterTime) || !!note.trim();

  return (
    <>
      <IconButton
        size="small"
        aria-label="Room notes"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        color={hasAny ? 'info' : 'default'}
        sx={{ ml: 0.25, p: 0.5, borderRadius: 10 }}
      >
        {triggerIcon || selectedTriggerIcon}
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              p: 1,
              width: 300,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 3,
              backdropFilter: 'blur(8px)',
              backgroundColor: 'rgba(255, 255, 255, 0.65)',
            }
          }
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" fontWeight={700}>
            Room {roomNumber}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {afterTimeEnabled && afterTime ? `After ${afterTime}` :
              (tags[0] || (note.trim() ? '1 note' : ''))}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.5} mt={1} flexWrap="wrap">
          {QUICK_TAGS.map((key) => {
            const active = tags.includes(key);
            return (
              <Chip
                key={key}
                label={key}
                size="small"
                variant={active ? 'filled' : 'outlined'}
                color={active ? tagConfig[key].color : 'default'}
                onClick={() => toggleTag(key)}
                icon={tagConfig[key].icon}
                sx={{ mb: 0.5, height: 26, '& .MuiChip-label': { px: 0.75 } }}
              />
            );
          })}
          <Chip
            label="Allow after time"
            size="small"
            variant={afterTimeEnabled ? 'filled' : 'outlined'}
            color={afterTimeEnabled ? tagConfig['Allow after time'].color : 'default'}
            onClick={() => setAfterTimeEnabled(v => !v)}
            icon={tagConfig['Allow after time'].icon}
            sx={{ mb: 0.5, height: 26, '& .MuiChip-label': { px: 0.75 } }}
          />
        </Stack>

        {afterTimeEnabled && (
          <Stack direction="row" alignItems="center" spacing={0.75} mt={1}>
            <AccessTimeOutlinedIcon fontSize="small" />
            <Typography variant="caption" color="text.secondary">After</Typography>
            <input
              type="time"
              value={afterTime}
              onChange={(e) => setAfterTime(e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.12)',
                outline: 'none'
              }}
            />
          </Stack>
        )}

        <TextField
          size="small"
          variant="outlined"
          placeholder="Add a note…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <NoteIcon fontSize="small" sx={{ opacity: 0.6 }} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: 2,
              backgroundColor: 'background.paper',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'action.disabledBackground' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
              fontSize: '0.9rem',
              py: 0.25
            }
          }}
          sx={{ mt: 0.75 }}
        />

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Button size="small" color="inherit" onClick={() => { setTags([]); setAfterTime(''); setAfterTimeEnabled(false); setNote(''); }}>
            Clear
          </Button>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              size="small"
              sx={{ minWidth: 'auto', px: 1.5, py: 0.25, fontSize: '0.7rem', borderRadius: 1.5, boxShadow: 'none' }}
              onClick={handleSave}
            >
              Save
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  );
}