
# Climate Quest — Jeopardy (with phone buzzers)

Static Jeopardy host + phone buzzer client powered by Firebase Realtime Database (free tier).
- Host: `index.html`
- Audience: `buzzer.html`

## Setup Firebase (one time)
1) Create a Firebase project.
2) Add a **Web app** and copy the config JSON.
3) Enable **Realtime Database** (start in test mode for quick events).

## Host flow
1) Open `index.html` → paste the Firebase config → Save.
2) Click **Create room**. Share the **room code** or the **QR** (it opens `buzzer.html#CODE`).
3) Start the game. When you click **Open buzzers**, phones can press **BUZZ**. First press locks others.
4) Mark **Correct** or **Wrong** in the host dialog. **Pass** allows others to buzz again.

## Deploy
Upload all files to Cloudflare Pages. No build needed.
