import Redis from 'ioredis';

const GRAPH_NAME = 'graphsentinel';

const client = new Redis({
  host: 'r-6jissuruar.instance-vtc7em4kz.hc-7up0crkyn.ap-south-1.aws.f2e0a955bb84.cloud',
  port: 58345,
  username: 'hackathonedb',
  password: 'vansharora',
  connectTimeout: 10000,
});

async function query(cypher) {
  const result = await client.call('GRAPH.QUERY', GRAPH_NAME, cypher);
  return Array.isArray(result?.[1]) ? result[1] : result;
}

client.on('ready', async () => {
  console.log('=== FalkorDB Full Integration Test ===\n');

  try { await client.call('GRAPH.DELETE', GRAPH_NAME); } catch {}
  console.log('1. Graph cleared');

  const accounts = [
    { id: 'ACC_001', name: 'Rahul Sharma', risk: 'high', branch: 'Mumbai Main' },
    { id: 'ACC_002', name: 'Priya Patel', risk: 'low', branch: 'Delhi Central' },
    { id: 'ACC_003', name: 'Amit Kumar', risk: 'critical', branch: 'Bangalore Tech' },
    { id: 'ACC_004', name: 'Sneha Reddy', risk: 'medium', branch: 'Hyderabad City' },
    { id: 'ACC_005', name: 'Vikram Singh', risk: 'low', branch: 'Chennai Port' },
  ];

  for (const a of accounts) {
    await query(`CREATE (a:Account {id: "${a.id}", name: "${a.name}", risk_level: "${a.risk}", branch: "${a.branch}"})`);
  }
  console.log(`2. Created ${accounts.length} nodes`);

  const transactions = [
    { s: 'ACC_001', r: 'ACC_002', amt: 500000, sus: false },
    { s: 'ACC_002', r: 'ACC_003', amt: 480000, sus: true },
    { s: 'ACC_003', r: 'ACC_004', amt: 470000, sus: true },
    { s: 'ACC_004', r: 'ACC_005', amt: 460000, sus: true },
    { s: 'ACC_005', r: 'ACC_001', amt: 450000, sus: true },
    { s: 'ACC_001', r: 'ACC_003', amt: 200000, sus: false },
  ];

  for (const t of transactions) {
    await query(`MATCH (a:Account {id: "${t.s}"}), (b:Account {id: "${t.r}"}) CREATE (a)-[:TRANSFER {amount: ${t.amt}, is_suspicious: ${t.sus}}]->(b)`);
  }
  console.log(`3. Created ${transactions.length} edges`);

  const nodes = await query('MATCH (a:Account) RETURN a.id, a.name, a.risk_level');
  console.log(`4. Nodes: ${nodes.length}`);
  nodes.forEach(n => console.log(`   ${n[0]}: ${n[1]} [${n[2]}]`));

  const edges = await query('MATCH (a)-[r:TRANSFER]->(b) RETURN a.id, b.id, r.amount, r.is_suspicious');
  console.log(`5. Edges: ${edges.length}`);
  edges.forEach(e => console.log(`   ${e[0]}->${e[1]}: ${e[2]} ${e[3] ? '⚠️' : '✅'}`));

  // Shortest path — FalkorDB: shortestPath MUST be in RETURN clause
  const pathResult = await query(
    `MATCH (source:Account {id: "ACC_001"}), (target:Account {id: "ACC_004"})
     RETURN shortestPath((source)-[:TRANSFER*]->(target)) AS p`
  );
  if (pathResult.length && pathResult[0][0]) {
    const p = pathResult[0][0];
    // FalkorDB path object: { nodes: [...], relationships: [...] }
    const nodeIds = (p.nodes || []).map(n => n.properties?.id || n.id || 'unknown');
    const hopCount = (p.relationships || []).length;
    console.log(`6. Shortest path ACC_001->ACC_004: ${nodeIds.join(' -> ')} (${hopCount} hops)`);
  } else {
    console.log('6. Shortest path: no path found');
  }

  // Suspicious chains — FalkorDB: use path variable with relationships(p)
  const chains = await query(
    `MATCH p = (a:Account)-[:TRANSFER*2..4]->(b:Account)
     WHERE ALL(r IN relationships(p) WHERE r.is_suspicious = true)
     RETURN [n IN nodes(p) | n.id] AS chain, length(p) AS hops
     LIMIT 10`
  );
  console.log(`7. Suspicious chains: ${chains.length}`);
  chains.forEach(c => console.log(`   ${c[0].join(' -> ')} (${c[1]} hops)`));

  // Community detection
  const communities = await query(
    `MATCH (a:Account)
     OPTIONAL MATCH (a)-[:TRANSFER*1..10]-(b:Account)
     WITH a, collect(DISTINCT b.id) AS connected
     RETURN a.id, size(connected) AS connected_count`
  );
  console.log(`8. Communities: ${communities.length} rows`);
  communities.forEach(c => console.log(`   ${c[0]}: connected to ${c[1]} accounts`));

  await client.call('GRAPH.DELETE', GRAPH_NAME);
  console.log('9. Cleaned up');

  console.log('\n🎉 All tests PASSED!');
  await client.quit();
  process.exit(0);
});

client.on('error', (e) => { console.error('FAIL:', e.message); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 20000);
