'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Badge,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Popover,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  DashboardOutlined as DashboardIcon,
  AccountTreeOutlined as GraphIcon,
  GppMaybeOutlined as AlertsIcon,
  DescriptionOutlined as ReportsIcon,
  HubOutlined as FederatedIcon,
  PsychologyOutlined as IntelligenceIcon,
  BoltOutlined as SimulatorIcon,
  SettingsOutlined as SettingsIcon,
  NotificationsNoneOutlined as BellIcon,
  ShieldOutlined as ShieldIcon,
  KeyboardDoubleArrowLeft as CollapseIcon,
  KeyboardDoubleArrowRight as ExpandIcon,
  LogoutOutlined as LogoutIcon,
} from '@mui/icons-material';
import { logout, getCurrentUser } from '@/lib/auth';
import type { FraudAlert } from '@/lib/types';

const MIN_WIDTH = 220;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 264;
const COLLAPSED_WIDTH = 68;

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const STORAGE_KEYS = {
  collapsed: 'causeway:sidebar:collapsed',
  width: 'causeway:sidebar:width',
};

interface NavItem {
  to: string;
  icon: React.ComponentType<{ sx?: object }>;
  label: string;
  badge?: boolean;
}

const NAV_SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Monitor',
    items: [
      { to: '/dashboard', icon: DashboardIcon, label: 'Dashboard' },
      { to: '/graph', icon: GraphIcon, label: 'Fund Flow Graph' },
      { to: '/alerts', icon: AlertsIcon, label: 'Fraud Alerts', badge: true },
    ],
  },
  {
    heading: 'Compliance',
    items: [
      { to: '/reports', icon: ReportsIcon, label: 'STR / CTR Reports' },
      { to: '/federated', icon: FederatedIcon, label: 'Federated Network' },
      { to: '/intelligence', icon: IntelligenceIcon, label: 'Graph Intelligence' },
    ],
  },
  {
    heading: 'Tools',
    items: [{ to: '/simulator', icon: SimulatorIcon, label: 'Simulator' }],
  },
  {
    heading: 'System',
    items: [{ to: '/settings', icon: SettingsIcon, label: 'Settings' }],
  },
];

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'Command Center', sub: 'Real-time transaction monitoring and alert overview' },
  '/graph': { title: 'Fund Flow Graph', sub: 'Interactive fund flow visualization powered by D3.js' },
  '/alerts': { title: 'Fraud Alert Workbench', sub: 'AI-powered fraud detection with SHAP causal analysis' },
  '/reports': { title: 'STR / CTR Reports', sub: 'Auto-generated goAML-compliant documentation' },
  '/federated': { title: 'Federated Learning Network', sub: '26-bank privacy-preserving AI network' },
  '/intelligence': { title: 'Graph Intelligence', sub: 'pgvector semantic search & FalkorDB-style analytics' },
  '/simulator': { title: 'Transaction Simulator', sub: 'Simulate transfers or trigger pre-defined ML fraud scenarios' },
  '/settings': { title: 'Settings & Configuration', sub: 'Detection thresholds, routing rules and audit trail' },
};

// Pages that render full-bleed (no padding, no scroll, fill remaining height)
const FULL_BLEED_ROUTES = ['/graph', '/intelligence'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [openAlerts, setOpenAlerts] = useState(0);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState<FraudAlert[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const user = getCurrentUser();

  useEffect(() => {
    const storedCollapsed = window.localStorage.getItem(STORAGE_KEYS.collapsed) === '1';
    const storedWidth = Number(window.localStorage.getItem(STORAGE_KEYS.width));
    setCollapsed(storedCollapsed);
    if (Number.isFinite(storedWidth) && storedWidth >= MIN_WIDTH) {
      setWidth(clamp(storedWidth, MIN_WIDTH, MAX_WIDTH));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.collapsed, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    if (!collapsed) window.localStorage.setItem(STORAGE_KEYS.width, String(width));
  }, [width, collapsed]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/alert-count');
        const data = await res.json();
        setOpenAlerts(data.openAlerts || 0);
      } catch {
        // API may be down during startup; badge stays hidden
      }
    };
    fetchAlerts();

    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const openNotifPanel = async (e: React.MouseEvent<HTMLElement>) => {
    setNotifAnchor(e.currentTarget);
    if (notifications.length === 0) {
      setNotifLoading(true);
      try {
        const res = await fetch('/api/fraud-alerts');
        const data = await res.json();
        const alerts = (data.data || [])
          .filter((a: any) => a.status === 'open')
          .sort((a: any, b: any) => {
            const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
            return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
          });
        setNotifications(alerts);
        setOpenAlerts(alerts.length);
      } catch {
        // silent
      } finally {
        setNotifLoading(false);
      }
    }
  };

  const closeNotifPanel = () => setNotifAnchor(null);

  const startResize = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (collapsed) return;
      e.preventDefault();
      setDragging(true);
      const startX = e.clientX;
      const startWidth = width;

      const onMove = (ev: PointerEvent) => {
        setWidth(clamp(startWidth + (ev.clientX - startX), MIN_WIDTH, MAX_WIDTH));
      };
      const onUp = () => {
        setDragging(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [collapsed, width]
  );

  const meta = PAGE_META[pathname] ?? { title: 'Causeway', sub: '' };
  const isFullBleed = FULL_BLEED_ROUTES.includes(pathname);
  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : width;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Sidebar (resizable + collapsible) ── */}
      <Box
        component="aside"
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e8e8e8',
          position: 'relative',
          transition: dragging ? 'none' : `width 300ms ${EASE}`,
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            px: collapsed ? 0 : 2.5,
            height: 64,
            borderBottom: '1px solid #f0f0f2',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
              flexShrink: 0,
            }}
          >
            <ShieldIcon sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          {!collapsed && (
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#0f172a', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                Causeway
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: '#71717a', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                Union Bank of India
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Nav */}
        <Box sx={{ px: 1, py: 1.5, overflow: 'hidden', flex: 1 }}>
          {NAV_SECTIONS.map((section) => (
            <Box key={section.heading} sx={{ mb: 1.5 }}>
              {!collapsed && (
                <Typography
                  sx={{
                    px: 1.5,
                    mb: 0.5,
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#a1a1aa',
                    textTransform: 'uppercase',
                    letterSpacing: '0.18em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {section.heading}
                </Typography>
              )}
              <List disablePadding>
                {section.items.map(({ to, icon: Icon, label, badge }) => {
                  const isActive = pathname === to;
                  const item = (
                    <ListItem key={to} disablePadding sx={{ display: 'block', position: 'relative' }}>
                      {isActive && (
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 3,
                            height: 20,
                            borderRadius: '0 999px 999px 0',
                            bgcolor: 'primary.main',
                            transition: 'opacity 300ms ease',
                          }}
                        />
                      )}
                      <ListItemButton
                        component={Link}
                        href={to}
                        selected={isActive}
                        sx={{
                          py: 0.75,
                          px: 1.5,
                          justifyContent: collapsed ? 'center' : 'flex-start',
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(0, 0, 0, 0.08)',
                            color: 'primary.main',
                            '& .MuiListItemIcon-root': { color: 'primary.main' },
                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.12)' },
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: collapsed ? 0 : 34, justifyContent: 'center' }}>
                          <Icon sx={{ fontSize: 19 }} />
                        </ListItemIcon>
                        {!collapsed && <ListItemText primary={label} />}
                        {!collapsed && badge && openAlerts > 0 && (
                          <Box
                            sx={{
                              minWidth: 18,
                              height: 18,
                              px: 0.5,
                              borderRadius: 999,
                              bgcolor: 'error.main',
                              color: '#fff',
                              fontSize: 10.5,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {openAlerts}
                          </Box>
                        )}
                      </ListItemButton>
                    </ListItem>
                  );
                  return collapsed ? (
                    <Tooltip key={to} title={label} placement="right" arrow>
                      <Box>{item}</Box>
                    </Tooltip>
                  ) : (
                    item
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>

        {/* Resize handle */}
        {!collapsed && (
          <Box
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            onPointerDown={startResize}
            sx={{
              position: 'absolute',
              insetY: 0,
              right: 0,
              width: 6,
              zIndex: 10,
              cursor: 'col-resize',
              touchAction: 'none',
              '&:hover .sb-line': { backgroundColor: 'primary.main' },
            }}
          >
            <Box
              className="sb-line"
              sx={{
                mx: 'auto',
                height: '100%',
                width: 1,
                borderLeft: '1px solid #e8e8e8',
                transition: 'background-color 150ms ease',
              }}
            />
          </Box>
        )}
      </Box>

      {/* ── Main ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar position="static" elevation={0}>
          <Toolbar sx={{ minHeight: 64, px: { xs: 2, md: 3 }, gap: 2 }}>
            <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <IconButton
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                sx={{ border: '1px solid #e8e8e8', bgcolor: '#fff', '&:hover': { bgcolor: '#fafafa' } }}
              >
                {collapsed ? <ExpandIcon sx={{ fontSize: 18 }} /> : <CollapseIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Tooltip>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: '#0f172a', lineHeight: 1.2 }}>
                {meta.title}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: '#71717a', lineHeight: 1.3, mt: 0.25 }}>{meta.sub}</Typography>
            </Box>

            <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
              <Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: '#52525b' }}>
                {currentTime ? currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: '#a1a1aa' }}>
                {currentTime ? currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : '---'}
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem />

            <Tooltip title="Notifications">
              <IconButton onClick={openNotifPanel}>
                <Badge color="error" variant="dot" invisible={openAlerts === 0}>
                  <BellIcon sx={{ fontSize: 20 }} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* ── Notification Popover ── */}
            <Popover
              open={Boolean(notifAnchor)}
              anchorEl={notifAnchor}
              onClose={closeNotifPanel}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { width: 380, maxHeight: 480, borderRadius: 2, border: '1px solid #e5e7eb', mt: 1, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' } } }}
            >
              {/* Header */}
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Notifications</Typography>
                <Chip label={`${openAlerts} open`} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600, color: openAlerts > 0 ? '#dc2626' : '#6b7280', bgcolor: openAlerts > 0 ? '#fef2f2' : '#f3f4f6', border: 'none' }} />
              </Box>

              {/* Body */}
              <Box sx={{ overflowY: 'auto', maxHeight: 400 }}>
                {notifLoading ? (
                  <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : notifications.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 13, color: '#9ca3af' }}>No open alerts</Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {notifications.slice(0, 20).map((n) => {
                      const severityColor: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#f59e0b', low: '#10b981' };
                      const color = severityColor[n.severity] || '#6b7280';
                      const ago = (() => {
                        const diff = Date.now() - new Date(n.created_at).getTime();
                        const mins = Math.floor(diff / 60000);
                        if (mins < 60) return `${mins}m ago`;
                        const hrs = Math.floor(mins / 60);
                        if (hrs < 24) return `${hrs}h ago`;
                        return `${Math.floor(hrs / 24)}d ago`;
                      })();
                      return (
                        <ListItem key={n.id} disablePadding
                          sx={{ borderBottom: '1px solid #fafafa', '&:hover': { bgcolor: '#f9fafb' }, cursor: 'pointer' }}
                          onClick={() => { closeNotifPanel(); window.location.href = '/alerts'; }}
                        >
                          <Box sx={{ px: 2, py: 1.25, width: '100%' }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: color, flexShrink: 0 }} />
                              <Chip label={n.severity.toUpperCase()} size="small"
                                sx={{ height: 18, fontSize: 9, fontWeight: 600, color, bgcolor: `${color}10`, border: `1px solid ${color}25`, '& .MuiChip-label': { px: 0.75 } }} />
                              <Typography sx={{ fontSize: 10, color: '#9ca3af', ml: 'auto' }}>{ago}</Typography>
                            </Stack>
                            <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#374151', lineHeight: 1.3 }}>
                              {n.pattern_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            </Typography>
                            <Stack direction="row" spacing={1.5} sx={{ mt: 0.5, alignItems: 'center' }}>
                              <Typography sx={{ fontSize: 10, color: '#9ca3af' }}>
                                {n.confidence_score ? `${(n.confidence_score * 100).toFixed(0)}% confidence` : ''}
                              </Typography>
                              {n.total_amount > 0 && (
                                <Typography sx={{ fontSize: 10, color: '#9ca3af' }}>
                                  ₹{n.total_amount.toLocaleString('en-IN')}
                                </Typography>
                              )}
                            </Stack>
                          </Box>
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </Box>

              {/* Footer */}
              {notifications.length > 0 && (
                <Box sx={{ px: 2, py: 1, borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
                  <Typography
                    onClick={() => { closeNotifPanel(); window.location.href = '/alerts'; }}
                    sx={{ fontSize: 12, fontWeight: 500, color: '#2563eb', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                  >
                    View all alerts
                  </Typography>
                </Box>
              )}
            </Popover>

            <Divider orientation="vertical" flexItem />

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ width: 30, height: 30, bgcolor: 'rgba(0,0,0,0.08)', color: 'primary.main', fontSize: 12, fontWeight: 600 }}>
                {user?.name?.slice(0, 2).toUpperCase() || 'AM'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#0f172a', lineHeight: 1.2 }}>{user?.name || 'Arjun Mehta'}</Typography>
                <Typography sx={{ fontSize: 10.5, color: '#a1a1aa', lineHeight: 1.2 }}>{user?.role || 'Senior Investigator'}</Typography>
              </Box>
            </Stack>

            <Divider orientation="vertical" flexItem />

            <Tooltip title="Sign out">
              <IconButton
                onClick={() => {
                  logout();
                  router.push('/login');
                  router.refresh();
                }}
                aria-label="Sign out"
              >
                <LogoutIcon sx={{ fontSize: 19 }} />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1, overflow: isFullBleed ? 'hidden' : 'auto', p: isFullBleed ? 0 : { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box key={pathname} sx={{ flex: 1, minHeight: 0, ...(isFullBleed ? {} : { animation: 'pageEnter 0.18s ease-out both', '@keyframes pageEnter': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }) }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}