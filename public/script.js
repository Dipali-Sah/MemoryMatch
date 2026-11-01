const EMOJIS = ["🐶", "🍕", "🚀", "🌙", "🎸", "🌵", "🦊", "🍩"];
const board = document.getElementById("board");
const movesEl = document.getElementById("moves");
const timeEl = document.getElementById("time");
const pairsEl = document.getElementById("pairs");
const scoresEl = document.getElementById("scores");
const win = document.getElementById("win");
const winText = document.getElementById("winText");
const winMsg = document.getElementById("winMsg");
const nameInput = document.getElementById("name");
const saveBtn = document.getElementById("save");

let first = null, locked = false;
let moves = 0, pairs = 0, seconds = 0, timer = null;

const pad = (n) => String(n).padStart(2, "0");
const fmt = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startGame() {
  clearInterval(timer);
  timer = null;
  first = null; locked = false;
  moves = 0; pairs = 0; seconds = 0;
  movesEl.textContent = 0;
  timeEl.textContent = "00:00";
  pairsEl.textContent = "0 / 8";
  saveBtn.disabled = false;
  winMsg.textContent = "";

  board.innerHTML = "";
  shuffle([...EMOJIS, ...EMOJIS]).forEach((emoji) => {
    const card = document.createElement("button");
    card.className = "card";
    card.dataset.emoji = emoji;
    card.setAttribute("aria-label", "Hidden card");
    card.innerHTML = `<div class="inner"><div class="face front"></div><div class="face back">${emoji}</div></div>`;
    card.addEventListener("click", () => flip(card));
    board.appendChild(card);
  });
}

function startTimer() {
  if (timer) return;
  timer = setInterval(() => {
    seconds++;
    timeEl.textContent = fmt(seconds);
  }, 1000);
}

function flip(card) {
  if (locked || card === first || card.classList.contains("matched")) return;
  startTimer();
  card.classList.add("flipped");

  if (!first) { first = card; return; }

  moves++;
  movesEl.textContent = moves;
  locked = true;

  if (first.dataset.emoji === card.dataset.emoji) {
    first.classList.add("matched");
    card.classList.add("matched");
    first = null; locked = false;
    pairs++;
    pairsEl.textContent = `${pairs} / 8`;
    if (pairs === 8) finish();
  } else {
    setTimeout(() => {
      first.classList.remove("flipped");
      card.classList.remove("flipped");
      first = null; locked = false;
    }, 900);
  }
}

function finish() {
  clearInterval(timer);
  timer = null;
  winText.textContent = `${moves} moves in ${fmt(seconds)}.`;
  setTimeout(() => win.showModal(), 500);
}

async function loadScores() {
  try {
    const res = await fetch("/api/scores");
    if (!res.ok) throw new Error();
    const rows = await res.json();
    if (!rows.length) {
      scoresEl.innerHTML = '<li class="empty">No scores yet. Be the first.</li>';
      return;
    }
    scoresEl.innerHTML = "";
    rows.forEach((r, i) => {
      const li = document.createElement("li");
      const who = document.createElement("span");
      who.textContent = `${i + 1}. ${r.player_name}`;
      const stat = document.createElement("small");
      stat.textContent = `${r.moves} moves, ${r.time_seconds}s`;
      li.append(who, stat);
      scoresEl.appendChild(li);
    });
  } catch {
    scoresEl.innerHTML = '<li class="empty">Couldn\'t load scores. Check that the server is running.</li>';
  }
}

document.getElementById("winForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  saveBtn.disabled = true;
  try {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput.value.trim(), moves, time: seconds }),
    });
    if (!res.ok) throw new Error();
    winMsg.textContent = "Score saved.";
    loadScores();
  } catch {
    winMsg.textContent = "Couldn't save your score. Try again.";
    saveBtn.disabled = false;
  }
});

document.getElementById("again").addEventListener("click", () => { win.close(); startGame(); });
document.getElementById("restart").addEventListener("click", startGame);

startGame();
loadScores();