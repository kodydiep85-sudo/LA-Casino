/* Craps and Crapless Craps — the table. Bets, the dice, payouts and the shooter.
   The same file runs on the website's server (friends' tables, up to 5 players, the shooter passes on a seven-out)
   and inside the browser for solo play, so both play by exactly the same rules.
   The shooter can set the dice before throwing; every throw is random. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GSCraps = factory();
})(typeof self !== 'undefined' ? self : this, function () {

// table limits, like the baccarat rooms: pick the table you want to play (numbers & line min-max; every side bet (props, hardways, the bonus) is $50 minimum; the bonus has no maximum)
const TIERS = {
  lounge:  { name: 'Lounge',       min: 10,    max: 5000,      propMin: 50, hardMin: 50, bonusMin: 50 },
  high:    { name: 'High Limit',   min: 25,    max: 50000,     propMin: 50, hardMin: 50, bonusMin: 50 },
  vip:     { name: 'VIP Salon',    min: 100,   max: 500000,    propMin: 50, hardMin: 50, bonusMin: 50 },
  private: { name: 'Private Room', min: 1000,  max: 5000000,   propMin: 50, hardMin: 50, bonusMin: 50 },
  diamond: { name: 'Diamond Room', min: 10000, max: 1000000000000, propMin: 50, hardMin: 50, bonusMin: 50 },
};
const tierOf = room => TIERS[room && room.tier] || TIERS.lounge;
const LIMITS = TIERS.lounge;
const VARIANTS = { classic: { name: 'Regular Craps', numbers: [4, 5, 6, 8, 9, 10] }, crapless: { name: 'Crapless Craps', numbers: [2, 3, 4, 5, 6, 8, 9, 10, 11, 12] } };
// what each bet pays (to 1)
const PLACE = { 4: [9, 5], 10: [9, 5], 5: [7, 5], 9: [7, 5], 6: [7, 6], 8: [7, 6], 2: [11, 2], 12: [11, 2], 3: [11, 4], 11: [11, 4] };
const TRUE = { 4: [2, 1], 10: [2, 1], 5: [3, 2], 9: [3, 2], 6: [6, 5], 8: [6, 5], 2: [6, 1], 12: [6, 1], 3: [3, 1], 11: [3, 1] };   // odds pay true odds
const ODDS_MAX = { 4: 3, 10: 3, 5: 4, 9: 4, 6: 5, 8: 5, 2: 3, 12: 3, 3: 3, 11: 3 };   // 3-4-5x odds (3x on 2, 3, 11, 12)
const LAY_MAX = 6;   // lay odds behind Don't Pass / Don't Come: up to 6x the flat bet
const HARD = { 4: 7, 10: 7, 6: 9, 8: 9 };
const PROPS = { any7: ['Any 7', 4], anyCraps: ['Any craps', 7], p2: ['Aces (2)', 30], p12: ['Twelve', 30], p3: ['Ace-deuce (3)', 15], p11: ['Yo (11)', 15] };
const FIELD = { 2: 2, 12: 3, 3: 1, 4: 1, 9: 1, 10: 1, 11: 1 };
const BONUS = { small: ['All Small', 34, [2, 3, 4, 5, 6]], tall: ['All Tall', 34, [8, 9, 10, 11, 12]], all: ["Make 'Em All", 175, [2, 3, 4, 5, 6, 8, 9, 10, 11, 12]] };
const BET_MS = 45000;   // friends' tables: the shooter has 45 seconds to throw, then the dice go for them
const env = typeof process !== 'undefined' && process.env ? process.env : {};

const cents = n => Math.floor(n * 100 + 1e-6) / 100;
const pay = (amt, [a, b]) => cents(amt * a / b);
const money = n => '$' + (Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

/* ---------------- tables ---------------- */
const rooms = new Map();
let nextId = 1;
const send = (ws, m) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
const broadcast = (room, m) => { for (const p of room.players.values()) send(p.ws, m); };
const code4 = () => { let c; do { c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random() * 24 | 0]).join(''); } while (rooms.has(c)); return c; };
const onTable = p => Object.values(p.bets).reduce((a, b) => a + b, 0) + p.comes.reduce((a, c) => a + c.amt + c.odds, 0) + p.dcs.reduce((a, c) => a + c.amt + c.odds, 0);
const order = room => [...room.players.values()].sort((a, b) => b.seat - a.seat);   // the dice go round from first base

function publicState(room) {
  return {
    t: 'state', now: Date.now(), code: room.code, solo: room.solo, variant: room.variant, tier: room.tier || 'lounge', point: room.point, shooter: room.shooter,
    rolling: room.rolling, bonusOpen: room.bonusOpen, bonusHits: [...room.bonusHits], history: room.history.slice(-24), timerEnds: room.timerEnds || null,
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, seat: p.seat, balance: p.balance, bets: p.bets, comes: p.comes, dcs: p.dcs, bh: p.bh || {}, away: !!p.away })),
  };
}
const pushState = room => broadcast(room, publicState(room));
function armTimer(room) {
  clearTimeout(room.timer); room.timerEnds = null;
  if (room.solo || !room.shooter) return;
  room.timerEnds = Date.now() + (+env.CRAPS_SHOOT_MS || BET_MS);
  room.timer = setTimeout(() => { const s = room.players.get(room.shooter); if (s) roll(room, s, [1, 1], true); }, room.timerEnds - Date.now());
}
function nextShooter(room, after) {
  const seats = order(room).filter(p => !p.away); if (!seats.length) { room.shooter = null; return; }
  const i = seats.findIndex(p => p.id === after);
  room.shooter = seats[(i + 1) % seats.length].id;
}

/* ---------------- placing bets ---------------- */
const isNum = (room, n) => VARIANTS[room.variant].numbers.includes(n);
function check(room, p, key, amt, n) {
  const b = p.bets, crapless = room.variant === 'crapless', pt = room.point, cur = key === 'comeOdds' ? (p.comes.find(c => c.n === n) || {}).odds || 0 : key === 'dcOdds' ? (p.dcs.find(c => c.n === n) || {}).odds || 0 : b[key] || 0;
  if (!(amt >= 0) || !Number.isFinite(amt)) return 'That amount doesn\'t work.';
  const up = amt > cur;
  if (amt > 0) {
    const isBonus = ['small', 'tall', 'all'].includes(key), isProp = key in PROPS || /^hard/.test(key);
    const lim = tierOf(room), mn = isBonus ? lim.bonusMin : /^hard/.test(key) ? lim.hardMin : isProp ? lim.propMin : /Odds$/.test(key) ? 1 : lim.min;
    if (amt < mn) return `The minimum there is ${money(mn)} at the ${lim.name} table.`;
    if (!isBonus && !/Odds$/.test(key) && amt > lim.max) return `The maximum there is ${money(lim.max)} at the ${lim.name} table.`;
  }
  switch (key) {
    case 'pass': if (pt !== null) return 'The Pass Line is a contract bet once the point is on: bet it on the come-out roll.'; break;
    case 'dp': if (crapless) return 'There\'s no Don\'t Pass at a crapless table.'; if (pt !== null && up) return 'Don\'t Pass goes on before the come-out roll.'; break;
    case 'passOdds': if (pt === null || !b.pass) return 'Odds go behind your Pass Line bet once there\'s a point.'; if (amt > b.pass * ODDS_MAX[pt]) return `Odds on ${pt} go up to ${ODDS_MAX[pt]}× your Pass Line bet (${money(b.pass * ODDS_MAX[pt])}).`; break;
    case 'dpOdds': if (pt === null || !b.dp) return 'Lay odds go behind your Don\'t Pass bet once there\'s a point.'; if (amt > b.dp * LAY_MAX) return `Lay odds go up to ${LAY_MAX}× your Don't Pass bet.`; break;
    case 'come': if (pt === null) return 'Come bets go on once there\'s a point (on the come-out roll, use the Pass Line).'; break;
    case 'dc': if (crapless) return 'There\'s no Don\'t Come at a crapless table.'; if (pt === null) return 'Don\'t Come bets go on once there\'s a point.'; break;
    case 'comeOdds': { const c = p.comes.find(x => x.n === n); if (!c) return 'You need a Come bet on that number first.'; if (amt > c.amt * ODDS_MAX[n]) return `Odds on ${n} go up to ${ODDS_MAX[n]}× your Come bet.`; break; }
    case 'dcOdds': { const c = p.dcs.find(x => x.n === n); if (!c) return 'You need a Don\'t Come bet on that number first.'; if (amt > c.amt * LAY_MAX) return `Lay odds go up to ${LAY_MAX}× your Don't Come bet.`; break; }
    case 'field': case 'any7': case 'anyCraps': case 'p2': case 'p3': case 'p11': case 'p12': break;
    case 'small': case 'tall': case 'all': { const prog = (p.bh && p.bh[key]) || []; if (cur > 0 && prog.length) return up ? 'This Bonus bet already has numbers lit: add to it after it wins or a 7 rolls (or start it fresh then).' : 'Bonus bets stay up until they win or a 7 rolls once a number has hit.'; break; }
    default: {
      const m = /^(place|buy|hard)(\d+)$/.exec(key); if (!m) return 'That isn\'t a bet here.';
      const num = +m[2];
      if ((m[1] === 'place' || m[1] === 'buy') && !isNum(room, num)) return 'That isn\'t a number here.';
      if (m[1] === 'hard' && !HARD[num]) return 'That isn\'t a hardway.';
    }
  }
  if (amt - cur > p.balance + 1e-9) return 'Not enough chips for that.';
  return null;
}
function setBet(room, p, key, amt, n) {
  if (key === 'comeOdds' || key === 'dcOdds') { const c = (key === 'comeOdds' ? p.comes : p.dcs).find(x => x.n === n); p.balance = cents(p.balance - (amt - c.odds)); c.odds = amt; return; }
  const cur = p.bets[key] || 0; p.balance = cents(p.balance - (amt - cur));
  if (amt) p.bets[key] = amt; else delete p.bets[key];
  if (key in BONUS) { p.bh = p.bh || {}; if (amt && !cur) p.bh[key] = []; if (!amt) delete p.bh[key]; }
}

/* ---------------- the roll ---------------- */
function resolve(room, p, d1, d2) {
  const s = d1 + d2, b = p.bets, pt = room.point, crapless = room.variant === 'crapless', hard = d1 === d2, comeOut = pt === null;
  let won = 0, lost = 0; const lines = [], hits = [];
  const win = (label, amount, key) => { won += amount; lines.push(`${label} +${money(amount)}`); if (key) hits.push(key); };
  const lose = (label, amount, key) => { lost += amount; lines.push(`${label} −${money(amount)}`); if (key) hits.push('x' + key); };
  // one-roll bets: field and the proposition bets
  if (b.field) { if (FIELD[s]) { const w = b.field * FIELD[s]; p.balance += w; win(`Field ${s}${FIELD[s] > 1 ? ` (${FIELD[s]}×)` : ''}`, w, 'field'); } else { lose('Field', b.field, 'field'); delete b.field; } }
  for (const k in PROPS) if (b[k]) {
    const ok = k === 'any7' ? s === 7 : k === 'anyCraps' ? [2, 3, 12].includes(s) : s === +k.slice(1);
    if (ok) { const w = b[k] * PROPS[k][1]; p.balance += w + b[k]; win(PROPS[k][0], w, k); } else lose(PROPS[k][0], b[k], k);
    delete b[k];
  }
  // hardways: off on the come-out roll
  if (!comeOut) for (const n of [4, 6, 8, 10]) { const k = 'hard' + n; if (!b[k]) continue;
    if (s === n && hard) { const w = b[k] * HARD[n]; p.balance += w; win(`Hard ${n}`, w, k); }
    else if (s === 7 || s === n) { lose(`Hard ${n}`, b[k], k); delete b[k]; } }
  // place bets: off on the come-out roll; they stay up when they win
  if (!comeOut) for (const n of VARIANTS[room.variant].numbers) { const k = 'place' + n; if (!b[k]) continue;
    if (s === n) { const w = pay(b[k], PLACE[n]); p.balance += w; win(`Place ${n}`, w, k); }
    else if (s === 7) { lose(`Place ${n}`, b[k], k); delete b[k]; } }
  // buy bets: true odds and NO commission; off on the come-out roll, they stay up when they win
  if (!comeOut) for (const n of VARIANTS[room.variant].numbers) { const k = 'buy' + n; if (!b[k]) continue;
    if (s === n) { const w = pay(b[k], TRUE[n]); p.balance += w; win(`Buy ${n} (no commission)`, w, k); }
    else if (s === 7) { lose(`Buy ${n}`, b[k], k); delete b[k]; } }
  // come bets already on a number (their odds are off on the come-out roll)
  for (const c of p.comes.slice()) {
    if (s === c.n) { const w = c.amt + (comeOut ? 0 : pay(c.odds, TRUE[c.n])); p.balance += c.amt * 2 + c.odds + (comeOut ? 0 : pay(c.odds, TRUE[c.n])); win(`Come ${c.n}`, w, 'come' + c.n); p.comes.splice(p.comes.indexOf(c), 1); }
    else if (s === 7) { if (comeOut) { p.balance += c.odds; lose(`Come ${c.n}${c.odds ? ' (odds returned)' : ''}`, c.amt, 'come' + c.n); } else lose(`Come ${c.n}`, c.amt + c.odds, 'come' + c.n); p.comes.splice(p.comes.indexOf(c), 1); }
  }
  for (const c of p.dcs.slice()) {
    if (s === 7) { const w = c.amt + (c.odds ? cents(c.odds * TRUE[c.n][1] / TRUE[c.n][0]) : 0); p.balance += c.amt + c.odds + w; win(`Don't Come ${c.n}`, w, 'dc' + c.n); p.dcs.splice(p.dcs.indexOf(c), 1); }
    else if (s === c.n) { lose(`Don't Come ${c.n}`, c.amt + c.odds, 'dc' + c.n); p.dcs.splice(p.dcs.indexOf(c), 1); }
  }
  // come and don't come bets in the come box: this roll is their come-out
  if (b.come) {
    if (s === 7 || (!crapless && s === 11)) { p.balance += b.come * 2; win(`Come (${s})`, b.come, 'comebox'); }
    else if (!crapless && [2, 3, 12].includes(s)) lose(`Come (${s})`, b.come, 'comebox');
    else p.comes.push({ n: s, amt: b.come, odds: 0 });
    delete b.come;
  }
  if (b.dc) {
    if (s === 2 || s === 3) { p.balance += b.dc * 2; win(`Don't Come (${s})`, b.dc, 'dcbox'); }
    else if (s === 12) { p.balance += b.dc; lines.push('Don\'t Come pushes on 12'); }
    else if (s === 7 || s === 11) lose(`Don't Come (${s})`, b.dc, 'dcbox');
    else p.dcs.push({ n: s, amt: b.dc, odds: 0 });
    delete b.dc;
  }
  // the line
  if (comeOut) {
    if (b.pass) { if (s === 7 || (!crapless && s === 11)) { p.balance += b.pass; win(`Pass Line (${s})`, b.pass, 'pass'); } else if (!crapless && [2, 3, 12].includes(s)) { lose(`Pass Line (${s})`, b.pass, 'pass'); delete b.pass; } }
    if (b.dp) { if (s === 2 || s === 3) { p.balance += b.dp; win(`Don't Pass (${s})`, b.dp, 'dp'); } else if (s === 12) lines.push('Don\'t Pass pushes on 12'); else if (s === 7 || s === 11) { lose(`Don't Pass (${s})`, b.dp, 'dp'); delete b.dp; } }
  } else {
    if (s === pt) {
      if (b.pass) { const w = b.pass + pay(b.passOdds || 0, TRUE[pt]); p.balance += w + (b.passOdds || 0); win(`Pass Line, point ${pt}${b.passOdds ? ' with odds' : ''}`, w, 'pass'); delete b.passOdds; }
      if (b.dp) { lose(`Don't Pass`, b.dp + (b.dpOdds || 0), 'dp'); delete b.dp; delete b.dpOdds; }
    } else if (s === 7) {
      if (b.pass) { lose('Pass Line', b.pass + (b.passOdds || 0), 'pass'); delete b.pass; delete b.passOdds; }
      if (b.dp) { const w = b.dp + (b.dpOdds ? cents(b.dpOdds * TRUE[pt][1] / TRUE[pt][0]) : 0); p.balance += w + (b.dpOdds || 0); win(`Don't Pass${b.dpOdds ? ' with odds' : ''}`, w, 'dp'); delete b.dpOdds; }
    }
  }
  // the Bonus: every number in the set before a 7
  p.bh = p.bh || {};
  if (s === 7) { for (const k in BONUS) if (b[k]) { lose(BONUS[k][0], b[k], k); delete b[k]; } p.bh = {}; }
  else for (const k in BONUS) if (b[k]) { const hit = new Set([...(p.bh[k] || []), s].filter(n => BONUS[k][2].includes(n))); p.bh[k] = [...hit].sort((x, y) => x - y);
    if (BONUS[k][2].every(n => hit.has(n))) { const w = b[k] * BONUS[k][1]; p.balance += w + b[k]; win(BONUS[k][0], w, k); delete b[k]; delete p.bh[k]; } }
  p.balance = cents(p.balance);
  return { won: cents(won), lost: cents(lost), net: cents(won - lost), lines, hits };
}
function roll(room, shooter, set, auto) {
  if (room.rolling || room.shooter !== shooter.id) return;
  clearTimeout(room.timer); room.timerEnds = null;
  const d1 = 1 + Math.floor(Math.random() * 6), d2 = 1 + Math.floor(Math.random() * 6), s = d1 + d2;
  room.rolling = true;
  const sv = Array.isArray(set) ? set.slice(0, 2).map(v => Math.min(6, Math.max(1, v | 0))) : [1, 1];
  broadcast(room, { t: 'roll', dice: [d1, d2], set: sv, by: shooter.seat, name: shooter.name, auto: !!auto });
  pushState(room);
  setTimeout(() => {
    const pt = room.point, results = {};
    for (const p of room.players.values()) results[p.id] = resolve(room, p, d1, d2);
    // move the puck, and the dice
    let call, sevenOut = false;
    if (pt === null) {
      if (s === 7) call = 'Seven, winner on the come-out!';
      else if (room.variant === 'classic' && s === 11) call = 'Yo-leven, winner!';
      else if (room.variant === 'classic' && [2, 3, 12].includes(s)) call = `${s === 2 ? 'Aces' : s === 3 ? 'Ace-deuce' : 'Twelve'}, craps!`;
      else { room.point = s; call = `The point is ${s}.`; }
    } else if (s === pt) { room.point = null; call = `${s}, the point! Winner!`; }
    else if (s === 7) { room.point = null; sevenOut = true; call = 'Seven out.'; }
    else call = `${s}${d1 === d2 && [4, 6, 8, 10].includes(s) ? ', hard' : [4, 6, 8, 10].includes(s) ? ', easy' : ''}.`;
    if (s === 7) { room.bonusHits = new Set(); room.bonusOpen = true; } else { room.bonusHits.add(s); room.bonusOpen = false; }
    room.history.push({ d: [d1, d2], s, p: room.point });
    const prev = room.shooter;
    if (sevenOut) nextShooter(room, prev);
    room.rolling = false;
    broadcast(room, { t: 'result', dice: [d1, d2], sum: s, call, sevenOut, newShooter: sevenOut && room.shooter !== prev ? room.shooter : null, results });
    pushState(room); armTimer(room);
  }, +env.CRAPS_ROLL_MS || 1700);
}

/* ---------------- messages from players ---------------- */
function seatFor(room) { const used = new Set([...room.players.values()].map(p => p.seat)); for (const s of [2, 1, 3, 0, 4]) if (!used.has(s)) return s; return -1; }
function addPlayer(room, ws, msg) {
  const seat = seatFor(room); if (seat < 0) return send(ws, { t: 'error', msg: 'That table is full (5 players).' });
  const bank = Number(msg.bankroll);
  const p = { id: 'p' + (nextId++) + Math.random().toString(36).slice(2, 10), name: String(msg.name || 'Player').slice(0, 14) || 'Player', seat,
    balance: Number.isFinite(bank) && bank >= 0 ? Math.min(1e15, cents(bank)) : 1000, bets: {}, comes: [], dcs: [], ws };
  room.players.set(p.id, p); ws.player = p; ws.room = room;
  if (!room.shooter) { room.shooter = p.id; armTimer(room); }
  send(ws, { t: 'welcome', you: p.id, code: room.code, seat, solo: room.solo, variant: room.variant, tier: room.tier });
  if (!room.solo) broadcast(room, { t: 'chat', text: `${p.name} sat down in seat ${seat + 1}.` });
  pushState(room);
}
function handle(ws, msg) {
  if (!msg || typeof msg !== 'object') return;
  const me = ws.player, room = ws.room;
  switch (msg.t) {
    case 'create': {
      if (me) return;
      const variant = msg.variant === 'crapless' ? 'crapless' : 'classic';
      const code = msg.solo ? 'SOLO' + (nextId++) : code4();
      const r = { code, solo: !!msg.solo, variant, tier: TIERS[msg.tier] ? msg.tier : 'lounge', players: new Map(), point: null, shooter: null, rolling: false, bonusOpen: true, bonusHits: new Set(), history: [] };
      rooms.set(code, r); addPlayer(r, ws, msg); return;
    }
    case 'join': {
      if (me) return;
      const r = rooms.get(String(msg.code || '').toUpperCase());
      if (!r || r.solo) return send(ws, { t: 'error', msg: 'No table with that code.' });
      const back = msg.id && r.players.get(String(msg.id).slice(0, 40));
      if (back) { clearTimeout(back.awayTimer); back.away = false; back.ws = ws; ws.player = back; ws.room = r;
        if (!r.shooter) { r.shooter = back.id; armTimer(r); }
        send(ws, { t: 'welcome', you: back.id, code: r.code, seat: back.seat, back: true, variant: r.variant, tier: r.tier }); pushState(r); return; }
      return addPlayer(r, ws, msg);
    }
  }
  if (!me || !room) return;
  switch (msg.t) {
    case 'bet': {
      if (room.rolling) return send(ws, { t: 'error', msg: 'The dice are rolling: wait for them to land.' });
      const key = String(msg.key), n = +msg.n, amt = cents(+msg.amount);
      const why = check(room, me, key, amt, n);
      if (why) { send(ws, { t: 'error', msg: why }); return pushState(room); }
      setBet(room, me, key, amt, n); return pushState(room);
    }
    case 'roll': return roll(room, me, msg.set);
    case 'tier': {   // solo: move to another table's limits when nothing's riding
      if (!room.solo) return;
      const t = TIERS[msg.tier] ? msg.tier : 'lounge';
      if (t !== room.tier) {
        if (room.point !== null && onTable(me) > 0) return send(ws, { t: 'error', msg: 'Finish the point first: your bets are working.' });
        for (const k of Object.keys(me.bets)) { me.balance = cents(me.balance + me.bets[k]); delete me.bets[k]; }
        for (const c of [...me.comes, ...me.dcs]) me.balance = cents(me.balance + c.amt + c.odds);
        me.comes = []; me.dcs = [];
        room.tier = t; room.point = null; room.bonusHits = new Set(); room.bonusOpen = true;
      }
      return pushState(room);
    }
    case 'variant': {   // solo: switch between classic and crapless when nothing's riding
      if (!room.solo) return;
      const v = msg.variant === 'crapless' ? 'crapless' : 'classic';
      if (v !== room.variant) {
        if (room.point !== null && onTable(me) > 0) return send(ws, { t: 'error', msg: 'Finish the point first: your bets are working.' });
        // nothing is at risk between rolls, so everything comes back to you and you move tables
        for (const k of Object.keys(me.bets)) { me.balance = cents(me.balance + me.bets[k]); delete me.bets[k]; }
        for (const c of [...me.comes, ...me.dcs]) me.balance = cents(me.balance + c.amt + c.odds);
        me.comes = []; me.dcs = [];
        room.variant = v; room.point = null; room.history = []; room.bonusHits = new Set(); room.bonusOpen = true;
      }
      return pushState(room);
    }
    case 'clear': {   // take down everything that's allowed to come down
      if (room.rolling) return;
      for (const k of Object.keys(me.bets)) { if (k === 'pass' && room.point !== null) continue; if (k === 'come') { /* not rolled yet: fine */ }
        if (['small', 'tall', 'all'].includes(k) && ((me.bh && me.bh[k]) || []).length) continue;
        me.balance = cents(me.balance + me.bets[k]); delete me.bets[k]; }
      for (const c of me.comes) { me.balance = cents(me.balance + c.odds); c.odds = 0; }
      for (const c of me.dcs) { me.balance = cents(me.balance + c.odds); c.odds = 0; }
      return pushState(room);
    }
    case 'pass': {   // hand the dice on
      if (room.shooter !== me.id || room.rolling || room.solo) return;
      const to = typeof msg.to === 'string' ? room.players.get(msg.to) : null;   // hand them to someone you pick, or to the next player in line
      if (to && to.id !== me.id && !to.away) room.shooter = to.id; else nextShooter(room, me.id);
      const nx = room.players.get(room.shooter);
      broadcast(room, { t: 'chat', text: `${me.name} passes the dice${nx && nx.id !== me.id ? ` to ${nx.name}` : ''}.` }); pushState(room); armTimer(room); return;
    }
    case 'rebuy': {
      if (onTable(me) > 0) return send(ws, { t: 'error', msg: 'Take your bets down first.' });
      const a = Math.floor(+msg.amount); if (a >= 100 && a <= 1e15) me.balance = a; return pushState(room);
    }
    case 'leave': return leave(ws);
  }
}
function leave(ws) {
  const me = ws.player, room = ws.room; if (!me || !room) return;
  ws.player = null; ws.room = null; remove(room, me);
}
// a dropped connection keeps the seat (and the bets) for a minute; the dice move on
function drop(ws) {
  const me = ws.player, room = ws.room; if (!me || !room) return;
  ws.player = null; ws.room = null;
  if (room.solo) return remove(room, me);
  me.away = true; me.ws = null; clearTimeout(me.awayTimer);
  me.awayTimer = setTimeout(() => remove(room, me), +env.CRAPS_AWAY_MS || 60000);
  if (room.shooter === me.id) { nextShooter(room, me.id); if (room.shooter === me.id) room.shooter = null; armTimer(room); }
  pushState(room);
}
function remove(room, me) {
  clearTimeout(me.awayTimer);
  if (room.players.get(me.id) !== me) return;
  if (room.shooter === me.id) nextShooter(room, me.id);
  room.players.delete(me.id);
  if (room.shooter === me.id) room.shooter = null;
  if (!room.players.size) { clearTimeout(room.timer); rooms.delete(room.code); return; }
  if (!room.shooter) nextShooter(room, null);
  broadcast(room, { t: 'chat', text: `${me.name} left the table.` });
  pushState(room); armTimer(room);
}

return { handle, leave, drop, rooms, LIMITS, TIERS, VARIANTS, PLACE, TRUE, ODDS_MAX, LAY_MAX, HARD, PROPS, FIELD, BONUS, resolve, check, onTable, cents };
});
