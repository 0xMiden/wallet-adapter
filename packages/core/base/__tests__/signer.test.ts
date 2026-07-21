import { describe, it, expect } from 'vitest';
import type { GuardianInfo } from '../types';

describe('GuardianInfo', () => {
  it('has the agreed shape', () => {
    const g: GuardianInfo = {
      isGuardianAccount: false,
      guardianEndpoint: null,
      guardianProvider: null,
      guardianSyncStatus: null,
    };

    expect(Object.keys(g).sort()).toEqual([
      'guardianEndpoint',
      'guardianProvider',
      'guardianSyncStatus',
      'isGuardianAccount',
    ]);
  });
});
