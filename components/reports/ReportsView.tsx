'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Divider,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
} from '@mui/material';
import {
  Description,
  Add,
  Download,
  X,
  ChevronRight,
  Timer,
  Send,
  CheckCircle,
  WarningAmber,
  AutoAwesome,
} from '@mui/icons-material';
import type { FraudAlert, Account, Transaction, StrCtrReport } from '@/lib/types';
import { formatCurrency, formatDateTime, timeAgo, patternLabel } from '@/lib/formatters';
import { generateReport as createReport, updateReport } from '@/lib/api';

type Step = 'list' | 'select' | 'preview';

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high: '#d97706',
  medium: '#d97706',
  low: '#059669',
};

export default function ReportsView({
  initialReports,
  initialAlerts,
  initialAccounts,
  initialTransactions,
}: {
  initialReports: StrCtrReport[];
  initialAlerts: FraudAlert[];
  initialAccounts: Account[];
  initialTransactions: Transaction[];
}) {
  const [reports, setReports] = useState<StrCtrReport[]>(initialReports);
  const [alerts] = useState<FraudAlert[]>(initialAlerts);
  const [accounts] = useState<Account[]>(initialAccounts);
  const [transactions] = useState<Transaction[]>(initialTransactions);
  const [step, setStep] = useState<Step>('list');
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([]);
  const [reportType, setReportType] = useState<'STR' | 'CTR'>('STR');
  const [narrative, setNarrative] = useState('');
  const [previewReport, setPreviewReport] = useState<StrCtrReport | null>(null);
  const [generatedXml, setGeneratedXml] = useState('');
  const [generating, setGenerating] = useState(false);

  const confirmedAlerts = alerts.filter((a) => a.status === 'confirmed');

  const handleGenerateReport = async () => {
    if (selectedAlertIds.length === 0) return;
    setGenerating(true);
    const startTime = Date.now();
    await new Promise((r) => setTimeout(r, 1200));

    const selectedAlerts = alerts.filter((a) => selectedAlertIds.includes(a.id));
    const allTxnIds = [...new Set(selectedAlerts.flatMap((a) => a.linked_transaction_ids))];
    const allAccIds = [...new Set(selectedAlerts.flatMap((a) => a.involved_accounts))];
    const involvedTxns = transactions.filter((t) => allTxnIds.includes(t.id));
    const involvedAccs = accounts.filter((a) => allAccIds.includes(a.id));
    const totalAmount = selectedAlerts.reduce((s, a) => s + a.total_amount, 0);
    const genTimeSecs = Math.round((Date.now() - startTime) / 1000);
    const defaultNarrative = narrative ||
      `${reportType} Report: Suspicious activity detected across ${selectedAlerts.length} alert(s) involving ${allAccIds.length} accounts. Total suspicious transaction value: ${formatCurrency(totalAmount)}. Pattern types: ${[...new Set(selectedAlerts.map((a) => patternLabel(a.pattern_type)))].join(', ')}. AI analysis indicates high-confidence fraud indicators. Immediate investigation and regulatory reporting recommended.`;
    const result = await createReport({
      alertIds: selectedAlertIds,
      reportType,
      narrative: defaultNarrative,
      submissionStatus: 'draft',
    });
    const inserted = {
      ...result.report,
      alert_ids: selectedAlertIds,
      generation_time_seconds: genTimeSecs,
      created_at: new Date().toISOString(),
      transaction_summary: {
        total_amount: totalAmount,
        transaction_count: allTxnIds.length,
        account_count: allAccIds.length,
        channels: [...new Set(involvedTxns.map((t) => t.channel))],
      },
      subject_details: {
        reporting_entity: 'Union Bank of India',
        branch: involvedAccs[0]?.bank_branch || 'Multiple Branches',
        officer: 'Chief Compliance Officer',
        date: new Date().toISOString().split('T')[0],
      },
    } as StrCtrReport;
    setReports((prev) => [inserted, ...prev]);
    setPreviewReport(inserted);
    setGeneratedXml(result.xml);
    setStep('preview');
    setGenerating(false);
  };

  const submitReport = async (id: string) => {
    const now = new Date().toISOString();
    await updateReport({ id, submission_status: 'submitted', submitted_at: now });
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, submission_status: 'submitted', submitted_at: now } : r));
    if (previewReport?.id === id) setPreviewReport((r) => r ? { ...r, submission_status: 'submitted' } : null);
  };

  const downloadXml = (xml: string, id: string) => {
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${id}_goAML.xml`; a.click();
    URL.revokeObjectURL(url);
  };

  const colorizeXml = (xml: string) => {
    return xml
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/&lt;(\/?[\w:]+)/g, '<span style="color:#1c1c1c">&lt;$1</span>')
      .replace(/&gt;/g, '<span style="color:#1c1c1c">&gt;</span>')
      .replace(/&gt;([^&<]+)&lt;/g, '&gt;<span style="color:#cbd5e1">$1</span>&lt;')
      .replace(/([\w:]+)="([^"]*)"/g, '<span style="color:#94a3b8">$1</span>=<span style="color:#10b981">"$2"</span>');
  };

  /* ── SELECT STEP ── */
  if (step === 'select') {
    return (
      <Box sx={{ p: 3, maxWidth: 760, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>Generate New Report</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>Select confirmed alerts to include</Typography>
          </Box>
          <IconButton size="small" onClick={() => setStep('list')}>
            <X sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Report Type */}
        <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
            Report Type
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {(['STR', 'CTR'] as const).map((t) => (
              <Button
                key={t}
                fullWidth
                onClick={() => setReportType(t)}
                variant={reportType === t ? 'contained' : 'outlined'}
                sx={{
                  py: 1.5,
                  fontSize: 13,
                  fontWeight: 600,
                  color: reportType === t ? '#fff' : 'text.secondary',
                  flexDirection: 'column',
                  gap: 0.25,
                }}
              >
                {t}
                <Typography sx={{ fontSize: 10, fontWeight: 400, opacity: 0.75, lineHeight: 1.3 }}>
                  {t === 'STR' ? 'Suspicious Transaction Report' : 'Cash Transaction Report'}
                </Typography>
              </Button>
            ))}
          </Box>
        </Paper>

        {/* Alert Selection */}
        <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #eef0f4', bgcolor: '#fafbfc' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Confirmed Alerts</Typography>
          </Box>
          {confirmedAlerts.length === 0 ? (
            <Box sx={{ px: 2.5, py: 6, textAlign: 'center' }}>
              <WarningAmber sx={{ fontSize: 32, color: 'text.disabled', mx: 'auto', mb: 1 }} />
              <Typography sx={{ fontSize: 13, color: '#475569' }}>No confirmed alerts available.</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>Confirm alerts from the Fraud Alert Workbench first.</Typography>
            </Box>
          ) : (
            <Box sx={{ '& > div': { borderTop: '1px solid #f1f3f7' }, '& > div:first-of-type': { borderTop: 'none' } }}>
              {confirmedAlerts.map((a) => (
                <Box
                  key={a.id}
                  component="label"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.75, cursor: 'pointer', '&:hover': { bgcolor: '#f8fafc' }, transition: 'background 150ms ease' }}
                >
                  <Checkbox
                    checked={selectedAlertIds.includes(a.id)}
                    onChange={(e) => setSelectedAlertIds((prev) =>
                      e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id)
                    )}
                    sx={{ p: 0.5, color: 'primary.main' }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.25 }}>
                      <Chip
                        label={a.severity.toUpperCase()}
                        size="small"
                        sx={{ fontSize: 10, fontWeight: 600, height: 18, color: SEVERITY_COLOR[a.severity] || '#64748b', bgcolor: 'transparent' }}
                      />
                      <Typography sx={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{patternLabel(a.pattern_type)}</Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{a.involved_accounts.length} accounts · {timeAgo(a.created_at)}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(a.total_amount)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        {/* Narrative */}
        <Paper variant="outlined" sx={{ p: 2.5, mb: 2.5 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
            Narrative Override (optional)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="Auto-generated from alert data if left blank..."
            size="small"
          />
        </Paper>

        <Button
          fullWidth
          variant="contained"
          onClick={handleGenerateReport}
          disabled={selectedAlertIds.length === 0 || generating}
          startIcon={generating ? <Timer sx={{ fontSize: 16, animation: 'spin 1s linear infinite' }} /> : <AutoAwesome sx={{ fontSize: 16 }} />}
          sx={{ py: 1.25 }}
        >
          {generating ? 'Generating report...' : `Generate ${reportType} Report`}
        </Button>
      </Box>
    );
  }

  /* ── PREVIEW STEP ── */
  if (step === 'preview' && previewReport) {
    const totalAmt = (previewReport.transaction_summary as { total_amount?: number })?.total_amount || 0;
    const txnCount = (previewReport.transaction_summary as { transaction_count?: number })?.transaction_count || 0;
    const accCount = (previewReport.transaction_summary as { account_count?: number })?.account_count || 0;
    const xml = (generatedXml || previewReport.goaml_xml);
    const displayXml = xml.slice(0, 3000) + (xml.length > 3000 ? '\n\n... (truncated for display)' : '');

    return (
      <Box sx={{ p: 3, maxWidth: 880, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%', overflow: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.75 }}>
              <Chip
                label={`Generated in ${previewReport.generation_time_seconds}s`}
                size="small"
                sx={{ fontSize: 11, fontWeight: 600, color: '#059669', bgcolor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}
              />
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>vs. 4 hours manual</Typography>
              <Typography sx={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>96% faster</Typography>
            </Stack>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
              {previewReport.report_type} Report
              <Typography component="span" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: 13, ml: 1 }}>{previewReport.id}</Typography>
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button variant="outlined" size="small" startIcon={<Download sx={{ fontSize: 14 }} />} onClick={() => downloadXml(generatedXml || previewReport.goaml_xml, previewReport.id)}>
              Download XML
            </Button>
            {previewReport.submission_status === 'draft' ? (
              <Button variant="contained" size="small" startIcon={<Send sx={{ fontSize: 14 }} />} onClick={() => submitReport(previewReport.id)}>
                Submit to FIU-IND
              </Button>
            ) : (
              <Chip
                icon={<CheckCircle sx={{ fontSize: 13, color: '#059669' }} />}
                label="Submitted"
                size="small"
                sx={{ fontSize: 11, fontWeight: 600, color: '#059669', bgcolor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}
              />
            )}
            <IconButton size="small" onClick={() => setStep('list')}>
              <X sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
        </Box>

        {/* Time Saved Banner */}
        <Paper variant="outlined" sx={{ p: 2.5, borderColor: 'rgba(5,150,105,0.25)' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 1.5, bgcolor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Timer sx={{ fontSize: 22, color: '#059669' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Report ready in under 2 seconds</Typography>
              <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.5 }}>
                Traditional manual reporting takes <Box component="span" sx={{ color: '#1e293b', fontWeight: 600 }}>~4 hours</Box>.
                Causeway AI generated this in <Box component="span" sx={{ color: '#059669', fontWeight: 600 }}>{previewReport.generation_time_seconds}s</Box> —
                saving your team <Box component="span" sx={{ color: '#059669', fontWeight: 600 }}>96% of the time</Box>.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {/* Report Details */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
              Report Details
            </Typography>
            <Stack spacing={1.25}>
              {[
                ['Report ID', previewReport.id],
                ['Type', previewReport.report_type],
                ['Filing Entity', previewReport.subject_details?.reporting_entity || 'Union Bank of India'],
                ['Reporting Officer', 'Chief Compliance Officer'],
                ['Filing Date', formatDateTime(previewReport.created_at)],
                ['FIU Reference', `FIU-IND-${previewReport.id}`],
              ].map(([label, value]) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{label}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#475569', fontWeight: 500, textAlign: 'right' }}>{value}</Typography>
                </Box>
              ))}
              <Divider />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Status</Typography>
                <Chip
                  label={previewReport.submission_status}
                  size="small"
                  sx={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize', color: previewReport.submission_status === 'submitted' ? '#059669' : '#d97706', bgcolor: previewReport.submission_status === 'submitted' ? 'rgba(5,150,105,0.08)' : 'rgba(217,119,6,0.08)', border: `1px solid ${previewReport.submission_status === 'submitted' ? 'rgba(5,150,105,0.2)' : 'rgba(217,119,6,0.2)'}` }}
                />
              </Box>
            </Stack>
          </Paper>

          {/* Transaction Summary */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
              Transaction Summary
            </Typography>
            <Stack spacing={1.5}>
              {[
                { label: 'Total Suspicious Value', value: formatCurrency(totalAmt), accent: true },
                { label: 'Transaction Count', value: String(txnCount) },
                { label: 'Accounts Involved', value: String(accCount) },
                { label: 'Alerts Covered', value: String(previewReport.alert_ids.length) },
              ].map(({ label, value, accent }) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{label}</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: accent ? '#1e293b' : '#475569', fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Box>

        {/* Narrative */}
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
            Narrative Description
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>{previewReport.narrative}</Typography>
        </Paper>

        {/* goAML XML */}
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid #eef0f4', bgcolor: '#fafbfc' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Description sx={{ fontSize: 14, color: 'primary.main' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>goAML XML</Typography>
            </Stack>
            <Chip label="FIU-IND v2.0" size="small" sx={{ fontSize: 10, height: 20, color: 'text.secondary', bgcolor: '#f1f5f9', border: '1px solid #e2e8f0' }} />
          </Box>
          <Box sx={{ p: 2.5, bgcolor: '#0f172a', maxHeight: 288, overflow: 'auto' }}>
            <Typography
              component="pre"
              sx={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6, color: '#cbd5e1', m: 0, whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{ __html: colorizeXml(displayXml) }}
            />
          </Box>
        </Paper>
      </Box>
    );
  }

  /* ── LIST STEP ── */
  const draftCount = reports.filter((r) => r.submission_status === 'draft').length;
  const submittedCount = reports.filter((r) => r.submission_status === 'submitted').length;
  const avgGenTime = reports.length > 0 ? Math.round(reports.reduce((s, r) => s + r.generation_time_seconds, 0) / reports.length) : 0;

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>STR / CTR Reports</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
            {reports.length} total · {draftCount} pending submission
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add sx={{ fontSize: 14 }} />}
          onClick={() => { setSelectedAlertIds([]); setNarrative(''); setStep('select'); }}
        >
          New Report
        </Button>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        {[
          { label: 'Total Reports', value: reports.length, color: '#1e293b' },
          { label: 'Draft', value: draftCount, color: '#d97706' },
          { label: 'Submitted', value: submittedCount, color: '#059669' },
          { label: 'Avg Gen Time', value: `${avgGenTime}s`, color: '#1c1c1c' },
        ].map(({ label, value, color }) => (
          <Paper key={label} variant="outlined" sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {label}
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 600, mt: 0.75, color, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Table */}
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Report ID', 'Type', 'Alerts', 'Total Value', 'Generated', 'Gen Time', 'Status', ''].map((h) => (
                  <TableCell key={h}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((r) => {
                const totalAmt = (r.transaction_summary as { total_amount?: number })?.total_amount || 0;
                return (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' }}>{r.id}</TableCell>
                    <TableCell>
                      <Chip
                        label={r.report_type}
                        size="small"
                        sx={{ fontSize: 11, fontWeight: 600, color: r.report_type === 'STR' ? '#dc2626' : 'primary.main', bgcolor: r.report_type === 'STR' ? 'rgba(220,38,38,0.08)' : 'rgba(0,0,0,0.08)', border: `1px solid ${r.report_type === 'STR' ? 'rgba(220,38,38,0.3)' : 'rgba(0,0,0,0.3)'}` }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#475569' }}>{r.alert_ids.length}</TableCell>
                    <TableCell sx={{ fontSize: 13, color: '#1e293b', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalAmt)}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{timeAgo(r.created_at)}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#475569' }}>{r.generation_time_seconds}s</TableCell>
                    <TableCell>
                      <Chip
                        label={r.submission_status}
                        size="small"
                        sx={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize', color: r.submission_status === 'submitted' ? '#059669' : '#d97706', bgcolor: r.submission_status === 'submitted' ? 'rgba(5,150,105,0.08)' : 'rgba(217,119,6,0.08)', border: `1px solid ${r.submission_status === 'submitted' ? 'rgba(5,150,105,0.2)' : 'rgba(217,119,6,0.2)'}` }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        endIcon={<ChevronRight sx={{ fontSize: 13 }} />}
                        onClick={() => { setPreviewReport(r); setGeneratedXml(r.goaml_xml); setStep('preview'); }}
                        sx={{ fontSize: 11, color: 'primary.main' }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {reports.length === 0 && (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Description sx={{ fontSize: 40, color: 'text.disabled', mx: 'auto', mb: 1.5 }} />
            <Typography sx={{ fontSize: 13, color: '#475569' }}>No reports yet</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>Confirm alerts and generate your first report</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}