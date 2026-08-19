'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  Stack,
  Slider,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
} from '@mui/material';
import {
  VerifiedUser,
  Check,
  WarningAmber,
  Schedule,
  Person,
} from '@mui/icons-material';
import type { FraudPattern, InvestigatorFeedback } from '@/lib/types';
import { timeAgo } from '@/lib/formatters';
import { updatePattern } from '@/lib/api';

const ACTION_COLOR: Record<string, string> = {
  confirmed: '#dc2626',
  dismissed: '#64748b',
  pending: '#d97706',
  completed: '#059669',
};

export default function SettingsView({
  initialPatterns,
  initialAuditLog,
}: {
  initialPatterns: FraudPattern[];
  initialAuditLog: InvestigatorFeedback[];
}) {
  const [patterns, setPatterns] = useState<FraudPattern[]>(initialPatterns);
  const [dirtyPatterns, setDirtyPatterns] = useState<Set<string>>(new Set());
  const [auditLog] = useState<InvestigatorFeedback[]>(initialAuditLog);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedRecently, setSavedRecently] = useState<Set<string>>(new Set());

  const updateLocalPattern = (id: string, field: string, value: number | boolean) => {
    setPatterns((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    setDirtyPatterns((prev) => new Set(prev).add(id));
  };

  const savePattern = async (id: string) => {
    const pattern = patterns.find((p) => p.id === id);
    if (!pattern) return;
    setSaving(id);
    await updatePattern({
      id,
      amount_ceiling: pattern.amount_ceiling,
      time_window_hours: pattern.time_window_hours,
      hop_count: pattern.hop_count,
      multiplier: pattern.multiplier,
      is_enabled: pattern.is_enabled,
    });
    setSaving(null);
    setDirtyPatterns((prev) => { const s = new Set(prev); s.delete(id); return s; });
    setSavedRecently((prev) => new Set(prev).add(id));
    setTimeout(() => setSavedRecently((prev) => { const s = new Set(prev); s.delete(id); return s; }), 2500);
  };

  const togglePattern = async (id: string, value: boolean) => {
    setPatterns((prev) => prev.map((p) => (p.id === id ? { ...p, is_enabled: value } : p)));
    await updatePattern({ id, is_enabled: value });
  };

  const routingRules = [
    { pattern: 'Multi-Hop Layering', team: 'Financial Crime Unit — Team A', lead: 'Investigator Arjun Mehta' },
    { pattern: 'Circular Round-Trip', team: 'Financial Crime Unit — Team B', lead: 'Investigator Priya Sharma' },
    { pattern: 'Structuring', team: 'AML Compliance Unit', lead: 'Investigator Kavitha Nair' },
    { pattern: 'Dormant Reactivation', team: 'Financial Crime Unit — Team A', lead: 'Investigator Arjun Mehta' },
    { pattern: 'KYC Mismatch', team: 'KYC Compliance Unit', lead: 'Investigator Priya Sharma' },
  ];

  const systemConfigLeft = [
    ['Model Retraining Schedule', 'Daily at 02:00 IST'],
    ['Feedback Batch Size', '50 confirmed alerts'],
    ['Real-time Detection', 'Enabled (Supabase Realtime)'],
  ];
  const systemConfigRight = [
    ['Report Template', 'goAML XML v2.0 (FIU-IND)'],
    ['Federated Sync Interval', 'Every 6 hours'],
    ['Data Retention Policy', '7 years (RBI mandate)'],
  ];

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%', overflow: 'auto', maxWidth: 960 }}>
      <Box>
        <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>Detection Engine Configuration</Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>Adjust thresholds and enable/disable each fraud detection pattern</Typography>
      </Box>

      {/* Pattern Configurations */}
      <Stack spacing={2}>
        {patterns.map((p) => {
          const isDirty = dirtyPatterns.has(p.id);
          const isSaving = saving === p.id;
          const justSaved = savedRecently.has(p.id);

          return (
            <Paper
              key={p.id}
              variant="outlined"
              sx={{ overflow: 'hidden', transition: 'border-color 200ms ease', ...(isDirty && { borderColor: 'rgba(0,0,0,0.4)' }) }}
            >
              {isDirty && <Box sx={{ height: 2, bgcolor: 'primary.main' }} />}

              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', px: 2.5, py: 2, borderBottom: '1px solid #eef0f4' }}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.25 }}>
                    <VerifiedUser sx={{ fontSize: 16, color: 'primary.main' }} />
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{p.name}</Typography>
                    {justSaved && (
                      <Chip
                        icon={<Check sx={{ fontSize: 12, color: '#059669' }} />}
                        label="Saved"
                        size="small"
                        sx={{ fontSize: 10, height: 20, color: '#059669', bgcolor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}
                      />
                    )}
                  </Stack>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', ml: 3.5, lineHeight: 1.6 }}>{p.description}</Typography>
                </Box>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', ml: 2, flexShrink: 0 }}>
                  <Switch
                    checked={p.is_enabled}
                    onChange={(e) => togglePattern(p.id, e.target.checked)}
                    size="small"
                  />
                  <Typography sx={{ fontSize: 11, fontWeight: 500, color: p.is_enabled ? '#059669' : 'text.disabled' }}>
                    {p.is_enabled ? 'On' : 'Off'}
                  </Typography>
                </Stack>
              </Box>

              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 3, mb: 2 }}>
                  <ThresholdSlider
                    label="Amount Ceiling"
                    value={p.amount_ceiling}
                    min={100000} max={10000000} step={100000}
                    format={(v) => `₹${(v / 100000).toFixed(1)}L`}
                    onChange={(v) => updateLocalPattern(p.id, 'amount_ceiling', v)}
                  />
                  <ThresholdSlider
                    label="Time Window"
                    value={p.time_window_hours}
                    min={1} max={720} step={1}
                    format={(v) => `${v}h`}
                    onChange={(v) => updateLocalPattern(p.id, 'time_window_hours', v)}
                  />
                  <ThresholdSlider
                    label="Hop Count"
                    value={p.hop_count}
                    min={1} max={10} step={1}
                    format={(v) => `${v}`}
                    onChange={(v) => updateLocalPattern(p.id, 'hop_count', v)}
                  />
                  <ThresholdSlider
                    label="Income Multiplier"
                    value={p.multiplier}
                    min={1} max={20} step={0.5}
                    format={(v) => `${v}x`}
                    onChange={(v) => updateLocalPattern(p.id, 'multiplier', v)}
                  />
                </Box>

                {isDirty && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #eef0f4' }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                      <WarningAmber sx={{ fontSize: 13, color: 'warning.main' }} />
                      <Typography sx={{ fontSize: 11, color: 'warning.main' }}>Unsaved changes</Typography>
                    </Stack>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => savePattern(p.id)}
                      disabled={isSaving}
                      startIcon={isSaving ? <Box sx={{ width: 12, height: 12, borderRadius: 999, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> : <Check sx={{ fontSize: 14 }} />}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Box>
                )}
              </Box>
            </Paper>
          );
        })}
      </Stack>

      {/* Alert Routing */}
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid #eef0f4', bgcolor: '#fafbfc' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Alert Routing Rules</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>Pattern type assignments to investigator teams</Typography>
        </Box>
        <Box sx={{ '& > div': { borderTop: '1px solid #f1f3f7' }, '& > div:first-of-type': { borderTop: 'none' } }}>
          {routingRules.map(({ pattern, team, lead }) => (
            <Box key={pattern} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.75, '&:hover': { bgcolor: '#f8fafc' }, transition: 'background 150ms ease' }}>
              <Box>
                <Typography sx={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{pattern}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>{team}</Typography>
              </Box>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <Person sx={{ fontSize: 13, color: 'text.disabled' }} />
                <Typography sx={{ fontSize: 11, color: '#475569' }}>{lead}</Typography>
              </Stack>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* System Config */}
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b', mb: 2 }}>System Configuration</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0, '& > div:first-of-type': { borderRight: { sm: '1px solid #eef0f4' }, pr: { sm: 2.5 } }, '& > div:last-of-type': { pl: { sm: 2.5 } } }}>
          <Box>
            {systemConfigLeft.map(([label, value]) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f1f3f7', '&:last-child': { borderBottom: 'none' } }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</Typography>
                <Typography sx={{ fontSize: 12, color: '#1e293b', fontWeight: 500 }}>{value}</Typography>
              </Box>
            ))}
          </Box>
          <Box>
            {systemConfigRight.map(([label, value]) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f1f3f7', '&:last-child': { borderBottom: 'none' } }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</Typography>
                <Typography sx={{ fontSize: 12, color: '#1e293b', fontWeight: 500 }}>{value}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Audit Log */}
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid #eef0f4', bgcolor: '#fafbfc' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>System Audit Log</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>All investigator actions — read-only</Typography>
        </Box>
        <TableContainer sx={{ maxHeight: 288 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {['Time', 'Investigator', 'Action', 'Alert ID', 'Notes'].map((h) => (
                  <TableCell key={h}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {auditLog.map((f) => (
                <TableRow key={f.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                      <Schedule sx={{ fontSize: 13, color: 'text.disabled' }} />
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{timeAgo(f.created_at)}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#475569' }}>{f.investigator_name.replace('Investigator ', '')}</TableCell>
                  <TableCell>
                    <Chip
                      label={f.investigator_action}
                      size="small"
                      sx={{ fontSize: 10, fontWeight: 600, textTransform: 'capitalize', color: ACTION_COLOR[f.investigator_action] || '#64748b', bgcolor: `${ACTION_COLOR[f.investigator_action] || '#64748b'}18`, border: `1px solid ${ACTION_COLOR[f.investigator_action] || '#64748b'}40` }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' }}>{f.alert_id}</TableCell>
                  <TableCell sx={{ fontSize: 11, color: '#475569', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.notes}</TableCell>
                </TableRow>
              ))}
              {auditLog.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 6, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}>No audit records yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

function ThresholdSlider({ label, value, min, max, step, format, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>{format(value)}</Typography>
      </Box>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(_, v) => onChange(Number(v))}
        size="small"
        sx={{ '& .MuiSlider-thumb': { width: 14, height: 14 } }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: -0.5 }}>
        <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>{format(min)}</Typography>
        <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>{format(max)}</Typography>
      </Box>
    </Box>
  );
}