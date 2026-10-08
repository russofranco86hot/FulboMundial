import { Client } from "pg";

const OLD_DB_URL = "postgresql://neondb_owner:npg_IL7Ri0vPnzuK@ep-polished-firefly-atn9prt2.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";
const NEW_DB_URL = "postgresql://neondb_owner:npg_LmUb1FKNED5n@ep-late-smoke-ayw1pjcr.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";

async function main() {
  console.log("Connecting to databases...");
  const oldClient = new Client({ connectionString: OLD_DB_URL });
  const newClient = new Client({ connectionString: NEW_DB_URL });

  await oldClient.connect();
  await newClient.connect();

  console.log("Starting migration...");

  try {
    // 1. Migrate Players
    console.log("Migrating players...");
    const playersRes = await oldClient.query("SELECT * FROM players ORDER BY id ASC");
    for (const p of playersRes.rows) {
      await newClient.query(
        `INSERT INTO players (id, name, priority_order, is_historico, is_guest, is_goalkeeper, stars, adj_won, adj_drawn, adj_lost, google_id, email, phone, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, null, $13)`,
        [p.id, p.name, p.priority_order, p.is_historico, p.is_guest, p.is_goalkeeper, p.stars, p.adj_won, p.adj_drawn, p.adj_lost, p.google_id, p.email, p.created_at]
      );
    }
    await newClient.query("SELECT setval('players_id_seq', (SELECT MAX(id) FROM players))");

    // 2. Migrate Matches
    console.log("Migrating matches...");
    const matchesRes = await oldClient.query("SELECT * FROM matches ORDER BY id ASC");
    for (const m of matchesRes.rows) {
      await newClient.query(
        `INSERT INTO matches (id, match_date, signup_opens_at, signup_closes_at, status, capacity, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [m.id, m.match_date, m.signup_opens_at, m.signup_closes_at, m.status, m.capacity, m.created_at]
      );
    }
    await newClient.query("SELECT setval('matches_id_seq', (SELECT COALESCE(MAX(id), 1) FROM matches))");

    // 3. Migrate Signups
    console.log("Migrating signups...");
    const signupsRes = await oldClient.query("SELECT * FROM signups ORDER BY id ASC");
    for (const s of signupsRes.rows) {
      await newClient.query(
        `INSERT INTO signups (id, match_id, player_id, signup_at, withdrawn, withdrawn_at, final_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [s.id, s.match_id, s.player_id, s.signup_at, s.withdrawn, s.withdrawn_at, s.final_status]
      );
    }
    await newClient.query("SELECT setval('signups_id_seq', (SELECT COALESCE(MAX(id), 1) FROM signups))");

    // 4. Migrate Teams
    console.log("Migrating teams...");
    const teamsRes = await oldClient.query("SELECT * FROM teams ORDER BY id ASC");
    for (const t of teamsRes.rows) {
      await newClient.query(
        `INSERT INTO teams (id, match_id, team, player_id, guest_name, is_guest)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [t.id, t.match_id, t.team, t.player_id, t.guest_name, t.is_guest]
      );
    }
    await newClient.query("SELECT setval('teams_id_seq', (SELECT COALESCE(MAX(id), 1) FROM teams))");

    // 5. Migrate Results
    console.log("Migrating results...");
    const resultsRes = await oldClient.query("SELECT * FROM results ORDER BY id ASC");
    for (const r of resultsRes.rows) {
      await newClient.query(
        `INSERT INTO results (id, match_id, score_a, score_b, result, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [r.id, r.match_id, r.score_a, r.score_b, r.result, r.notes, r.created_at]
      );
    }
    await newClient.query("SELECT setval('results_id_seq', (SELECT COALESCE(MAX(id), 1) FROM results))");

    // 6. Migrate Attendance Log
    console.log("Migrating attendance log...");
    const attRes = await oldClient.query("SELECT * FROM attendance_log ORDER BY id ASC");
    for (const a of attRes.rows) {
      await newClient.query(
        `INSERT INTO attendance_log (id, player_id, match_id, attended)
         VALUES ($1, $2, $3, $4)`,
        [a.id, a.player_id, a.match_id, a.attended]
      );
    }
    await newClient.query("SELECT setval('attendance_log_id_seq', (SELECT COALESCE(MAX(id), 1) FROM attendance_log))");

    // 7. Migrate Push Subscriptions
    console.log("Migrating push subscriptions...");
    const pushRes = await oldClient.query("SELECT * FROM push_subscriptions ORDER BY id ASC");
    for (const p of pushRes.rows) {
      await newClient.query(
        `INSERT INTO push_subscriptions (id, player_id, endpoint, keys, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [p.id, p.player_id, p.endpoint, p.keys, p.created_at]
      );
    }
    await newClient.query("SELECT setval('push_subscriptions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM push_subscriptions))");

    console.log("Migration completed successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await oldClient.end();
    await newClient.end();
  }
}

main();
