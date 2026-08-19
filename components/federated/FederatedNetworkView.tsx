'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  LinearProgress,
  Avatar,
} from '@mui/material';
import {
  Lock,
  Shield,
  ShowChart,
  Verified,
  Wifi,
  Refresh,
  Hub,
} from '@mui/icons-material';
import type { FederatedNode } from '@/lib/types';
import { timeAgo } from '@/lib/formatters';
import { fetchFederatedNodes } from '@/lib/api';

const FEDERATED_ROUNDS = [
  { round: 1, f1: 0.71 }, { round: 2, f1: 0.75 }, { round: 3, f1: 0.79 },
  { round: 4, f1: 0.82 }, { round: 5, f1: 0.85 }, { round: 6, f1: 0.87 },
  { round: 7, f1: 0.89 }, { round: 8, f1: 0.90 }, { round: 9, f1: 0.91 }, { round: 10, f1: 0.92 },
];
const SINGLE_BANK_F1 = 0.71;

const STATUS_COLOR: Record<string, string> = {
  active: '#059669',
  syncing: '#d97706',
  offline: '#dc2626',
};

export default function FederatedNetworkView({ initialNodes }: { initialNodes: FederatedNode[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<FederatedNode[]>(initialNodes);
  const [selectedNode, setSelectedNode] = useState<FederatedNode | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      setNodes(await fetchFederatedNodes());
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 500;
    const height = svgRef.current.clientHeight || 400;
    const cx = width / 2;
    const cy = height / 2;

    const defs = svg.append('defs');
    const hubGlow = defs.append('filter').attr('id', 'hub-glow');
    hubGlow.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur');
    const hm = hubGlow.append('feMerge');
    hm.append('feMergeNode').attr('in', 'blur');
    hm.append('feMergeNode').attr('in', 'SourceGraphic');

    const nodeGlow = defs.append('filter').attr('id', 'node-glow');
    nodeGlow.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'blur');
    const nm = nodeGlow.append('feMerge');
    nm.append('feMergeNode').attr('in', 'blur');
    nm.append('feMergeNode').attr('in', 'SourceGraphic');

    // ── Force simulation data ─────────────────────────────────────
    // Hub is a fixed center node; each bank is a free node pulled toward
    // the hub by a link force and pushed apart by charge + collide forces.
    const hubNode = { id: 'FED_UNI', x: cx, y: cy, fx: cx, fy: cy, isHub: true };
    const bankNodes = nodes.map((node, i) => ({
      id: node.id,
      index: i,
      x: cx + (Math.cos((i / nodes.length) * 2 * Math.PI) * Math.min(width, height) * 0.3),
      y: cy + (Math.sin((i / nodes.length) * 2 * Math.PI) * Math.min(width, height) * 0.3),
      isHub: false,
    }));
    const allNodes = [hubNode, ...bankNodes];
    const links = bankNodes.map((n) => ({ source: hubNode, target: n }));

    const simulation = d3
      .forceSimulation(allNodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(Math.min(width, height) * 0.3).strength(0.35))
      .force('charge', d3.forceManyBody().strength(-260))
      .force('center', d3.forceCenter(cx, cy))
      .force('collide', d3.forceCollide(34))
      .force('x', d3.forceX(cx).strength(0.06))
      .force('y', d3.forceY(cy).strength(0.06))
      .alphaDecay(0.028)
      .velocityDecay(0.4);

    // ── Render ───────────────────────────────────────────────────
    const g = svg.append('g');

    // Transparent background to catch clicks on empty space (deselect)
    svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'transparent')
      .style('cursor', 'default')
      .on('click', () => setSelectedNode(null));

    // Spokes (drawn between hub and each bank)
    const spoke = g
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', (d: any) => (d.target.id === 'FED_UNI' ? 1.5 : 0.75))
      .attr('stroke-dasharray', (d: any) => (nodes.find((n) => n.id === d.target.id)?.status === 'offline' ? '3,4' : 'none'));

    // Bank nodes
    const node = g
      .selectAll('g.bank')
      .data(bankNodes)
      .join('g')
      .attr('class', 'bank')
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        const real = nodes.find((n) => n.id === d.id);
        if (real) setSelectedNode(real);
      })
      .on('mouseenter', function (_, d) {
        const g = d3.select(this);
        g.raise();
        g.select('circle').attr('r', 13).attr('stroke-width', 1.5);
      })
      .on('mouseleave', function (_, d) {
        const g = d3.select(this);
        const isSel = selectedNode?.id === d.id;
        g.select('circle').attr('r', isSel ? 15 : 11).attr('stroke-width', isSel ? 2.5 : 1);
      });

    node.append('title').text((d: any) => {
      const n = nodes.find((x) => x.id === d.id);
      return n ? `${n.bank_name} — ${n.status} · F1 ${(n.f1_score * 100).toFixed(1)}%` : '';
    });

    node.append('circle').attr('r', 11)
      .attr('fill', (d: any) => {
        const n = nodes.find((x) => x.id === d.id);
        return n?.status === 'active' ? '#ffffff' : '#f8fafc';
      })
      .attr('stroke', (d: any) => {
        const n = nodes.find((x) => x.id === d.id);
        return STATUS_COLOR[n?.status || 'offline'] || '#dc2626';
      })
      .attr('stroke-width', 1);

    node.append('text')
      .text((d: any) => nodes.find((n) => n.id === d.id)?.bank_code.slice(0, 3) || '')
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('font-size', '6.5px')
      .attr('fill', (d: any) => {
        const n = nodes.find((x) => x.id === d.id);
        return n?.status === 'active' ? '#334155' : '#94a3b8';
      })
      .style('font-family', 'JetBrains Mono, monospace');

    node.append('circle').attr('r', 2.5).attr('cx', 9).attr('cy', -9)
      .attr('fill', (d: any) => {
        const n = nodes.find((x) => x.id === d.id);
        return STATUS_COLOR[n?.status || 'offline'] || '#dc2626';
      });

    // Hub (fixed at center)
    const hubGroup = g.append('g').attr('transform', `translate(${cx},${cy})`).style('cursor', 'pointer')
      .on('click', () => setSelectedNode(null))
      .on('mouseenter', function () {
        d3.select(this).select('circle:nth-of-type(3)').attr('r', 17).attr('stroke-width', 2.25);
      })
      .on('mouseleave', function () {
        d3.select(this).select('circle:nth-of-type(3)').attr('r', 15).attr('stroke-width', 1.75);
      });
    hubGroup.append('title').text('Causeway Federation Hub — click to clear selection');
    hubGroup.append('circle').attr('r', 26)
      .attr('fill', 'rgba(0,0,0,0.04)').attr('stroke', 'rgba(0,0,0,0.14)').attr('stroke-width', 1.5)
      .attr('filter', 'url(#hub-glow)');
    hubGroup.append('circle').attr('r', 20)
      .attr('fill', 'rgba(37,99,235,0.04)').attr('stroke', 'rgba(37,99,235,0.15)').attr('stroke-width', 1);
    hubGroup.append('circle').attr('r', 15)
      .attr('fill', 'rgba(0,0,0,0.08)').attr('stroke', '#1c1c1c').attr('stroke-width', 1.75)
      .attr('filter', 'url(#node-glow)');

    ['CAUSEWAY'].forEach((word, i) => {
      hubGroup.append('text').attr('x', 0).attr('y', 0).attr('text-anchor', 'middle')
        .attr('dy', '0.35em').attr('font-size', '6.5px')
        .attr('fill', '#1c1c1c').attr('font-weight', '700').attr('letter-spacing', '0.05em').text(word);
    });

    // ── Simulation tick: move nodes + spokes ─────────────────────
    simulation.on('tick', () => {
      spoke
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)
        .attr('stroke', (d: any) => {
          const n = nodes.find((x) => x.id === d.target.id);
          return n?.status === 'active' ? 'rgba(0,0,0,0.10)' : 'rgba(100,116,139,0.12)';
        })
        .attr('opacity', (d: any) => {
          const n = nodes.find((x) => x.id === d.target.id);
          return n?.status === 'active' ? 0.7 : 0.3;
        });

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // ── Animated sync pulses (decorative) ────────────────────────
    const animateSync = () => {
      const active = nodes.filter((n) => n.status === 'active');
      if (!active.length) return;
      const node = active[Math.floor(Math.random() * active.length)];
      const simNode = bankNodes.find((n) => n.id === node.id);
      if (!simNode) return;

      g.append('circle').attr('r', 3).attr('cx', simNode.x).attr('cy', simNode.y)
        .attr('fill', '#059669').attr('opacity', 0.9)
        .transition().duration(1400).ease(d3.easeLinear)
        .attr('cx', cx).attr('cy', cy).attr('r', 2.5).attr('opacity', 0).remove();
    };

    const interval = setInterval(animateSync, 500);

    return () => {
      clearInterval(interval);
      simulation.stop();
    };
  }, [nodes]);

  // Highlight the selected node on the graph (runs when selection changes)
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('g.bank').each(function (d: any) {
      const g = d3.select(this);
      const isSel = selectedNode?.id === d.id;
      g.select('circle')
        .attr('r', isSel ? 15 : 11)
        .attr('stroke-width', isSel ? 2.5 : 1)
        .attr('stroke', isSel ? '#1c1c1c' : STATUS_COLOR[nodes.find((n) => n.id === d.id)?.status || 'offline'] || '#dc2626');
      g.select('circle:nth-of-type(2)').attr('r', isSel ? 3.5 : 2.5);
    });
  }, [selectedNode, nodes]);

  const avgF1 = nodes.length > 0 ? nodes.reduce((s, n) => s + n.f1_score, 0) / nodes.length : 0;
  const avgPrecision = nodes.length > 0 ? nodes.reduce((s, n) => s + n.precision_score, 0) / nodes.length : 0;
  const avgRecall = nodes.length > 0 ? nodes.reduce((s, n) => s + n.recall_score, 0) / nodes.length : 0;
  const totalAlerts = nodes.reduce((s, n) => s + n.alerts_contributed, 0);
  const activeCount = nodes.filter((n) => n.status === 'active').length;

  const kpis = [
    { label: 'Active Nodes', value: `${activeCount}/${nodes.length}`, color: '#059669' },
    { label: 'Total Alerts Shared', value: totalAlerts.toLocaleString(), color: '#1c1c1c' },
    { label: 'Federated F1 Score', value: `${(avgF1 * 100).toFixed(1)}%`, color: '#1e293b' },
    { label: 'vs Single-Bank Baseline', value: `+${((avgF1 - SINGLE_BANK_F1) * 100).toFixed(1)}%`, color: '#059669' },
  ];

  const metrics = [
    { label: 'Precision', value: avgPrecision, baseline: 0.72, color: '#2563eb' },
    { label: 'Recall', value: avgRecall, baseline: 0.70, color: '#059669' },
    { label: 'F1 Score', value: avgF1, baseline: SINGLE_BANK_F1, color: '#d97706' },
  ];

  const privacyItems = [
    { icon: Lock, text: 'Zero raw customer data leaves bank perimeters' },
    { icon: Shield, text: 'Only encrypted gradient updates shared' },
    { icon: ShowChart, text: 'Differential privacy noise injection active' },
    { icon: Verified, text: 'RBI data localisation compliant' },
    { icon: Refresh, text: 'Secure aggregation via PySyft v0.9' },
    { icon: Wifi, text: 'End-to-end TLS 1.3 encryption' },
  ];

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%', overflow: 'auto' }}>
      {/* KPI Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
        {kpis.map(({ label, value, color }) => (
          <Paper key={label} variant="outlined" sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {label}
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 600, mt: 0.75, color, fontVariantNumeric: 'tabular-nums' }}>
              {value}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 2fr' }, gap: 2.5 }}>
        {/* Network Diagram */}
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid #eef0f4', bgcolor: '#fafbfc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Box sx={{ position: 'relative', width: 8, height: 8 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: '#059669' }} />
                  <Box sx={{ position: 'absolute', inset: 0, borderRadius: 999, bgcolor: '#059669', animation: 'pulse 2s infinite' }} />
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Federated Network</Typography>
              </Stack>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.5, ml: 3.5 }}>
                {nodes.length} banks · PySyft privacy layer · live sync
              </Typography>
            </Box>
            <Tooltip title="Refresh from live backend">
              <IconButton onClick={refresh} disabled={refreshing} size="small" sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', '&:hover': { bgcolor: '#f8fafc' } }}>
                <Refresh sx={{ fontSize: 15, ...(refreshing && { animation: 'spin 1s linear infinite' }) }} />
              </IconButton>
            </Tooltip>
          </Box>
          <svg ref={svgRef} style={{ width: '100%', height: 340, display: 'block' }} />
          <Box sx={{ px: 2.5, py: 1, borderTop: '1px solid #eef0f4', bgcolor: '#fafbfc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Click a bank node for details · click empty space or hub to clear</Typography>
            <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>Force-directed · live</Typography>
          </Box>
        </Paper>

        {/* Right Column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Model Performance */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
              <ShowChart sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Aggregate Model Performance</Typography>
            </Stack>
            <Stack spacing={2}>
              {metrics.map(({ label, value, baseline, color }) => (
                <Box key={label}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography sx={{ fontSize: 12, color: '#475569' }}>{label}</Typography>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>Baseline {(baseline * 100).toFixed(0)}%</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>
                        {(value * 100).toFixed(1)}%
                      </Typography>
                    </Stack>
                  </Box>
                  <Box sx={{ position: 'relative', height: 6, bgcolor: '#eef0f4', borderRadius: 999, overflow: 'hidden' }}>
                    <Box sx={{ position: 'absolute', insetY: 0, borderRadius: 999, opacity: 0.2, bgcolor: color, width: `${baseline * 100}%` }} />
                    <Box sx={{ position: 'absolute', insetY: 0, left: 0, borderRadius: 999, bgcolor: color, width: `${value * 100}%`, transition: 'width 700ms ease' }} />
                    <Box sx={{ position: 'absolute', insetY: 0, width: 2, bgcolor: 'rgba(255,255,255,0.6)', left: `${baseline * 100}%` }} />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>

          {/* F1 Round Chart */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>F1 Score Over Federated Rounds</Typography>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 12, height: 3, bgcolor: '#1c1c1c', borderRadius: 999 }} />
                  <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Federated</Typography>
                </Stack>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 12, borderTop: '1px dashed #94a3b8' }} />
                  <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Single-Bank</Typography>
                </Stack>
              </Stack>
            </Box>
            <Box sx={{ position: 'relative', height: 112 }}>
              <Box sx={{ position: 'absolute', left: 0, right: 0, borderTop: '1px dashed #e2e8f0', bottom: `${((SINGLE_BANK_F1 - 0.65) / 0.30) * 100}%` }} />
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: '100%' }}>
                {FEDERATED_ROUNDS.map((d, i) => {
                  const pct = ((d.f1 - 0.65) / 0.30) * 100;
                  const isLast = i === FEDERATED_ROUNDS.length - 1;
                  return (
                    <Box key={d.round} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, height: '100%', justifyContent: 'flex-end' }}>
                      <Box
                        sx={{
                          width: '100%',
                          borderTopLeftRadius: 4,
                          borderTopRightRadius: 4,
                          height: `${pct}%`,
                          bgcolor: isLast ? '#1c1c1c' : '#d4d4d8',
                          transition: 'height 700ms ease',
                          position: 'relative',
                        }}
                      >
                        {isLast && (
                          <Typography sx={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap' }}>
                            {(d.f1 * 100).toFixed(0)}%
                          </Typography>
                        )}
                      </Box>
                      <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>{d.round}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Round 1: 71.0%</Typography>
              <Typography sx={{ fontSize: 10, color: 'primary.main', fontWeight: 600 }}>Round 10: 92.0% (+21pp)</Typography>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Bottom Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' }, gap: 2.5 }}>
        {/* Privacy Compliance */}
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(5,150,105,0.08)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}>
              <Lock sx={{ fontSize: 16 }} />
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Data Privacy Shield</Typography>
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>RBI IT Framework 2016</Typography>
            </Box>
          </Stack>
          <Stack spacing={1.5}>
            {privacyItems.map(({ icon: Icon, text }) => (
              <Stack key={text} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <Avatar sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: 'rgba(5,150,105,0.08)', color: '#059669', border: '1px solid rgba(5,150,105,0.15)', mt: 0.25 }}>
                  <Icon sx={{ fontSize: 11 }} />
                </Avatar>
                <Typography sx={{ fontSize: 11, color: '#334155', lineHeight: 1.5 }}>{text}</Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>

        {/* Bank Table */}
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid #eef0f4', bgcolor: '#fafbfc' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Bank Node Status</Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 320 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {['Bank', 'Status', 'Last Sync', 'Alerts', 'F1 Score', 'Version'].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {nodes.map((n) => {
                  const isUBI = n.id === 'FED_UNI';
                  const statusColor = STATUS_COLOR[n.status] || '#dc2626';
                  return (
                    <TableRow
                      key={n.id}
                      hover
                      onClick={() => setSelectedNode(n)}
                      sx={{
                        cursor: 'pointer',
                        borderLeft: `2px solid ${isUBI ? '#1c1c1c' : `${statusColor}66`}`,
                        bgcolor: selectedNode?.id === n.id ? 'rgba(0,0,0,0.03)' : 'inherit',
                      }}
                    >
                      <TableCell>
                        <Typography sx={{ fontSize: 12, fontWeight: 500, color: isUBI ? 'primary.main' : '#1e293b' }}>
                          {n.bank_name.length > 24 ? n.bank_name.slice(0, 24) + '…' : n.bank_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: 999, bgcolor: statusColor, ...(n.status === 'syncing' && { animation: 'pulse 1.5s infinite' }) }} />
                          <Typography sx={{ fontSize: 12, fontWeight: 500, color: statusColor, textTransform: 'capitalize' }}>{n.status}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#475569' }}>{timeAgo(n.last_sync_at)}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{n.alerts_contributed}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <LinearProgress
                            variant="determinate"
                            value={n.f1_score * 100}
                            sx={{ width: 56, '& .MuiLinearProgress-bar': { bgcolor: '#1c1c1c' } }}
                          />
                          <Typography sx={{ fontSize: 12, color: '#475569', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                            {(n.f1_score * 100).toFixed(1)}%
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>{n.model_version}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {/* Selected node detail */}
      {selectedNode && (
        <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Avatar sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.08)', color: 'primary.main', border: '1px solid rgba(0,0,0,0.2)' }}>
              <Hub sx={{ fontSize: 18 }} />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{selectedNode.bank_name}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                {selectedNode.bank_code} · {selectedNode.model_version} · last sync {timeAgo(selectedNode.last_sync_at)}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Chip
              label={`F1 ${(selectedNode.f1_score * 100).toFixed(1)}%`}
              size="small"
              sx={{ fontSize: 11, fontWeight: 600, color: '#059669', bgcolor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}
            />
            <Chip
              label={`${selectedNode.alerts_contributed} alerts`}
              size="small"
              sx={{ fontSize: 11, fontWeight: 600, color: 'primary.main', bgcolor: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.2)' }}
            />
            <Chip
              label={selectedNode.status}
              size="small"
              sx={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[selectedNode.status] || '#dc2626', bgcolor: `${STATUS_COLOR[selectedNode.status] || '#dc2626'}18`, border: `1px solid ${STATUS_COLOR[selectedNode.status] || '#dc2626'}40`, textTransform: 'capitalize' }}
            />
          </Stack>
        </Paper>
      )}
    </Box>
  );
}