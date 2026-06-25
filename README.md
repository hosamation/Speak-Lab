<h1 align="center">
  <img src="src/images/speak-lab-logo-no-bg.png" alt="Speak Lab logo" width="150">
  <br>
  Speak Lab
</h1>

![License](https://img.shields.io/github/license/hosamation/Speak-Lab) ![Stars](https://img.shields.io/github/stars/hosamation/Speak-Lab)

You can try it live here: https://hosamation.github.io/Speak-Lab/
Practice English speaking in your browser — JAM, tongue twisters, impromptu speeches, and interview questions. Records straight to **`.m4a`** (Safari/iOS) or **`.mp3`** (everyone else) — no `.webm`, no server, no account.

## Features

- **5 practice modes**: JAM (60s), Tongue Twisters (easy/medium/hard), Impromptu speeches by category, Interview questions (customer service, ownership, STAR, tech roles, etc.), and **Free** (your own custom prompt).
- **In-browser recorder** with built-in MP3 encoder (`lamejs`) so files are universally playable.
- **Save to folder** via the File System Access API (Chrome/Edge desktop) — recordings drop straight into your Obsidian vault. Other browsers download instead.
- **Mobile-friendly** dark theme.
- **Vite-powered** — bundles `lamejs` and JSON data at build time, then ships a fully static site.

## Run it

### Locally
Requires **Node.js 18+**. Then either:

```bash
# easy mode — auto-installs deps and starts Vite on http://localhost:8080
python3 start-recorder-local.py

# or run npm directly
npm install
npm run dev
```

> The microphone requires a **secure context** (`https://` or `http://localhost`). Opening `index.html` directly with `file://` — or via a plain static server — will not work: the app uses ES module imports that only Vite can resolve.

### Deploy
Build first, then publish the `dist/` folder:
```bash
npm run build      # outputs dist/
npm run preview    # smoke-test the build locally
```
- **GitHub Pages / Cloudflare Pages / Netlify / Vercel** — build command `npm run build`, publish directory `dist`.

## Project structure

```
speak-lab/
├── start-recorder-local.py     # local dev server (mic-safe localhost)
├── index.html                  # markup + module entry point
├── src/
│   ├── styles.css              # all CSS (dark theme)
│   ├── app.js                  # loads data, wires tabs + shuffle
│   ├── recorder.js             # mic capture + MP3 encoding
│   ├── vault.js                # File System Access API + IndexedDB handle
│   ├── util.js                 # timestamps, slug, toast, downloadBlob
│   └── data/
│       ├── jam.json            # 300+ JAM prompts
│       ├── tongue-twisters.json # easy / medium / hard
│       ├── impromptu.json      # 6 categories
│       └── interview.json      # 6 categories incl. customer service, STAR
└── README.md
```

## Customize prompts

Edit any file in `src/data/`. The schemas:
- `jam.json` — `string[]`
- `tongue-twisters.json` — `{ easy: {text, focus}[], medium: ..., hard: ... }`
- `impromptu.json` / `interview.json` — `{ category: string, questions: string[] }[]`

Reload the page after editing — that's it.

## Where recordings go

Filenames: `{module}_{YYYY-MM-DD_HH-MM-SS}_{prompt-slug}.{m4a|mp3}`

If you "Pick vault folder" (Chrome/Edge desktop), they save into the matching subfolder:
- `07-Attachments/Audio/Recordings/JAM-Recordings/`
- `07-Attachments/Audio/Recordings/Tongue-Twisters-Recordings/`
- `07-Attachments/Audio/Recordings/Impromptu-Recordings/`
- `07-Attachments/Audio/Recordings/Interview-Recordings/`

On Safari, Firefox, Android, or iOS the **Save** button downloads instead — move the file into the matching folder manually. Change these paths in `src/app.js` → `PATHS`.

## Browser support

| Browser | Mic | Native format | MP3 output | Save to folder |
|---|---|---|---|---|
| Chrome / Edge (desktop) | ✅ | webm/opus | ✅ encoded | ✅ |
| Safari (macOS/iOS) | ✅ | mp4/aac | ✅ `.m4a` native | ❌ download |
| Firefox | ✅ | webm/opus | ✅ encoded | ❌ download |
| Brave | ✅* | webm/opus | ✅ encoded | ✅ |

*Brave: lower Shields for the site and allow Microphone.

## License

MIT
