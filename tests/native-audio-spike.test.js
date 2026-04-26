const fs = require('node:fs');
const path = require('node:path');

describe('native mobile Batch C scaffolding', () => {
  const projectRoot = path.resolve(__dirname, '..');

  function read(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
  }

  it('adds a dedicated native audio integration test suite', () => {
    const testFile = read('mobile/tests/integration/audio/transport.test.ts');

    expect(testFile).toContain('loads and schedules accented beats plus subdivisions ahead of playback time');
    expect(testFile).toContain('reschedules future beats after a stop/start cycle without leaking old queue state');
    expect(testFile).toContain('adapts future scheduling when the denominator changes while stopped');
    expect(testFile).toContain('unloads prepared clips when disposed');
    expect(testFile).toContain('does not double-load clips when prepare is called concurrently');
    expect(testFile).toContain('realigns overdue scheduler work instead of bunching late beats onto the current time');
  });

  it('expects audio engine and transport modules for the spike', () => {
    expect(fs.existsSync(path.join(projectRoot, 'mobile/src/audio/index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'mobile/src/audio/transport.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'mobile/src/audio/expoAudioEngine.ts'))).toBe(true);
  });
});