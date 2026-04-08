import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static assets from the frontend build
app.use(express.static(path.join(__dirname, '../dist')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auto-migrate: Add 'details' column to payments if missing
(async () => {
  try {
    // Payments
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS details JSON`);
    
    // Sessions: Add members_snapshot
    await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS members_snapshot LONGTEXT`);

    console.log('✅ DB migration: members_snapshot and payments.details ensured');
  } catch (e) {
    // MySQL < 8.0 doesn't support IF NOT EXISTS on ALTER TABLE
    try {
      await pool.query(`ALTER TABLE payments ADD COLUMN details LONGTEXT NULL`);
      await pool.query(`ALTER TABLE sessions ADD COLUMN members_snapshot LONGTEXT NULL`);
      console.log('✅ DB migration: columns added');
    } catch (e2) {
      // Column already exists - that's fine
      console.log('ℹ️  columns already exist');
    }
  }
})();

// PULL MASTER DATA
app.get('/api/master', async (req, res) => {
  try {
    const [membersRows] = await pool.query('SELECT * FROM members');
    const [settingsRows] = await pool.query('SELECT * FROM settings WHERE id = 1');

    // Format for React App
    const rankMemory = {};
    const membersList = membersRows.map(r => {
      rankMemory[r.name] = r.rank_tier;
      return {
        id: r.id,
        name: r.name,
        rank: r.rank_tier,
        gamesPlayed: 0,
        status: r.is_active ? 'waiting' : 'resting',
        checkInTime: Date.now(),
        balance: 0, courtBalance: 0, shuttleBalance: 0, snackBalance: 0, shuttleCount: 0, snackHistory: [], paidCourtFee: false
      };
    });

    res.json({
      members: membersList,
      rankMemory,
      settings: settingsRows.length > 0 ? {
        courtFeePerPerson: Number(settingsRows[0].court_fee_per_person),
        shuttlePrice: Number(settingsRows[0].shuttle_price)
      } : {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUSH MASTER DATA
app.post('/api/master', async (req, res) => {
  const { members, settings } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Update settings
    if (settings) {
      await conn.query(
        'UPDATE settings SET court_fee_per_person = ?, shuttle_price = ? WHERE id = 1',
        [settings.courtFeePerPerson, settings.shuttlePrice]
      );
    }

    // Update members
    if (members && members.length > 0) {
      for (const m of members) {
        await conn.query(
          'INSERT INTO members (id, name, rank_tier, is_active) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), rank_tier = VALUES(rank_tier), is_active = VALUES(is_active)',
          [m.id, m.name, m.rank, m.status !== 'resting']
        );
      }
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// PUSH SESSION DATA (End of Day Sync)
app.post('/api/sync', async (req, res) => {
  const { timestamp, members, games, payments } = req.body;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const sessionId = `session-${timestamp}`;
    const dateInt = new Date(timestamp).getTime();
    const membersSnapshot = JSON.stringify(members);

    // Insert Session
    await conn.query('INSERT INTO sessions (id, date, status, members_snapshot) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE members_snapshot = VALUES(members_snapshot)', [sessionId, dateInt, 'completed', membersSnapshot]);

    // Insert Games
    for (const g of (games || [])) {
      const gId = g.id || `game-${Date.now()}-${Math.random()}`;
      await conn.query(
        'INSERT IGNORE INTO games (id, session_id, court_id, court_name, played_at, shuttles_used, shuttle_cost, court_fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [gId, sessionId, g.courtId, g.courtName, g.playedAt, g.shuttlesUsed, g.shuttleCostPerPerson, g.courtFeePerPerson]
      );

      // Delete old players for this game first (safe re-insert)
      await conn.query('DELETE FROM game_players WHERE game_id = ?', [gId]);
      for (const p of (g.players || [])) {
        await conn.query(
          'INSERT INTO game_players (game_id, member_id, member_name, member_rank) VALUES (?, ?, ?, ?)',
          [gId, p.id, p.name, p.rank]
        );
      }
    }

    // Insert Payments
    for (const p of (payments || [])) {
      const pId = p.id || `payment-${Date.now()}-${Math.random()}`;
      const detailsStr = p.details ? JSON.stringify(p.details) : null;
      await conn.query(
        'INSERT IGNORE INTO payments (id, session_id, member_id, member_name, member_rank, amount, method, note, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [pId, sessionId, p.memberId, p.memberName, p.memberRank, p.amount, p.method, p.note || '', detailsStr, p.timestamp]
      );
    }

    await conn.commit();
    res.json({ success: true, sessionId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// PULL SESSION (Historical data)
app.get('/api/session', async (req, res) => {
  const { date } = req.query; // YYYY-MM-DD
  if (!date) return res.status(400).json({ error: 'Missing date parameter' });

  try {
    // Robust date parsing (YYYY-MM-DD or timestamp)
    let dateInt = Number(date);
    if (isNaN(dateInt)) dateInt = new Date(date).getTime();
    if (isNaN(dateInt)) return res.status(400).json({ error: 'Invalid date format' });

    const startOfDay = new Date(dateInt);
    startOfDay.setHours(0, 0, 0, 0);
    // Extend window to 36 hours (covering the full day + up to 12 PM next day)
    // to catch sessions that started late and were saved the next morning.
    const endWindow = new Date(startOfDay.getTime() + 36 * 60 * 60 * 1000);

    const [sessions] = await pool.query(
      'SELECT * FROM sessions WHERE date >= ? AND date <= ? ORDER BY date DESC LIMIT 1', 
      [startOfDay.getTime(), endWindow.getTime()]
    );

    if (sessions.length === 0) {
      return res.json({ date: startOfDay.getTime(), membersSnapshot: [], gameHistory: [], paymentHistory: [] });
    }

    const sessionId = sessions[0].id;
    const sessionDate = Number(sessions[0].date);
    const storedSnapshotJson = sessions[0].members_snapshot;

    // Get games
    const [games] = await pool.query('SELECT * FROM games WHERE session_id = ? ORDER BY played_at DESC', [sessionId]);
    const [players] = await pool.query('SELECT p.* FROM game_players p JOIN games g ON p.game_id = g.id WHERE g.session_id = ?', [sessionId]);

    const formattedGames = games.map(g => {
      const gPlayers = players.filter(p => p.game_id === g.id).map(p => ({
        id: p.member_id, name: p.member_name, rank: p.member_rank
      }));
      
      const shuttleCostPerPerson = Number(g.shuttle_cost);
      let shuttlesUsed = g.shuttles_used;
      
      // RECONSTRUCT SHUTTLES USED: If the cost per person implies more shuttles 
      // than recorded (common in legacy data), adjust shuttlesUsed for accurate summary.
      // Calculation: (CostPerPerson * NumPlayers) / PricePerShuttle
      const totalCostForGame = shuttleCostPerPerson * gPlayers.length;
      const impliedShuttles = Math.round(totalCostForGame / defaultShuttlePrice);
      if (impliedShuttles > shuttlesUsed) {
        shuttlesUsed = impliedShuttles;
      }

      return {
        id: g.id,
        courtId: g.court_id,
        courtName: g.court_name,
        playedAt: Number(g.played_at),
        shuttlesUsed: shuttlesUsed,
        shuttleCostPerPerson: shuttleCostPerPerson,
        courtFeePerPerson: Number(g.court_fee),
        players: gPlayers
      };
    });

    // Get payments
    const [payments] = await pool.query('SELECT * FROM payments WHERE session_id = ? ORDER BY created_at DESC', [sessionId]);
    const formattedPayments = payments.map(p => {
      let parsedDetails = undefined;
      if (p.details) {
        try { parsedDetails = JSON.parse(p.details); } catch (e) { }
      }
      return {
        id: p.id,
        memberId: p.member_id,
        memberName: p.member_name,
        memberRank: p.member_rank,
        amount: Number(p.amount),
        method: p.method,
        note: p.note,
        details: parsedDetails,
        timestamp: Number(p.created_at)
      };
    });

    // Try to use stored snapshot first for 100% data fidelity
    let snapshot = null;
    if (storedSnapshotJson) {
      try { 
        snapshot = JSON.parse(storedSnapshotJson); 
      } catch (e) {
        console.error('Error parsing stored members_snapshot:', e);
      }
    }

    // GET SETTINGS for default court fee and shuttle price (used in fallback)
    const [settings] = await pool.query('SELECT court_fee_per_person, shuttle_price FROM settings LIMIT 1');
    const defaultCourtFee = Number(settings[0]?.court_fee_per_person || 40);
    const defaultShuttlePrice = Number(settings[0]?.shuttle_price || 25);

    // Reconstruct simplified members snapshot from games & payments for historical view (Fallback)
    if (!snapshot || snapshot.length === 0) {
      const membersMap = new Map();
      
      // Process Games for individual costs
      formattedGames.forEach(g => {
        g.players.forEach(p => {
          if (!membersMap.has(p.id)) {
            membersMap.set(p.id, { 
              id: p.id, name: p.name, rank: p.rank, gamesPlayed: 0, status: 'paid', 
              balance: 0, courtBalance: 0, shuttleBalance: 0, snackBalance: 0, 
              shuttleCount: 0, snackHistory: [], paidCourtFee: true, checkInTime: 0 
            });
          }
          const m = membersMap.get(p.id);
          m.gamesPlayed += 1;
          const gameFee = Number(g.courtFeePerPerson);
          m.courtBalance += gameFee;
          const sCost = Number(g.shuttleCostPerPerson);
          m.shuttleBalance += sCost;
          // Reconstruct shuttle quantity: based on the cost they paid / price per shuttle
          // If each shuttle is ฿25 and they paid ฿25, they used 1 shuttle effectively.
          m.shuttleCount += (sCost / defaultShuttlePrice);
        });
      });

      // 1. BACKFILL: If courtBalance is still 0 (e.g. because game.court_fee was 0), 
      // but they played games, apply a ONE-TIME default court fee.
      membersMap.forEach(m => {
        if ((m.courtBalance || 0) === 0 && m.gamesPlayed > 0) {
          m.courtBalance = defaultCourtFee;
        }
        // Round shuttle count for neatness
        m.shuttleCount = Math.round(m.shuttleCount * 10) / 10;
      });
      
      // Process Payments for snack history and actual amount paid
      const memberPaidTotal = new Map(); // Track how much they actually paid
      formattedPayments.forEach(p => {
        // 1. Add snack costs from payment details if they exists
        if (p.details && p.details.snackHistory) {
          p.details.snackHistory.forEach(s => {
            if (!membersMap.has(p.memberId)) { // Create member if only payment exists
              membersMap.set(p.memberId, { id: p.memberId, name: p.memberName, rank: p.memberRank, gamesPlayed: 0, status: 'paid', balance: 0, courtBalance: 0, shuttleBalance: 0, snackBalance: 0, shuttleCount: 0, snackHistory: [], paidCourtFee: true, checkInTime: 0 });
            }
            const m = membersMap.get(p.memberId);
            m.snackHistory.push(s);
            m.snackBalance += Number(s.price);
          });
        }

        // 2. Map included members (if any) to have their debt cleared in balance calc
        const includedIds = p.details?.includedMemberIds || [p.memberId];
        includedIds.forEach(id => {
          const currentPaid = memberPaidTotal.get(id) || 0;
          memberPaidTotal.set(id, currentPaid + (p.amount / includedIds.length)); 
        });
      });

      // Final balance calculation and status (incorporate payments & snacks)
      membersMap.forEach((m, id) => {
        const totalPaid = memberPaidTotal.get(id) || 0;
        // Total costs identified FROM GAMES
        const gameCosts = (m.courtBalance || 0) + (m.shuttleBalance || 0);
        
        // RECONSTRUCT SNACKS: If they paid more than their court+shuttle cost, 
        // and we have NO snack history, attribute the difference to snackBalance.
        // This handles cases where older sync data lost the snack detail objects.
        if (totalPaid > (gameCosts + (m.snackBalance || 0))) {
          const diff = totalPaid - (gameCosts + (m.snackBalance || 0));
          m.snackBalance = (m.snackBalance || 0) + diff;
          m.snackHistory.push({ 
            id: `re-snack-${Date.now()}-${id}`, 
            name: 'สินค้า/น้ำ (กู้คืนจากยอดจ่าย)', 
            price: diff, 
            time: sessionDate 
          });
        }

        const totalIncurred = gameCosts + (m.snackBalance || 0);
        m.balance = Math.max(0, totalIncurred - totalPaid);
        m.status = m.balance > 0 ? 'resting' : 'paid'; 
      });

      snapshot = Array.from(membersMap.values());
    }

    res.json({
      id: sessionId,
      date: sessionDate,
      membersSnapshot: snapshot,
      gameHistory: formattedGames,
      paymentHistory: formattedPayments
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET FULL LIVE STATE (Replaces initial localStorage read)
app.get('/api/state', async (req, res) => {
  try {
    const [states] = await pool.query('SELECT * FROM system_states');
    const result = {};
    states.forEach(row => {
      try {
        result[row.state_key] = JSON.parse(row.state_value);
      } catch (e) {
        result[row.state_key] = row.state_value;
      }
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// SAVE FULL LIVE STATE (Replaces localStorage.setItem)
app.post('/api/state', async (req, res) => {
  const stateObj = req.body;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    for (const [key, value] of Object.entries(stateObj)) {
      await conn.query(
        'INSERT INTO system_states (state_key, state_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE state_value = VALUES(state_value)',
        [key, JSON.stringify(value)]
      );
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 SmashIT Server running on port ${port}`);
});

// RE-SYNC: Recover all session data from system_states blob into proper tables
app.post('/api/resync', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await pool.query("SELECT state_value FROM system_states WHERE state_key = 'sessionHistory'");
    if (rows.length === 0) return res.status(404).json({ error: 'No sessionHistory found in system_states' });

    const sessionHistory = JSON.parse(rows[0].state_value);
    let synced = 0;

    await conn.beginTransaction();
    for (const session of sessionHistory) {
      const sessionId = session.id || `session-${session.date}`;
      const dateInt = Number(session.date);
      const membersSnapshot = session.membersSnapshot ? JSON.stringify(session.membersSnapshot) : null;

      await conn.query(
        'INSERT INTO sessions (id, date, status, members_snapshot) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), members_snapshot = VALUES(members_snapshot)', 
        [sessionId, dateInt, 'completed', membersSnapshot]
      );

      for (const g of (session.gameHistory || [])) {
        const gId = g.id || `game-${g.playedAt}`;
        await conn.query(
          'INSERT IGNORE INTO games (id, session_id, court_id, court_name, played_at, shuttles_used, shuttle_cost, court_fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [gId, sessionId, g.courtId, g.courtName, g.playedAt, g.shuttlesUsed, g.shuttleCostPerPerson, g.courtFeePerPerson]
        );
        await conn.query('DELETE FROM game_players WHERE game_id = ?', [gId]);
        for (const p of (g.players || [])) {
          await conn.query(
            'INSERT INTO game_players (game_id, member_id, member_name, member_rank) VALUES (?, ?, ?, ?)',
            [gId, p.id, p.name, p.rank]
          );
        }
      }

      for (const p of (session.paymentHistory || [])) {
        const pId = p.id || `pay-${p.timestamp}`;
        const detailsStr = p.details ? JSON.stringify(p.details) : null;
        await conn.query(
          'INSERT IGNORE INTO payments (id, session_id, member_id, member_name, member_rank, amount, method, note, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [pId, sessionId, p.memberId, p.memberName, p.memberRank, p.amount, p.method, p.note || '', detailsStr, p.timestamp]
        );
      }
      synced++;
    }

    await conn.commit();
    res.json({ success: true, sessionsSynced: synced });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Fallback for SPA routing: serve index.html for all other requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});
