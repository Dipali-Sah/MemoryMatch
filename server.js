require('dotenv').config();
const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
};

const DB_NAME = process.env.DB_NAME || "memorymatch";

let db;

async function initDb() {
  const conn = await mysql.createConnection(DB_CONFIG);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await conn.end();

  db = mysql.createPool({ ...DB_CONFIG, database: DB_NAME });
  await db.query(`
    CREATE TABLE IF NOT EXISTS scores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      player_name VARCHAR(50) NOT NULL,
      moves INT NOT NULL,
      time_seconds INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("Database ready");
}

app.post("/api/scores", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim().slice(0, 50);
    const moves = Number(req.body.moves);
    const time = Number(req.body.time);
    if (!name || !Number.isInteger(moves) || !Number.isInteger(time) || moves < 8 || time < 1) {
      return res.status(400).json({ error: "Invalid score" });
    }
    await db.query(
      "INSERT INTO scores (player_name, moves, time_seconds) VALUES (?, ?, ?)",
      [name, moves, time]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save score" });
  }
});

app.get("/api/scores", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT player_name, moves, time_seconds FROM scores ORDER BY moves ASC, time_seconds ASC LIMIT 10"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load scores" });
  }
});

initDb()
  .then(() => app.listen(3000, () => console.log("Server: http://localhost:3000")))
  .catch((err) => {
    console.error("MySQL connection failed. Please check the password and MySQL service.");
    console.error(err.message);
    process.exit(1);
  });