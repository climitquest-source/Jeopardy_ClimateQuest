# Climate Quest — Jeopardy

A projector-friendly Jeopardy-style game to teach climate topics. Static site, no backend.

## Modes & flow
- Up to **4 teams** (rename on setup). Built-in **keyboard buzzers**: Team1=A, Team2=L, Team3=W, Team4=P. On-screen buzzer buttons also work.
- **Single** or **Double** round values.
- One **Daily Double** per game (random cell).
- Optional **Final Question** with wagers and manual grading.

## Hosting
This is a static site. Upload the files to Cloudflare Pages (no build), GitHub Pages, Netlify, or open `index.html` locally.

## Files
- `index.html` — the app
- `styles.css` — UI theme
- `app.js` — game logic
- `packs/climate_pack_1.json` — sample pack (5x5 board + final)
- `assets/` — icon/OG image

## Authoring new packs
Create a new JSON file like `packs/your_pack.json`:
```json
{
  "packName": "Your Pack",
  "categories": [
    { "title": "Category 1", "clues": [
      {"q":"Question text","answer":"Answer","explain":"One-sentence explainer"},
      {"q":"... five clues total ..."}
    ]},
    "... total 5 categories ..."
  ],
  "final": { "category":"Final Cat", "clue":"...", "answer":"...", "explain":"..." }
}
```
Put five categories, each with five clues.

## Tips for hosting
- Project to a screen. Read the clue, **Open buzzers**, then mark correct/wrong.
- Daily Double allows only the selecting team to answer, with a wager.
- Final: enter wagers, reveal clue, then mark each team.

## Accessibility
- Large tiles, high contrast, keyboard support.
