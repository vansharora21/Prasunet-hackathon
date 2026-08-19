function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function formatAmount(amount) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

export function generateGoamlXml({ report, alerts, accounts, transactions }) {
  const reportId = report.id || `RPT_${Date.now()}`;
  const reportType = report.report_type || 'STR';
  const today = new Date().toISOString().split('T')[0];

  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const involvedAccountIds = [...new Set(alerts.flatMap((alert) => alert.involved_accounts || []))];
  const subjectAccount = accountMap.get(involvedAccountIds[0]);

  const alertIds = alerts.map((alert) => escapeXml(alert.id)).join(', ');
  const suspiciousTypes = alerts.map((alert) => escapeXml(alert.pattern_type)).join(', ');

  const subjectAccountsXml = involvedAccountIds
    .map((accountId) => {
      const account = accountMap.get(accountId);

      if (!account) {
        return '';
      }

      return `
        <account>
          <account_number>${escapeXml(account.id)}</account_number>
          <account_name>${escapeXml(account.holder_name)}</account_name>
          <account_type>${escapeXml(account.account_type)}</account_type>
          <opening_date>${escapeXml(String(account.created_at).split('T')[0])}</opening_date>
          <branch_name>${escapeXml(account.bank_branch)}</branch_name>
        </account>`;
    })
    .join('');

  const transactionsXml = transactions
    .map(
      (transaction) => `
      <transaction>
        <transactionnumber>${escapeXml(transaction.id)}</transactionnumber>
        <internal_ref_number>${escapeXml(transaction.reference_number)}</internal_ref_number>
        <transaction_location>${escapeXml(accountMap.get(transaction.sender_account_id)?.bank_branch || 'Unknown')}</transaction_location>
        <date_transaction>${escapeXml(String(transaction.timestamp).split('T')[0])}</date_transaction>
        <amount_local>${formatAmount(transaction.amount)}</amount_local>
        <transmode_code>${escapeXml(transaction.channel)}</transmode_code>
        <from_account>
          <account>
            <account_number>${escapeXml(transaction.sender_account_id)}</account_number>
            <account_name>${escapeXml(accountMap.get(transaction.sender_account_id)?.holder_name || 'Unknown')}</account_name>
          </account>
        </from_account>
        <to_account>
          <account>
            <account_number>${escapeXml(transaction.receiver_account_id)}</account_number>
            <account_name>${escapeXml(accountMap.get(transaction.receiver_account_id)?.holder_name || 'Unknown')}</account_name>
          </account>
        </to_account>
      </transaction>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<goAML>
  <report>
    <rentity_id>UBIN_MUMBAI_001</rentity_id>
    <rentity_branch>Mumbai Main Branch</rentity_branch>
    <submission_code>E</submission_code>
    <report_code>${escapeXml(reportType)}</report_code>
    <submission_date>${today}</submission_date>
    <currency_code_local>INR</currency_code_local>
    <reporting_person>
      <first_name>Chief</first_name>
      <last_name>Compliance Officer</last_name>
      <title>CCO</title>
      <email>cco@unionbank.in</email>
      <phone>+91-22-25757000</phone>
    </reporting_person>
    <location>
      <address_type>B</address_type>
      <address>239, Vidhan Bhavan Marg, Nariman Point</address>
      <city>Mumbai</city>
      <country_code>IN</country_code>
      <zip>400021</zip>
    </location>
    <report_id>${escapeXml(reportId)}</report_id>
    <entity_reference>${escapeXml(reportId)}</entity_reference>
    <fiu_ref_number>FIU-IND-${escapeXml(reportId)}</fiu_ref_number>
    <alert_ids>${alertIds}</alert_ids>
    <suspicious_activity_type>${suspiciousTypes}</suspicious_activity_type>
    <subject>
      <first_name>${escapeXml(subjectAccount?.holder_name?.split(' ')[0] || 'Unknown')}</first_name>
      <last_name>${escapeXml(subjectAccount?.holder_name?.split(' ').slice(1).join(' ') || '')}</last_name>
      <alias></alias>
      <birthdate></birthdate>
      <nationality1>IN</nationality1>
      <occupation>${escapeXml(subjectAccount?.declared_profession || 'Unknown')}</occupation>
      <accounts>${subjectAccountsXml}
      </accounts>
    </subject>
    <transactions>${transactionsXml}
    </transactions>
    <action_initiated>
      <action_code>04</action_code>
      <action_date>${today}</action_date>
      <comment>${escapeXml(report.narrative || 'Suspicious activity detected by GraphSentinel AI system. Under investigation.')}</comment>
    </action_initiated>
  </report>
</goAML>`;
}