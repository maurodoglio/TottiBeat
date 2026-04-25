# TottiBeat

A professional, browser-based metronome with rich visual and audio feedback.

## Features

- **BPM control** – slider, number input, and ±1 buttons; keyboard arrow keys also work. Tempo name (Andante, Moderato, Allegro …) is shown automatically.
- **Beats per bar** – choose 1–8 beats per bar.
- **Visual beat monitor** – animated circles flash in sync with each beat.
- **Audio beat monitor** – synthesised sounds via the Web Audio API (no server required).
- **Sound picker** – Tick, Accent, Clap, Kick, Hi-Hat, Woodblock, or Mute.
- **Uniform vs per-beat settings** – toggle between one global colour/sound for all beats, or assign a unique colour and sound to each beat in the bar.
- **Saved presets** – save up to 5 named configurations to `localStorage` and reload them later.
- **Keyboard shortcut** – press `Space` to start/stop.

## Usage

Open `index.html` directly in any modern browser – no build step or server required.

## Native mobile app

A new native mobile workspace now lives under `mobile/`.

- root `npm test` validates the existing web regression suite plus Batch A native-foundation checks
- mobile work is developed and validated from inside `mobile/`
- typical mobile commands:

```bash
cd mobile
npm install
npm run lint
npm test
npm start
```

## File structure

```
index.html      – App shell
css/style.css   – Dark-theme styles
js/app.js       – SoundEngine, Metronome, SettingsStore, UI
mobile/         – Native React Native / Expo workspace
```
