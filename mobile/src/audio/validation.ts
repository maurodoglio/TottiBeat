export type AudioValidationStatus = 'pending' | 'passed' | 'failed';

export type AudioValidationCheck = {
  id:
    | 'iphone-start-latency'
    | 'android-start-latency'
    | 'slow-tempo-drift'
    | 'fast-tempo-drift'
    | 'restart-stability'
    | 'background-resume';
  label: string;
  detail: string;
  status: AudioValidationStatus;
};

const DEFAULT_AUDIO_VALIDATION_CHECKS: Omit<AudioValidationCheck, 'status'>[] = [
  {
    id: 'iphone-start-latency',
    label: 'Run latency pass',
    detail: 'Measure first-click responsiveness on iPhone hardware before transport sign-off.',
  },
  {
    id: 'android-start-latency',
    label: 'Android start latency',
    detail: 'Verify first-click timing on at least one Pixel-class Android device.',
  },
  {
    id: 'slow-tempo-drift',
    label: 'Slow tempo drift',
    detail: 'Listen for drift between 40 and 60 BPM during a sustained practice session.',
  },
  {
    id: 'fast-tempo-drift',
    label: 'Fast tempo drift',
    detail: 'Stress-test the transport between 180 and 240 BPM for bursty or unstable playback.',
  },
  {
    id: 'restart-stability',
    label: 'Restart stability',
    detail: 'Confirm repeated stop/start cycles keep the next count-in aligned and artifact-free.',
  },
  {
    id: 'background-resume',
    label: 'Background resume',
    detail: 'Check how playback behaves after interruptions, app switches, and lock-screen returns.',
  },
];

export type AudioValidationReadiness = {
  ready: boolean;
  completed: number;
  total: number;
  failed: number;
  summary: string;
};

export function buildAudioValidationChecklist(): AudioValidationCheck[] {
  return DEFAULT_AUDIO_VALIDATION_CHECKS.map((item) => ({
    ...item,
    status: 'pending',
  }));
}

export function summarizeAudioValidationReadiness(
  checklist: AudioValidationCheck[],
): AudioValidationReadiness {
  const completed = checklist.filter((item) => item.status === 'passed').length;
  const failed = checklist.filter((item) => item.status === 'failed').length;
  const total = checklist.length;
  const baseSummary = `${completed} of ${total} validation checks passed`;

  return {
    ready: total > 0 && completed === total,
    completed,
    total,
    failed,
    summary: failed > 0 ? `${baseSummary} · ${failed} failed` : baseSummary,
  };
}
