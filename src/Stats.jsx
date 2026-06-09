import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format, parseISO, intervalToDuration } from 'date-fns';
import { Box, Typography } from '@mui/material';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import HomeIcon from '@mui/icons-material/Home';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { Azkar } from './Constants';
import { loadHistory, deleteCycle } from './History';

function Stats() {
  const theme = useMuiTheme();
  const navigate = useNavigate();

  const [history, setHistory] = useState(() => loadHistory());
  const [pendingDelete, setPendingDelete] = useState(null); // { day, categoryId, cycleIdx, label }

  const days = useMemo(() => {
    return Object.keys(history)
      .sort()
      .reverse()
      .map((day) => ({ day, categories: history[day] }));
  }, [history]);

  // Chart data: per day { day, cycles, completedItems, fullyCompletedCycles } — ascending oldest→newest
  const chartData = useMemo(() => {
    return Object.keys(history)
      .sort()
      .map((day) => {
        let cycles = 0;
        let completedItems = 0;
        let fullyCompletedCycles = 0;
        const categories = history[day];
        for (const id of Object.keys(categories)) {
          const list = categories[id];
          const visible = list.filter((c) => (c.completedItems?.length || 0) > 0 || !!c.endedAt);
          for (const c of visible) {
            cycles += 1;
            const done = c.completedItems?.length || 0;
            completedItems += done;
            if (c.totalItems > 0 && done === c.totalItems) fullyCompletedCycles += 1;
          }
        }
        return { day, cycles, completedItems, fullyCompletedCycles };
      })
      .filter((d) => d.cycles > 0)
      .slice(-30); // last 30 active days
  }, [history]);

  const categoryName = (id) => Azkar.find((a) => String(a.id) === String(id))?.name ?? `#${id}`;
  const categoryIndex = (id) => Azkar.findIndex((a) => String(a.id) === String(id));

  const timeSince = (iso) => {
    if (!iso) return '';
    const duration = intervalToDuration({ start: new Date(iso), end: new Date() });
    const parts = [];
    if (duration.months) parts.push(`${duration.months}mo`);
    if (duration.days) parts.push(`${duration.days}d`);
    if (duration.hours) parts.push(`${duration.hours}h`);
    if (duration.minutes) parts.push(`${duration.minutes}m`);
    if (parts.length === 0) return 'just now';
    return `${parts.join(' ')} ago`;
  };

  const formatDuration = (startIso, endIso) => {
    if (!startIso || !endIso) return '';
    const start = new Date(startIso);
    const end = new Date(endIso);
    const totalSec = Math.max(0, Math.floor((end - start) / 1000));
    if (totalSec === 0) return '0s';
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const parts = [];
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (s || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const updated = deleteCycle(pendingDelete.day, pendingDelete.categoryId, pendingDelete.cycleIdx);
    setHistory({ ...updated });
    setPendingDelete(null);
  };

  return (
    <Box sx={{ maxWidth: '600px', margin: '0 auto', px: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 2 }}>
        <Button
          variant='contained'
          color='info'
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
        >
          Home
        </Button>
        <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
          Statistics
        </Typography>
      </Box>

      {chartData.length > 0 && (
        <UsageChart data={chartData} theme={theme} />
      )}

      {days.length === 0 ? (
        <Typography variant='body1' sx={{ textAlign: 'center', color: 'text.secondary', mt: 6 }}>
          No history yet
        </Typography>
      ) : (
        days.map(({ day, categories }) => {
          // Flatten all cycles across all categories for this day, preserving original cycle indices
          const rows = [];
          for (const id of Object.keys(categories)) {
            const cycles = categories[id]; // array
            const visibleWithOriginalIdx = cycles
              .map((cycle, originalIdx) => ({ cycle, originalIdx }))
              .filter(({ cycle }) => (cycle.completedItems?.length || 0) > 0 || !!cycle.endedAt);
            const visibleCount = visibleWithOriginalIdx.length;
            visibleWithOriginalIdx.forEach(({ cycle, originalIdx }, visibleIdx) => {
              rows.push({
                categoryId: id,
                cycleIdx: originalIdx, // for delete (storage index)
                displayIdx: visibleIdx, // for UI cycle label
                cycleCount: visibleCount,
                completedItems: cycle.completedItems || [],
                totalItems: cycle.totalItems || 0,
                startedAt: cycle.startedAt,
                endedAt: cycle.endedAt,
              });
            });
          }

          // Sort rows by most recent activity (endedAt then startedAt) descending
          rows.sort((a, b) => {
            const aTime = a.endedAt || a.startedAt || '';
            const bTime = b.endedAt || b.startedAt || '';
            return bTime.localeCompare(aTime);
          });

          const totalReads = rows.length;

          return (
            <Box
              key={day}
              sx={{
                backgroundColor: theme.palette.background.paper,
                borderRadius: '8px',
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? '0 2px 8px rgba(0,0,0,0.3)'
                    : '0 2px 8px rgba(0,0,0,0.1)',
                p: 2,
                mb: 2,
              }}
            >
              <Typography variant='h6' sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {format(parseISO(day), 'EEEE, dd MMM yyyy')}
              </Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary', mb: 1.5 }}>
                Total reads: {totalReads}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {rows.map((row) => {
                  const done = row.completedItems.length;
                  const total = row.totalItems;
                  const isComplete = total > 0 && done === total;
                  const bg = isComplete ? theme.palette.success.main : theme.palette.warning.main;
                  const fg = isComplete ? theme.palette.success.contrastText : theme.palette.warning.contrastText;
                  return (
                    <Box
                      key={`${row.categoryId}-${row.cycleIdx}`}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1,
                        py: 0.5,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      <Box sx={{ textAlign: 'right', flex: 1, minWidth: 0 }}>
                        <Typography variant='body1' sx={{ fontWeight: 'bold' }}>
                          {categoryIndex(row.categoryId) >= 0 ? (
                            <Link
                              to={`/${categoryIndex(row.categoryId)}`}
                              style={{ color: theme.palette.primary.main, textDecoration: 'none' }}
                            >
                              {categoryName(row.categoryId)}
                            </Link>
                          ) : (
                            categoryName(row.categoryId)
                          )}
                          {row.cycleCount > 1 && (
                            <Typography component='span' variant='caption' sx={{ color: 'text.secondary', ml: 1 }}>
                              (cycle {row.displayIdx + 1})
                            </Typography>
                          )}
                        </Typography>
                        {(row.startedAt || row.endedAt) && (
                          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                            {row.startedAt ? format(parseISO(row.startedAt), 'hh:mm:ss a') : '—'}
                            {' → '}
                            {row.endedAt ? format(parseISO(row.endedAt), 'hh:mm:ss a') : '—'}
                          </Typography>
                        )}
                        {row.startedAt && row.endedAt && (
                          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                            Duration: {formatDuration(row.startedAt, row.endedAt)}
                          </Typography>
                        )}
                        {row.endedAt && (
                          <Typography variant='caption' sx={{ color: 'text.secondary', fontStyle: 'italic', display: 'block' }}>
                            Since: {timeSince(row.endedAt)}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                        <Box
                          sx={{
                            backgroundColor: bg,
                            color: fg,
                            px: 1.2,
                            py: 0.3,
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                          }}
                        >
                          {done}/{total}
                        </Box>
                        <IconButton
                          size='small'
                          color='error'
                          aria-label='delete row'
                          onClick={() =>
                            setPendingDelete({
                              day,
                              categoryId: row.categoryId,
                              cycleIdx: row.cycleIdx,
                              label: `${categoryName(row.categoryId)}${row.cycleCount > 1 ? ` (cycle ${row.displayIdx + 1})` : ''}`,
                            })
                          }
                        >
                          <DeleteIcon fontSize='small' />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })
      )}

      <Dialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        aria-labelledby='delete-row-title'
        disableRestoreFocus
      >
        <DialogTitle id='delete-row-title'>Delete this entry?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingDelete
              ? `This will permanently delete the entry "${pendingDelete.label}" from ${pendingDelete.day}. This action cannot be undone.`
              : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)} variant='contained' color='primary' autoFocus>
            Cancel
          </Button>
          <Button onClick={confirmDelete} variant='contained' color='error'>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function UsageChart({ data, theme }) {
  // Layout
  const W = Math.max(320, data.length * 60);
  const H = 220;
  const padL = 32;
  const padR = 12;
  const padT = 16;
  const padB = 48;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxVal = Math.max(1, ...data.flatMap((d) => [d.cycles, d.completedItems, d.fullyCompletedCycles]));
  // Round up the y-axis to a nice number
  const yTop = Math.ceil(maxVal / 5) * 5 || maxVal;

  const groupW = innerW / data.length;
  const barW = Math.min(14, (groupW - 8) / 3);
  const yScale = (v) => (innerH * v) / yTop;

  const colors = {
    cycles: theme.palette.info.main,
    completed: theme.palette.success.main,
    full: theme.palette.warning.main,
    axis: theme.palette.divider,
    text: theme.palette.text.secondary,
  };

  const yTicks = [0, Math.round(yTop / 2), yTop];

  return (
    <Box
      sx={{
        backgroundColor: theme.palette.background.paper,
        borderRadius: '8px',
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 2px 8px rgba(0,0,0,0.3)'
            : '0 2px 8px rgba(0,0,0,0.1)',
        p: 2,
        mb: 2,
      }}
    >
      <Typography variant='h6' sx={{ fontWeight: 'bold', mb: 1 }}>
        Usage over time
      </Typography>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
        <LegendItem color={colors.cycles} label='Cycles (rows)' />
        <LegendItem color={colors.completed} label='Completed items' />
        <LegendItem color={colors.full} label='Fully-completed cycles' />
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <svg width={W} height={H} style={{ display: 'block' }}>
          {/* Y axis gridlines + labels */}
          {yTicks.map((t) => {
            const y = padT + innerH - yScale(t);
            return (
              <g key={t}>
                <line x1={padL} x2={padL + innerW} y1={y} y2={y} stroke={colors.axis} strokeDasharray='3 3' />
                <text x={padL - 6} y={y + 4} fontSize='10' fill={colors.text} textAnchor='end'>
                  {t}
                </text>
              </g>
            );
          })}

          {/* Bars + X labels */}
          {data.map((d, i) => {
            const gx = padL + i * groupW + (groupW - barW * 3 - 4) / 2;
            const baseY = padT + innerH;
            return (
              <g key={d.day}>
                {/* Cycles bar */}
                <rect
                  x={gx}
                  y={baseY - yScale(d.cycles)}
                  width={barW}
                  height={yScale(d.cycles)}
                  fill={colors.cycles}
                  rx={2}
                >
                  <title>{`${d.day} — Cycles: ${d.cycles}`}</title>
                </rect>
                {/* Completed items bar */}
                <rect
                  x={gx + barW + 2}
                  y={baseY - yScale(d.completedItems)}
                  width={barW}
                  height={yScale(d.completedItems)}
                  fill={colors.completed}
                  rx={2}
                >
                  <title>{`${d.day} — Completed items: ${d.completedItems}`}</title>
                </rect>
                {/* Fully-completed cycles bar */}
                <rect
                  x={gx + (barW + 2) * 2}
                  y={baseY - yScale(d.fullyCompletedCycles)}
                  width={barW}
                  height={yScale(d.fullyCompletedCycles)}
                  fill={colors.full}
                  rx={2}
                >
                  <title>{`${d.day} — Fully-completed cycles: ${d.fullyCompletedCycles}`}</title>
                </rect>

                {/* Date label (rotated) */}
                <text
                  x={padL + i * groupW + groupW / 2}
                  y={baseY + 16}
                  fontSize='10'
                  fill={colors.text}
                  textAnchor='middle'
                  transform={`rotate(-35 ${padL + i * groupW + groupW / 2} ${baseY + 16})`}
                >
                  {format(parseISO(d.day), 'dd MMM')}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line x1={padL} x2={padL + innerW} y1={padT + innerH} y2={padT + innerH} stroke={colors.axis} />
          <line x1={padL} x2={padL} y1={padT} y2={padT + innerH} stroke={colors.axis} />
        </svg>
      </Box>
    </Box>
  );
}

function LegendItem({ color, label }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ width: 12, height: 12, backgroundColor: color, borderRadius: '2px' }} />
      <Typography variant='caption'>{label}</Typography>
    </Box>
  );
}

export default Stats;
