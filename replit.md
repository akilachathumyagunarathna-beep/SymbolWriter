# SymbolWriter

A modern, mobile-responsive React rewrite of the original SymbolWriter app — a rich text editor with built-in symbol library, scientific calculator (with graphing) and an Excel-like Data Lab spreadsheet engine.

## Tech Stack
- **React 18** + **TypeScript** — UI
- **Vite** — dev server / bundler
- **Math.js** — calculator expression engine + custom user-defined functions
- **Chart.js** + **react-chartjs-2** — calculator graph + Data Lab charts
- **Custom recursive-descent formula parser** in `src/lib/formulaEngine.ts` — supports nested function calls, ranges, custom functions

## Architecture

```
src/
  main.tsx               app bootstrap
  App.tsx                top-level layout + state hub
  components/
    Header.tsx           brand + theme + actions
    Toolbar.tsx          editor formatting toolbar
    Editor.tsx           contentEditable wrapper
    StatusBar.tsx        live word/char stats
    SymbolsPanel.tsx     left side panel with all symbols + search + custom
    Calculator.tsx       calculator + custom vars/fns + graph
    DataLab.tsx          spreadsheet grid + formula bar
    DataLabChart.tsx     spreadsheet → chart bridge (9 chart types)
    WordCountPanel.tsx   detailed text statistics
    FindReplace.tsx      modal find/replace with highlighting
    Toast.tsx            notification stack
  lib/
    symbols.ts           600+ built-in symbol shortcuts (/alpha, /sum, etc.)
    formulaEngine.ts     spreadsheet engine — tokenizer, parser, evaluator
    storage.ts           localStorage helpers
    exporters.ts         .doc/.txt/.html, CSV, Excel-compatible XLS export
  hooks/
    useToast.ts          toast notifications
  styles/
    global.css           4 themes via CSS variables, mobile-first responsive
```

## Features

### Rich Text Editor
- Full formatting toolbar (bold, italic, alignment, lists, headings, fonts, colors, highlight, sub/super, etc.)
- 600+ symbol shortcuts via `/command` (auto-expand) or click from the side panel
- User-defined custom symbols (persisted in localStorage)
- Image insertion, links, horizontal rules
- Find & replace with regex options & live highlighting
- Export as `.doc` (Word), `.txt`, `.html`
- "Copy for Word" — copies rich HTML to clipboard for direct paste into Word
- Live word/char/sentence/paragraph/reading-time statistics

### Scientific Calculator + Graphing
- Math.js-powered evaluator (full expression support, complex numbers, matrices, units)
- 22-key on-screen pad + free-form input
- Custom user variables (`x = 5`)
- Custom user-defined functions (`f(x,y) = x^2 + y`)
- Graphing panel: line, area, scatter; configurable x range and resolution
- All custom variables and functions are also accessible from the Data Lab

### Data Lab Spreadsheet
- Live grid (default 30 rows × 12 cols, expandable)
- Formula bar with live preview
- Custom recursive-descent parser supports **nested function calls** (e.g. `=SUM(IF(A1>0, A1, 0), B1*POWER(2, ROUND(C1, 0)))`)
- 80+ functions across categories:
  - **Math:** SUM, AVERAGE, MAX, MIN, COUNT, COUNTA, COUNTIF, COUNTIFS, SUMIF, SUMIFS, AVERAGEIF, AVERAGEIFS, PRODUCT, SQRT, ABS, ROUND/UP/DOWN, FLOOR, CEILING, MOD, POWER, LOG, LN, EXP, INT, SIGN, RAND, RANDBETWEEN, GCD, LCM, FACT, …
  - **Stats:** MEDIAN, MODE, STDEV(P), VAR(P), LARGE, SMALL, RANK, PERCENTILE, QUARTILE
  - **Trig:** SIN/COS/TAN, ASIN/ACOS/ATAN, ATAN2, hyperbolics, RADIANS/DEGREES
  - **String:** LEN, UPPER, LOWER, PROPER, TRIM, LEFT/MID/RIGHT, CONCAT, TEXTJOIN, SUBSTITUTE, REPLACE, FIND, SEARCH, REPT, REVERSE, TEXT, VALUE, CHAR, CODE
  - **Logical:** IF, IFS, AND, OR, NOT, XOR, IFERROR, IFNA, IS*, SWITCH
  - **Lookup:** VLOOKUP, HLOOKUP, INDEX, MATCH, XLOOKUP, CHOOSE, OFFSET
  - **Date:** TODAY, NOW, YEAR, MONTH, DAY, DATE, WEEKDAY, DATEDIF, EOMONTH
  - **Financial:** PMT, FV, PV
- Function-name autocomplete suggestions while editing
- Cycle detection (`#CYCLE!`)
- CSV import & export, Excel `.xls` export
- 9 chart types (bar, horizontal bar, line, area, pie, doughnut, scatter, radar, polar) bound to live cell ranges
- Resizable chart panel

### UI / UX
- 4 themes: Dark, Light, Paper, High-Contrast
- Mobile-responsive (drawer panels for ≤1100px viewports, touch-friendly buttons)
- Keyboard shortcuts: Ctrl+F (find), Ctrl+S (export menu), Ctrl+B/I/U (formatting), Tab/Shift+Tab in grid, Enter to edit, etc.
- All work persists in localStorage automatically

## Dev / Build

```bash
npm run dev      # vite dev server on 0.0.0.0:5000
npm run build    # production build → dist/
npm run preview  # preview built site on 0.0.0.0:5000
```

## Deployment
Configured as a **static** Replit deployment that runs `npm run build` and serves `dist/`.

## Recent Changes
- 2026-04-26 — Full rewrite from vanilla JS to React + TypeScript + Vite. New recursive-descent formula engine with deeply nested function support, 80+ functions, 9 chart types, mobile-responsive layout, and 4 themes.

## User Preferences
None recorded yet.
