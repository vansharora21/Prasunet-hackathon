'use client';

import { useState, useEffect } from 'react';
import { postTransaction, triggerAnalysis } from '@/lib/api';
import type { Account } from '@/lib/types';
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  MenuItem,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Send,
  GppMaybe,
  CheckCircle,
  PlayArrow,
  Bolt,
  Refresh,
  BarChart,
  SubdirectoryArrowRight,
} from '@mui/icons-material';

interface AlertFactor {
  factor: string;
  weight: number;
  direction: string;
}

export default function TransactionSimulatorView({ initialAccounts }: { initialAccounts: Account[] }) {
  const [accounts] = useState<Account[]>(initialAccounts);
  const [loadingAccounts] = useState(false);
  const [senderId, setSenderId] = useState(initialAccounts[0]?.id || '');
  const [receiverId, setReceiverId] = useState(initialAccounts[1]?.id || initialAccounts[0]?.id || '');
  const [amount, setAmount] = useState('150000');
  const [channel, setChannel] = useState('NEFT');

  // Simulator Execution state
  const [isSimulating, setIsSimulating] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<{
    success: boolean;
    txId?: string;
    alertTriggered: boolean;
    alertDetails?: {
      pattern_type: string;
      confidence_score: number;
      shap_narrative: string;
      shap_factors: AlertFactor[];
      severity: string;
    };
  } | null>(null);

  useEffect(() => {
    if (initialAccounts.length > 0) {
      setSenderId(initialAccounts[0].id);
      setReceiverId(initialAccounts[1]?.id || initialAccounts[0].id);
    }
  }, [initialAccounts]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderId || !receiverId) return;
    await executeSimulation([
      {
        sender_account_id: senderId,
        receiver_account_id: receiverId,
        amount: Number(amount),
        channel,
      }
    ]);
  };

  const handleScenarioPreset = async (presetType: 'structuring' | 'velocity' | 'layering') => {
    let txs: Array<{ sender_account_id: string; receiver_account_id: string; amount: number; channel: string }> = [];

    // Choose representative accounts from seed or general lists
    const norm = accounts.find(a => a.id.startsWith('ACC_N')) || accounts[0];

    if (presetType === 'structuring') {
      // 3 transactions of 9.8 Lakhs successively from a single account to different recipients
      const targets = accounts.filter(a => a.id !== norm.id).slice(0, 3);
      txs = targets.map(t => ({
        sender_account_id: norm.id,
        receiver_account_id: t.id,
        amount: 980000,
        channel: 'NEFT'
      }));
    } else if (presetType === 'velocity') {
      // 5 rapid transfers of 1.2 Lakhs to the same receiver within UPI
      const receiver = accounts.find(a => a.id !== norm.id) || accounts[1];
      txs = Array.from({ length: 5 }).map(() => ({
        sender_account_id: norm.id,
        receiver_account_id: receiver.id,
        amount: 120000,
        channel: 'UPI'
      }));
    } else if (presetType === 'layering') {
      // Linear hops: A -> B -> C -> D
      const chain = accounts.slice(0, 4);
      if (chain.length >= 4) {
        txs = [
          { sender_account_id: chain[0].id, receiver_account_id: chain[1].id, amount: 5000000, channel: 'RTGS' },
          { sender_account_id: chain[1].id, receiver_account_id: chain[2].id, amount: 4950000, channel: 'RTGS' },
          { sender_account_id: chain[2].id, receiver_account_id: chain[3].id, amount: 4900000, channel: 'RTGS' },
        ];
      }
    }

    if (txs.length > 0) {
      await executeSimulation(txs);
    }
  };

  const executeSimulation = async (transactionsToPost: Array<{ sender_account_id: string; receiver_account_id: string; amount: number; channel: string }>) => {
    setIsSimulating(true);
    setResult(null);
    setStep(1); // Posting transactions

    try {
      let lastTxId = '';
      for (let i = 0; i < transactionsToPost.length; i++) {
        const tx = transactionsToPost[i];
        const res = await postTransaction(tx);
        lastTxId = res.transaction?.id || `TXN_${Date.now()}`;
      }

      await new Promise(r => setTimeout(r, 1000));
      setStep(2); // Analyzing neural networks GCN + LSTM

      await new Promise(r => setTimeout(r, 1200));
      setStep(3); // Running Integrated Gradients Backattribution

      const analysis = await triggerAnalysis();
      await new Promise(r => setTimeout(r, 800));

      // Find if any alert involves sender or receiver accounts in this submission
      const activeAccountIds = new Set(transactionsToPost.flatMap(t => [t.sender_account_id, t.receiver_account_id]));
      const matchingAlert = (analysis.alerts || []).find(alert =>
        (alert.involved_accounts || []).some((accId: string) => activeAccountIds.has(accId))
      );

      if (matchingAlert) {
        // Parse factors if stringified
        let shapFactors: AlertFactor[] = [];
        try {
          shapFactors = typeof matchingAlert.shap_factors === 'string'
            ? JSON.parse(matchingAlert.shap_factors)
            : (matchingAlert.shap_factors || []);
        } catch {
          shapFactors = [];
        }

        setResult({
          success: true,
          txId: lastTxId,
          alertTriggered: true,
          alertDetails: {
            pattern_type: matchingAlert.pattern_type,
            confidence_score: matchingAlert.confidence_score,
            shap_narrative: matchingAlert.shap_narrative,
            shap_factors: shapFactors,
            severity: matchingAlert.severity || 'high',
          }
        });
      } else {
        setResult({
          success: true,
          txId: lastTxId,
          alertTriggered: false,
        });
      }
    } catch (err) {
      console.error('Simulation error:', err);
      setResult({
        success: false,
        alertTriggered: false,
      });
    } finally {
      setIsSimulating(false);
      setStep(0);
    }
  };

  const formatPatternName = (pattern: string) => {
    return pattern.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const stepLabels = [
    'Writing to Supabase Ledger...',
    'Running Deep Graph GCN + Sequence LSTM...',
    'Calculating Integrated Gradients Causal Weights...',
  ];

  const presets = [
    {
      type: 'structuring' as const,
      icon: SubdirectoryArrowRight,
      title: 'Structuring Pattern',
      desc: 'Triggers 3 back-to-back transfers of ₹9.8 Lakhs (just below limits) from a single node to distinct targets.',
    },
    {
      type: 'velocity' as const,
      icon: Bolt,
      title: 'Velocity Spike',
      desc: 'Launches 5 rapid consecutive UPI transfers within seconds to a single node, triggering anomaly alerts.',
    },
    {
      type: 'layering' as const,
      icon: PlayArrow,
      title: 'Multi-hop Layering',
      desc: 'Initiates a linear multi-hop chain (A → B → C → D) transferring large values rapidly across accounts.',
    },
  ];

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%', overflow: 'auto', maxWidth: 1200, mx: 'auto' }}>
      {/* Introduction Card */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #1c1c1c 0%, #3a3a3a 100%)',
          color: '#fff',
        }}
      >
        <Typography sx={{ fontSize: 20, fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Bolt sx={{ fontSize: 20 }} /> Live Transaction Simulation Sandbox
        </Typography>
        <Typography sx={{ fontSize: 13, opacity: 0.9, maxWidth: 720, lineHeight: 1.7 }}>
          Test the limits of Causeway&apos;s machine learning engine in real-time. Conduct individual
          custom transfers or trigger advanced predefined fraud patterns. Watch the hybrid LSTM + Graph Convolutional Network
          instantly process ledger updates and construct regulator-defensible Integrated Gradients causal narratives.
        </Typography>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 2.5 }}>
        {/* Left Column: Form & Presets */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Preset Fraud Scenarios Card */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <GppMaybe sx={{ fontSize: 16, color: 'primary.main' }} /> Trigger Preset Fraud Scenarios
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
              {presets.map(({ type, icon: Icon, title, desc }) => (
                <Button
                  key={type}
                  onClick={() => handleScenarioPreset(type)}
                  disabled={isSimulating || loadingAccounts}
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    p: 2,
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    color: '#1e293b',
                    textTransform: 'none',
                    '&:hover': { borderColor: '#c4c4c8', bgcolor: 'rgba(0,0,0,0.02)' },
                    '&:disabled': { opacity: 0.5 },
                  }}
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Icon sx={{ fontSize: 15, color: 'primary.main' }} /> {title}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#475569', lineHeight: 1.5, textAlign: 'left' }}>{desc}</Typography>
                </Button>
              ))}
            </Box>
          </Paper>

          {/* Manual Simulator Form */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Send sx={{ fontSize: 16, color: 'primary.main' }} /> Create Manual Transaction
            </Typography>

            {loadingAccounts ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', py: 2 }}>
                <Refresh sx={{ fontSize: 16, animation: 'spin 1s linear infinite', color: 'primary.main' }} />
                <Typography sx={{ fontSize: 13, color: '#475569' }}>Loading ledger accounts...</Typography>
              </Stack>
            ) : (
              <Box component="form" onSubmit={handleManualSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    select
                    label="Sender Account"
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    size="small"
                    fullWidth
                  >
                    {accounts.map(acc => (
                      <MenuItem key={acc.id} value={acc.id}>
                        {acc.id} - {acc.holder_name} (Risk: {acc.risk_level})
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Receiver Account"
                    value={receiverId}
                    onChange={(e) => setReceiverId(e.target.value)}
                    size="small"
                    fullWidth
                  >
                    {accounts.map(acc => (
                      <MenuItem key={acc.id} value={acc.id}>
                        {acc.id} - {acc.holder_name} (Risk: {acc.risk_level})
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Amount (INR)"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    size="small"
                    fullWidth
                    slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
                    placeholder="Enter transfer amount"
                  />
                  <TextField
                    select
                    label="Payment Channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    size="small"
                    fullWidth
                  >
                    <MenuItem value="UPI">UPI (Unified Payments Interface)</MenuItem>
                    <MenuItem value="NEFT">NEFT (National Electronic Funds Transfer)</MenuItem>
                    <MenuItem value="RTGS">RTGS (Real Time Gross Settlement)</MenuItem>
                  </TextField>
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSimulating || senderId === receiverId}
                  startIcon={<Send sx={{ fontSize: 16 }} />}
                  sx={{ py: 1.25 }}
                >
                  Inject Transaction Into Ledger
                </Button>
              </Box>
            )}
          </Paper>
        </Box>

        {/* Right Column: Execution Progress & Live Prediction Result */}
        <Paper variant="outlined" sx={{ p: 2.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BarChart sx={{ fontSize: 16, color: 'primary.main' }} /> Live AI Engine Response
            </Typography>

            {/* Loader Screen */}
            {isSimulating && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, textAlign: 'center', gap: 2 }}>
                <Refresh sx={{ fontSize: 32, color: 'primary.main', animation: 'spin 1s linear infinite' }} />
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    {stepLabels[step - 1] || 'Processing...'}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#475569', mt: 0.5 }}>This will take only a few moments...</Typography>
                </Box>
                <LinearProgress sx={{ width: 200 }} />
              </Box>
            )}

            {/* Empty State */}
            {!isSimulating && !result && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, textAlign: 'center', gap: 1 }}>
                <PlayArrow sx={{ fontSize: 32, color: 'primary.main', opacity: 0.4 }} />
                <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#475569' }}>No simulation active</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.disabled', maxWidth: 260 }}>
                  Inject a transaction or click a scenario preset to watch Causeway respond live.
                </Typography>
              </Box>
            )}

            {/* Simulation Result Screen */}
            {!isSimulating && result && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {result.success ? (
                  result.alertTriggered && result.alertDetails ? (
                    <>
                      {/* Red Threat Indicator */}
                      <Box sx={{ bgcolor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 2, p: 2, display: 'flex', gap: 1.5 }}>
                        <GppMaybe sx={{ fontSize: 20, color: 'error.main', flexShrink: 0, mt: 0.25 }} />
                        <Box>
                          <Chip
                            label="ALERT TRIGGERED"
                            size="small"
                            sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: '#fff', bgcolor: 'error.main', height: 20 }}
                          />
                          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1e293b', mt: 0.75 }}>
                            {formatPatternName(result.alertDetails.pattern_type)} Detected
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.25 }}>
                            Model Confidence: <Box component="span" sx={{ fontWeight: 600, color: 'error.main', fontFamily: 'monospace' }}>
                              {(result.alertDetails.confidence_score * 100).toFixed(1)}%
                            </Box>
                          </Typography>
                        </Box>
                      </Box>

                      {/* SHAP/IG Attribution Factors */}
                      {result.alertDetails.shap_factors.length > 0 && (
                        <Box>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1 }}>
                            Causal Attribution Weights (Integrated Gradients)
                          </Typography>
                          <Box sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {result.alertDetails.shap_factors.map((factor, index) => (
                              <Box key={index}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, mb: 0.5 }}>
                                  <Typography sx={{ fontSize: 11, color: '#1e293b', fontWeight: 500 }}>{factor.factor}</Typography>
                                  <Typography sx={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', fontWeight: 600 }}>
                                    {(factor.weight * 100).toFixed(0)}%
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={factor.weight * 100}
                                  sx={{ '& .MuiLinearProgress-bar': { bgcolor: 'error.main' } }}
                                />
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* Narrative */}
                      <Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.75 }}>
                          Automated Causal Narrative
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: '#475569', lineHeight: 1.7, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2, p: 1.5 }}>
                          {result.alertDetails.shap_narrative}
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    /* Clean State */
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, textAlign: 'center', gap: 1.5 }}>
                      <CheckCircle sx={{ fontSize: 48, color: '#059669' }} />
                      <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Transaction Logged Cleanly</Typography>
                        <Typography sx={{ fontSize: 11, color: '#475569', maxWidth: 280, mt: 0.5 }}>
                          The hybrid Neural Network evaluated transaction ID{' '}
                          <Box component="span" sx={{ fontFamily: 'monospace', color: '#1e293b', fontWeight: 600 }}>{result.txId}</Box>{' '}
                          and found no anomalous risk behaviors.
                        </Typography>
                      </Box>
                    </Box>
                  )
                ) : (
                  /* Failure State */
                  <Alert severity="error" icon={<GppMaybe sx={{ fontSize: 18 }} />}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Execution Failed</Typography>
                    <Typography sx={{ fontSize: 11, color: '#475569', mt: 0.5 }}>
                      An error occurred while connecting to the Supabase database or Python ML service. Please make sure the ML backend is active.
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}
          </Box>

          {/* Subtext info */}
          {!isSimulating && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eef0f4' }}>
              <Typography sx={{ fontSize: 10, color: '#475569', lineHeight: 1.6 }}>
                💡 <Box component="span" sx={{ fontWeight: 600 }}>Pro Tip:</Box> Inbound and outbound transactions will expand your ledger and community graphs dynamically, updating the Fund Flow Graph view.
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}