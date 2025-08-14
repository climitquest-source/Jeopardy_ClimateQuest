// Phones integration (host side) using Firebase Realtime Database
(function(){
  const btnSave = document.getElementById('btn-save-firebase');
  const fbConfigEl = document.getElementById('fbConfig');
  const fbStatus = document.getElementById('fbStatus');
  const btnCreateRoom = document.getElementById('btn-create-room');
  const btnCloseRoom = document.getElementById('btn-close-room');
  const roomCodeEl = document.getElementById('roomCode');
  const qrCanvas = document.getElementById('qrCanvas');
  const connectedList = document.getElementById('connectedList');

  try {
    const saved = localStorage.getItem('cq_fb_config');
    if (saved) fbConfigEl.value = saved;
  } catch(e) {}

  btnSave.addEventListener('click', () => {
    try {
      const cfg = JSON.parse(fbConfigEl.value);
      window._fbCfg = cfg;
      localStorage.setItem('cq_fb_config', fbConfigEl.value);
      fbStatus.textContent = "Saved. You can create a room now.";
      fbStatus.style.color = "#a7f3d0";
    } catch(e) {
      fbStatus.textContent = "Invalid JSON.";
      fbStatus.style.color = "#fca5a5";
    }
  });

  btnCreateRoom.addEventListener('click', async () => {
    if (!window._fbCfg) {
      try { window._fbCfg = JSON.parse(fbConfigEl.value); } catch(e){}
    }
    if (!window._fbCfg) {
      fbStatus.textContent = "Save a valid Firebase config first.";
      fbStatus.style.color = "#fca5a5";
      return;
    }
    try {
      const app = firebase.initializeApp(window._fbCfg, 'hostApp');
      const db = firebase.database(app);
      const code = genCode();
      const roomRef = db.ref('rooms/'+code);
      await roomRef.set({ open:false, created: Date.now() });
      window.hostState = { app, db, code, roomRef,
        openRef: roomRef.child('open'),
        pressesRef: roomRef.child('presses'),
        playersRef: roomRef.child('players')
      };
      roomCodeEl.textContent = code;
      const link = location.origin + location.pathname.replace('index.html','') + 'buzzer.html#' + code;
      drawFakeQR(qrCanvas, link);
      btnCloseRoom.disabled = false;

      window.hostState.playersRef.on('value', snap => {
        const val = snap.val() || {};
        connectedList.innerHTML = '';
        Object.keys(val).forEach(id => {
          const p = val[id];
          const pill = document.createElement('span');
          pill.className = 'pill';
          pill.textContent = `${p.name || 'Player'} · T${(p.team||0)+1}`;
          connectedList.appendChild(pill);
        });
      });

      window.hostState.pressesRef.on('child_added', async (snap) => {
        const press = snap.val();
        if (!press) return;
        if (!window.state || !window.state.buzzersOpen) return;
        const team = Number(press.team||0);
        if (window.state.answeredTeams && window.state.answeredTeams.has(team)) return;
        if (window.state.buzzingOrder && window.state.buzzingOrder.length) return;
        window.state.buzzingOrder.push(team);
        const lockBtn = document.getElementById('btn-lock-buzzers');
        if (lockBtn) lockBtn.click();
      });

      fbStatus.textContent = "Room ready. Share the QR or code.";
      fbStatus.style.color = "#a7f3d0";

      // Attach to state so app.js can toggle open/close
      if (window.state) {
        window.state.fb = { app, db, room: roomRef, code, openRef: window.hostState.openRef, pressesRef: window.hostState.pressesRef, playersRef: window.hostState.playersRef };
      } else {
        window.state = { fb: { app, db, room: roomRef, code, openRef: window.hostState.openRef, pressesRef: window.hostState.pressesRef, playersRef: window.hostState.playersRef } };
      }
    } catch(e) {
      console.error(e);
      fbStatus.textContent = "Failed to init Firebase. Check config.";
      fbStatus.style.color = "#fca5a5";
    }
  });

  btnCloseRoom.addEventListener('click', async () => {
    try {
      if (window.hostState) {
        await window.hostState.roomRef.remove();
        firebase.app('hostApp').delete();
        window.hostState = null;
      }
      roomCodeEl.textContent = '—';
      connectedList.innerHTML = '';
      const ctx = document.getElementById('qrCanvas').getContext('2d');
      ctx.clearRect(0,0,180,180);
      btnCloseRoom.disabled = true;
      fbStatus.textContent = "Room closed.";
      fbStatus.style.color = "#94a3b8";
    } catch(e) {
      fbStatus.textContent = "Could not close room.";
      fbStatus.style.color = "#fca5a5";
    }
  });

  function genCode(){
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for(let i=0;i<6;i++) s += chars[Math.floor(Math.random()*chars.length)];
    return s;
  }
})();