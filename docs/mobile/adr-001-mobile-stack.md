# ADR-001: Native mobile stack choice

## Status
Accepted

## Decision
Use **React Native + Expo + TypeScript** for the TottiBeat native mobile app foundation.

## Context
TottiBeat currently exists as a small static web app. The goal is not to wrap the website inside a webview, but to build a true native mobile product for iOS and Android while preserving product behavior and musician-oriented timing rules.

The current web app is useful as a behavioral reference, but not as a UI codebase to transplant directly.

## Why this stack

- one cross-platform codebase for iOS and Android
- TypeScript aligns well with the current JavaScript-based product logic
- Expo accelerates setup, iteration, and distribution
- React Native provides native UI primitives instead of browser DOM abstractions
- easier to maintain than separate SwiftUI and Kotlin/Compose codebases at this stage

## Rejected alternatives

### Webview wrapper
Rejected because it would not produce a fully native product and would likely compromise audio behavior, offline ergonomics, and long-term maintainability.

### Separate SwiftUI + Kotlin apps
Rejected for now because it doubles implementation cost too early.

## Known risk

The largest technical risk is **audio precision**.
A metronome is extremely sensitive to timing drift and latency. Expo-level audio APIs may or may not be sufficient for metronome-grade scheduling, so the project will validate audio precision early in Batch C before investing heavily in feature-complete UI parity.

## Consequences

- the repo will gain a new `mobile/` workspace
- the current web app remains the parity reference during migration
- domain logic should be ported into pure TypeScript modules before large UI implementation
- audio engine feasibility must be proven before deep native UI work continues
