// Phones client (buzzer.html) — join room and buzz
(function(){
  const roomEl = document.getElementById('room');
  const nameEl = document.getElementById('name');
  const teamEl = document.getElementById('team');
  const joinBtn = document.getElementById('btn-join');
  const joinStatus = document.getElementById('joinStatus');
  const buzzCard = document.getElementById('buzzCard');
  const buzzBtn = document.getElementById('btn-buzz');
  const buzzHeader = document.getElementById('buzzHeader');
  const buzzStatus = document.getElementById('buzzStatus');
  const leaveBtn = document.getElementById('btn-leave');

  // Prefill
  if (location.hash.length > 1) roomEl.value = location.hash.slice(1);
  try {
    const saved = JSON.parse(localStorage.getItem('cq_buzzer') || '{}');
    if (saved.room) roomEl.value = saved.room;
    if (saved.name) nameEl.value = saved.name;
    if (saved.team != null) teamEl.value = String(saved.team);
  } catch(e){}

  joinBtn.addEventListener('click', async () => {
    const cfgText = localStorage.getItem('cq_fb_config'); // Saved when user visited host page on same device OR host shares a link that sets it
    let cfg = null;
    try { cfg = JSON.parse(cfgText || ''); } catch(e){}
    if (!cfg) {
      joinStatus.textContent = "This buzzer needs the same Firebase config the host used. Easiest: scan the host's QR which pre-fills the room code; then ask the host to open this site once on your phone to store config.";
      joinStatus.style.color = "#fca5a5";
      return;
    }

    const room = roomEl.value.trim().toUpperCase();
    const name = (nameEl.value.trim() || "Player").slice(0,18);
    const team = Number(teamEl.value || 0);
    if (!room) { joinStatus.textContent = "Enter a room code."; joinStatus.style.color = "#fca5a5"; return; }

    try {
      const app = firebase.initializeApp(cfg, 'buzzerApp');
      const db = firebase.database(app);
      const roomRef = db.ref('rooms/'+room);
      const playersRef = roomRef.child('players');
      const pressesRef = roomRef.child('presses');
      const openRef = roomRef.child('open');

      const exists = (await roomRef.get()).exists();
      if (!exists) { joinStatus.textContent = "Room not found."; joinStatus.style.color = "#fca5a5"; return; }

      const id = randomId();
      await playersRef.child(id).set({ name, team, joined: Date.now() });

      buzzHeader.textContent = `${name} — Team ${team+1}`;
      joinStatus.textContent = "";
      buzzCard.style.display = 'block';

      openRef.on('value', snap => {
        const isOpen = !!snap.val();
        buzzBtn.disabled = !isOpen;
        buzzStatus.textContent = isOpen ? "Buzzers OPEN" : "Buzzers locked";
      });

      let pressedForThisOpen = false;
      buzzBtn.addEventListener('click', async () => {
        if (pressedForThisOpen) return;
        pressedForThisOpen = true;
        try {
          await pressesRef.push({ team, name, ts: firebase.database.ServerValue.TIMESTAMP });
        } catch(e){}
        setTimeout(()=>{ pressedForThisOpen = false; }, 2500);
      });

      localStorage.setItem('cq_buzzer', JSON.stringify({ room, name, team }));

      leaveBtn.addEventListener('click', async () => {
        try { await playersRef.child(id).remove(); } catch(e){}
        try { firebase.app('buzzerApp').delete(); } catch(e){}
        location.reload();
      });
    } catch(e) {
      console.error(e);
      joinStatus.textContent = "Could not join. Check your connection.";
      joinStatus.style.color = "#fca5a5";
    }
  });

  function randomId(){
    const chars = "abcdef0123456789";
    let s = "";
    for(let i=0;i<16;i++) s += chars[Math.floor(Math.random()*chars.length)];
    return s;
  }
})();