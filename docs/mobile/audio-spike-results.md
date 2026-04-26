# Batch C — Native audio spike results

## Goal
Validate whether an Expo-based audio transport can serve as the starting point for a metronome-grade native engine.

## What this spike includes
- a minimal Expo AV-backed audio engine wrapper
- a transport/scheduler prototype that schedules accented beats and subdivision ticks ahead of playback time
- deterministic integration tests for:
  - first-beat accent scheduling
  - subdivision scheduling
  - stop/start queue reset behavior
  - denominator-sensitive future scheduling
  - clip unload cleanup

## Current conclusion
**Conditional go** for continuing exploration with Expo AV.

The current prototype is good enough to:
- prove the mobile architecture can host a native transport abstraction
- validate parity math against the web domain model
- establish a scheduler contract for later UI integration
- demonstrate recovery policies for two early risks:
  - concurrent prepare calls should not double-load clips
  - overdue scheduler work should realign to the next safe future slot instead of bunching notes at `now`

But it is **not yet enough** to prove final metronome-grade performance on devices.

Important: this spike validates **transport math and abstraction boundaries**, not true sample-accurate future playback scheduling in Expo AV.

## What still must be measured on physical devices
- start latency on iPhone
- start latency on Android
- audible drift at slow tempos (40–60 BPM)
- audible drift at fast tempos (180–240 BPM)
- stability after repeated stop/start cycles
- behavior during app background/foreground transitions

## Risk notes
- Expo AV does not expose sample-accurate scheduling comparable to low-level native audio engines.
- The current wrapper accepts scheduled timestamps, but the actual playback call still depends on Expo/runtime behavior.
- If device testing shows unacceptable jitter, the fallback path should be:
  1. keep the pure TypeScript transport contract
  2. replace only the engine layer with a custom native module or a more timing-capable audio path

## Recommendation
Proceed to the next native batch only if:
- device testing is acceptable for the target quality bar, or
- we explicitly accept Expo AV as a temporary transport while keeping the engine swappable.
