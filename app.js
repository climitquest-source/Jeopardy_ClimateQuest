// Climate Quest — Jeopardy
// Static host tool: one screen + keyboard/on-screen buzzers. No backend.

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const screens = {
  setup: $("#screen-setup"),
  board: $("#screen-board"),
  final: $("#screen-final"),
  end: $("#screen-end"),
};
const dialogs = {
  clue: $("#clueDialog"),
  dd: $("#ddDialog"),
  help: $("#helpDialog"),
};

// Elements
const packSelect = $("#packSelect");
const roundType = $("#roundType");
const enableFinal = $("#enableFinal");
const tInputs = [$("#t1"), $("#t2"), $("#t3"), $("#t4")];
const scorebar = $("#scorebar");
const boardEl = $("#board");
const btnStart = $("#btn-start");
const btnRestart = $("#btn-restart");
const btnRestart2 = $("#btn-restart-2");
const btnHome = $("#btn-home");
const btnToFinal = $("#btn-to-final");

const clueCategory = $("#clueCategory");
const clueValue = $("#clueValue");
const clueFlags = $("#clueFlags");
const clueText = $("#clueText");
const clueExplain = $("#clueExplain");
const buzzerStatus = $("#buzzerStatus");
const buzzerButtons = $$(".buzzer");
const btnOpenBuzzers = $("#btn-open-buzzers");
const btnLockBuzzers = $("#btn-lock-buzzers");
const btnCorrect = $("#btn-correct");
const btnWrong = $("#btn-wrong");
const btnPass = $("#btn-pass");
const btnCloseClue = $("#btn-close-clue");

const ddTeamName = $("#ddTeamName");
const ddWager = $("#ddWager");
const btnDdContinue = $("#btn-dd-continue");

const finalCategory = $("#finalCategory");
const finalWagers = $("#finalWagers");
const finalClue = $("#finalClue");
const btnRevealFinal = $("#btn-reveal-final");
const btnFinalCorrect = $("#btn-final-correct");
const btnFinalWrong = $("#btn-final-wrong");
const btnFinishGame = $("#btn-finish-game");

const resultsTable = $("#resultsTable");

$("#btn-help").addEventListener("click", ()=>dialogs.help.showModal());
$("#btn-close-help").addEventListener("click", ()=>dialogs.help.close());

btnStart.addEventListener("click", startGame);
btnRestart.addEventListener("click", ()=>location.reload());
btnRestart2.addEventListener("click", ()=>location.reload());
btnHome.addEventListener("click", ()=>location.reload());
btnToFinal.addEventListener("click", goToFinal);

btnOpenBuzzers.addEventListener("click", openBuzzers);
btnLockBuzzers.addEventListener("click", lockBuzzers);
btnCorrect.addEventListener("click", ()=>grade(true));
btnWrong.addEventListener("click", ()=>grade(false));
btnPass.addEventListener("click", passBuzz);
btnCloseClue.addEventListener("click", closeClue);

btnDdContinue.addEventListener("click", continueDailyDouble);
btnRevealFinal.addEventListener("click", revealFinal);
btnFinalCorrect.addEventListener("click", ()=>gradeFinal(true));
btnFinalWrong.addEventListener("click", ()=>gradeFinal(false));
btnFinishGame.addEventListener("click", finishGame);

buzzerButtons.forEach(b => b.addEventListener("click", () => onBuzz(parseInt(b.dataset.team,10))));

// Keyboard buzzers
const KEY_TO_TEAM = { 'a':0, 'l':1, 'w':2, 'p':3 };
window.addEventListener("keydown", (e) => {
  const k = (e.key || "").toLowerCase();
  if (state.buzzersOpen && KEY_TO_TEAM.hasOwnProperty(k)) {
    onBuzz(KEY_TO_TEAM[k]);
  }
});

let PACK = null;
const state = {
  round: "single",      // single|double
  values: [100,200,300,400,500],
  categories: [],       // [{title, clues:[{q,a,explain}, ...]}]
  board: [],            // 5x5 cell objects
  usedCount: 0,
  dailyDoubleCell: null,

  teams: [
    { name:"Team 1", score: 0, active:true },
    { name:"Team 2", score: 0, active:true },
    { name:"Team 3", score: 0, active:true },
    { name:"Team 4", score: 0, active:true },
  ],
  currentCell: null,    // {catIndex, rowIndex, value, clue}
  selectingTeam: 0,     // index of team choosing the next tile
  buzzersOpen: false,
  buzzingOrder: [],     // queue of team indices
  answeredTeams: new Set(),  // to prevent repeat on same clue

  // Final
  hasFinal: true,
  final: null,          // {category, clue, answer, explain}
  finalWagers: {},      // teamIndex -> wager
  finalIndex: 0,        // whose final is being graded
};

async function startGame() {
  const packUrl = packSelect.value;
  const resp = await fetch(packUrl);
  PACK = await resp.json();

  state.round = roundType.value;
  state.values = state.round === "double" ? [200,400,600,800,1000] : [100,200,300,400,500];
  state.hasFinal = $("#enableFinal").checked;

  // Teams
  tInputs.forEach((inp, i) => {
    const name = (inp.value || `Team ${i+1}`).trim();
    state.teams[i].name = name;
    state.teams[i].score = 0;
    state.teams[i].active = !!name;
  });

  // Build board (first 5 categories from pack)
  state.categories = PACK.categories.slice(0,5);
  state.board = [];
  for (let c=0; c<5; c++) {
    const cat = state.categories[c];
    for (let r=0; r<5; r++) {
      const clue = cat.clues[r];
      state.board.push({ catIndex:c, rowIndex:r, value: state.values[r], used:false, clue });
    }
  }
  // Daily Double
  state.dailyDoubleCell = Math.floor(Math.random()*state.board.length);

  // Final
  if (state.hasFinal) {
    state.final = PACK.final;
  }

  renderScores();
  renderBoard();
  show("board");
}

function renderScores() {
  scorebar.innerHTML = "";
  state.teams.forEach((t,i) => {
    if (!t.active) return;
    const div = document.createElement("div");
    div.className = "score";
    div.innerHTML = `<div class="name">${escapeHtml(t.name)}</div><div class="pts">$${t.score}</div>`;
    scorebar.appendChild(div);
  });
}

function renderBoard() {
  boardEl.innerHTML = "";
  // header row categories
  for (let c=0; c<5; c++) {
    const cat = state.categories[c];
    const el = document.createElement("div");
    el.className = "cat";
    el.textContent = cat.title;
    boardEl.appendChild(el);
  }
  // 5 rows of tiles
  for (let r=0; r<5; r++) {
    for (let c=0; c<5; c++) {
      const idx = c*5 + r;
      const cell = state.board[idx];
      const tile = document.createElement("button");
      tile.className = "tile" + (idx === state.dailyDoubleCell ? " daily" : "");
      tile.textContent = `$${cell.value}`;
      if (cell.used) tile.classList.add("used");
      tile.addEventListener("click", ()=>openClue(idx));
      boardEl.appendChild(tile);
    }
  }
  // Final button if finished
  const allUsed = state.board.every(c => c.used);
  btnToFinal.style.display = (allUsed && state.hasFinal) ? "inline-block" : "none";
}

function openClue(index) {
  const cell = state.board[index];
  if (cell.used) return;
  state.currentCell = { ...cell, index };
  state.buzzersOpen = false;
  state.buzzingOrder = [];
  state.answeredTeams = new Set();

  clueCategory.textContent = state.categories[cell.catIndex].title;
  clueValue.textContent = `$${cell.value}`;
  clueFlags.textContent = (index === state.dailyDoubleCell) ? "Daily Double" : "";
  clueText.textContent = cell.clue.q;
  clueExplain.textContent = ""; // hidden until close
  buzzerStatus.textContent = "Buzzers locked";

  // Daily Double flow
  if (index === state.dailyDoubleCell) {
    // Selecting team is the one whose turn it is; by default, use last correct or 0
    ddTeamName.textContent = state.teams[state.selectingTeam].name;
    const maxWager = Math.max(Math.max(...state.values), Math.abs(state.teams[state.selectingTeam].score));
    ddWager.min = 0;
    ddWager.max = maxWager;
    ddWager.value = Math.min(300, maxWager);
    dialogs.dd.showModal();
  } else {
    dialogs.clue.showModal();
  }
}

function continueDailyDouble() {
  dialogs.dd.close();
  dialogs.clue.showModal();
  // For DD, only selectingTeam can buzz; so we immediately set buzz order to that team
  state.buzzersOpen = true;
  state.buzzingOrder = [state.selectingTeam];
  btnOpenBuzzers.disabled = true;
  btnLockBuzzers.disabled = false;
  btnCorrect.disabled = false;
  btnWrong.disabled = false;
  buzzerStatus.textContent = `${state.teams[state.selectingTeam].name} to answer (Daily Double)`;
}

function openBuzzers() {
  state.buzzersOpen = true;
  state.buzzingOrder = [];
  state.answeredTeams = new Set();
  btnOpenBuzzers.disabled = true;
  btnLockBuzzers.disabled = false;
  btnCorrect.disabled = true;
  btnWrong.disabled = true;
  buzzerStatus.textContent = "Buzzers open… (A, L, W, P)";
}

function lockBuzzers() {
  state.buzzersOpen = false;
  btnOpenBuzzers.disabled = false;
  btnLockBuzzers.disabled = true;
  const current = state.buzzingOrder[0];
  if (current != null) {
    buzzerStatus.textContent = `${state.teams[current].name} locked in`;
    btnCorrect.disabled = false;
    btnWrong.disabled = false;
  } else {
    buzzerStatus.textContent = "Buzzers locked";
  }
}

function onBuzz(teamIndex) {
  if (!state.buzzersOpen) return;
  if (!state.teams[teamIndex].active) return;
  if (state.answeredTeams.has(teamIndex)) return; // already wrong once for this clue
  if (!state.buzzingOrder.length) {
    state.buzzingOrder.push(teamIndex);
    lockBuzzers();
  }
}

function grade(isCorrect) {
  const team = state.buzzingOrder[0];
  if (team == null) return;
  const cell = state.currentCell;
  const value = (cell.index === state.dailyDoubleCell) ? Number(ddWager.value||0) : cell.value;
  if (isCorrect) {
    state.teams[team].score += value;
    state.selectingTeam = team; // gets next pick
    finishClue(true);
  } else {
    state.teams[team].score -= value;
    state.answeredTeams.add(team);
    // allow another team to buzz
    state.buzzersOpen = true;
    btnCorrect.disabled = true;
    btnWrong.disabled = true;
    buzzerStatus.textContent = "Wrong. Others may buzz…";
  }
  renderScores();
}

function passBuzz() {
  // Close without scoring; mark used
  finishClue(false);
}

function finishClue(showExplain) {
  // mark cell used
  const idx = state.currentCell.index;
  state.board[idx].used = true;
  state.usedCount += 1;
  if (showExplain && state.currentCell.clue.explain) {
    clueExplain.textContent = "Explain: " + state.currentCell.clue.explain;
  }
  setTimeout(()=>{
    dialogs.clue.close();
    renderBoard();
  }, showExplain ? 900 : 200);
}

function closeClue() {
  dialogs.clue.close();
}

function goToFinal() {
  // Build wagers UI
  finalCategory.textContent = state.final.category || "Final";
  finalWagers.innerHTML = "";
  state.finalWagers = {};
  state.teams.forEach((t,i)=>{
    if (!t.active) return;
    const maxWager = Math.max(Math.abs(t.score), Math.max(...state.values));
    const row = document.createElement("div");
    row.className = "score";
    row.innerHTML = `
      <div class="name">${escapeHtml(t.name)} — $${t.score}</div>
      <div style="margin-top:6px">
        Wager: <input type="number" id="w${i}" min="0" max="${maxWager}" value="${Math.min(300,maxWager)}" style="width:120px" />
      </div>`;
    finalWagers.appendChild(row);
    state.finalWagers[i] = 0;
  });
  finalClue.style.display = "none";
  btnFinalCorrect.disabled = true;
  btnFinalWrong.disabled = true;
  show("final");
}

function revealFinal() {
  // Save wagers and show clue
  Object.keys(state.finalWagers).forEach(k => {
    const i = Number(k);
    const inp = document.getElementById("w"+i);
    if (inp) state.finalWagers[i] = Math.max(0, Math.min(Number(inp.max), Number(inp.value||0)));
  });
  finalClue.textContent = `${state.final.clue}\n\n(Answer: ${state.final.answer})`;
  finalClue.style.display = "block";
  // Start grading per team
  state.finalIndex = firstActiveTeam();
  if (state.finalIndex == null) return;
  btnFinalCorrect.disabled = false;
  btnFinalWrong.disabled = false;
  toast(`Grading: ${state.teams[state.finalIndex].name}`);
}

function gradeFinal(isCorrect) {
  const i = state.finalIndex;
  const w = state.finalWagers[i] || 0;
  if (isCorrect) state.teams[i].score += w; else state.teams[i].score -= w;
  renderScores();

  // Next active team
  const next = nextActiveTeam(i);
  if (next == null) {
    toast("Final grading complete.");
    btnFinalCorrect.disabled = true;
    btnFinalWrong.disabled = true;
  } else {
    state.finalIndex = next;
    toast(`Grading: ${state.teams[state.finalIndex].name}`);
  }
}

function finishGame() {
  // Sort results and show table
  const arr = state.teams.filter(t=>t.active).map((t,i)=>({i,...t})).sort((a,b)=>b.score-a.score);
  const rows = arr.map((t,idx)=>`<tr><td>${idx+1}</td><td>${escapeHtml(t.name)}</td><td>$${t.score}</td></tr>`).join("");
  resultsTable.innerHTML = `<table><thead><tr><th>#</th><th>Team</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>`;
  show("end");
}

// Helpers
function show(name) {
  Object.values(screens).forEach(s=>s.classList.remove("active"));
  screens[name].classList.add("active");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function firstActiveTeam() {
  for (let i=0;i<state.teams.length;i++) if (state.teams[i].active) return i;
  return null;
}
function nextActiveTeam(cur) {
  for (let i=cur+1;i<state.teams.length;i++) if (state.teams[i].active) return i;
  return null;
}
function toast(msg) {
  // minimal inline toast
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.position = "fixed"; el.style.bottom = "16px"; el.style.right = "16px";
  el.style.background = "#0ea5e9"; el.style.color = "#000";
  el.style.padding = "8px 12px"; el.style.borderRadius = "10px";
  el.style.boxShadow = "0 2px 8px rgba(0,0,0,.3)"; el.style.zIndex = "9999";
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 1600);
}
