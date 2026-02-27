import { describe, expect, it } from 'vitest';
import {
  canTransitionSubmission,
  transitionFromAuthorResubmit,
  transitionFromUploadComplete,
} from '../src/lib/submission-workflow.js';

describe('submission workflow transitions', () => {
  it('allows only declared state transitions', () => {
    expect(canTransitionSubmission('DRAFT', 'SUBMITTED')).toBe(true);
    expect(canTransitionSubmission('SUBMITTED', 'IN_REVIEW')).toBe(true);
    expect(canTransitionSubmission('SUBMITTED', 'PUBLISHED')).toBe(false);
    expect(canTransitionSubmission('REJECTED', 'SUBMITTED')).toBe(false);
  });

  it('maps upload complete transition to submitted or resubmitted', () => {
    expect(transitionFromUploadComplete('DRAFT')).toBe('SUBMITTED');
    expect(transitionFromUploadComplete('IN_REVIEW')).toBe('SUBMITTED');
    expect(transitionFromUploadComplete('NEEDS_CHANGES')).toBe('RESUBMITTED');
  });

  it('maps author resubmit transition correctly', () => {
    expect(transitionFromAuthorResubmit('DRAFT')).toBe('SUBMITTED');
    expect(transitionFromAuthorResubmit('NEEDS_CHANGES')).toBe('RESUBMITTED');
    expect(() => transitionFromAuthorResubmit('SUBMITTED')).toThrow();
  });
});
