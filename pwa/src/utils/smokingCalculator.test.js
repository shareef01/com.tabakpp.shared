import { describe, it, expect } from 'vitest';
import { SmokingCalculator } from './smokingCalculator';

describe('SmokingCalculator', () => {
  const mockConfigs = [
    { id: 'c1', limit: 20, pricePerUnit: 0.5 },
    { id: 'c2', limit: 5, pricePerUnit: 0 }
  ];

  it('calculates total count correctly', () => {
    const log = { counts: { c1: 5, c2: 2 } };
    expect(SmokingCalculator.getTotalCount(log, mockConfigs)).toBe(7);
  });

  it('calculates total limit correctly', () => {
    expect(SmokingCalculator.getTotalLimit(mockConfigs)).toBe(25);
  });

  it('calculates life lost correctly (11 mins per unit)', () => {
    const logs = [{ counts: { c1: 2 } }];
    expect(SmokingCalculator.calculateLifeLostMinutes(logs)).toBe(22);
  });

  it('gets correct rank based on XP', () => {
    expect(SmokingCalculator.getRank(50)).toBe('Apprentice');
    expect(SmokingCalculator.getRank(1000)).toBe('Veteran');
    expect(SmokingCalculator.getRank(2000)).toBe('Master');
    expect(SmokingCalculator.getRank(6000)).toBe('Legend');
  });

  it('calculates savings correctly with global fallback', () => {
    const logs = [{ counts: { c1: 2, c2: 2 } }];
    const globalCost = 1.0;
    // c1 has pricePerUnit 0.5, c2 has 0 (fallback to global 1.0)
    // (2 * 0.5) + (2 * 1.0) = 3.0
    expect(SmokingCalculator.calculateSavings(logs, mockConfigs, globalCost)).toBe(3.0);
  });

  it('calculates recovery milestones', () => {
    const milestones = SmokingCalculator.calculateRecoveryMilestones(Date.now() - 1000 * 60 * 60); // 1 hour ago
    expect(milestones[0].title).toBe("Heart Rate Normalizes");
    expect(milestones[0].progress).toBe(1); // 1 hour > 20 mins
  });
});
