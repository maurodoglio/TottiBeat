const { createApp } = require('./helpers/appHarness');

describe('TottiBeat UI regressions', () => {
  it('shows Prestissimo as the tempo mark at 300 BPM', () => {
    const { document } = createApp();
    const bpmInput = document.getElementById('bpm-input');

    bpmInput.value = '300';
    bpmInput.dispatchEvent(new document.defaultView.Event('input', { bubbles: true }));

    expect(document.getElementById('tempo-name').textContent).toBe('Prestissimo');
  });

  it('keeps tempo names correct on bucket boundaries', () => {
    const { document } = createApp();
    const bpmInput = document.getElementById('bpm-input');

    const expectations = [
      ['40', 'Largo'],
      ['60', 'Larghetto'],
      ['120', 'Allegro'],
    ];

    expectations.forEach(([value, expected]) => {
      bpmInput.value = value;
      bpmInput.dispatchEvent(new document.defaultView.Event('input', { bubbles: true }));
      expect(document.getElementById('tempo-name').textContent).toBe(expected);
    });
  });

  it('keeps beat circles out of the tab order in uniform mode', () => {
    const { document } = createApp();
    const beatCircles = [...document.querySelectorAll('.beat-circle')];

    expect(beatCircles.length).toBeGreaterThan(0);
    expect(beatCircles.every((element) => element.tabIndex === -1)).toBe(true);
    expect(beatCircles.every((element) => element.getAttribute('aria-disabled') === 'true')).toBe(true);
  });

  it('renders beat circles as keyboard-accessible buttons in per-beat mode', () => {
    const { document, window } = createApp();
    const uniformToggle = document.getElementById('uniform-toggle');

    uniformToggle.checked = false;
    uniformToggle.dispatchEvent(new window.Event('change', { bubbles: true }));

    const beatCircles = [...document.querySelectorAll('.beat-circle')];
    expect(beatCircles.length).toBeGreaterThan(0);
    expect(beatCircles.every((element) => element.tagName === 'BUTTON')).toBe(true);
    expect(beatCircles.every((element) => element.tabIndex === 0)).toBe(true);
    expect(beatCircles.every((element) => element.getAttribute('aria-disabled') === 'false')).toBe(true);
  });

  it('renders a tap tempo button', () => {
    const { document } = createApp();
    const tapTempoButton = document.getElementById('tap-btn');

    expect(tapTempoButton).not.toBeNull();
    expect(tapTempoButton.textContent).toContain('Tap');
  });

  it('updates BPM from successive tap tempo presses', () => {
    const { document } = createApp({ nowValues: [1000, 1500, 2000, 2500] });
    const tapTempoButton = document.getElementById('tap-btn');

    tapTempoButton.click();
    tapTempoButton.click();
    tapTempoButton.click();
    tapTempoButton.click();

    expect(document.getElementById('bpm-input').value).toBe('120');
    expect(document.getElementById('tempo-name').textContent).toBe('Allegro');
    expect(tapTempoButton.textContent).toContain('120 BPM');
  });

  it('supports button-based tap tempo activation without requiring pointer input', () => {
    const { document } = createApp({ nowValues: [1000, 1400] });
    const tapTempoButton = document.getElementById('tap-btn');

    tapTempoButton.focus();
    tapTempoButton.click();
    tapTempoButton.click();

    expect(document.getElementById('bpm-input').value).toBe('150');
  });

  it('resets tap tempo history after a long pause', () => {
    const { document } = createApp({ nowValues: [1000, 1500, 5000, 5500] });
    const tapTempoButton = document.getElementById('tap-btn');

    tapTempoButton.click();
    tapTempoButton.click();
    expect(document.getElementById('bpm-input').value).toBe('120');

    tapTempoButton.click();
    tapTempoButton.click();

    expect(document.getElementById('bpm-input').value).toBe('120');
    expect(tapTempoButton.textContent).toContain('120 BPM');
  });

  it('clears stale tap history after BPM is changed manually', () => {
    const { document, window } = createApp({ nowValues: [1000, 1500, 1900] });
    const tapTempoButton = document.getElementById('tap-btn');
    const bpmInput = document.getElementById('bpm-input');

    tapTempoButton.click();
    tapTempoButton.click();
    expect(bpmInput.value).toBe('120');

    bpmInput.value = '60';
    bpmInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(tapTempoButton.textContent).toBe('Tap Tempo');

    tapTempoButton.click();

    expect(bpmInput.value).toBe('60');
    expect(tapTempoButton.textContent).toBe('Tap Tempo');
  });

  it('closes the popover when loading a uniform preset', () => {
    const { document, window } = createApp();
    const uniformToggle = document.getElementById('uniform-toggle');

    uniformToggle.checked = true;
    uniformToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
    document.querySelector('.save-btn').click();

    const modal = document.getElementById('preset-modal');
    const nameInput = document.getElementById('preset-name-input');
    const confirmButton = document.getElementById('preset-modal-confirm');

    expect(modal.classList.contains('hidden')).toBe(false);
    nameInput.value = 'Uniform Practice';
    confirmButton.click();

    uniformToggle.checked = false;
    uniformToggle.dispatchEvent(new window.Event('change', { bubbles: true }));

    const beatButton = document.querySelector('.beat-circle');
    beatButton.focus();
    beatButton.click();
    expect(document.getElementById('beat-popover').classList.contains('hidden')).toBe(false);

    document.querySelector('.load-btn').click();

    expect(document.getElementById('beat-popover').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('uniform-toggle').checked).toBe(true);
  });

  it('opens an in-app preset modal instead of using prompt when saving', () => {
    const { document } = createApp({ prompt: () => { throw new Error('prompt should not be called'); } });

    document.querySelector('.save-btn').click();

    const modal = document.getElementById('preset-modal');
    const nameInput = document.getElementById('preset-name-input');
    expect(modal.classList.contains('hidden')).toBe(false);
    expect(document.activeElement).toBe(nameInput);
  });

  it('saves a preset from the in-app modal and updates the slot metadata', () => {
    const { document } = createApp();

    document.querySelector('.save-btn').focus();
    document.querySelector('.save-btn').click();

    const modal = document.getElementById('preset-modal');
    const nameInput = document.getElementById('preset-name-input');
    const confirmButton = document.getElementById('preset-modal-confirm');

    nameInput.value = 'Studio Warmup';
    confirmButton.click();

    expect(modal.classList.contains('hidden')).toBe(true);
    expect(document.querySelector('.preset-name').textContent).toBe('Studio Warmup');
    expect(document.querySelector('.load-btn').disabled).toBe(false);
    expect(document.querySelector('.del-btn').disabled).toBe(false);
    expect(document.activeElement).toBe(document.querySelector('.save-btn'));
  });

  it('opens an in-app confirmation modal instead of using confirm when deleting', () => {
    const { document } = createApp({ confirm: () => { throw new Error('confirm should not be called'); } });

    document.querySelector('.save-btn').click();
    document.getElementById('preset-name-input').value = 'To Remove';
    document.getElementById('preset-modal-confirm').click();

    document.querySelector('.del-btn').focus();
    document.querySelector('.del-btn').click();

    const modal = document.getElementById('preset-modal');
    expect(modal.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('preset-modal-title').textContent).toContain('Delete');
    expect(document.getElementById('preset-modal-confirm').textContent).toContain('Delete');
  });

  it('restores focus to the live save button after confirming preset deletion', () => {
    const { document } = createApp();

    document.querySelector('.save-btn').click();
    document.getElementById('preset-name-input').value = 'Delete Me';
    document.getElementById('preset-modal-confirm').click();

    document.querySelector('.del-btn').focus();
    document.querySelector('.del-btn').click();
    document.getElementById('preset-modal-confirm').click();

    expect(document.getElementById('preset-modal').classList.contains('hidden')).toBe(true);
    expect(document.querySelector('.preset-name').textContent).toContain('Slot 1');
    expect(document.activeElement).toBe(document.querySelector('.save-btn'));
  });

  it('renders popover color controls as keyboard-accessible buttons and allows changing color from the keyboard', () => {
    const { document, window } = createApp();
    const uniformToggle = document.getElementById('uniform-toggle');

    uniformToggle.checked = false;
    uniformToggle.dispatchEvent(new window.Event('change', { bubbles: true }));

    const beatButton = document.querySelector('.beat-circle');
    beatButton.focus();
    beatButton.click();

    const colorButtons = [...document.querySelectorAll('#popover-color-picker .color-swatch')];
    expect(colorButtons.length).toBeGreaterThan(1);
    expect(colorButtons.every((element) => element.tagName === 'BUTTON')).toBe(true);

    const alternativeColorButton = colorButtons.find((button) => button.getAttribute('aria-pressed') === 'false');
    const selectedColorLabel = alternativeColorButton.getAttribute('aria-label');
    alternativeColorButton.focus();
    alternativeColorButton.click();

    const refreshedColorButtons = [...document.querySelectorAll('#popover-color-picker .color-swatch')];
    expect(refreshedColorButtons.some((button) => button.getAttribute('aria-pressed') === 'true')).toBe(true);
    expect(document.getElementById('beat-popover').classList.contains('hidden')).toBe(false);
    expect(document.activeElement.getAttribute('aria-label')).toBe(selectedColorLabel);
  });

  it('traps focus inside the popover when tabbing forward and backward', () => {
    const { document, window } = createApp();
    const uniformToggle = document.getElementById('uniform-toggle');

    uniformToggle.checked = false;
    uniformToggle.dispatchEvent(new window.Event('change', { bubbles: true }));

    const beatButton = document.querySelector('.beat-circle');
    beatButton.focus();
    beatButton.click();

    const closeButton = document.getElementById('popover-close');
    closeButton.focus();
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    const focusAfterForwardTab = document.activeElement;
    expect(document.getElementById('beat-popover').contains(focusAfterForwardTab)).toBe(true);

    const firstFocusable = document.querySelector('#popover-sound-picker .sound-btn');
    firstFocusable.focus();
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));

    expect(document.activeElement).toBe(closeButton);
  });

  it('closes the popover when uniform mode is re-enabled', () => {
    const { document, window } = createApp();
    const uniformToggle = document.getElementById('uniform-toggle');

    uniformToggle.checked = false;
    uniformToggle.dispatchEvent(new window.Event('change', { bubbles: true }));

    const beatButton = document.querySelector('.beat-circle');
    beatButton.focus();
    beatButton.click();

    uniformToggle.checked = true;
    uniformToggle.focus();
    uniformToggle.dispatchEvent(new window.Event('change', { bubbles: true }));

    expect(document.getElementById('beat-popover').classList.contains('hidden')).toBe(true);
    expect(document.activeElement).toBe(uniformToggle);
  });

  it('closes the popover when beats-per-bar changes', () => {
    const { document, window } = createApp();
    const uniformToggle = document.getElementById('uniform-toggle');

    uniformToggle.checked = false;
    uniformToggle.dispatchEvent(new window.Event('change', { bubbles: true }));

    const beatButton = document.querySelector('.beat-circle');
    beatButton.focus();
    beatButton.click();

    document.querySelector('[data-beats="3"]').click();

    expect(document.getElementById('beat-popover').classList.contains('hidden')).toBe(true);
    expect(document.querySelectorAll('.beat-circle')).toHaveLength(3);
  });

  it('opens and closes the beat popover from the keyboard and returns focus to the triggering beat control', async () => {
    const { document, window } = createApp();
    const uniformToggle = document.getElementById('uniform-toggle');

    uniformToggle.checked = false;
    uniformToggle.dispatchEvent(new window.Event('change', { bubbles: true }));

    const beatButton = document.querySelector('.beat-circle');
    beatButton.focus();
    beatButton.click();

    const popover = document.getElementById('beat-popover');
    expect(popover.classList.contains('hidden')).toBe(false);

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(popover.classList.contains('hidden')).toBe(true);
    expect(document.activeElement).toBe(beatButton);
  });

  it('keeps focus anchored to the originating beat button after editing sound inside the popover', () => {
    const { document, window } = createApp();
    const uniformToggle = document.getElementById('uniform-toggle');

    uniformToggle.checked = false;
    uniformToggle.dispatchEvent(new window.Event('change', { bubbles: true }));

    const beatButton = document.querySelector('.beat-circle');
    beatButton.focus();
    beatButton.click();

    const alternativeSoundButton = [...document.querySelectorAll('#popover-sound-picker .sound-btn')]
      .find((button) => !button.classList.contains('active'));

    alternativeSoundButton.click();
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(document.activeElement?.dataset.beat).toBe(beatButton.dataset.beat);
    expect(document.activeElement?.classList.contains('beat-circle')).toBe(true);
  });

  it('keeps focus anchored to the originating beat button after editing color inside the popover', () => {
    const { document, window } = createApp();
    const uniformToggle = document.getElementById('uniform-toggle');

    uniformToggle.checked = false;
    uniformToggle.dispatchEvent(new window.Event('change', { bubbles: true }));

    const beatButton = document.querySelector('.beat-circle');
    beatButton.focus();
    beatButton.click();

    const alternativeColorSwatch = [...document.querySelectorAll('#popover-color-picker .color-swatch')]
      .find((swatch) => !swatch.classList.contains('active'));

    alternativeColorSwatch.click();
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(document.activeElement?.dataset.beat).toBe(beatButton.dataset.beat);
    expect(document.activeElement?.classList.contains('beat-circle')).toBe(true);
  });

  it('renders subdivision controls with quarter notes selected by default', () => {
    const { document } = createApp();
    const subdivisionButtons = [...document.querySelectorAll('#subdivision-grid .subdivision-btn')];

    expect(subdivisionButtons).toHaveLength(4);
    expect(document.querySelector('.subdivision-btn.active')?.dataset.subdivision).toBe('quarter');
  });

  it('defaults to easy mode and hides expert-only controls', () => {
    const { document } = createApp();

    expect(document.querySelector('.mode-btn.active')?.dataset.mode).toBe('easy');
    expect(document.querySelector('[data-mode-section="expert"]')?.hidden).toBe(true);
    expect(document.querySelector('[data-mode-section="always"]')?.hidden).toBe(false);
    expect(document.getElementById('app-subtitle').textContent).toContain('Simple metronome');
  });

  it('shows expert controls when expert mode is selected', () => {
    const { document } = createApp();

    document.querySelector('[data-mode="expert"]').click();

    expect(document.querySelector('.mode-btn.active')?.dataset.mode).toBe('expert');
    expect(document.querySelector('[data-mode-section="expert"]')?.hidden).toBe(false);
    expect(document.getElementById('app-subtitle').textContent).toContain('Advanced practice tools');
  });

  it('returns to easy mode without changing tempo or time signature', () => {
    const { document, window } = createApp();
    const bpmInput = document.getElementById('bpm-input');

    document.querySelector('[data-beats="7"]').click();
    bpmInput.value = '144';
    bpmInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('[data-mode="expert"]').click();
    document.querySelector('[data-subdivision="triplet"]').click();
    document.querySelector('[data-mode="easy"]').click();

    expect(document.querySelector('.mode-btn.active')?.dataset.mode).toBe('easy');
    expect(document.querySelector('.beats-btn.active')?.dataset.beats).toBe('7');
    expect(bpmInput.value).toBe('144');
    expect(document.querySelector('[data-mode-section="expert"]')?.hidden).toBe(true);
  });

  it('persists the selected app mode when saving and loading a preset', () => {
    const { document } = createApp();

    document.querySelector('[data-mode="expert"]').click();
    document.querySelector('.save-btn').click();
    document.getElementById('preset-name-input').value = 'Expert Setup';
    document.getElementById('preset-modal-confirm').click();

    document.querySelector('[data-mode="easy"]').click();
    document.querySelector('.load-btn').click();

    expect(document.querySelector('.mode-btn.active')?.dataset.mode).toBe('expert');
    expect(document.querySelector('[data-mode-section="expert"]')?.hidden).toBe(false);
  });

  it('keeps beat circles non-interactive in easy mode even when expert per-beat settings were active', () => {
    const { document, window } = createApp();

    document.querySelector('[data-mode="expert"]').click();
    document.getElementById('uniform-toggle').checked = false;
    document.getElementById('uniform-toggle').dispatchEvent(new window.Event('change', { bubbles: true }));
    document.querySelector('[data-mode="easy"]').click();

    const firstBeat = document.querySelector('.beat-circle');
    firstBeat.click();

    expect(firstBeat.tabIndex).toBe(-1);
    expect(firstBeat.getAttribute('aria-disabled')).toBe('true');
    expect(document.getElementById('beat-popover').classList.contains('hidden')).toBe(true);
  });

  it('closes the beat popover when switching from expert mode back to easy mode', () => {
    const { document, window } = createApp();

    document.querySelector('[data-mode="expert"]').click();
    document.getElementById('uniform-toggle').checked = false;
    document.getElementById('uniform-toggle').dispatchEvent(new window.Event('change', { bubbles: true }));
    document.querySelector('.beat-circle').click();
    expect(document.getElementById('beat-popover').classList.contains('hidden')).toBe(false);

    document.querySelector('[data-mode="easy"]').click();

    expect(document.getElementById('beat-popover').classList.contains('hidden')).toBe(true);
  });

  it('loads easy mode presets without re-enabling expert beat editing affordances', () => {
    const { document, window } = createApp();

    document.querySelector('[data-mode="expert"]').click();
    document.getElementById('uniform-toggle').checked = false;
    document.getElementById('uniform-toggle').dispatchEvent(new window.Event('change', { bubbles: true }));
    document.querySelector('[data-mode="easy"]').click();
    document.querySelector('.save-btn').click();
    document.getElementById('preset-name-input').value = 'Easy Reading';
    document.getElementById('preset-modal-confirm').click();

    document.querySelector('[data-mode="expert"]').click();
    document.querySelector('.load-btn').click();

    const firstBeat = document.querySelector('.beat-circle');
    firstBeat.click();

    expect(document.querySelector('.mode-btn.active')?.dataset.mode).toBe('easy');
    expect(firstBeat.tabIndex).toBe(-1);
    expect(firstBeat.getAttribute('aria-disabled')).toBe('true');
    expect(document.getElementById('beat-popover').classList.contains('hidden')).toBe(true);
    expect(document.activeElement).toBe(document.querySelector('[data-mode="easy"]'));
  });

  it('loads legacy presets without an app mode into expert mode for backward compatibility', () => {
    const { document, window } = createApp();

    window.localStorage.setItem('tottibeat_presets', JSON.stringify([
      {
        name: 'Legacy Expert',
        savedAt: 1,
        state: {
          bpm: 120,
          beatsPerBar: 4,
          beatSettings: [
            { sound: 'accent', color: '#6c63ff' },
            { sound: 'tick', color: '#ff6584' },
            { sound: 'tick', color: '#38d9a9' },
            { sound: 'tick', color: '#ffd43b' },
          ],
          useUniform: false,
          uniformSound: 'tick',
          uniformColor: '#6c63ff',
          subdivision: 'triplet',
        },
      },
      null,
      null,
      null,
      null,
    ]));

    window.__ui.store.presets = window.__ui.store._load();
    window.__ui._buildPresets();
    document.querySelector('.load-btn').click();

    expect(document.querySelector('.mode-btn.active')?.dataset.mode).toBe('expert');
    expect(document.querySelector('[data-mode-section="expert"]')?.hidden).toBe(false);
    expect(document.querySelector('.subdivision-btn.active')?.dataset.subdivision).toBe('triplet');
    expect(document.getElementById('uniform-toggle').checked).toBe(false);
  });

  it('switching to easy mode resets hidden expert-only behaviors to safe defaults', () => {
    const { document, window } = createApp();

    document.querySelector('[data-mode="expert"]').click();
    document.querySelector('[data-subdivision="triplet"]').click();
    document.getElementById('practice-mode-toggle').checked = true;
    document.getElementById('practice-mode-toggle').dispatchEvent(new window.Event('change', { bubbles: true }));

    document.querySelector('[data-mode="easy"]').click();

    expect(document.querySelector('.subdivision-btn.active')?.dataset.subdivision).toBe('quarter');
    expect(document.getElementById('practice-mode-toggle').checked).toBe(false);
    expect(window.__metro.subdivision).toBe('quarter');
    expect(window.__ui._practice.enabled).toBe(false);
  });

  it('loading an easy preset disables hidden expert-only behaviors', () => {
    const { document, window } = createApp();

    document.querySelector('[data-mode="expert"]').click();
    document.querySelector('[data-subdivision="triplet"]').click();
    document.getElementById('practice-mode-toggle').checked = true;
    document.getElementById('practice-mode-toggle').dispatchEvent(new window.Event('change', { bubbles: true }));
    document.querySelector('[data-mode="easy"]').click();
    document.querySelector('.save-btn').click();
    document.getElementById('preset-name-input').value = 'Easy Safe';
    document.getElementById('preset-modal-confirm').click();

    document.querySelector('[data-mode="expert"]').click();
    document.querySelector('[data-subdivision="triplet"]').click();
    document.getElementById('practice-mode-toggle').checked = true;
    document.getElementById('practice-mode-toggle').dispatchEvent(new window.Event('change', { bubbles: true }));
    document.querySelector('.load-btn').click();

    expect(document.querySelector('.mode-btn.active')?.dataset.mode).toBe('easy');
    expect(window.__metro.subdivision).toBe('quarter');
    expect(window.__ui._practice.enabled).toBe(false);
  });

  it('renders practice mode controls with sensible defaults', () => {
    const { document } = createApp();

    expect(document.getElementById('practice-mode-toggle')).not.toBeNull();
    expect(document.getElementById('practice-bars-input').value).toBe('4');
    expect(document.getElementById('practice-step-input').value).toBe('5');
    expect(document.getElementById('practice-max-bpm-input').value).toBe('160');
    expect(document.getElementById('practice-status').textContent).toContain('Off');
  });

  it('increases BPM only after the configured number of full bars in practice mode', () => {
    const { document, window } = createApp();
    const practiceToggle = document.getElementById('practice-mode-toggle');
    const barsInput = document.getElementById('practice-bars-input');
    const stepInput = document.getElementById('practice-step-input');
    const maxInput = document.getElementById('practice-max-bpm-input');
    const bpmInput = document.getElementById('bpm-input');

    practiceToggle.checked = true;
    practiceToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
    barsInput.value = '2';
    barsInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    stepInput.value = '3';
    stepInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    maxInput.value = '130';
    maxInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    window.__ui._handlePracticeBarEnd();
    expect(bpmInput.value).toBe('120');
    expect(document.getElementById('practice-status').textContent).toContain('1 / 2');

    window.__ui._handlePracticeBarEnd();
    expect(bpmInput.value).toBe('123');
    expect(document.getElementById('practice-status').textContent).toContain('Will increase after 2 full bars');

    window.__ui._handleBeat(0);
    expect(bpmInput.value).toBe('123');
    expect(document.getElementById('practice-status').textContent).toContain('Waiting for bar 1 of 2');
  });

  it('does not count a partial bar when practice mode is enabled mid-bar during playback', () => {
    const { document, window } = createApp();
    const practiceToggle = document.getElementById('practice-mode-toggle');
    const barsInput = document.getElementById('practice-bars-input');
    const stepInput = document.getElementById('practice-step-input');
    const bpmInput = document.getElementById('bpm-input');

    window.__metro.isPlaying = true;
    practiceToggle.checked = true;
    practiceToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
    barsInput.value = '1';
    barsInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    stepInput.value = '10';
    stepInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    window.__ui._handlePracticeBarEnd();
    expect(bpmInput.value).toBe('120');

    window.__ui._handleBeat(0);
    expect(bpmInput.value).toBe('120');
  });

  it('advances practice mode through the live beat callback path', () => {
    const { document, window } = createApp();
    const practiceToggle = document.getElementById('practice-mode-toggle');
    const barsInput = document.getElementById('practice-bars-input');
    const stepInput = document.getElementById('practice-step-input');
    const bpmInput = document.getElementById('bpm-input');

    practiceToggle.checked = true;
    practiceToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
    barsInput.value = '1';
    barsInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    stepInput.value = '4';
    stepInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    window.__metro.onBarEnd();
    window.__metro.onBeat(0);

    expect(bpmInput.value).toBe('124');
    expect(document.getElementById('practice-status').textContent).toContain('Waiting for bar 1 of 1');
  });

  it('does not increase BPM past the configured practice mode maximum', () => {
    const { document, window } = createApp();
    const practiceToggle = document.getElementById('practice-mode-toggle');
    const barsInput = document.getElementById('practice-bars-input');
    const stepInput = document.getElementById('practice-step-input');
    const maxInput = document.getElementById('practice-max-bpm-input');
    const bpmInput = document.getElementById('bpm-input');

    practiceToggle.checked = true;
    practiceToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
    barsInput.value = '1';
    barsInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    stepInput.value = '5';
    stepInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    maxInput.value = '125';
    maxInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    window.__ui._handlePracticeBarEnd();
    expect(bpmInput.value).toBe('125');

    window.__ui._handlePracticeBarEnd();
    expect(bpmInput.value).toBe('125');
    expect(document.getElementById('practice-status').textContent).toContain('Max 125 BPM reached');
  });

  it('does not carry practice mode progress across stop and restart', async () => {
    const { document, window } = createApp();
    const practiceToggle = document.getElementById('practice-mode-toggle');
    const barsInput = document.getElementById('practice-bars-input');
    const stepInput = document.getElementById('practice-step-input');
    const playButton = document.getElementById('play-btn');
    const bpmInput = document.getElementById('bpm-input');

    practiceToggle.checked = true;
    practiceToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
    barsInput.value = '2';
    barsInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    stepInput.value = '4';
    stepInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    await window.__ui._togglePlay();
    window.__ui._handlePracticeBarEnd();
    expect(document.getElementById('practice-status').textContent).toContain('Bar 1 / 2');

    await window.__ui._togglePlay();
    await window.__ui._togglePlay();
    window.__ui._handlePracticeBarEnd();

    expect(bpmInput.value).toBe('120');
    expect(document.getElementById('practice-status').textContent).toContain('Bar 1 / 2');
    expect(playButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('resets practice mode progress after a manual BPM change', () => {
    const { document, window } = createApp();
    const practiceToggle = document.getElementById('practice-mode-toggle');
    const barsInput = document.getElementById('practice-bars-input');
    const bpmInput = document.getElementById('bpm-input');

    practiceToggle.checked = true;
    practiceToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
    barsInput.value = '2';
    barsInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    window.__ui._handlePracticeBarEnd();
    expect(document.getElementById('practice-status').textContent).toContain('1 / 2');

    bpmInput.value = '132';
    bpmInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(document.getElementById('practice-status').textContent).toContain('Waiting for bar 1 of 2');
  });

  it('does not count a partial bar after a manual BPM change during playback', () => {
    const { document, window } = createApp();
    const practiceToggle = document.getElementById('practice-mode-toggle');
    const barsInput = document.getElementById('practice-bars-input');
    const stepInput = document.getElementById('practice-step-input');
    const bpmInput = document.getElementById('bpm-input');

    window.__metro.isPlaying = true;
    practiceToggle.checked = true;
    practiceToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
    barsInput.value = '1';
    barsInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    stepInput.value = '10';
    stepInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    bpmInput.value = '132';
    bpmInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    window.__ui._handleBeat(3);
    expect(bpmInput.value).toBe('132');

    window.__ui._handleBeat(0);
    expect(bpmInput.value).toBe('132');
  });

  it('does not lower BPM when practice mode max is below the current tempo', () => {
    const { document, window } = createApp();
    const practiceToggle = document.getElementById('practice-mode-toggle');
    const barsInput = document.getElementById('practice-bars-input');
    const stepInput = document.getElementById('practice-step-input');
    const maxInput = document.getElementById('practice-max-bpm-input');
    const bpmInput = document.getElementById('bpm-input');

    bpmInput.value = '200';
    bpmInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    practiceToggle.checked = true;
    practiceToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
    barsInput.value = '1';
    barsInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    stepInput.value = '10';
    stepInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    maxInput.value = '160';
    maxInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    window.__ui._handlePracticeBarEnd();

    expect(bpmInput.value).toBe('200');
    expect(document.getElementById('practice-status').textContent).toContain('Max 160 BPM reached');
  });

  it('applies practice mode BPM increases before scheduling the next bar', () => {
    const { document, window } = createApp();
    const practiceToggle = document.getElementById('practice-mode-toggle');
    const barsInput = document.getElementById('practice-bars-input');
    const stepInput = document.getElementById('practice-step-input');
    const scheduled = [];

    practiceToggle.checked = true;
    practiceToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
    barsInput.value = '1';
    barsInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    stepInput.value = '30';
    stepInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    window.__metro.sound.play = (type, time) => {
      scheduled.push({ type, time });
    };
    window.__metro.beatsPerBar = 1;
    window.__metro._currentBeat = 0;
    window.__metro._nextNoteTime = 10;

    window.__metro._scheduleNote(0, 10);
    window.__metro._advance();

    expect(window.__metro.bpm).toBe(150);
    expect(window.__metro._nextNoteTime).toBeCloseTo(10.4, 5);
    expect(scheduled).toEqual([{ type: 'tick', time: 10 }]);
  });

  it('resets practice mode progress when beats per bar changes', () => {
    const { document, window } = createApp();
    const practiceToggle = document.getElementById('practice-mode-toggle');
    const barsInput = document.getElementById('practice-bars-input');
    const stepInput = document.getElementById('practice-step-input');
    const bpmInput = document.getElementById('bpm-input');

    practiceToggle.checked = true;
    practiceToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
    barsInput.value = '2';
    barsInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    stepInput.value = '5';
    stepInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    window.__ui._handlePracticeBarEnd();
    expect(document.getElementById('practice-status').textContent).toContain('1 / 2');

    document.querySelector('[data-beats="3"]').click();
    expect(document.getElementById('practice-status').textContent).toContain('Waiting for bar 1 of 2');

    window.__ui._handlePracticeBarEnd();
    expect(bpmInput.value).toBe('120');
    expect(document.getElementById('practice-status').textContent).toContain('1 / 2');
  });

  it('persists practice mode settings when saving and loading a preset', () => {
    const { document, window } = createApp();
    const practiceToggle = document.getElementById('practice-mode-toggle');
    const barsInput = document.getElementById('practice-bars-input');
    const stepInput = document.getElementById('practice-step-input');
    const maxInput = document.getElementById('practice-max-bpm-input');

    practiceToggle.checked = true;
    practiceToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
    barsInput.value = '3';
    barsInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    stepInput.value = '7';
    stepInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    maxInput.value = '175';
    maxInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    document.querySelector('.save-btn').click();
    document.getElementById('preset-name-input').value = 'Practice Builder';
    document.getElementById('preset-modal-confirm').click();

    practiceToggle.checked = false;
    practiceToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
    barsInput.value = '1';
    barsInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    stepInput.value = '1';
    stepInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    maxInput.value = '130';
    maxInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    document.querySelector('.load-btn').click();

    expect(document.getElementById('practice-mode-toggle').checked).toBe(true);
    expect(document.getElementById('practice-bars-input').value).toBe('3');
    expect(document.getElementById('practice-step-input').value).toBe('7');
    expect(document.getElementById('practice-max-bpm-input').value).toBe('175');
  });

  it('persists subdivision selection when saving and loading a preset in expert mode', () => {
    const { document } = createApp();

    document.querySelector('[data-mode="expert"]').click();
    document.querySelector('[data-subdivision="triplet"]').click();
    document.querySelector('.save-btn').click();
    document.getElementById('preset-name-input').value = 'Triplet Groove';
    document.getElementById('preset-modal-confirm').click();

    document.querySelector('[data-subdivision="quarter"]').click();
    document.querySelector('.load-btn').click();

    expect(document.querySelector('.mode-btn.active')?.dataset.mode).toBe('expert');
    expect(document.querySelector('.subdivision-btn.active')?.dataset.subdivision).toBe('triplet');
  });

  it('keeps focus on the active subdivision button after selection', () => {
    const { document } = createApp();
    const targetButton = document.querySelector('[data-subdivision="eighth"]');

    targetButton.focus();
    targetButton.click();

    expect(document.activeElement).toBe(document.querySelector('[data-subdivision="eighth"]'));
  });

  it('schedules intermediate subdivision notes between quarter-note beats', () => {
    const { document, window } = createApp();
    const scheduled = [];
    const originalPlay = window.__metro.sound.play.bind(window.__metro.sound);
    window.__metro.sound.play = (type, time) => {
      scheduled.push({ type, time });
      return originalPlay(type, time);
    };

    document.querySelector('[data-subdivision="eighth"]').click();
    window.__metro._scheduleNote(0, 10);

    expect(scheduled).toEqual([
      { type: 'tick', time: 10 },
      { type: 'tick', time: 10.25 },
    ]);
  });

  it('keeps visual beat flashing anchored to quarter-note beats when subdivisions are enabled', () => {
    const { window } = createApp();
    const beats = [];
    window.__metro.isPlaying = true;
    window.__metro.onBeat = (beat) => beats.push(beat);
    window.__metro._noteQueue.push(
      { beat: 0, time: 0, isSubdivision: false },
      { beat: 0, time: 0, isSubdivision: true },
      { beat: 1, time: 0, isSubdivision: false },
    );

    window.__metro._visualLoop();

    expect(beats).toEqual([0, 1]);
  });
});
