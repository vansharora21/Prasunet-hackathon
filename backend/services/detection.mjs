import { randomUUID } from 'node:crypto';

const REPORTING_THRESHOLD = 1000000;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value) {
  return Math.round(clamp(value, 0, 0.99) * 100) / 100;
}

function daysBetween(start, end) {
  return Math.abs(new Date(end).getTime() - new Date(start).getTime()) / 86400000;
}

function hoursBetween(start, end) {
  return Math.abs(new Date(end).getTime() - new Date(start).getTime()) / 3600000;
}

function toIso(date) {
  return new Date(date).toISOString();
}

function groupBy(values, keyFn) {
  return values.reduce((map, value) => {
    const key = keyFn(value);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(value);
    return map;
  }, new Map());
}

function severityFromConfidence(confidence, totalAmount) {
  if (confidence >= 0.9 || totalAmount >= 50000000) {
    return 'critical';
  }

  if (confidence >= 0.78 || totalAmount >= 10000000) {
    return 'high';
  }

  if (confidence >= 0.62 || totalAmount >= 1000000) {
    return 'medium';
  }

  return 'low';
}

function makeAlert({ patternType, accounts, transactions, totalAmount, confidenceScore, shapNarrative, shapFactors, notes = '' }) {
  const createdAt = toIso(new Date());

  return {
    id: `ALRT_${randomUUID().slice(0, 8).toUpperCase()}`,
    pattern_type: patternType,
    involved_accounts: [...new Set(accounts)],
    linked_transaction_ids: [...new Set(transactions.map((transaction) => transaction.id))],
    total_amount: Number(totalAmount.toFixed(2)),
    confidence_score: roundScore(confidenceScore),
    shap_narrative: shapNarrative,
    shap_factors: shapFactors,
    severity: severityFromConfidence(confidenceScore, totalAmount),
    status: 'open',
    assigned_investigator: '',
    notes,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

function accountLabel(accountMap, accountId) {
  return accountMap.get(accountId)?.holder_name || accountId;
}

function accountAgeDays(account) {
  return daysBetween(account.created_at, new Date().toISOString());
}

function recentDormancyDays(account) {
  return daysBetween(account.last_activity_at, new Date().toISOString());
}

function avgForwardRatio(path) {
  if (path.length < 2) {
    return 0;
  }

  const ratios = [];

  for (let index = 1; index < path.length; index += 1) {
    const previousAmount = Number(path[index - 1].amount || 0);
    const currentAmount = Number(path[index].amount || 0);

    if (previousAmount > 0) {
      ratios.push(currentAmount / previousAmount);
    }
  }

  return ratios.length > 0 ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length : 0;
}

function buildAdjacency(transactions) {
  const adjacency = groupBy(transactions, (transaction) => transaction.sender_account_id);

  for (const edges of adjacency.values()) {
    edges.sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));
  }

  return adjacency;
}

function windowTransactions(transactions, windowHours) {
  const cutoff = Date.now() - windowHours * 3600000;
  return transactions.filter((transaction) => new Date(transaction.timestamp).getTime() >= cutoff);
}

function detectMultiHopLayering({ accounts, transactions, pattern }) {
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const recentTransactions = windowTransactions(transactions, pattern.time_window_hours || 48);
  const adjacency = buildAdjacency(recentTransactions);
  const alerts = [];
  const seen = new Set();
  const maxDepth = Math.max(4, (pattern.hop_count || 3) + 1);

  function walk(path) {
    const lastTransaction = path[path.length - 1];
    const nextTransactions = adjacency.get(lastTransaction.receiver_account_id) || [];

    if (path.length >= 3) {
      const accountsInPath = [path[0].sender_account_id, ...path.map((transaction) => transaction.receiver_account_id)];
      const timeSpanHours = hoursBetween(path[0].timestamp, path[path.length - 1].timestamp);
      const uniqueAccounts = new Set(accountsInPath).size;
      const forwardRatio = avgForwardRatio(path);
      const shellAccounts = accountsInPath.filter((accountId) => {
        const account = accountMap.get(accountId);
        return account && (accountAgeDays(account) < 180 || ['high', 'critical'].includes(account.risk_level));
      }).length;

      if (timeSpanHours <= (pattern.time_window_hours || 48) && uniqueAccounts >= 4 && forwardRatio >= 0.9) {
        const key = accountsInPath.join('>');

        if (!seen.has(key)) {
          seen.add(key);
          const totalAmount = Number(path.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0).toFixed(2));
          const confidence = clamp(0.56 + path.length * 0.05 + forwardRatio * 0.2 + shellAccounts * 0.04, 0, 0.97);

          alerts.push(
            makeAlert({
              patternType: 'multi_hop_layering',
              accounts: accountsInPath,
              transactions: path,
              totalAmount,
              confidenceScore: confidence,
              shapNarrative: `A multi-hop layering chain with ${path.length} transfers was detected from ${accountLabel(accountMap, path[0].sender_account_id)} to ${accountLabel(accountMap, path[path.length - 1].receiver_account_id)} over ${timeSpanHours.toFixed(1)} hours. Funds were forwarded at an average rate of ${(forwardRatio * 100).toFixed(0)}%, which is consistent with rapid pass-through activity designed to obscure origin.`,
              shapFactors: [
                { factor: 'Hop velocity across the chain', weight: 0.38, direction: 'increases_risk' },
                { factor: 'High pass-through forwarding ratio', weight: 0.29, direction: 'increases_risk' },
                { factor: 'New or high-risk intermediate accounts', weight: 0.18, direction: 'increases_risk' },
                { factor: 'Compressed time span', weight: 0.15, direction: 'increases_risk' },
              ],
            })
          );
        }
      }
    }

    if (path.length >= maxDepth) {
      return;
    }

    for (const nextTransaction of nextTransactions) {
      if (path.some((transaction) => transaction.receiver_account_id === nextTransaction.receiver_account_id)) {
        continue;
      }

      if (new Date(nextTransaction.timestamp) < new Date(lastTransaction.timestamp)) {
        continue;
      }

      walk([...path, nextTransaction]);
    }
  }

  for (const transaction of recentTransactions) {
    walk([transaction]);
  }

  return alerts;
}

function detectCircularRoundTrip({ accounts, transactions, pattern }) {
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const recentTransactions = windowTransactions(transactions, pattern.time_window_hours || 72);
  const adjacency = buildAdjacency(recentTransactions);
  const alerts = [];
  const seen = new Set();
  const maxDepth = 5;

  function walk(startTransaction, path) {
    const lastTransaction = path[path.length - 1];
    const nextTransactions = adjacency.get(lastTransaction.receiver_account_id) || [];

    if (path.length >= 3 && lastTransaction.receiver_account_id === startTransaction.sender_account_id) {
      const accountsInCycle = [startTransaction.sender_account_id, ...path.map((transaction) => transaction.receiver_account_id)];
      const key = accountsInCycle.join('>');
      const recoveryRatio = Number((lastTransaction.amount / startTransaction.amount).toFixed(2));
      const timeSpanHours = hoursBetween(startTransaction.timestamp, lastTransaction.timestamp);

      if (!seen.has(key) && timeSpanHours <= (pattern.time_window_hours || 72) && recoveryRatio >= 0.75) {
        seen.add(key);
        const totalAmount = Number(path.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0).toFixed(2));
        const confidence = clamp(0.58 + recoveryRatio * 0.28 + path.length * 0.04, 0, 0.98);

        alerts.push(
          makeAlert({
            patternType: 'circular_round_trip',
            accounts: accountsInCycle,
            transactions: path,
            totalAmount,
            confidenceScore: confidence,
            shapNarrative: `A circular fund flow completed a round trip back to ${accountLabel(accountMap, startTransaction.sender_account_id)} in ${timeSpanHours.toFixed(1)} hours. The return ratio was ${(recoveryRatio * 100).toFixed(0)}%, indicating that the chain was likely used for balance manipulation rather than genuine commerce.`,
            shapFactors: [
              { factor: 'Cycle completion back to originator', weight: 0.45, direction: 'increases_risk' },
              { factor: 'High amount recovery ratio', weight: 0.28, direction: 'increases_risk' },
              { factor: 'Deviation from ordinary transaction path length', weight: 0.27, direction: 'increases_risk' },
            ],
          })
        );
      }
    }

    if (path.length >= maxDepth) {
      return;
    }

    for (const nextTransaction of nextTransactions) {
      if (nextTransaction.timestamp < lastTransaction.timestamp) {
        continue;
      }

      if (path.some((transaction) => transaction.receiver_account_id === nextTransaction.receiver_account_id) && nextTransaction.receiver_account_id !== startTransaction.sender_account_id) {
        continue;
      }

      walk(startTransaction, [...path, nextTransaction]);
    }
  }

  for (const transaction of recentTransactions) {
    walk(transaction, [transaction]);
  }

  return alerts;
}

function detectStructuring({ accounts, transactions, pattern }) {
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const recentTransactions = windowTransactions(transactions, pattern.time_window_hours || 72);
  const bySender = groupBy(recentTransactions, (transaction) => transaction.sender_account_id);
  const alerts = [];

  for (const [senderId, senderTransactions] of bySender.entries()) {
    const sortedTransactions = [...senderTransactions].sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));
    const subThreshold = sortedTransactions.filter((transaction) => Number(transaction.amount || 0) < REPORTING_THRESHOLD && Number(transaction.amount || 0) >= REPORTING_THRESHOLD * 0.88);

    if (subThreshold.length < 4) {
      continue;
    }

    const totalAmount = subThreshold.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    if (totalAmount < REPORTING_THRESHOLD) {
      continue;
    }

    const spanHours = hoursBetween(subThreshold[0].timestamp, subThreshold[subThreshold.length - 1].timestamp);
    const confidence = clamp(0.54 + subThreshold.length * 0.08 + Math.min(totalAmount / (REPORTING_THRESHOLD * 6), 0.16), 0, 0.96);

    alerts.push(
      makeAlert({
        patternType: 'structuring',
        accounts: [senderId, ...subThreshold.map((transaction) => transaction.receiver_account_id)],
        transactions: subThreshold,
        totalAmount,
        confidenceScore: confidence,
        shapNarrative: `Structuring behaviour was detected on ${accountLabel(accountMap, senderId)}. ${subThreshold.length} transfers were placed just below the ₹10L reporting threshold across ${spanHours.toFixed(1)} hours, with a combined value of ₹${totalAmount.toLocaleString('en-IN')}.`,
        shapFactors: [
          { factor: 'Sub-threshold amount clustering', weight: 0.52, direction: 'increases_risk' },
          { factor: 'High transaction frequency in a short window', weight: 0.31, direction: 'increases_risk' },
          { factor: 'Partial forwarding by recipients', weight: 0.17, direction: 'increases_risk' },
        ],
      })
    );
  }

  return alerts;
}

function detectDormantReactivation({ accounts, transactions, pattern }) {
  const recentTransactions = windowTransactions(transactions, pattern.time_window_hours || 24);
  const alerts = [];
  const seen = new Set();

  for (const account of accounts) {
    const dormancyGap = recentDormancyDays(account);
    const reactivationTransactions = recentTransactions.filter(
      (transaction) => transaction.sender_account_id === account.id && Number(transaction.amount || 0) >= (pattern.amount_ceiling || 500000)
    );

    if (dormancyGap < 180 || reactivationTransactions.length === 0 || seen.has(account.id)) {
      continue;
    }

    seen.add(account.id);
    const totalAmount = reactivationTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const confidence = clamp(0.62 + Math.min(dormancyGap / 365, 0.22) + Math.min(totalAmount / 10000000, 0.12), 0, 0.97);

    alerts.push(
      makeAlert({
        patternType: 'dormant_reactivation',
        accounts: [account.id, ...reactivationTransactions.map((transaction) => transaction.receiver_account_id)],
        transactions: reactivationTransactions,
        totalAmount,
        confidenceScore: confidence,
        shapNarrative: `${account.holder_name} was inactive for ${Math.round(dormancyGap)} days and then suddenly initiated high-value transfers totaling ₹${totalAmount.toLocaleString('en-IN')}. This reactivation pattern is consistent with dormant account takeover or prepositioning for large transfers.`,
        shapFactors: [
          { factor: 'Long inactivity gap', weight: 0.41, direction: 'increases_risk' },
          { factor: 'Sudden high-value transfer after dormancy', weight: 0.34, direction: 'increases_risk' },
          { factor: 'Concentrated reactivation within a short window', weight: 0.25, direction: 'increases_risk' },
        ],
      })
    );
  }

  return alerts;
}

function detectKycMismatch({ accounts, transactions, pattern }) {
  const recentTransactions = windowTransactions(transactions, pattern.time_window_hours || 720);
  const alerts = [];
  const byAccount = new Map();

  for (const transaction of recentTransactions) {
    const outgoing = byAccount.get(transaction.sender_account_id) || 0;
    const incoming = byAccount.get(transaction.receiver_account_id) || 0;
    byAccount.set(transaction.sender_account_id, outgoing + Number(transaction.amount || 0));
    byAccount.set(transaction.receiver_account_id, incoming + Number(transaction.amount || 0));
  }

  for (const account of accounts) {
    const monthlyVolume = byAccount.get(account.id) || 0;
    const annualIncome = Number(account.declared_annual_income || 0);
    const monthlyIncomeEquivalent = annualIncome / 12;
    const ratio = monthlyIncomeEquivalent > 0 ? monthlyVolume / monthlyIncomeEquivalent : 0;

    if (ratio < 3) {
      continue;
    }

    const relatedTransactions = recentTransactions.filter(
      (transaction) => transaction.sender_account_id === account.id || transaction.receiver_account_id === account.id
    );

    if (relatedTransactions.length === 0) {
      continue;
    }

    const confidence = clamp(0.58 + Math.min(ratio / 10, 0.32) + (account.account_type === 'savings' ? 0.04 : 0), 0, 0.98);
    const totalAmount = relatedTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    alerts.push(
      makeAlert({
        patternType: 'kyc_mismatch',
        accounts: [account.id, ...relatedTransactions.map((transaction) => transaction.receiver_account_id)],
        transactions: relatedTransactions,
        totalAmount,
        confidenceScore: confidence,
        shapNarrative: `${account.holder_name} has declared annual income of ₹${annualIncome.toLocaleString('en-IN')} but transacted approximately ₹${monthlyVolume.toLocaleString('en-IN')} in the recent monitoring window. The activity is ${ratio.toFixed(1)}x the monthly income equivalent, which strongly suggests a mismatch between KYC profile and observed behaviour.`,
        shapFactors: [
          { factor: 'Observed transaction volume vs declared income', weight: 0.54, direction: 'increases_risk' },
          { factor: 'Monthly velocity relative to profile', weight: 0.28, direction: 'increases_risk' },
          { factor: 'Declared profession / account behavior mismatch', weight: 0.18, direction: 'increases_risk' },
        ],
      })
    );
  }

  return alerts;
}

export function detectFraudAlerts({ accounts, transactions, patterns }) {
  const patternByName = new Map(patterns.map((pattern) => [String(pattern.name || '').toLowerCase(), pattern]));

  const multiHopPattern = patternByName.get('multi-hop layering') || patterns.find((pattern) => pattern.id === 'pat_multilayer');
  const circularPattern = patternByName.get('circular round-trip') || patterns.find((pattern) => pattern.id === 'pat_circular');
  const structuringPattern = patternByName.get('structuring / smurfing') || patterns.find((pattern) => pattern.id === 'pat_structuring');
  const dormantPattern = patternByName.get('dormant account reactivation') || patterns.find((pattern) => pattern.id === 'pat_dormant');
  const kycPattern = patternByName.get('kyc profile mismatch') || patterns.find((pattern) => pattern.id === 'pat_kyc_mismatch');

  const alerts = [];

  if (multiHopPattern?.is_enabled !== false) {
    alerts.push(...detectMultiHopLayering({ accounts, transactions, pattern: multiHopPattern || { time_window_hours: 48, hop_count: 3 } }));
  }

  if (circularPattern?.is_enabled !== false) {
    alerts.push(...detectCircularRoundTrip({ accounts, transactions, pattern: circularPattern || { time_window_hours: 72 } }));
  }

  if (structuringPattern?.is_enabled !== false) {
    alerts.push(...detectStructuring({ accounts, transactions, pattern: structuringPattern || { time_window_hours: 72 } }));
  }

  if (dormantPattern?.is_enabled !== false) {
    alerts.push(...detectDormantReactivation({ accounts, transactions, pattern: dormantPattern || { time_window_hours: 24, amount_ceiling: 500000 } }));
  }

  if (kycPattern?.is_enabled !== false) {
    alerts.push(...detectKycMismatch({ accounts, transactions, pattern: kycPattern || { time_window_hours: 720 } }));
  }

  const uniqueAlerts = [];
  const seen = new Set();

  for (const alert of alerts) {
    const key = `${alert.pattern_type}:${alert.involved_accounts.join('>')}:${alert.linked_transaction_ids.join('>')}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueAlerts.push(alert);
  }

  return uniqueAlerts.sort((left, right) => right.confidence_score - left.confidence_score);
}

export function summarizeGraph(accounts, transactions, alerts) {
  const nodes = accounts.map((account) => ({
    ...account,
    label: account.holder_name,
  }));

  const edgeMap = new Map();

  for (const transaction of transactions) {
    const key = `${transaction.sender_account_id}::${transaction.receiver_account_id}`;
    const existing = edgeMap.get(key) || {
      id: key,
      source_account_id: transaction.sender_account_id,
      target_account_id: transaction.receiver_account_id,
      total_amount: 0,
      transaction_count: 0,
      last_transaction_at: transaction.timestamp,
      is_suspicious: false,
    };

    existing.total_amount += Number(transaction.amount || 0);
    existing.transaction_count += 1;
    if (new Date(transaction.timestamp) > new Date(existing.last_transaction_at)) {
      existing.last_transaction_at = transaction.timestamp;
    }

    edgeMap.set(key, existing);
  }

  for (const alert of alerts) {
    for (const transactionId of alert.linked_transaction_ids || []) {
      const transaction = transactions.find((item) => item.id === transactionId);

      if (!transaction) {
        continue;
      }

      const key = `${transaction.sender_account_id}::${transaction.receiver_account_id}`;
      const edge = edgeMap.get(key);

      if (edge) {
        edge.is_suspicious = true;
      }
    }
  }

  return {
    nodes,
    edges: [...edgeMap.values()],
  };
}

export function summarizeDashboard({ accounts, transactions, alerts, reports, nodes }) {
  const openAlerts = alerts.filter((alert) => alert.status === 'open').length;
  const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical').length;
  const dormantAccounts = accounts.filter((account) => account.is_dormant).length;
  const suspiciousVolume = alerts.reduce((sum, alert) => sum + Number(alert.total_amount || 0), 0);

  return {
    accounts: accounts.length,
    transactions: transactions.length,
    alerts: alerts.length,
    openAlerts,
    criticalAlerts,
    dormantAccounts,
    suspiciousVolume,
    draftReports: reports.filter((report) => report.submission_status === 'draft').length,
    submittedReports: reports.filter((report) => report.submission_status === 'submitted').length,
    activeBanks: nodes.filter((node) => node.status === 'active').length,
  };
}