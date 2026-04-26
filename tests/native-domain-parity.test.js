const fs = require('node:fs');
const path = require('node:path');

describe('native mobile Batch B scaffolding', () => {
  const projectRoot = path.resolve(__dirname, '..');

  function read(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
  }

  it('adds a native metronome domain test suite covering parity behavior', () => {
    const testFile = read('mobile/tests/unit/domain/metronome-domain.test.ts');

    expect(testFile).toContain('preserves the web tempo-mark bucket boundaries');
    expect(testFile).toContain('keeps the time-signature denominator in the beat-interval math');
    expect(testFile).toContain('applies practice tempo increases only after the configured number of full bars');
    expect(testFile).toContain('creates preset records and empty slots with the current storage assumptions');
  });

  it('expects a dedicated native domain module barrel for Batch B', () => {
    const barrelPath = path.join(projectRoot, 'mobile/src/domain/metronome/index.ts');
    expect(fs.existsSync(barrelPath)).toBe(true);
  });
});