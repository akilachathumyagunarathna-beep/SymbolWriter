# SymbolWriter

A browser-based rich text editor with built-in symbol library, scientific calculator, and spreadsheet engine. Pure vanilla JS / HTML / CSS — no build step.

## Tech Stack
- Vanilla JavaScript (ES modules / classic scripts)
- HTML5 ContentEditable for the editor
- Math.js (formula evaluation), Chart.js (graphs)
- localStorage for persistence

## Project Structure
```
index.html          # Main entry
css/style.css       # Styles
js/                 # All app logic (editor, calculator, dataLab, symbols, etc.)
server.js           # Tiny static file server for Replit (port 5000, host 0.0.0.0)
```

## Replit Setup
- Workflow `Start application` runs `node server.js`, serving the static site on port 5000.
- The server disables caching in dev so changes always reload through the Replit preview proxy.
- Deployment is configured as a `static` site with `publicDir = "."`.

## Notes
- No package.json / dependencies required — `server.js` uses only Node's built-in `http`/`fs`/`path`.
- Works through Replit's iframe proxy with no host restrictions.
