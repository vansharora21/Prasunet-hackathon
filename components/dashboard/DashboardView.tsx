'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  GppMaybe,
  Description,
  ShowChart,
  ArrowForward,
  BarChart,
  ArrowUpward,
  Refresh,
} from '@mui/icons-material';
import type { Transaction, FraudAlert, Account } from '@/lib/types';
import { formatCurrency, timeAgo, patternLabel } from '@/lib/formatters';
import { fetchDashboardSummary, fetchTransactions, fetchAlerts } from '@/lib/api';
import type { DashboardSummary } from '@/lib/types';

const PATTERN_COLORS: Record<string, string> = {
  multi_hop_layering: '#dc2626',
  circular_round_trip: '#d97706',
  structuring: '#d97706',
  dormant_reactivation: '#2563eb',
  kyc_mismatch: '#dc2626',
  fan_out_fan_in: '#7c3aed',
  velocity_spike: '#ea580c',
  cross_border_layering: '#dc2626',
};

type BranchRisk = 'critical' | 'high' | 'medium' | 'low';

const RISK_COLOR: Record<BranchRisk, string> = {
  critical: '#dc2626',
  high: '#d97706',
  medium: '#64748b',
  low: '#94a3b8',
};

const RISK_BG: Record<BranchRisk, string> = {
  critical: 'rgba(220,38,38,0.07)',
  high: 'rgba(217,119,6,0.07)',
  medium: '#f8fafc',
  low: '#f8fafc',
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high: '#d97706',
  medium: '#d97706',
  low: '#059669',
};

const CHANNEL_COLOR: Record<string, string> = {
  NEFT: '#2563eb',
  RTGS: '#d97706',
  UPI: '#059669',
};

const KPI_LINKS = [
  { to: '/graph', title: 'Transactions Today', key: 'transactions' },
  { to: '/alerts', title: 'Active Alerts', key: 'openAlerts' },
  { to: '/reports', title: 'Pending Reports', key: 'draftReports' },
  { to: '/graph', title: 'System Risk', key: 'systemRisk' },
] as const;

function computeBranchRisk(accounts: Account[], alerts: FraudAlert[]): { name: string; risk: BranchRisk; alerts: number; accounts: number }[] {
  const branchMap = new Map<string, { accounts: Account[]; alertCount: number; hasCritical: boolean }>();

  for (const acc of accounts) {
    const entry = branchMap.get(acc.bank_branch) || { accounts: [], alertCount: 0, hasCritical: false };
    entry.accounts.push(acc);
    branchMap.set(acc.bank_branch, entry);
  }

  for (const alert of alerts.filter((a) => a.status !== 'dismissed')) {
    for (const id of alert.involved_accounts || []) {
      const acc = accounts.find((a) => a.id === id);
      if (!acc) continue;
      const entry = branchMap.get(acc.bank_branch);
      if (!entry) continue;
      entry.alertCount += 1;
      if (alert.severity === 'critical' || alert.confidence_score > 0.9) entry.hasCritical = true;
    }
  }

  const riskOf = (entry: { alertCount: number; hasCritical: boolean }): BranchRisk => {
    if (entry.hasCritical || entry.alertCount >= 4) return 'critical';
    if (entry.alertCount >= 2) return 'high';
    if (entry.alertCount === 1) return 'medium';
    return 'low';
  };

  return [...branchMap.entries()]
    .map(([name, entry]) => ({ name, risk: riskOf(entry), alerts: entry.alertCount, accounts: entry.accounts.length }))
    .sort((a, b) => {
      const order: Record<BranchRisk, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.risk] - order[b.risk];
    });
}

export default function DashboardView({
  recentTxns: initialTxns,
  alerts: initialAlerts,
  accounts: initialAccounts,
  totalTxns: initialTotal,
  pendingReports: initialPending,
}: {
  recentTxns: Transaction[];
  alerts: FraudAlert[];
  accounts: Account[];
  totalTxns: number;
  pendingReports: number;
}) {
  const [recentTxns, setRecentTxns] = useState<Transaction[]>(initialTxns);
  const [alerts, setAlerts] = useState<FraudAlert[]>(initialAlerts);
  const [accounts] = useState<Account[]>(initialAccounts);
  const [totalTxns, setTotalTxns] = useState(initialTotal);
  const [pendingReports, setPendingReports] = useState(initialPending);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<{ name: string; risk: BranchRisk; alerts: number; accounts: number } | null>(null);

  const openAlerts = alerts.filter((a) => a.status === 'open');
  const criticalAlerts = openAlerts.filter((a) => a.severity === 'critical');
  const systemRisk = criticalAlerts.length > 2 ? 'Critical' : criticalAlerts.length > 0 ? 'High' : 'Medium';

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [summary, txns, alertList] = await Promise.all([
        fetchDashboardSummary(),
        fetchTransactions(20),
        fetchAlerts(),
      ]);
      setTotalTxns(summary.transactions);
      setPendingReports(summary.draftReports);
      setRecentTxns(txns);
      setAlerts(alertList);
      setLastRefreshed(new Date());
    } finally {
      setRefreshing(false);
    }
  }, []);

  const patternCounts = Object.entries(
    alerts.reduce((acc: Record<string, number>, a) => {
      acc[a.pattern_type] = (acc[a.pattern_type] || 0) + 1;
      return acc;
    }, {})
  ).map(([pattern, count]) => ({ pattern, count, color: PATTERN_COLORS[pattern] || '#64748b' }));

  const maxCount = Math.max(...patternCounts.map((p) => p.count), 1);
  const flaggedIds = new Set(alerts.flatMap((a) => a.linked_transaction_ids));
  const branches = computeBranchRisk(accounts, alerts);

  // Detail for the selected branch: its accounts + the alerts touching them
  const branchDetail = selectedBranch
    ? (() => {
        const branchAccounts = accounts.filter((a) => a.bank_branch === selectedBranch.name);
        const branchAccountIds = new Set(branchAccounts.map((a) => a.id));
        const branchAlerts = alerts.filter(
          (a) => a.status !== 'dismissed' && (a.involved_accounts || []).some((id) => branchAccountIds.has(id))
        );
        return { accounts: branchAccounts, alerts: branchAlerts };
      })()
    : null;
  const kpiValues: Record<string, string> = {
    transactions: totalTxns.toString(),
    openAlerts: openAlerts.length.toString(),
    draftReports: pendingReports.toString(),
    systemRisk,
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header + refresh */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>Compliance Overview</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
            {lastRefreshed
              ? `Last refreshed ${timeAgo(lastRefreshed.toISOString())}`
              : 'Live view of today’s AML / fraud activity'}
          </Typography>
        </Box>
        <Tooltip title="Refresh from live backend">
          <IconButton
            onClick={refresh}
            disabled={refreshing}
            sx={{ border: '1px solid #e2e8f0', bgcolor: '#fff', '&:hover': { bgcolor: '#f8fafc' } }}
          >
            <Refresh sx={{ fontSize: 18, ...(refreshing && { animation: 'spin 1s linear infinite' }) }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* KPI strip — each card links to its section */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
        <KpiLink to="/graph" title="Transactions Today" value={totalTxns.toString()} sub="+12 in last hour" icon={<ShowChart sx={{ fontSize: 20 }} />} />
        <KpiLink to="/alerts" title="Active Alerts" value={openAlerts.length.toString()} sub={`${criticalAlerts.length} critical`} icon={<GppMaybe sx={{ fontSize: 20 }} />} />
        <KpiLink to="/reports" title="Pending Reports" value={pendingReports.toString()} sub="STR / CTR drafts" icon={<Description sx={{ fontSize: 20 }} />} />
        <KpiLink to="/intelligence" title="System Risk" value={systemRisk} sub="Based on active alerts" icon={<TrendingUp sx={{ fontSize: 20 }} />} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '2fr 1fr' }, gap: 2.5 }}>
        {/* Live Transaction Feed */}
        <Card>
          <CardHeaderRow
            title={
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box sx={{ position: 'relative', width: 8, height: 8 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: 'success.main' }} />
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 999,
                      bgcolor: 'success.main',
                      opacity: 0.4,
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': { '0%': { transform: 'scale(1)', opacity: 0.5 }, '70%': { transform: 'scale(2.2)', opacity: 0 } },
                    }}
                  />
                </Box>
                <Title14>Live Transaction Feed</Title14>
              </Stack>
            }
            action={
              <Link href="/graph" style={{ textDecoration: 'none' }}>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'primary.main', fontSize: 12, fontWeight: 500 }}>
                  View Graph <ArrowForward sx={{ fontSize: 14 }} />
                </Stack>
              </Link>
            }
          />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Time', 'Reference', 'Channel', 'From', 'To', 'Amount', 'Status'].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {recentTxns.map((t) => {
                  const isFlagged = flaggedIds.has(t.id);
                  return (
                    <TableRow
                      key={t.id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        ...(isFlagged && { '& td:first-of-type': { borderLeft: '3px solid #dc2626' } }),
                      }}
                    >
                      <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{timeAgo(t.timestamp)}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' }}>{t.reference_number.slice(-8)}</TableCell>
                      <TableCell>
                        <Chip
                          label={t.channel}
                          size="small"
                          sx={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: CHANNEL_COLOR[t.channel] || '#64748b',
                            bgcolor: `${CHANNEL_COLOR[t.channel] || '#64748b'}14`,
                            border: `1px solid ${CHANNEL_COLOR[t.channel] || '#64748b'}30`,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' }}>{t.sender_account_id.slice(-6)}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' }}>{t.receiver_account_id.slice(-6)}</TableCell>
                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(t.amount)}</TableCell>
                      <TableCell>
                        {isFlagged ? (
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'error.main', fontSize: 12, fontWeight: 500 }}>
                            <GppMaybe sx={{ fontSize: 14 }} /> Flagged
                          </Stack>
                        ) : (
                          <Text12 color="success.main">{t.status}</Text12>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Right column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Pattern Distribution */}
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                <BarChart sx={{ fontSize: 18, color: 'primary.main' }} />
                <Title14>Alert Distribution</Title14>
              </Stack>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {patternCounts.map(({ pattern, count, color }) => (
                  <Box key={pattern}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                      <Text12 color="text.secondary">{patternLabel(pattern)}</Text12>
                      <Text12 sx={{ fontWeight: 600, color }}>{count}</Text12>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={(count / maxCount) * 100}
                      sx={{ '& .MuiLinearProgress-bar': { backgroundColor: color } }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Active Alerts */}
          <Card>
            <CardHeaderRow
              title={
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <GppMaybe sx={{ fontSize: 18, color: 'error.main' }} />
                  <Title14>Active Alerts</Title14>
                </Stack>
              }
              action={
                <Link href="/alerts" style={{ textDecoration: 'none' }}>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'primary.main', fontSize: 12, fontWeight: 500 }}>
                    All <ArrowForward sx={{ fontSize: 14 }} />
                  </Stack>
                </Link>
              }
            />
            <Box sx={{ borderTop: '1px solid #eef0f4' }}>
              {openAlerts.slice(0, 5).map((a) => (
                <Link key={a.id} href="/alerts" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      px: 2,
                      py: 1.5,
                      borderBottom: '1px solid #f1f3f7',
                      borderLeft: `3px solid ${SEVERITY_COLOR[a.severity] || '#64748b'}`,
                      '&:hover': { backgroundColor: '#f8fafc' },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                        <Chip
                          label={a.severity.toUpperCase()}
                          size="small"
                          sx={{
                            fontSize: 10,
                            fontWeight: 600,
                            height: 20,
                            color: SEVERITY_COLOR[a.severity] || '#64748b',
                            bgcolor: `${SEVERITY_COLOR[a.severity] || '#64748b'}14`,
                          }}
                        />
                        <Text12 color="text.secondary">{(a.confidence_score * 100).toFixed(0)}%</Text12>
                      </Stack>
                      <Text13 sx={{ fontWeight: 500, color: '#1e293b' }}>{patternLabel(a.pattern_type)}</Text13>
                      <Text12 color="text.secondary" sx={{ mt: 0.25 }}>{timeAgo(a.created_at)}</Text12>
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Text13 sx={{ fontWeight: 600, color: '#1e293b' }}>{formatCurrency(a.total_amount)}</Text13>
                      <Chip
                        label={a.status}
                        size="small"
                        sx={{ mt: 0.5, fontSize: 10, height: 20, color: '#2563eb', bgcolor: 'rgba(37,99,235,0.08)' }}
                      />
                    </Box>
                  </Box>
                </Link>
              ))}
            </Box>
          </Card>
        </Box>
      </Box>

      {/* Branch Risk Heatmap — computed from live accounts + alerts */}
      <Card>
        <CardContent>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Title14>Branch Risk Heatmap</Title14>
            <Stack direction="row" spacing={2}>
              {(['critical', 'high', 'medium', 'low'] as BranchRisk[]).map((r) => (
                <Stack key={r} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: 1, bgcolor: RISK_COLOR[r] }} />
                  <Text12 color="text.secondary" sx={{ textTransform: 'capitalize' }}>{r}</Text12>
                </Stack>
              ))}
            </Stack>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 1 }}>
            {branches.map((b) => {
              const isSel = selectedBranch?.name === b.name;
              return (
                <Box
                  key={b.name}
                  onClick={() => setSelectedBranch(isSel ? null : b)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    textAlign: 'center',
                    bgcolor: RISK_BG[b.risk],
                    border: `1px solid ${isSel ? RISK_COLOR[b.risk] : `${RISK_COLOR[b.risk]}30`}`,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                    cursor: 'pointer',
                    outline: isSel ? `2px solid ${RISK_COLOR[b.risk]}55` : 'none',
                    '&:hover': { transform: 'scale(1.02)', boxShadow: '0 2px 8px rgba(15,23,42,0.08)' },
                  }}
                >
                  <Typography sx={{ fontSize: 11, fontWeight: 500, lineHeight: 1.3, color: '#334155' }}>{b.name}</Typography>
                  {b.alerts > 0 ? (
                    <Stack direction="row" spacing={0.25} sx={{ mt: 0.5, justifyContent: 'center', alignItems: 'center', color: RISK_COLOR[b.risk], fontSize: 10, fontWeight: 500 }}>
                      <ArrowUpward sx={{ fontSize: 12 }} /> {b.alerts} alert{b.alerts > 1 ? 's' : ''}
                    </Stack>
                  ) : (
                    <Typography sx={{ mt: 0.5, fontSize: 10, color: 'text.disabled' }}>{b.accounts} accts · clear</Typography>
                  )}
                </Box>
              );
            })}
          </Box>

          {/* Branch detail panel */}
          {selectedBranch && branchDetail && (
            <Box sx={{ mt: 2, p: 2, borderRadius: 2, border: `1px solid ${RISK_COLOR[selectedBranch.risk]}40`, bgcolor: `${RISK_COLOR[selectedBranch.risk]}08` }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: RISK_COLOR[selectedBranch.risk] }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{selectedBranch.name}</Typography>
                  <Chip
                    label={selectedBranch.risk}
                    size="small"
                    sx={{ fontSize: 10, fontWeight: 600, textTransform: 'capitalize', color: RISK_COLOR[selectedBranch.risk], bgcolor: `${RISK_COLOR[selectedBranch.risk]}18`, border: `1px solid ${RISK_COLOR[selectedBranch.risk]}40` }}
                  />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{branchDetail.accounts.length} accounts</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{branchDetail.alerts.length} active alerts</Typography>
                </Stack>
              </Stack>

              {branchDetail.alerts.length > 0 ? (
                <Stack spacing={1}>
                  {branchDetail.alerts.slice(0, 5).map((a) => (
                    <Stack key={a.id} direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.7)', border: '1px solid #eef0f4' }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: 999, bgcolor: SEVERITY_COLOR[a.severity] || '#64748b', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 11, fontWeight: 500, color: '#334155', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {patternLabel(a.pattern_type)}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary', textTransform: 'capitalize' }}>{a.severity}</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
                        {(a.confidence_score * 100).toFixed(0)}%
                      </Typography>
                    </Stack>
                  ))}
                  {branchDetail.alerts.length > 5 && (
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>+{branchDetail.alerts.length - 5} more alerts</Typography>
                  )}
                </Stack>
              ) : (
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>No active alerts for this branch.</Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

function KpiLink({ to, title, value, sub, icon }: {
  to: string; title: string; value: string; sub: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={to} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          transition: 'box-shadow 0.15s ease, transform 0.15s ease',
          '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.06)', transform: 'translateY(-1px)' },
          cursor: 'pointer',
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#71717a' }}>{title}</Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: '#0f172a', mt: 0.5, lineHeight: 1.2 }}>{value}</Typography>
          <Typography sx={{ fontSize: 11, color: '#a1a1aa', mt: 0.5 }}>{sub}</Typography>
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.07)', color: '#1c1c1c', mt: 0.5 }}>{icon}</Box>
      </Card>
    </Link>
  );
}

function CardHeaderRow({ title, action }: { title: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2, borderBottom: '1px solid #eef0f4' }}>
      {title}
      {action}
    </Box>
  );
}

function Title14({ children }: { children: React.ReactNode }) {
  return <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{children}</Typography>;
}

function Text13({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return <Typography sx={{ fontSize: 13, ...sx }}>{children}</Typography>;
}

function Text12({ children, color, sx }: { children: React.ReactNode; color?: string; sx?: object }) {
  return <Typography sx={{ fontSize: 12, color, ...sx }}>{children}</Typography>;
}