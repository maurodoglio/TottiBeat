const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const projectRoot = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const appScript = fs.readFileSync(path.join(projectRoot, 'js', 'app.js'), 'utf8');

class FakeAudioParam {
  constructor() {
    this.value = 0;
  }

  setValueAtTime(value) {
    this.value = value;
  }

  exponentialRampToValueAtTime(value) {
    this.value = value;
  }
}

class FakeNode {
  connect() {}
}

class FakeOscillator extends FakeNode {
  constructor() {
    super();
    this.frequency = new FakeAudioParam();
    this.type = 'sine';
  }

  start() {}
  stop() {}
}

class FakeGain extends FakeNode {
  constructor() {
    super();
    this.gain = new FakeAudioParam();
  }
}

class FakeBufferSource extends FakeNode {
  start() {}
  stop() {}
}

class FakeFilter extends FakeNode {
  constructor() {
    super();
    this.frequency = { value: 0 };
    this.Q = { value: 0 };
    this.type = 'lowpass';
  }
}

class FakeBuffer {
  constructor(length) {
    this.length = length;
    this.data = new Float32Array(length);
  }

  getChannelData() {
    return this.data;
  }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.sampleRate = 44100;
    this.destination = {};
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }

  createOscillator() {
    return new FakeOscillator();
  }

  createGain() {
    return new FakeGain();
  }

  createBufferSource() {
    return new FakeBufferSource();
  }

  createBiquadFilter() {
    return new FakeFilter();
  }

  createBuffer(channels, length) {
    return new FakeBuffer(length);
  }
}

function createNowStub(values = []) {
  const queue = [...values];
  let lastValue = queue.length ? queue[queue.length - 1] : 0;

  return () => {
    if (queue.length) {
      lastValue = queue.shift();
    }
    return lastValue;
  };
}

function createApp(options = {}) {
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    pretendToBeVisual: true,
    runScripts: 'dangerously',
  });

  const { window } = dom;
  const rafCallbacks = [];

  if (options.storage) {
    Object.entries(options.storage).forEach(([key, value]) => {
      window.localStorage.setItem(key, value);
    });
  }

  window.AudioContext = FakeAudioContext;
  window.webkitAudioContext = FakeAudioContext;
  window.requestAnimationFrame = (callback) => {
    rafCallbacks.push(callback);
    return rafCallbacks.length;
  };
  window.cancelAnimationFrame = () => {};
  window.prompt = options.prompt || (() => 'Preset 1');
  window.confirm = options.confirm || (() => true);
  window.Date.now = createNowStub(options.nowValues);

  const instrumentedScript = appScript.replace(
    "document.addEventListener('DOMContentLoaded', () => {\n  const sound  = new SoundEngine();\n  const metro  = new Metronome(sound);\n  const store  = new SettingsStore();\n  new UI(metro, store); // eslint-disable-line no-new\n});",
    "(() => {\n  const sound  = new SoundEngine();\n  const metro  = new Metronome(sound);\n  window.__metro = metro;\n  window.__sound = sound;\n  const store  = new SettingsStore();\n  window.__ui = new UI(metro, store); // eslint-disable-line no-new\n})();"
  );

  const scriptEl = window.document.createElement('script');
  scriptEl.textContent = instrumentedScript;
  window.document.body.appendChild(scriptEl);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

  return {
    window,
    document: window.document,
    flushAnimationFrame() {
      const callback = rafCallbacks.shift();
      if (callback) callback(0);
    },
  };
}

module.exports = {
  createApp,
};
