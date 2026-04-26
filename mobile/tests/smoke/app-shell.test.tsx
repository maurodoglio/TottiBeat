import { render } from '@testing-library/react-native';

import { EasyModeScreen } from '../../src/screens/EasyModeScreen';
import { ExpertModeScreen } from '../../src/screens/ExpertModeScreen';
import { SettingsScreen } from '../../src/screens/SettingsScreen';

describe('native app shell', () => {
  it('renders a native-style easy mode dashboard with accessible transport actions', () => {
    const { getByRole, getByText } = render(<EasyModeScreen />);

    expect(getByText('TottiBeat')).toBeTruthy();
    expect(getByText('120')).toBeTruthy();
    expect(getByText('4/4')).toBeTruthy();
    expect(getByRole('button', { name: 'Play', disabled: true })).toBeTruthy();
    expect(getByRole('button', { name: 'Tap tempo', disabled: true })).toBeTruthy();
    expect(getByText('Native feel preview')).toBeTruthy();
  });

  it('renders an expert screen with advanced cards and subdivision copy', () => {
    const { getByText } = render(<ExpertModeScreen />);

    expect(getByText('Expert Mode')).toBeTruthy();
    expect(getByText('Beat subdivision')).toBeTruthy();
    expect(getByText('Practice ramp')).toBeTruthy();
    expect(getByText('Preset slots')).toBeTruthy();
  });

  it('renders a settings screen with a device audio validation checklist preview', () => {
    const { getByText } = render(<SettingsScreen />);

    expect(getByText('Audio validation preview')).toBeTruthy();
    expect(getByText('Run latency pass')).toBeTruthy();
    expect(getByText('Slow tempo drift')).toBeTruthy();
    expect(getByText('Fast tempo drift')).toBeTruthy();
    expect(getByText('Wake lock')).toBeTruthy();
  });
});
