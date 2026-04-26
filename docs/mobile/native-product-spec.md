# TottiBeat Native Product Spec

## Goal

Transform TottiBeat into a fully native mobile metronome for iOS and Android while preserving the current product model:
- approachable Easy mode
- more configurable Expert mode
- musician-friendly timing behavior

## Target users

- musicians practicing with a phone on a stand or nearby surface
- users who want a simple metronome quickly
- advanced users who need subdivision, practice mode, presets, and beat customization

## Product model

### Easy mode
Must stay focused on:
- BPM control
- tap tempo
- time signature fractions
- beat display
- transport

### Expert mode
Must expose advanced tools without cluttering easy mode:
- beat subdivision
- practice mode
- beat settings
- presets

## Native v1 launch scope

### Must-have
- easy mode shell
- expert mode shell
- native audio transport
- BPM controls
- tap tempo
- fraction time signatures
- current-session persistence
- presets
- practice mode
- expert-only subdivision

### Should-have soon after launch
- count-in
- master volume
- wake lock
- preset import/export

### Later
- setlists
- background playback refinements
- odd-meter grouping UI
- cloud sync

## Mobile UX rules

- readable from arm’s length
- large transport controls
- one-thumb friendly layout
- no hidden critical controls in Easy mode
- native navigation and modal patterns
- stable behavior during interruptions and app backgrounding
- home-screen level polish: elevated cards, large metrics, and bottom navigation that feels native on modern phones
- release readiness should be visible in-app via an audio validation checklist preview until hardware sign-off tooling is complete

## Non-goals for Batch A

- parity implementation
- audio engine validation
- feature-complete screens

Batch A only establishes the foundation for later native work.
