// Jeopardy host logic (keyboard + phone buzzers)
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

const fbConfigEl = $("#fbConfig");
const fbStatus = $("#fbStatus");
const btnSaveFirebase = $("#btn-save-firebase");
const btnCreateRoom = $("#btn-create-room");
const btnCloseRoom = $("#btn-close-room");
const roomCodeEl = $("#roomCode");
const qrCanvas = $("#qrCanvas");
const connectedList = $("#connectedList");

$("#btn-help").addEventListener("click", ()=>dialogs.help.showModal());
$("#btn-close-help")?.addEventListener("click", ()=>dialogs.help.close());

btnStart.addEventListener("click", startGame);
btnRestart.addEventListener("click", ()=>location.reload());
btnRestart2?.addEventListener("click", ()=>location.reload());
btnHome?.addEventListener("click", ()=>location.reload());
btnToFinal.addEventListener("click", goToFinal);

btnOpenBuzzers.addEventListener("click", openBuzzers);
btnLockBuzzers.addEventListener("click", lockBuzzers);
btnCorrect.addEventListener("click", ()=>grade(true));
btnWrong.addEventListener("click", ()=>grade(false));
btnPass.addEventListener("click", passBuzz);
btnCloseClue.addEventListener("click", closeClue);

btnDdContinue.addEventListener("click", continueDailyDouble);

buzzerButtons.forEach(b => b.addEventListener("click", () => onBuzzLocal(parseInt(b.dataset.team,10))));

// Keyboard buzzers
const KEY_TO_TEAM = { 'a':0, 'l':1, 'w':2, 'p':3 };
window.addEventListener("keydown", (e) => {
  const k = (e.key || "").toLowerCase();
  if (state.buzzersOpen && KEY_TO_TEAM.hasOwnProperty(k)) {
    onBuzzLocal(KEY_TO_TEAM[k]);
  }
});

let PACK = null;
const state = {
  round: "single",
  values: [100,200,300,400,500],
  categories: [],
  board: [],
  dailyDoubleCell: null,
  teams: [
    { name:"Team 1", score: 0, active:true },
    { name:"Team 2", score: 0, active:true },
    { name:"Team 3", score: 0, active:true },
    { name:"Team 4", score: 0, active:true },
  ],
  currentCell: null,
  selectingTeam: 0,
  buzzersOpen: false,
  buzzingOrder: [],
  answeredTeams: new Set(),

  hasFinal: true,
  final: null,
  finalWagers: {},
  finalIndex: 0,

  // Phones
  fb: { app:null, db:null, room:null, code:null, pressesRef:null, openRef:null, playersRef:null },
};

async function startGame() {
  const packUrl = packSelect.value;
  const resp = await fetch(packUrl);
  PACK = await resp.json();

  state.round = roundType.value;
  state.values = state.round === "double" ? [200,400,600,800,1000] : [100,200,300,400,500];
  state.hasFinal = enableFinal.checked;

  // Teams
  tInputs.forEach((inp, i) => {
    const name = (inp.value || `Team ${i+1}`).trim();
    state.teams[i].name = name;
    state.teams[i].score = 0;
    state.teams[i].active = !!name;
  });

  // Build board
  state.categories = PACK.categories.slice(0,5);
  state.board = [];
  for (let c=0; c<5; c++) {
    const cat = state.categories[c];
    for (let r=0; r<5; r++) {
      const clue = cat.clues[r];
      state.board.push({ catIndex:c, rowIndex:r, value: state.values[r], used:false, clue });
    }
  }
  state.dailyDoubleCell = Math.floor(Math.random()*state.board.length);
  if (state.hasFinal) state.final = PACK.final;

  renderScores();
  renderBoard();
  show("board");
}

// Rendering
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
  for (let c=0; c<5; c++) {
    const cat = state.categories[c];
    const el = document.createElement("div");
    el.className = "cat";
    el.textContent = cat.title;
    boardEl.appendChild(el);
  }
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
  clueExplain.textContent = "";
  buzzerStatus.textContent = "Buzzers locked";

  if (index === state.dailyDoubleCell) {
    ddTeamName.textContent = state.teams[state.selectingTeam].name;
    const maxWager = Math.max(Math.max(...state.values), Math.abs(state.teams[state.selectingTeam].score));
    ddWager.min = 0; ddWager.max = maxWager; ddWager.value = Math.min(300, maxWager);
    dialogs.dd.showModal();
  } else {
    dialogs.clue.showModal();
  }
}

function continueDailyDouble() {
  dialogs.dd.close();
  dialogs.clue.showModal();
  state.buzzersOpen = true;
  state.buzzingOrder = [state.selectingTeam];
  btnOpenBuzzers.disabled = true;
  btnLockBuzzers.disabled = false;
  btnCorrect.disabled = false;
  btnWrong.disabled = false;
  buzzerStatus.textContent = `${state.teams[state.selectingTeam].name} to answer (Daily Double)`;
}

// Buzzing (local keyboard/buttons)
function onBuzzLocal(teamIndex) {
  if (!state.buzzersOpen) return;
  if (!state.teams[teamIndex].active) return;
  if (state.answeredTeams.has(teamIndex)) return;
  if (!state.buzzingOrder.length) {
    state.buzzingOrder.push(teamIndex);
    lockBuzzers();
  }
}

function openBuzzers() {
  state.buzzersOpen = true;
  state.buzzingOrder = [];
  state.answeredTeams = new Set();
  btnOpenBuzzers.disabled = true;
  btnLockBuzzers.disabled = false;
  btnCorrect.disabled = true;
  btnWrong.disabled = true;
  buzzerStatus.textContent = "Buzzers open… (A, L, W, P or phones)";

  // Notify phones
  if (state.fb.room) {
    state.fb.openRef.set(true);
    state.fb.pressesRef.remove(); // clear previous presses
  }
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
    if (state.fb.room) state.fb.openRef.set(false);
  }
}

// Grade
function grade(isCorrect) {
  const team = state.buzzingOrder[0];
  if (team == null) return;
  const cell = state.currentCell;
  const value = (cell.index === state.dailyDoubleCell) ? Number(ddWager.value||0) : cell.value;
  if (isCorrect) {
    state.teams[team].score += value;
    state.selectingTeam = team;
    finishClue(true);
  } else {
    state.teams[team].score -= value;
    state.answeredTeams.add(team);
    state.buzzersOpen = true;
    btnCorrect.disabled = true;
    btnWrong.disabled = true;
    buzzerStatus.textContent = "Wrong. Others may buzz…";
    if (state.fb.room) state.fb.openRef.set(true);
  }
  renderScores();
}

function passBuzz() { finishClue(false); }

function finishClue(showExplain) {
  const idx = state.currentCell.index;
  state.board[idx].used = true;
  if (showExplain && state.currentCell.clue.explain) {
    clueExplain.textContent = "Explain: " + state.currentCell.clue.explain;
  }
  if (state.fb.room) state.fb.openRef.set(false);
  setTimeout(()=>{ dialogs.clue.close(); renderBoard(); }, showExplain ? 900 : 200);
}

function closeClue() { dialogs.clue.close(); }

function goToFinal() {
  finalCategory.textContent = state.final.category || "Final";
  finalWagers.innerHTML = "";
  state.finalWagers = {};
  state.teams.forEach((t,i)=>{
    if (!t.active) return;
    const maxWager = Math.max(Math.abs(t.score), Math.max(...state.values));
    const row = document.createElement("div");
    row.className = "score";
    row.innerHTML = `<div class="name">${escapeHtml(t.name)} — $${t.score}</div>
      <div style="margin-top:6px">Wager: <input type="number" id="w${i}" min="0" max="${maxWager}" value="${Math.min(300,maxWager)}" style="width:120px" /></div>`;
    finalWagers.appendChild(row);
    state.finalWagers[i] = 0;
  });
  finalClue.style.display = "none";
  btnFinalCorrect.disabled = true;
  btnFinalWrong.disabled = true;
  show("final");
}

function revealFinal() {
  Object.keys(state.finalWagers).forEach(k => {
    const i = Number(k);
    const inp = document.getElementById("w"+i);
    if (inp) state.finalWagers[i] = Math.max(0, Math.min(Number(inp.max), Number(inp.value||0)));
  });
  finalClue.textContent = `${state.final.clue}\n\n(Answer: ${state.final.answer})`;
  finalClue.style.display = "block";
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
  const arr = state.teams.filter(t=>t.active).map((t,i)=>({i,...t})).sort((a,b)=>b.score-a.score);
  const rows = arr.map((t,idx)=>`<tr><td>${idx+1}</td><td>${escapeHtml(t.name)}</td><td>$${t.score}</td></tr>`).join("");
  resultsTable.innerHTML = `<table><thead><tr><th>#</th><th>Team</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>`;
  show("end");
}

// Helpers
function show(name) { Object.values(screens).forEach(s=>s.classList.remove("active")); screens[name].classList.add("active"); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function firstActiveTeam(){ for(let i=0;i<state.teams.length;i++) if(state.teams[i].active) return i; return null; }
function nextActiveTeam(cur){ for(let i=cur+1;i<state.teams.length;i++) if(state.teams[i].active) return i; return null; }
function toast(msg){
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.position = "fixed"; el.style.bottom = "16px"; el.style.right = "16px";
  el.style.background = "#0ea5e9"; el.style.color = "#000";
  el.style.padding = "8px 12px"; el.style.borderRadius = "10px";
  el.style.boxShadow = "0 2px 8px rgba(0,0,0,.3)"; el.style.zIndex = "9999";
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 1600);
}
