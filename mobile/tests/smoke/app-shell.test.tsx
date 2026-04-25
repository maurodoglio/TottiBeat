import { render } from '@testing-library/react-native';

import { EasyModeScreen } from '../../src/screens/EasyModeScreen';

describe('native app shell', () => {
  it('renders the native TottiBeat shell', () => {
    const { getByText } = render(<EasyModeScreen />);

    expect(getByText('TottiBeat')).toBeTruthy();
    expect(getByText('Easy mode controls will land in a later batch.')).toBeTruthy();
  });
});
