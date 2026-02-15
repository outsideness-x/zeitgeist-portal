import type { SubmissionStatus } from '@prisma/client';

const transitions: Record<SubmissionStatus, SubmissionStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['IN_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES'],
  IN_REVIEW: ['NEEDS_CHANGES', 'APPROVED', 'REJECTED'],
  NEEDS_CHANGES: ['RESUBMITTED', 'REJECTED'],
  RESUBMITTED: ['IN_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES'],
  APPROVED: ['PUBLISHED'],
  PUBLISHED: [],
  REJECTED: [],
};

// this keeps editorial transitions explicit and prevents invalid state jumps
export const canTransitionSubmission = (from: SubmissionStatus, to: SubmissionStatus) => {
  return transitions[from].includes(to);
};

export const assertTransition = (from: SubmissionStatus, to: SubmissionStatus) => {
  if (!canTransitionSubmission(from, to)) {
    throw new Error(`invalid submission status transition from ${from} to ${to}`);
  }
};

export const transitionFromUploadComplete = (status: SubmissionStatus): SubmissionStatus => {
  if (status === 'NEEDS_CHANGES' || status === 'RESUBMITTED') {
    return 'RESUBMITTED';
  }
  if (status === 'DRAFT' || status === 'SUBMITTED' || status === 'IN_REVIEW') {
    return 'SUBMITTED';
  }
  throw new Error(`upload is not allowed for submission status ${status}`);
};

export const transitionFromAuthorResubmit = (status: SubmissionStatus): SubmissionStatus => {
  if (status === 'NEEDS_CHANGES') {
    return 'RESUBMITTED';
  }
  if (status === 'DRAFT') {
    return 'SUBMITTED';
  }
  throw new Error(`resubmit is not allowed for submission status ${status}`);
};
