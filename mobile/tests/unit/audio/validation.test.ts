import {
  buildAudioValidationChecklist,
  summarizeAudioValidationReadiness,
} from '../../../src/audio/validation';

describe('audio validation helpers', () => {
  it('builds a device validation checklist with required passes for both platforms', () => {
    const checklist = buildAudioValidationChecklist();

    expect(checklist.map((item) => item.id)).toEqual([
      'iphone-start-latency',
      'android-start-latency',
      'slow-tempo-drift',
      'fast-tempo-drift',
      'restart-stability',
      'background-resume',
    ]);
    expect(checklist.every((item) => item.status === 'pending')).toBe(true);
  });

  it('summarizes readiness across pending, failed, and fully passed states', () => {
    const checklist = buildAudioValidationChecklist();

    expect(summarizeAudioValidationReadiness(checklist)).toEqual({
      ready: false,
      completed: 0,
      total: 6,
      failed: 0,
      summary: '0 of 6 validation checks passed',
    });

    const blockedChecklist = checklist.map((item, index) => ({
      ...item,
      status: index === 0 ? ('failed' as const) : item.status,
    }));

    expect(summarizeAudioValidationReadiness(blockedChecklist)).toEqual({
      ready: false,
      completed: 0,
      total: 6,
      failed: 1,
      summary: '0 of 6 validation checks passed · 1 failed',
    });

    const completedChecklist = checklist.map((item) => ({
      ...item,
      status: 'passed' as const,
    }));

    expect(summarizeAudioValidationReadiness(completedChecklist)).toEqual({
      ready: true,
      completed: 6,
      total: 6,
      failed: 0,
      summary: '6 of 6 validation checks passed',
    });
  });
});
