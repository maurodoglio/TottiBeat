import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { configureAudioSession, createAudioTransport } from '../../src/audio';
import { EasyModeScreen } from '../../src/screens/EasyModeScreen';
import { ExpertModeScreen } from '../../src/screens/ExpertModeScreen';
import { SettingsScreen } from '../../src/screens/SettingsScreen';

const mockTransport = {
  prepare: jest.fn().mockResolvedValue(undefined),
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn(),
  updateState: jest.fn(),
  schedulerTick: jest.fn().mockResolvedValue(1),
  dispose: jest.fn().mockResolvedValue(undefined),
  getDebugState: jest.fn(() => ({
    isPlaying: false,
    queuedNotes: 0,
    currentBeat: 0,
    nextNoteTime: 0.05,
  })),
  cancelScheduled: jest.fn(),
};

jest.mock('../../src/audio', () => ({
  configureAudioSession: jest.fn().mockResolvedValue(undefined),
  createAudioTransport: jest.fn(() => mockTransport),
  createExpoAudioEngine: jest.fn(() => ({ kind: 'engine', cancelScheduled: jest.fn() })),
  buildAudioValidationChecklist: jest.fn(() => ([
    { id: 'latency', label: 'Run latency pass', status: 'pending', detail: 'Preview checklist item.' },
    { id: 'slow-drift', label: 'Slow tempo drift', status: 'pending', detail: 'Preview checklist item.' },
    { id: 'fast-drift', label: 'Fast tempo drift', status: 'pending', detail: 'Preview checklist item.' },
    { id: 'wake-lock', label: 'Wake lock', status: 'pending', detail: 'Preview checklist item.' },
  ])),
  summarizeAudioValidationReadiness: jest.fn(() => ({
    completed: 0,
    failed: 0,
    ready: false,
    summary: '0 of 4 checks completed.',
    total: 4,
  })),
}));

jest.mock('../../src/components/ScreenContainer', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View, Text } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    ScreenContainer: ({ title, subtitle, eyebrow, headerAccessory, footer, children }: {
      title: string;
      subtitle?: string;
      eyebrow?: string;
      headerAccessory?: React.ReactNode;
      footer?: React.ReactNode;
      children?: React.ReactNode;
    }) => (
      <View>
        {eyebrow ? <Text>{eyebrow}</Text> : null}
        <Text accessibilityRole="header">{title}</Text>
        {subtitle ? <Text>{subtitle}</Text> : null}
        {headerAccessory}
        {children}
        {footer}
      </View>
    ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockTransport.prepare.mockResolvedValue(undefined);
  mockTransport.start.mockResolvedValue(undefined);
  mockTransport.stop.mockImplementation(() => undefined);
  mockTransport.schedulerTick.mockResolvedValue(1);
  mockTransport.dispose.mockResolvedValue(undefined);
  mockTransport.cancelScheduled.mockImplementation(() => undefined);
  mockTransport.getDebugState.mockReturnValue({
    isPlaying: false,
    queuedNotes: 0,
    currentBeat: 0,
    nextNoteTime: 0.05,
  });
});

describe('native app shell', () => {
  it('renders a functional easy mode dashboard with live controls instead of preview-only actions', () => {
    const { getByDisplayValue, getByRole, getAllByText, getByLabelText } = render(<EasyModeScreen />);

    expect(getAllByText('TottiBeat').length).toBeGreaterThan(0);
    expect(getByDisplayValue('120')).toBeTruthy();
    expect(getAllByText('4/4').length).toBeGreaterThan(0);
    expect(getByRole('button', { name: 'Start' })).toBeTruthy();
    expect(getByRole('button', { name: 'Tap tempo' })).toBeTruthy();
    expect(getAllByText('Tempo').length).toBeGreaterThan(0);
    expect(getAllByText('Time signature').length).toBeGreaterThan(0);
    expect(getByLabelText('Time signature numerator choices')).toBeTruthy();
    expect(getByLabelText('Time signature denominator choices')).toBeTruthy();
  });

  it('updates BPM from one-thumb controls and tap tempo while syncing the audio transport state', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1_000).mockReturnValueOnce(1_500);

    const { getByDisplayValue, getByLabelText, getByRole } = render(<EasyModeScreen />);

    mockTransport.updateState.mockClear();
    fireEvent.press(getByRole('button', { name: 'Increase BPM' }));
    expect(getByDisplayValue('121')).toBeTruthy();
    expect(mockTransport.updateState).toHaveBeenLastCalledWith(expect.objectContaining({ bpm: 121 }));

    fireEvent.changeText(getByLabelText('BPM input'), '96');
    fireEvent(getByLabelText('BPM input'), 'blur');
    expect(getByDisplayValue('96')).toBeTruthy();
    expect(mockTransport.updateState).toHaveBeenLastCalledWith(expect.objectContaining({ bpm: 96 }));

    fireEvent.press(getByRole('button', { name: 'Tap tempo' }));
    fireEvent.press(getByRole('button', { name: 'Tap tempo' }));
    expect(getByDisplayValue('120')).toBeTruthy();
    expect(getByRole('button', { name: 'Tap tempo · 120 BPM' })).toBeTruthy();

    nowSpy.mockRestore();
  });

  it('starts and stops the native transport while keeping time-signature controls wired', async () => {
    const { getByRole, getByText } = render(<EasyModeScreen />);

    fireEvent.press(getByRole('radio', { name: '6 beats per bar' }));
    expect(getByText('6/4')).toBeTruthy();
    expect(mockTransport.updateState).toHaveBeenLastCalledWith(expect.objectContaining({ beatsPerBar: 6 }));

    fireEvent.press(getByRole('radio', { name: 'Set denominator to 8' }));
    expect(getByText('6/8')).toBeTruthy();
    expect(mockTransport.updateState).toHaveBeenLastCalledWith(expect.objectContaining({ noteValue: 8 }));

    await act(async () => {
      fireEvent.press(getByRole('button', { name: 'Start' }));
    });
    expect(configureAudioSession).toHaveBeenCalled();
    expect(mockTransport.start).toHaveBeenCalled();
    expect(createAudioTransport).toHaveBeenCalled();

    await waitFor(() => {
      expect(getByRole('button', { name: 'Stop' })).toBeTruthy();
    });

    fireEvent.press(getByRole('button', { name: 'Stop' }));
    expect(mockTransport.stop).toHaveBeenCalled();
  });

  it('guards against duplicate start requests while native playback is still starting', async () => {
    let resolveStart: (() => void) | null = null;
    mockTransport.start.mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        resolveStart = resolve;
      }),
    );

    const { getByRole } = render(<EasyModeScreen />);
    const startButton = getByRole('button', { name: 'Start' });

    await act(async () => {
      fireEvent.press(startButton);
      fireEvent.press(startButton);
    });
    expect(configureAudioSession).toHaveBeenCalledTimes(1);

    expect(getByRole('button', { name: 'Starting…', disabled: true })).toBeTruthy();
    expect(mockTransport.start).toHaveBeenCalledTimes(1);

    resolveStart?.();
    await waitFor(() => {
      expect(getByRole('button', { name: 'Stop' })).toBeTruthy();
    });
  });

  it('cleans up a pending startup if the screen unmounts before transport start resolves', async () => {
    let resolveStart: (() => void) | null = null;
    mockTransport.start.mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        resolveStart = resolve;
      }),
    );

    const { getByRole, unmount } = render(<EasyModeScreen />);

    await act(async () => {
      fireEvent.press(getByRole('button', { name: 'Start' }));
    });

    expect(configureAudioSession).toHaveBeenCalled();
    unmount();
    resolveStart?.();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockTransport.stop).toHaveBeenCalled();
    expect(mockTransport.dispose).toHaveBeenCalled();
  });

  it('renders an expert screen with advanced cards and subdivision copy', () => {
    const { getByText } = render(<ExpertModeScreen />);

    expect(getByText('Expert Mode')).toBeTruthy();
    expect(getByText('Beat subdivision')).toBeTruthy();
    expect(getByText('Practice ramp')).toBeTruthy();
    expect(getByText('Preset slots')).toBeTruthy();
  });

  it('renders a settings screen with a device audio validation checklist preview', () => {
    const { getAllByText, getByText } = render(<SettingsScreen />);

    expect(getByText('Audio validation preview')).toBeTruthy();
    expect(getByText('Run latency pass')).toBeTruthy();
    expect(getByText('Slow tempo drift')).toBeTruthy();
    expect(getByText('Fast tempo drift')).toBeTruthy();
    expect(getAllByText('Wake lock').length).toBeGreaterThan(0);
  });
});
