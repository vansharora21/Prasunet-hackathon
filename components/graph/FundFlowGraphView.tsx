'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Paper,
  Divider,
  Stack,
  Avatar,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  RestartAlt,
  Close,
  ChevronRight,
  WarningAmber,
  Person,
  Business,
  Tune,
  Refresh,
} from '@mui/icons-material';
import type { Account, GraphEdge, FraudAlert } from '@/lib/types';
import { formatCurrency, timeAgo, riskColor, patternLabel } from '@/lib/formatters';
import { fetchGraph } from '@/lib/api';

type NodeDatum = d3.SimulationNodeDatum & {
  id: string; account: Account; radius: number; color: string;
};
type LinkDatum = d3.SimulationLinkDatum<NodeDatum> & {
  edge: GraphEdge; sourceId: string; targetId: string;
};

const RISK_LEVELS = ['All', 'critical', 'high', 'medium', 'low'];

export default function FundFlowGraphView({
  accounts: initialAccounts,
  edges: initialEdges,
  alerts,
}: {
  accounts: Account[];
  edges: GraphEdge[];
  alerts: FraudAlert[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [edges, setEdges] = useState<GraphEdge[]>(initialEdges);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [filterRisk, setFilterRisk] = useState('All');
  const [filterSuspicious, setFilterSuspicious] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const simulationRef = useRef<d3.Simulation<NodeDatum, LinkDatum> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchGraph();
      setAccounts(data.nodes);
      setEdges(data.edges);
    } finally {
      setRefreshing(false);
    }
  };

  const buildGraph = useCallback(() => {
    if (!svgRef.current || accounts.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 1200;
    const height = svgRef.current.clientHeight || 800;

    // ── Filter ──
    let filteredAccounts = accounts;
    if (filterRisk !== 'All') filteredAccounts = accounts.filter((a) => a.risk_level === filterRisk);
    const accountIds = new Set(filteredAccounts.map((a) => a.id));

    let filteredEdges = edges.filter(
      (e) => accountIds.has(e.source_account_id) && accountIds.has(e.target_account_id)
    );
    if (filterSuspicious) filteredEdges = filteredEdges.filter((e) => e.is_suspicious);

    // Volume per node for sizing
    const volMap = new Map<string, number>();
    filteredEdges.forEach((e) => {
      volMap.set(e.source_account_id, (volMap.get(e.source_account_id) || 0) + e.total_amount);
      volMap.set(e.target_account_id, (volMap.get(e.target_account_id) || 0) + e.total_amount);
    });
    const maxVol = Math.max(...Array.from(volMap.values()), 1);

    // ── Nodes ──
    const nodes: NodeDatum[] = filteredAccounts.map((a) => ({
      id: a.id, account: a,
      radius: 6 + ((volMap.get(a.id) || 0) / maxVol) * 14,
      color: riskColor(a.risk_level),
    }));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // ── Links ──
    const links: LinkDatum[] = filteredEdges
      .map((e) => ({
        source: nodeMap.get(e.source_account_id) as NodeDatum,
        target: nodeMap.get(e.target_account_id) as NodeDatum,
        edge: e, sourceId: e.source_account_id, targetId: e.target_account_id,
      }))
      .filter((l) => l.source && l.target);

    // ── Defs ──
    const defs = svg.append('defs');

    // Subtle arrow markers
    ['normal', 'suspicious'].forEach((type) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -4 8 8').attr('refX', 20).attr('refY', 0)
        .attr('markerWidth', 4).attr('markerHeight', 4).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', type === 'suspicious' ? '#dc2626' : '#cbd5e1');
    });

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => g.attr('transform', event.transform.toString()));
    zoomRef.current = zoom;
    svg.call(zoom);
    // Start zoomed out so graph fills the viewport
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.4));

    // ── Edges — thin, subtle ──
    const link = g.append('g').selectAll<SVGLineElement, LinkDatum>('line')
      .data(links).join('line')
      .attr('stroke', (d) => d.edge.is_suspicious ? '#ef4444' : '#d1d5db')
      .attr('stroke-width', (d) => d.edge.is_suspicious ? 1.5 : 0.75)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', (d) => d.edge.is_suspicious ? 'url(#arrow-suspicious)' : 'url(#arrow-normal)')
      .style('cursor', 'pointer')
      .on('click', (_e, d) => { setSelectedEdge(d.edge); setSelectedAccount(null); });

    // ── Alert hulls ──
    const alertGroups = alerts
      .filter((a) => a.status !== 'dismissed')
      .map((a) => ({
        alert: a,
        nodes: a.involved_accounts.map((id) => nodeMap.get(id)).filter(Boolean) as NodeDatum[],
      }))
      .filter((grp) => grp.nodes.length >= 2);
    const hullG = g.append('g');

    // ── Nodes — clean, solid ──
    const node = g.append('g').selectAll<SVGGElement, NodeDatum>('g')
      .data(nodes).join('g').style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, NodeDatum>()
          .on('start', (event, d) => {
            if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      )
      .on('click', (_e, d) => { setSelectedAccount(d.account); setSelectedEdge(null); });

    // Critical ring
    node.filter((d) => d.account.risk_level === 'critical')
      .append('circle')
      .attr('r', (d) => d.radius + 5)
      .attr('fill', 'none').attr('stroke', '#dc2626').attr('stroke-width', 1)
      .attr('opacity', 0.3)
      .attr('stroke-dasharray', '3,2');

    // Main circle — simple, clean
    node.append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.color)
      .attr('fill-opacity', 0.8)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    // Name label — subtle
    node.append('text')
      .text((d) => d.account.holder_name.split(' ')[0])
      .attr('dy', (d) => d.radius + 14)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('fill', '#6b7280')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .style('pointer-events', 'none');

    // ── Tooltip ──
    const tooltipDiv = d3.select(containerRef.current)
      .append('div')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('opacity', '0')
      .style('background', '#ffffff')
      .style('border', '1px solid #e5e7eb')
      .style('border-radius', '8px')
      .style('padding', '12px 16px')
      .style('font-family', 'Inter, system-ui, sans-serif')
      .style('font-size', '12px')
      .style('color', '#1f2937')
      .style('box-shadow', '0 4px 16px rgba(0,0,0,0.08)')
      .style('z-index', '100')
      .style('min-width', '200px')
      .style('transition', 'opacity 0.15s ease');

    node.on('mouseenter.tooltip', (event: MouseEvent, d) => {
      const a = d.account;
      tooltipDiv
        .html(`
          <div style="margin-bottom:6px;font-weight:600;font-size:13px;color:#111827">${a.holder_name}</div>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:2px 8px 2px 0;color:#9ca3af;font-weight:500">id</td><td style="padding:2px 0;font-family:monospace;font-size:11px">${a.id}</td></tr>
            <tr><td style="padding:2px 8px 2px 0;color:#9ca3af;font-weight:500">type</td><td style="padding:2px 0">${a.account_type}</td></tr>
            <tr><td style="padding:2px 8px 2px 0;color:#9ca3af;font-weight:500">branch</td><td style="padding:2px 0">${a.bank_branch}</td></tr>
            <tr><td style="padding:2px 8px 2px 0;color:#9ca3af;font-weight:500">risk</td><td style="padding:2px 0"><span style="color:${riskColor(a.risk_level)};font-weight:600">${a.risk_level}</span> (${a.risk_score}/100)</td></tr>
          </table>
        `)
        .style('opacity', '1')
        .style('left', `${(event as any).offsetX + 14}px`)
        .style('top', `${(event as any).offsetY - 10}px`);
    })
    .on('mousemove.tooltip', (event: MouseEvent) => {
      tooltipDiv
        .style('left', `${(event as any).offsetX + 14}px`)
        .style('top', `${(event as any).offsetY - 10}px`);
    })
    .on('mouseleave.tooltip', () => {
      tooltipDiv.style('opacity', '0');
    });

    // ── Simulation — much more spread ──
    const simulation = d3.forceSimulation<NodeDatum>(nodes)
      .force('link', d3.forceLink<NodeDatum, LinkDatum>(links).id((d) => d.id).distance(200).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-800).distanceMax(800))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide<NodeDatum>().radius((d) => d.radius + 24))
      .force('x', d3.forceX(0).strength(0.03))
      .force('y', d3.forceY(0).strength(0.03))
      .on('tick', () => {
        link
          .attr('x1', (d) => (d.source as NodeDatum).x!)
          .attr('y1', (d) => (d.source as NodeDatum).y!)
          .attr('x2', (d) => (d.target as NodeDatum).x!)
          .attr('y2', (d) => (d.target as NodeDatum).y!);
        node.attr('transform', (d) => `translate(${d.x},${d.y})`);

        hullG.selectAll('path').remove();
        alertGroups.forEach(({ alert, nodes: hn }) => {
          const pts = hn.map((n) => [n.x!, n.y!] as [number, number]);
          const pad = 35;
          const padded: [number, number][] = pts.flatMap(([x, y]) => [
            [x - pad, y - pad], [x + pad, y - pad], [x - pad, y + pad], [x + pad, y + pad],
          ]);
          const hull = d3.polygonHull(padded);
          if (!hull) return;
          const color = alert.severity === 'critical' ? '#dc2626' : '#d97706';
          hullG.append('path').datum(hull)
            .attr('d', (d) => `M${d.join('L')}Z`)
            .attr('fill', color + '08')
            .attr('stroke', color + '30')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,3')
            .style('pointer-events', 'none');
        });
      });

    simulationRef.current = simulation;

    // Subtle particle animation on suspicious edges
    const animateParticles = () => {
      links.filter((l) => l.edge.is_suspicious).forEach((l) => {
        const src = l.source as NodeDatum;
        const tgt = l.target as NodeDatum;
        if (!src.x || !tgt.x) return;
        g.append('circle').attr('r', 2).attr('fill', '#ef4444').attr('opacity', 0.7)
          .attr('cx', src.x ?? 0).attr('cy', src.y ?? 0)
          .transition().duration(1200).ease(d3.easeLinear)
          .attr('cx', tgt.x ?? 0).attr('cy', tgt.y ?? 0).attr('opacity', 0).remove();
      });
    };
    const interval = setInterval(animateParticles, 1000);
    return () => { clearInterval(interval); simulation.stop(); };
  }, [accounts, edges, alerts, filterRisk, filterSuspicious]);

  useEffect(() => {
    return buildGraph();
  }, [buildGraph]);

  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(280).call(zoomRef.current.scaleBy, factor);
  };
  const handleReset = () => {
    if (!svgRef.current || !zoomRef.current) return;
    const w = svgRef.current.clientWidth, h = svgRef.current.clientHeight;
    d3.select(svgRef.current).transition().duration(400)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(w / 2, h / 2).scale(0.4));
  };

  const accountAlerts = selectedAccount ? alerts.filter((a) => a.involved_accounts.includes(selectedAccount.id)) : [];

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        height: '100%',
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#ffffff',
      }}
    >
      {/* SVG canvas */}
      <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {/* Zoom Controls */}
      <Stack spacing={0.75} sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        {[
          { icon: ZoomIn, label: 'Zoom in', action: () => handleZoom(1.4) },
          { icon: ZoomOut, label: 'Zoom out', action: () => handleZoom(0.7) },
          { icon: RestartAlt, label: 'Reset', action: handleReset },
        ].map(({ icon: Icon, label, action }) => (
          <Tooltip key={label} title={label} placement="left">
            <IconButton onClick={action} size="small"
              sx={{ bgcolor: '#fff', border: '1px solid #e5e7eb', '&:hover': { bgcolor: '#f9fafb' } }}>
              <Icon sx={{ fontSize: 16, color: '#6b7280' }} />
            </IconButton>
          </Tooltip>
        ))}
        <Tooltip title="Refresh" placement="left">
          <IconButton onClick={refresh} disabled={refreshing} size="small"
            sx={{ bgcolor: '#fff', border: '1px solid #e5e7eb', '&:hover': { bgcolor: '#f9fafb' } }}>
            <Refresh sx={{ fontSize: 16, color: '#6b7280', ...(refreshing && { animation: 'spin 1s linear infinite' }) }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Filter Toggle */}
      <Button
        onClick={() => setShowFilters(!showFilters)}
        size="small"
        startIcon={<Tune sx={{ fontSize: 14 }} />}
        sx={{
          position: 'absolute', top: 16, left: 16, zIndex: 10,
          bgcolor: '#fff', border: '1px solid #e5e7eb',
          color: filterRisk !== 'All' || filterSuspicious ? '#2563eb' : '#6b7280',
          '&:hover': { bgcolor: '#f9fafb' }, fontWeight: 500, borderRadius: 1.5, textTransform: 'none',
        }}
      >
        Filters
        {(filterRisk !== 'All' || filterSuspicious) && (
          <Box sx={{ width: 6, height: 6, borderRadius: 999, bgcolor: '#2563eb', ml: 0.75 }} />
        )}
      </Button>

      {/* Filter Panel */}
      {showFilters && (
        <Paper elevation={2} sx={{ position: 'absolute', top: 56, left: 16, p: 2, width: 200, zIndex: 20, borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
            Risk Level
          </Typography>
          <Stack spacing={0.25}>
            {RISK_LEVELS.map((r) => (
              <Button key={r} onClick={() => setFilterRisk(r)} size="small" fullWidth
                sx={{
                  justifyContent: 'flex-start', textTransform: 'capitalize', fontSize: 12,
                  color: filterRisk === r ? '#111827' : '#6b7280',
                  bgcolor: filterRisk === r ? '#f3f4f6' : 'transparent',
                  '&:hover': { bgcolor: '#f9fafb' },
                }}>
                {r}
              </Button>
            ))}
          </Stack>
          <Divider sx={{ my: 1.5 }} />
          <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
            Show Only
          </Typography>
          <Button onClick={() => setFilterSuspicious(!filterSuspicious)} size="small" fullWidth
            sx={{ justifyContent: 'flex-start', fontSize: 12, color: '#6b7280' }}>
            <Box sx={{
              width: 16, height: 16, borderRadius: 0.5, border: '1px solid',
              borderColor: filterSuspicious ? '#2563eb' : '#d1d5db',
              bgcolor: filterSuspicious ? '#2563eb' : 'transparent',
              mr: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {filterSuspicious && <Box sx={{ width: 8, height: 8, borderRadius: 0.25, bgcolor: '#fff' }} />}
            </Box>
            Suspicious only
          </Button>
        </Paper>
      )}

      {/* Legend */}
      <Stack direction="row" spacing={2.5} sx={{
        position: 'absolute', bottom: 16, left: 16, px: 2, py: 1,
        bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: 1.5, alignItems: 'center', zIndex: 10,
      }}>
        {[
          { color: '#10b981', label: 'Clean' },
          { color: '#f59e0b', label: 'Medium' },
          { color: '#f97316', label: 'High' },
          { color: '#ef4444', label: 'Critical' },
        ].map(({ color, label }) => (
          <Stack key={label} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: color }} />
            <Typography sx={{ fontSize: 10, color: '#6b7280' }}>{label}</Typography>
          </Stack>
        ))}
        <Divider orientation="vertical" flexItem />
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 1.5, bgcolor: '#ef4444' }} />
          <Typography sx={{ fontSize: 10, color: '#6b7280' }}>Suspicious</Typography>
        </Stack>
      </Stack>

      {/* Node count */}
      <Box sx={{ position: 'absolute', bottom: 16, right: 16, px: 1.5, py: 0.75, bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: 1.5, zIndex: 10 }}>
        <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>
          {accounts.length} nodes &middot; {edges.length} edges
        </Typography>
      </Box>

      {/* Detail Panel */}
      {(selectedAccount || selectedEdge) && (
        <Box sx={{
          width: 320, bgcolor: '#fff', borderLeft: '1px solid #e5e7eb',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, zIndex: 10,
        }}>
          <Box sx={{ height: 3, flexShrink: 0, bgcolor: selectedAccount ? riskColor(selectedAccount.risk_level) : '#dc2626' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
              {selectedAccount ? 'Account Profile' : 'Transaction Link'}
            </Typography>
            <IconButton size="small" onClick={() => { setSelectedAccount(null); setSelectedEdge(null); }}>
              <Close sx={{ fontSize: 14, color: '#9ca3af' }} />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {selectedAccount && (
              <>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
                  <Avatar sx={{
                    width: 38, height: 38, borderRadius: 2,
                    bgcolor: `${riskColor(selectedAccount.risk_level)}15`,
                    color: riskColor(selectedAccount.risk_level),
                    border: `1px solid ${riskColor(selectedAccount.risk_level)}30`,
                  }}>
                    {selectedAccount.account_type === 'current' ? <Business sx={{ fontSize: 18 }} /> : <Person sx={{ fontSize: 18 }} />}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>{selectedAccount.holder_name}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#6b7280', mt: 0.25 }}>{selectedAccount.bank_branch}</Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                  <Chip label={`${selectedAccount.risk_level} risk`} size="small"
                    sx={{ fontSize: 10, fontWeight: 600, color: riskColor(selectedAccount.risk_level), bgcolor: `${riskColor(selectedAccount.risk_level)}12`, border: `1px solid ${riskColor(selectedAccount.risk_level)}30` }} />
                  <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>Score: {selectedAccount.risk_score}/100</Typography>
                </Stack>

                <Box sx={{ border: '1px solid #f3f4f6', borderRadius: 1.5, overflow: 'hidden', mb: 1.5 }}>
                  <Typography sx={{ px: 1.5, py: 0.75, fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', bgcolor: '#fafafa' }}>
                    KYC Profile
                  </Typography>
                  {([
                    ['Account ID', selectedAccount.id, true],
                    ['Type', selectedAccount.account_type],
                    ['Profession', selectedAccount.declared_profession.replace(/_/g, ' ')],
                    ['Income', formatCurrency(selectedAccount.declared_annual_income) + '/yr'],
                    ['Last Active', timeAgo(selectedAccount.last_activity_at)],
                  ] as [string, string, boolean?][]).map(([label, value, mono]) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, px: 1.5, py: 0.75, borderTop: '1px solid #fafafa' }}>
                      <Typography sx={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{label}</Typography>
                      <Typography sx={{ fontSize: 11, color: '#374151', textAlign: 'right', ...(mono && { fontFamily: 'monospace', fontSize: 10 }) }}>
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {selectedAccount.is_dormant && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 1.5, mb: 1.5 }}>
                    <WarningAmber sx={{ fontSize: 13, color: '#d97706', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 11, color: '#92400e' }}>Dormant account with recent activity</Typography>
                  </Box>
                )}

                {accountAlerts.length > 0 && (
                  <Box>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                      Linked Alerts ({accountAlerts.length})
                    </Typography>
                    <Stack spacing={0.75}>
                      {accountAlerts.map((a) => (
                        <Box key={a.id} sx={{ p: 1, bgcolor: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 1.5 }}>
                          <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.25 }}>
                            <Chip label={a.severity.toUpperCase()} size="small"
                              sx={{ fontSize: 9, fontWeight: 600, height: 16, color: '#dc2626', bgcolor: 'rgba(220,38,38,0.06)' }} />
                            <Typography sx={{ fontSize: 10, color: '#9ca3af' }}>{(a.confidence_score * 100).toFixed(0)}%</Typography>
                          </Stack>
                          <Typography sx={{ fontSize: 11, color: '#374151' }}>{patternLabel(a.pattern_type)}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}
              </>
            )}

            {selectedEdge && (
              <Box sx={{ border: '1px solid #f3f4f6', borderRadius: 1.5, overflow: 'hidden' }}>
                <Typography sx={{ px: 1.5, py: 0.75, fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', bgcolor: '#fafafa' }}>
                  Fund Flow
                </Typography>
                {([
                  ['Source', selectedEdge.source_account_id, true],
                  ['Destination', selectedEdge.target_account_id, true],
                  ['Volume', formatCurrency(selectedEdge.total_amount)],
                  ['Transactions', selectedEdge.transaction_count.toString()],
                  ['Last Transfer', timeAgo(selectedEdge.last_transaction_at)],
                ] as [string, string, boolean?][]).map(([label, value, mono]) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, px: 1.5, py: 0.75, borderTop: '1px solid #fafafa' }}>
                    <Typography sx={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{label}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#374151', textAlign: 'right', ...(mono && { fontFamily: 'monospace', fontSize: 10 }), overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {value}
                    </Typography>
                  </Box>
                ))}
                {selectedEdge.is_suspicious && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, bgcolor: '#fef2f2' }}>
                    <WarningAmber sx={{ fontSize: 13, color: '#dc2626', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 11, color: '#dc2626', fontWeight: 500 }}>Suspicious flow</Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>

          {selectedAccount && (
            <Box sx={{ px: 2, py: 1.25, borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
              <Button variant="outlined" size="small" fullWidth endIcon={<ChevronRight sx={{ fontSize: 14 }} />}
                sx={{ borderColor: '#e5e7eb', color: '#374151', textTransform: 'none', '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' } }}>
                View Transaction History
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
