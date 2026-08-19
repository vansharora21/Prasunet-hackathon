'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Shield,
  ArrowForward,
  Visibility,
  VisibilityOff,
  Lock,
  MailOutlined,
} from '@mui/icons-material';
import { login, DEMO_CREDENTIALS } from '@/lib/auth';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    // Simulate a short round-trip so the button state feels real.
    setTimeout(() => {
      const user = login(email, password);
      if (user) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError('Invalid credentials. Use the demo account below.');
        setSubmitting(false);
      }
    }, 450);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { lg: '1.1fr 1fr' },
        bgcolor: 'background.default',
      }}
    >
      {/* ── Brand panel ─────────────────────────────────────────── */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          bgcolor: '#0a0b0d',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ambient light */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: -120,
            right: -80,
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.09), transparent 62%)',
            pointerEvents: 'none',
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            bottom: -160,
            left: -60,
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,140,255,0.12), transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', position: 'relative' }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield sx={{ fontSize: 20, color: '#0a0b0d' }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Causeway</Typography>
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Union Bank of India</Typography>
          </Box>
        </Stack>

        <Box sx={{ position: 'relative', maxWidth: 480 }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.28em',
              color: 'rgba(255,255,255,0.5)',
              mb: 2,
            }}
          >
            AML / Fraud Detection
          </Typography>
          <Typography
            sx={{
              fontSize: 44,
              lineHeight: 1.08,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              mb: 2.5,
            }}
          >
            Every rupee,
            <br />
            <Box component="span" sx={{ color: 'rgba(255,255,255,0.55)' }}>
              in clear focus.
            </Box>
          </Typography>
          <Typography sx={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 420 }}>
            One quiet workspace for transaction monitoring, fraud alerts, graph
            intelligence and goAML reporting — built to stay out of the way.
          </Typography>
        </Box>

        <Box sx={{ position: 'relative' }}>
          <Stack direction="row" spacing={6} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
            {[
              ['AI detection', 'SHAP-causal ML scoring'],
              ['Graph analytics', 'Layering chain tracking'],
              ['Regulatory', 'goAML STR / CTR export'],
            ].map(([k, v]) => (
              <Box key={k}>
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{k}</Typography>
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', mt: 0.25 }}>{v}</Typography>
              </Box>
            ))}
          </Stack>
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', mt: 4 }}>
            © 2026 Causeway · Internal tool
          </Typography>
        </Box>
      </Box>

      {/* ── Sign-in panel ───────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 6 },
          position: 'relative',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(700px 360px at 85% -10%, rgba(28,28,28,0.05), transparent)',
            pointerEvents: 'none',
          }}
        />

        <Box sx={{ width: '100%', maxWidth: 400, position: 'relative' }}>
          {/* double-bezel shell */}
          <Box
            sx={{
              borderRadius: '2rem',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.04), transparent)',
              p: '6px',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <Box
              sx={{
                borderRadius: 'calc(2rem - 6px)',
                bgcolor: 'background.paper',
                px: { xs: 3, sm: 4 },
                py: 4,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65), 0 24px 48px -28px rgba(0,0,0,0.28)',
              }}
            >
              <Box sx={{ mb: 3.5 }}>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.24em',
                    color: 'rgba(28,28,28,0.7)',
                  }}
                >
                  Welcome back
                </Typography>
                <Typography sx={{ mt: 1.5, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>
                  Sign in to Causeway
                </Typography>
                <Typography sx={{ mt: 0.75, fontSize: 13, color: 'text.secondary' }}>
                  Use your work email and password.
                </Typography>
              </Box>

              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@causeway.com"
                  autoComplete="email"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <MailOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ fontSize: 16, color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword((s) => !s)}
                            edge="end"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                {error && (
                  <Alert severity="error" sx={{ py: 0.5, fontSize: 12 }}>
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                  sx={{
                    mt: 1,
                    height: 48,
                    borderRadius: 999,
                    justifyContent: 'space-between',
                    px: 2,
                    fontSize: 14,
                    fontWeight: 500,
                    boxShadow: '0 12px 24px -12px rgba(28,28,28,0.6)',
                  }}
                >
                  <span>{submitting ? 'Signing in…' : 'Sign in'}</span>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      bgcolor: 'rgba(255,255,255,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ArrowForward sx={{ fontSize: 15 }} />
                  </Box>
                </Button>
              </Box>

              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', my: 3 }}>
                <Box sx={{ height: 1, flex: 1, bgcolor: 'rgba(0,0,0,0.08)' }} />
                <Typography sx={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'text.secondary' }}>
                  Demo access
                </Typography>
                <Box sx={{ height: 1, flex: 1, bgcolor: 'rgba(0,0,0,0.08)' }} />
              </Stack>

              <Box sx={{ bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 2, px: 2, py: 1.5, fontSize: 12 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Admin</Typography>
                  <Typography sx={{ fontSize: 12, fontFamily: 'monospace' }}>
                    {DEMO_CREDENTIALS.email} · {DEMO_CREDENTIALS.password}
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}