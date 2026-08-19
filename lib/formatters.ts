export function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000)     return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(dateStr: string): string {
  const diffMs    = Date.now() - new Date(dateStr).getTime();
  const diffMins  = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays  = Math.floor(diffHours / 24);
  if (diffMins < 1)   return 'Just now';
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30)  return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export function patternLabel(patternType: string): string {
  const labels: Record<string, string> = {
    multi_hop_layering:   'Multi-Hop Layering',
    circular_round_trip:  'Circular Round-Trip',
    structuring:          'Structuring',
    dormant_reactivation: 'Dormant Reactivation',
    kyc_mismatch:         'KYC Mismatch',
    fan_out_fan_in:       'Fan-Out / Fan-In',
    velocity_spike:       'Velocity Spike',
    cross_border_layering: 'Cross-Border Layering',
  };
  return labels[patternType] || patternType;
}

export function severityBg(severity: string): string {
  const map: Record<string, string> = {
    critical: 'bg-[rgba(239,68,68,0.1)] text-[#EF4444] border border-[#EF4444]/30',
    high:     'bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border border-[#F59E0B]/30',
    medium:   'bg-[rgba(245,158,11,0.08)] text-[#F59E0B] border border-[#F59E0B]/20',
    low:      'bg-[rgba(16,185,129,0.1)] text-[#10B981] border border-[#10B981]/30',
  };
  return map[severity] || 'bg-[#1F2937] text-[#9CA3AF] border border-[#374151]';
}

export function statusBg(status: string): string {
  const map: Record<string, string> = {
    open:       'bg-[rgba(43,109,239,0.1)] text-[#2B6DEF] border border-[#2B6DEF]/30',
    confirmed:  'bg-[rgba(239,68,68,0.1)] text-[#EF4444] border border-[#EF4444]/30',
    dismissed:  'bg-[#1F2937] text-[#6B7280] border border-[#374151]',
    pending:    'bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border border-[#F59E0B]/30',
    completed:  'bg-[rgba(16,185,129,0.1)] text-[#10B981] border border-[#10B981]/30',
    draft:      'bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border border-[#F59E0B]/30',
    submitted:  'bg-[rgba(16,185,129,0.1)] text-[#10B981] border border-[#10B981]/30',
  };
  return map[status] || 'bg-[#1F2937] text-[#9CA3AF] border border-[#374151]';
}

export function channelColor(channel: string): string {
  const map: Record<string, string> = {
    NEFT: 'bg-[rgba(43,109,239,0.1)] text-[#2B6DEF] border border-[#2B6DEF]/25',
    RTGS: 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border border-[#F59E0B]/25',
    UPI:  'bg-[rgba(16,185,129,0.1)] text-[#10B981] border border-[#10B981]/25',
    Core: 'bg-[#1F2937] text-[#9CA3AF] border border-[#374151]',
  };
  return map[channel] || 'bg-[#1F2937] text-[#9CA3AF] border border-[#374151]';
}

export function riskColor(riskLevel: string): string {
  const map: Record<string, string> = {
    low:      '#10B981',
    medium:   '#F59E0B',
    high:     '#F59E0B',
    critical: '#EF4444',
  };
  return map[riskLevel] || '#6B7280';
}