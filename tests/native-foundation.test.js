const fs = require('node:fs');
const path = require('node:path');

describe('native mobile foundation batch', () => {
  const projectRoot = path.resolve(__dirname, '..');

  function read(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
  }

  it('adds a mobile workspace package with the expected native scripts', () => {
    const packageJson = JSON.parse(read('mobile/package.json'));

    expect(packageJson.name).toBe('tottibeat-mobile');
    expect(packageJson.scripts.start).toContain('expo start');
    expect(packageJson.scripts.ios).toContain('expo run:ios');
    expect(packageJson.scripts.android).toContain('expo run:android');
    expect(packageJson.scripts.test).toBeTruthy();
    expect(packageJson.scripts.lint).toBeTruthy();
  });

  it('adds the native migration docs for product scope, parity, and stack decisions', () => {
    const productSpec = read('docs/mobile/native-product-spec.md');
    const parityChecklist = read('docs/mobile/parity-checklist.md');
    const adr = read('docs/mobile/adr-001-mobile-stack.md');

    expect(productSpec).toContain('TottiBeat Native Product Spec');
    expect(productSpec).toContain('Easy mode');
    expect(parityChecklist).toContain('Time signature fractions');
    expect(parityChecklist).toContain('Practice mode');
    expect(adr).toContain('React Native + Expo');
    expect(adr).toContain('audio precision');
  });

  it('adds a mobile CI workflow that installs, lints, and tests the mobile workspace', () => {
    const workflow = read('.github/workflows/mobile-ci.yml');

    expect(workflow).toContain('name: Mobile CI');
    expect(workflow).toContain('working-directory: mobile');
    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm run lint');
    expect(workflow).toContain('npm test');
  });

  it('documents the new native workspace in the root README', () => {
    const readme = read('README.md');

    expect(readme).toContain('## Native mobile app');
    expect(readme).toContain('mobile/');
    expect(readme).toContain('cd mobile');
  });
});
