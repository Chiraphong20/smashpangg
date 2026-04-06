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

    // Insert Session
    await conn.query('INSERT IGNORE INTO sessions (id, date, status) VALUES (?, ?, ?)', [sessionId, dateInt, 'completed']);

    // Insert Games
    for (const g of (games || [])) {
      const gId = g.id || `game-${Date.now()}-${Math.random()}`;
      await conn.query(
        'INSERT IGNORE INTO games (id, session_id, court_id, court_name, played_at, shuttles_used, shuttle_cost, court_fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [gId, sessionId, g.courtId, g.courtName, g.playedAt, g.shuttlesUsed, g.shuttleCostPerPerson, g.courtFeePerPerson]
      );
      
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
      await conn.query(
        'INSERT IGNORE INTO payments (id, session_id, member_id, member_name, member_rank, amount, method, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [pId, sessionId, p.memberId, p.memberName, p.memberRank, p.amount, p.method, p.note || '', p.timestamp]
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
    const startOfDay = new Date(date);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23,59,59,999);

    const [sessions] = await pool.query('SELECT * FROM sessions WHERE date >= ? AND date <= ? LIMIT 1', [startOfDay.getTime(), endOfDay.getTime()]);
    
    if (sessions.length === 0) {
      return res.json({ date: startOfDay.getTime(), membersSnapshot: [], gameHistory: [], paymentHistory: [] });
    }

    const sessionId = sessions[0].id;
    const sessionDate = Number(sessions[0].date);

    // Get games
    const [games] = await pool.query('SELECT * FROM games WHERE session_id = ? ORDER BY played_at DESC', [sessionId]);
    const [players] = await pool.query('SELECT p.* FROM game_players p JOIN games g ON p.game_id = g.id WHERE g.session_id = ?', [sessionId]);
    
    const formattedGames = games.map(g => {
      const gPlayers = players.filter(p => p.game_id === g.id).map(p => ({
        id: p.member_id, name: p.member_name, rank: p.member_rank
      }));
      return {
        id: g.id,
        courtId: g.court_id,
        courtName: g.court_name,
        playedAt: Number(g.played_at),
        shuttlesUsed: g.shuttles_used,
        shuttleCostPerPerson: Number(g.shuttle_cost),
        courtFeePerPerson: Number(g.court_fee),
        players: gPlayers
      };
    });

    // Get payments
    const [payments] = await pool.query('SELECT * FROM payments WHERE session_id = ? ORDER BY created_at DESC', [sessionId]);
    const formattedPayments = payments.map(p => ({
      id: p.id,
      memberId: p.member_id,
      memberName: p.member_name,
      memberRank: p.member_rank,
      amount: Number(p.amount),
      method: p.method,
      note: p.note,
      timestamp: Number(p.created_at)
    }));

    // Reconstruct simplified members snapshot from games & payments for historical view
    const membersMap = new Map();
    // (In a fuller implementation, we might save the exact members array snapshot into a JSON column in sessions table)
    
    res.json({
      id: sessionId,
      date: sessionDate,
      membersSnapshot: [], // Since we don't save full snapshot in DB tables to keep it simple, we leave this empty or construct from payments
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

// Fallback for SPA routing: serve index.html for all other requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});
