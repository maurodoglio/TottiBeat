# TottiBeat Native Parity Checklist

Use this checklist to track parity between the current web app and the future native app.

## Core behavior

- [ ] BPM controls
- [ ] Tempo-name mapping
- [ ] Tap tempo
- [ ] Transport start/stop
- [ ] Current-session persistence

## Timing and music model

- [ ] Time signature fractions
- [ ] Denominator affects timing
- [ ] Beat subdivision
- [ ] Practice mode
- [ ] Practice mode bar-boundary tempo increase

## Expert features

- [ ] Expert-only controls hidden in Easy mode
- [ ] Beat settings
- [ ] Per-beat color customization
- [ ] Per-beat sound customization
- [ ] Saved presets
- [ ] Legacy preset compatibility rules if carried over

## UX and accessibility

- [ ] Clear easy/expert mode separation
- [ ] Keyboard-free touch-first navigation
- [ ] Strong focus/selection states where relevant
- [ ] Native modal flows for preset and beat editing
- [ ] Readable beat display during playback

## Native-only additions

- [ ] Wake lock
- [ ] Haptics
- [ ] Count-in
- [ ] Master volume
- [ ] Import/export presets

## Reference behavior notes

### Time signature fractions
The native app must preserve the current product decision that time signatures are shown as fractions and the denominator changes beat timing rather than acting as a cosmetic label.

### Practice mode
Practice mode must remain boundary-aware: tempo increases happen after the configured number of complete bars.

### Beat subdivision
Subdivision remains distinct from time signature and stays expert-only.
