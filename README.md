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

## File structure

```
index.html      – App shell
css/style.css   – Dark-theme styles
js/app.js       – SoundEngine, Metronome, SettingsStore, UI
```
