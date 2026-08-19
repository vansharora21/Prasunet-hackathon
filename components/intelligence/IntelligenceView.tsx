'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  MenuItem,
  Divider,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Search,
  Dataset,
  Hub,
  AccountTree,
  WarningAmber,
  VerifiedUser,
  ArrowForward,
  Refresh,
} from '@mui/icons-material';
import { searchVector, indexVectors, findShortestPath, type VectorSearchResult } from '@/lib/api';
import type { FraudAlert } from '@/lib/types';

type Community = {
  id: string;
  member_account_ids: string[];
  total_flow: number;
  suspicious_edge_count: number;
};

type Chain = {
  source_account_id: string;
  target_account_id: string;
  path_account_ids: string[];
  hop_count: number;
  total_amount: number;
  is_suspicious: boolean;
};

type InitialData = {
  nodeCount: number;
  edgeCount: number;
  suspiciousEdgeCount: number;
  communities: Community[];
  suspiciousChains: Chain[];
  accounts: { id: string; name: string }[];
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high: '#d97706',
  medium: '#d97706',
  low: '#059669',
};

export default function IntelligenceView({ initialData }: { initialData: InitialData }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VectorSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [indexing, setIndexing] = useState(false);
  const [indexMessage, setIndexMessage] = useState<string | null>(null);

  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [pathResult, setPathResult] = useState<{ path_account_ids: string[]; hop_count: number; total_amount: number; is_suspicious: boolean } | null>(null);
  const [pathMessage, setPathMessage] = useState<string | null>(null);
  const [pathLoading, setPathLoading] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await searchVector(query, 10);
      setSearchResults(res.results);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed');
      setSearchResults(null);
    } finally {
      setSearching(false);
    }
  }

  async function handleIndex() {
    setIndexing(true);
    setIndexMessage(null);
    try {
      const res = await indexVectors();
      setIndexMessage(`Indexed ${res.indexed} alerts into pgvector.`);
    } catch (error) {
      setIndexMessage(error instanceof Error ? error.message : 'Indexing failed');
    } finally {
      setIndexing(false);
    }
  }

  async function handlePath() {
    if (!source || !target) return;
    setPathLoading(true);
    setPathMessage(null);
    setPathResult(null);
    try {
      const res = await findShortestPath(source, target);
      if (res.path) {
        setPathResult(res.path);
      } else {
        setPathMessage(res.message || 'No path found.');
      }
    } catch (error) {
      setPathMessage(error instanceof Error ? error.message : 'Path search failed');
    } finally {
      setPathLoading(false);
    }
  }

  const stats = [
    { icon: Hub, label: 'Accounts (nodes)', value: initialData.nodeCount, color: '#1c1c1c' },
    { icon: AccountTree, label: 'Fund-flow edges', value: initialData.edgeCount, color: '#1c1c1c' },
    { icon: WarningAmber, label: 'Suspicious edges', value: initialData.suspiciousEdgeCount, color: '#dc2626' },
    { icon: VerifiedUser, label: 'Communities', value: initialData.communities.length, color: '#059669' },
  ];

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%', overflow: 'auto' }}>
      <Box>
        <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>Graph Intelligence</Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
          Vector DB semantic search (pgvector) and FalkorDB-style network analytics.
        </Typography>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
        {stats.map(({ icon: Icon, label, value, color }) => (
          <Paper key={label} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
              <Icon sx={{ fontSize: 18, color }} />
              <Typography sx={{ fontSize: 12 }}>{label}</Typography>
            </Stack>
            <Typography sx={{ mt: 1, fontSize: 24, fontWeight: 700, color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Semantic search */}
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Dataset sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Semantic Alert Search</Typography>
          </Stack>
          <Button
            onClick={handleIndex}
            disabled={indexing}
            size="small"
            variant="outlined"
            startIcon={indexing ? <Refresh sx={{ fontSize: 14, animation: 'spin 1s linear infinite' }} /> : <Refresh sx={{ fontSize: 14 }} />}
          >
            Re-index vectors
          </Button>
        </Box>

        {indexMessage && (
          <Alert severity={indexMessage.startsWith('Indexed') ? 'success' : 'error'} sx={{ mb: 2, py: 0.5, fontSize: 12 }}>
            {indexMessage}
          </Alert>
        )}

        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search alerts semantically, e.g. 'layering through shell companies'"
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            startIcon={searching ? <Refresh sx={{ fontSize: 14, animation: 'spin 1s linear infinite' }} /> : <Search sx={{ fontSize: 14 }} />}
            sx={{ flexShrink: 0 }}
          >
            Search
          </Button>
        </Stack>

        {searchError && <Alert severity="error" sx={{ mt: 1.5, py: 0.5, fontSize: 12 }}>{searchError}</Alert>}

        {searchResults && (
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {searchResults.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>No similar alerts found. Try re-indexing vectors first.</Typography>
            ) : (
              searchResults.map(({ alert, similarity }) => (
                <Box key={alert.id} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, border: '1px solid #e2e8f0', borderRadius: 2, p: 1.5 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                      <Chip
                        label={alert.severity}
                        size="small"
                        sx={{ fontSize: 10, fontWeight: 600, height: 18, color: SEVERITY_COLOR[alert.severity] || '#64748b', bgcolor: `${SEVERITY_COLOR[alert.severity] || '#64748b'}18`, border: `1px solid ${SEVERITY_COLOR[alert.severity] || '#64748b'}40` }}
                      />
                      <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{alert.pattern_type}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{alert.status}</Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 12, color: '#475569', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {alert.shap_narrative}
                    </Typography>
                  </Box>
                  <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>
                      {(similarity * 100).toFixed(1)}%
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>similarity</Typography>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        )}
      </Paper>

      {/* Shortest path */}
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <AccountTree sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Shortest Path (Layering Chain)</Typography>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <TextField
            select
            size="small"
            label="Source account"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <MenuItem value="">Source account</MenuItem>
            {initialData.accounts.map((a) => (
              <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Target account"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <MenuItem value="">Target account</MenuItem>
            {initialData.accounts.map((a) => (
              <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
            ))}
          </TextField>
        </Box>
        <Button
          onClick={handlePath}
          disabled={pathLoading || !source || !target}
          variant="contained"
          size="small"
          startIcon={pathLoading ? <Refresh sx={{ fontSize: 14, animation: 'spin 1s linear infinite' }} /> : <ArrowForward sx={{ fontSize: 14 }} />}
          sx={{ mt: 1.5 }}
        >
          Find Path
        </Button>

        {pathMessage && <Typography sx={{ fontSize: 12, color: '#475569', mt: 1.5 }}>{pathMessage}</Typography>}

        {pathResult && (
          <Box sx={{ mt: 2, border: '1px solid #e2e8f0', borderRadius: 2, p: 1.5 }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              {pathResult.path_account_ids.map((id, i) => (
                <Stack key={id} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <Chip
                    label={id.slice(0, 8)}
                    size="small"
                    sx={{ fontSize: 11, fontFamily: 'monospace', color: '#334155', bgcolor: '#f1f5f9', border: '1px solid #e2e8f0' }}
                  />
                  {i < pathResult.path_account_ids.length - 1 && <ArrowForward sx={{ fontSize: 13, color: 'text.disabled' }} />}
                </Stack>
              ))}
            </Stack>
            <Typography sx={{ mt: 1, fontSize: 13, color: '#475569' }}>
              {pathResult.hop_count} hops · {formatAmount(pathResult.total_amount)} ·{' '}
              {pathResult.is_suspicious ? (
                <Box component="span" sx={{ color: 'error.main', fontWeight: 600 }}>suspicious chain</Box>
              ) : (
                <Box component="span" sx={{ color: '#059669', fontWeight: 600 }}>clean path</Box>
              )}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Communities */}
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <Hub sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Detected Communities</Typography>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 1.5 }}>
          {initialData.communities.slice(0, 9).map((c) => (
            <Box key={c.id} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{c.id}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{c.member_account_ids.length} accounts</Typography>
              </Box>
              <Typography sx={{ mt: 1, fontSize: 13, color: '#475569' }}>Flow: {formatAmount(c.total_flow)}</Typography>
              {c.suspicious_edge_count > 0 && (
                <Typography sx={{ mt: 0.5, fontSize: 11, color: 'error.main', fontWeight: 600 }}>
                  {c.suspicious_edge_count} suspicious edge{c.suspicious_edge_count > 1 ? 's' : ''}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Suspicious chains */}
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <WarningAmber sx={{ fontSize: 18, color: 'error.main' }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Suspicious Layering Chains</Typography>
        </Stack>
        {initialData.suspiciousChains.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No multi-hop suspicious chains detected.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {initialData.suspiciousChains.slice(0, 10).map((chain, idx) => (
              <Box key={idx} sx={{ border: '1px solid rgba(220,38,38,0.2)', bgcolor: 'rgba(220,38,38,0.03)', borderRadius: 2, p: 1.5 }}>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  {chain.path_account_ids.map((id, i) => (
                    <Stack key={id} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <Chip
                        label={id.slice(0, 8)}
                        size="small"
                        sx={{ fontSize: 11, fontFamily: 'monospace', color: '#b91c1c', bgcolor: '#fff', border: '1px solid rgba(220,38,38,0.3)' }}
                      />
                      {i < chain.path_account_ids.length - 1 && <ArrowForward sx={{ fontSize: 13, color: 'rgba(220,38,38,0.4)' }} />}
                    </Stack>
                  ))}
                </Stack>
                <Typography sx={{ mt: 0.75, fontSize: 11, color: 'error.main' }}>
                  {chain.hop_count} hops · {formatAmount(chain.total_amount)} moved
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}