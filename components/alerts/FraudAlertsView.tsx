'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Button,
  Avatar,
  Alert,
} from '@mui/material';
import {
  GppMaybe,
  Close,
  CheckCircle,
  Cancel,
  EditNote,
  WarningAmber,
  Schedule,
  Person,
  ChevronRight,
  TrendingUp,
  AutoAwesome,
  Refresh,
} from '@mui/icons-material';
import type { FraudAlert, Account, InvestigatorFeedback } from '@/lib/types';
import { formatCurrency, formatDateTime, timeAgo, patternLabel } from '@/lib/formatters';
import { fetchFeedback, postFeedback, updateAlert, summarizeAlert, type AlertSummary } from '@/lib/api';

const STATUS_TABS = ['all', 'open', 'confirmed', 'dismissed'];

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high: '#d97706',
  medium: '#d97706',
  low: '#059669',
};

const STATUS_COLOR: Record<string, string> = {
  open: '#2563eb',
  confirmed: '#dc2626',
  dismissed: '#64748b',
};

export default function FraudAlertsView({
  initialAlerts,
  initialAccounts,
}: {
  initialAlerts: FraudAlert[];
  initialAccounts: Account[];
}) {
  const [alerts, setAlerts] = useState<FraudAlert[]>(initialAlerts);
  const [accounts] = useState<Map<string, Account>>(new Map(initialAccounts.map((a) => [a.id, a])));
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [feedback, setFeedback] = useState<InvestigatorFeedback[]>([]);
  const [activeTab, setActiveTab] = useState('open');
  const [sortBy, setSortBy] = useState<'created_at' | 'confidence_score' | 'total_amount'>('created_at');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
const [noteText, setNoteText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<AlertSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadFeedback = async (alertId: string) => {
    setFeedback(await fetchFeedback(alertId));
  };

  const selectAlert = (a: FraudAlert) => {
    setSelectedAlert(a);
    loadFeedback(a.id);
    setNoteText('');
    setAiSummary(null);
    setAiError(null);
  };

  const generateSummary = async () => {
    if (!selectedAlert) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await summarizeAlert(selectedAlert);
      setAiSummary(res.summary);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI summary failed');
    } finally {
      setAiLoading(false);
    }
  };

  const updateAlertStatus = async (status: string) => {
    if (!selectedAlert) return;
    setActionLoading(true);
    await updateAlert({ id: selectedAlert.id, status, updated_at: new Date().toISOString() });
    await postFeedback({
      alert_id: selectedAlert.id,
      status,
      investigator_action: status === 'confirmed' ? 'confirmed' : 'dismissed',
      investigator_name: 'Investigator Arjun Mehta',
      notes: noteText || `Alert ${status} by investigator.`,
    });
    setAlerts((prev) => prev.map((a) => (a.id === selectedAlert.id ? { ...a, status } : a)));
    setSelectedAlert((prev) => (prev ? { ...prev, status } : null));
    await loadFeedback(selectedAlert.id);
    setNoteText('');
    setActionLoading(false);
  };

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('desc'); }
  };

  const filtered = alerts
    .filter((a) => activeTab === 'all' || a.status === activeTab)
    .sort((a, b) => {
      const factor = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'created_at') return factor * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      if (sortBy === 'confidence_score') return factor * (a.confidence_score - b.confidence_score);
      return factor * (a.total_amount - b.total_amount);
    });

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Alert List */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ px: 2, borderBottom: '1px solid #eef0f4', minHeight: 48 }}
        >
          {STATUS_TABS.map((tab) => {
            const count = tab === 'all' ? alerts.length : alerts.filter((a) => a.status === tab).length;
            return (
              <Tab
                key={tab}
                value={tab}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 12, textTransform: 'capitalize' }}>{tab}</Typography>
                    <Chip
                      label={count}
                      size="small"
                      sx={{ height: 18, fontSize: 10, fontWeight: 600, bgcolor: activeTab === tab ? 'rgba(0,0,0,0.12)' : '#f1f5f9', color: activeTab === tab ? 'primary.main' : '#64748b' }}
                    />
                  </Box>
                }
              />
            );
          })}
        </Tabs>

        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {[
                  { label: 'Pattern', col: null },
                  { label: 'Severity', col: null },
                  { label: 'Confidence', col: 'confidence_score' as const },
                  { label: 'Amount', col: 'total_amount' as const },
                  { label: 'Accounts', col: null },
                  { label: 'Assigned', col: null },
                  { label: 'Status', col: null },
                  { label: 'Date', col: 'created_at' as const },
                ].map(({ label, col }) => (
                  <TableCell
                    key={label}
                    onClick={() => col && handleSort(col)}
                    sx={{ cursor: col ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                  >
                    {label}
                    {col && sortBy === col && (
                      <Typography component="span" sx={{ fontSize: 10, ml: 0.5, color: 'primary.main' }}>
                        {sortDir === 'desc' ? 'â†“' : 'â†‘'}
                      </Typography>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((a) => (
                <TableRow
                  key={a.id}
                  hover
                  onClick={() => selectAlert(a)}
                  sx={{
                    cursor: 'pointer',
                    ...(selectedAlert?.id === a.id && { backgroundColor: '#f8fafc' }),
                    '& td:first-of-type': { borderLeft: `3px solid ${SEVERITY_COLOR[a.severity] || '#64748b'}` },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GppMaybe sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{patternLabel(a.pattern_type)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={a.severity.toUpperCase()}
                      size="small"
                      sx={{ fontSize: 10, fontWeight: 600, height: 20, color: SEVERITY_COLOR[a.severity] || '#64748b', bgcolor: `${SEVERITY_COLOR[a.severity] || '#64748b'}14` }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 64, height: 6, borderRadius: 999, bgcolor: '#eef0f4', overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', borderRadius: 999, bgcolor: a.confidence_score > 0.9 ? '#dc2626' : '#d97706', width: `${a.confidence_score * 100}%` }} />
                      </Box>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{(a.confidence_score * 100).toFixed(0)}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(a.total_amount)}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{a.involved_accounts.length} accts</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{a.assigned_investigator.replace('Investigator ', '')}</TableCell>
                  <TableCell>
                    <Chip
                      label={a.status}
                      size="small"
                      sx={{ fontSize: 10, fontWeight: 600, height: 20, color: STATUS_COLOR[a.status] || '#64748b', bgcolor: `${STATUS_COLOR[a.status] || '#64748b'}14` }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12, whiteSpace: 'nowrap' }}>{timeAgo(a.created_at)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 8, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}>
                    No alerts in this category.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Detail Panel */}
      {selectedAlert && (
        <Box
          sx={{
            width: { xs: 320, xl: 420 },
            flexShrink: 0,
            borderLeft: '1px solid #e7e9ee',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: '#ffffff',
          }}
        >
          {/* Severity accent */}
          <Box sx={{ height: 3, flexShrink: 0, bgcolor: SEVERITY_COLOR[selectedAlert.severity] || '#64748b' }} />

          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', px: 2.5, py: 2, borderBottom: '1px solid #eef0f4', flexShrink: 0 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b', lineHeight: 1.3 }}>{patternLabel(selectedAlert.pattern_type)}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', fontFamily: 'monospace', mt: 0.25 }}>{selectedAlert.id}</Typography>
            </Box>
            <IconButton size="small" onClick={() => setSelectedAlert(null)} sx={{ ml: 1, flexShrink: 0 }}>
              <Close sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {/* Score + Meta */}
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #eef0f4' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ConfidenceGauge score={selectedAlert.confidence_score} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={selectedAlert.severity.toUpperCase()}
                      size="small"
                      sx={{ fontSize: 10, fontWeight: 600, height: 20, color: SEVERITY_COLOR[selectedAlert.severity] || '#64748b', bgcolor: `${SEVERITY_COLOR[selectedAlert.severity] || '#64748b'}14` }}
                    />
                    <Chip
                      label={selectedAlert.status}
                      size="small"
                      sx={{ fontSize: 10, fontWeight: 600, height: 20, color: STATUS_COLOR[selectedAlert.status] || '#64748b', bgcolor: `${STATUS_COLOR[selectedAlert.status] || '#64748b'}14` }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: 13, color: '#1e293b' }}>
                    <Box component="span" sx={{ fontWeight: 700 }}>{formatCurrency(selectedAlert.total_amount)}</Box>
                    <Box component="span" sx={{ color: 'text.secondary', fontSize: 11, ml: 0.5 }}>total exposure</Box>
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>{formatDateTime(selectedAlert.created_at)}</Typography>
                </Box>
              </Box>
            </Box>

            {/* SHAP Narrative */}
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #eef0f4' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <TrendingUp sx={{ fontSize: 14, color: 'primary.main' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  AI Causal Analysis
                </Typography>
              </Box>
<Box
                sx={{
                  fontSize: 12,
                  color: '#475569',
                  lineHeight: 1.7,
                  p: 1.75,
                  borderRadius: 2,
                  bgcolor: '#f8fafc',
                  border: '1px solid #e7e9ee',
                  borderLeft: `3px solid ${SEVERITY_COLOR[selectedAlert.severity] || '#d97706'}`,
                }}
              >
                {selectedAlert.shap_narrative}
              </Box>
            </Box>

            {/* AI Summary (Groq) */}
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #eef0f4' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesome sx={{ fontSize: 14, color: 'primary.main' }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    AI Summary
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={generateSummary}
                  disabled={aiLoading}
                  startIcon={aiLoading ? <Refresh sx={{ fontSize: 13, animation: 'spin 1s linear infinite' }} /> : <AutoAwesome sx={{ fontSize: 13 }} />}
                  sx={{ fontSize: 11, py: 0.25, minHeight: 26 }}
                >
                  {aiSummary ? 'Regenerate' : 'Generate'}
                </Button>
              </Box>

              {aiError && (
                <Alert severity="warning" sx={{ py: 0.5, fontSize: 11, mb: 1 }}>
                  {aiError}
                </Alert>
              )}

              {aiSummary ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Box sx={{ fontSize: 12, color: '#334155', lineHeight: 1.7, p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e7e9ee' }}>
                    {aiSummary.summary}
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.15)' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                      Recommended action
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#334155', lineHeight: 1.6 }}>{aiSummary.recommendedAction}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(217,119,6,0.04)', border: '1px solid rgba(217,119,6,0.15)' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                      Risk rationale
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#334155', lineHeight: 1.6 }}>{aiSummary.riskRationale}</Typography>
                  </Box>
                  {aiSummary.model && (
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>Generated via Groq · {aiSummary.model}</Typography>
                  )}
                </Box>
              ) : (
                !aiError && (
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.6 }}>
                    Generate a plain-English summary with recommended next steps using Groq's LLM.
                  </Typography>
                )
              )}
            </Box>

            {/* SHAP Factors */}
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #eef0f4' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
                Key Risk Factors
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {selectedAlert.shap_factors.map((f, i) => (
                  <Box key={i}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{f.factor}</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'error.main' }}>{(f.weight * 100).toFixed(0)}%</Typography>
                    </Box>
                    <Box sx={{ height: 6, bgcolor: '#eef0f4', borderRadius: 999, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', borderRadius: 999, bgcolor: '#dc2626', width: `${f.weight * 100}%` }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Involved Accounts */}
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #eef0f4' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
                Involved Accounts
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {selectedAlert.involved_accounts.map((id) => {
                  const acc = accounts.get(id);
                  return (
                    <Box key={id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, bgcolor: '#f8fafc', border: '1px solid #e2e9f0', borderRadius: 2 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: '#eef0f4', color: 'text.secondary', fontSize: 13 }}>
                        <Person sx={{ fontSize: 14 }} />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#1e293b', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {acc?.holder_name || id}
                        </Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{acc?.bank_branch || id}</Typography>
                      </Box>
                      {acc && (
                        <Chip
                          label={acc.risk_level}
                          size="small"
                          sx={{ fontSize: 10, fontWeight: 600, height: 20, color: SEVERITY_COLOR[acc.risk_level] || '#64748b', bgcolor: `${SEVERITY_COLOR[acc.risk_level] || '#64748b'}14` }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Evidence Timeline */}
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #eef0f4' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
                Evidence Chain
              </Typography>
              <Box>
                {selectedAlert.linked_transaction_ids.map((id, i) => (
                  <Box key={id} sx={{ display: 'flex', alignItems: 'stretch', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Box sx={{ width: 22, height: 22, borderRadius: 999, bgcolor: '#f1f5f9', border: '1px solid #e2e9f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'text.secondary', fontFamily: 'monospace', fontWeight: 600, flexShrink: 0 }}>
                        {i + 1}
                      </Box>
                      {i < selectedAlert.linked_transaction_ids.length - 1 && (
                        <Box sx={{ width: 1, flex: 1, bgcolor: '#e2e9f0', my: 0.5, minHeight: 12 }} />
                      )}
                    </Box>
                    <Box sx={{ pb: 1, pt: 0.25, display: 'flex', alignItems: 'center' }}>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', fontFamily: 'monospace' }}>{id}</Typography>
                      <ChevronRight sx={{ fontSize: 12, color: 'text.disabled', ml: 0.5 }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Feedback History */}
            {feedback.length > 0 && (
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #eef0f4' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
                  Investigator History
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {feedback.map((f) => (
                    <Box key={f.id} sx={{ p: 1.25, bgcolor: '#f8fafc', border: '1px solid #e2e9f0', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Schedule sx={{ fontSize: 12, color: 'text.secondary' }} />
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{timeAgo(f.created_at)}</Typography>
                        <Chip
                          label={f.investigator_action}
                          size="small"
                          sx={{ fontSize: 10, fontWeight: 600, height: 18, color: STATUS_COLOR[f.investigator_action] || '#64748b', bgcolor: `${STATUS_COLOR[f.investigator_action] || '#64748b'}14` }}
                        />
                      </Box>
                      <Typography sx={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>{f.notes}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Action Area */}
            {selectedAlert.status === 'open' && (
              <Box sx={{ px: 2.5, py: 2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
                  Investigator Action
                </Typography>
                <TextField
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add investigation notes..."
                  multiline
                  minRows={3}
                  fullWidth
                  size="small"
                />
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
                    onClick={() => updateAlertStatus('confirmed')}
                    disabled={actionLoading}
                    sx={{ flex: 1 }}
                  >
                    Confirm & Escalate
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Cancel sx={{ fontSize: 16 }} />}
                    onClick={() => updateAlertStatus('dismissed')}
                    disabled={actionLoading}
                    sx={{ flex: 1 }}
                  >
                    Dismiss
                  </Button>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  startIcon={<EditNote sx={{ fontSize: 16 }} />}
                  onClick={async () => {
                    if (!noteText.trim()) return;
                    setActionLoading(true);
                    await postFeedback({
                      alert_id: selectedAlert.id,
                      status: selectedAlert.status,
                      investigator_action: 'note_added',
                      investigator_name: 'Investigator Arjun Mehta',
                      notes: noteText,
                    });
                    await loadFeedback(selectedAlert.id);
                    setNoteText('');
                    setActionLoading(false);
                  }}
                  disabled={actionLoading || !noteText.trim()}
                  sx={{ mt: 1 }}
                >
                  Add Note
                </Button>
              </Box>
            )}

            {selectedAlert.status === 'confirmed' && (
              <Box sx={{ px: 2.5, py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5, bgcolor: 'rgba(5,150,105,0.05)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 2, fontSize: 12, color: 'success.main' }}>
                  <WarningAmber sx={{ fontSize: 14, mt: 0.25, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 12, color: 'success.main' }}>
                    Alert confirmed â€” generate an STR/CTR report from the Reports section.
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function ConfidenceGauge({ score }: { score: number }) {
  const pct = score * 100;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct > 90 ? '#dc2626' : '#d97706';

  return (
    <Box sx={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
      <svg viewBox="0 0 72 72" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="#eef0f4" strokeWidth="5" />
        <circle
          cx="36" cy="36" r={r} fill="none" stroke={color}
          strokeWidth="5" strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color }}>{pct.toFixed(0)}%</Typography>
      </Box>
    </Box>
  );
}
