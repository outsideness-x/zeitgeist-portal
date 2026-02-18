export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'READER' | 'AUTHOR' | 'ADMIN';
};

export type AuthState = {
  user: AuthUser | null;
  csrfToken: string | null;
  loading: boolean;
};

export type AuthStateAction =
  | {
    type: 'set-session';
    user: AuthUser;
    csrfToken: string;
  }
  | {
    type: 'clear-session';
  };

export const initialAuthState: AuthState = {
  user: null,
  csrfToken: null,
  loading: true,
};

const usersEqual = (left: AuthUser | null, right: AuthUser | null): boolean => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.id === right.id &&
    left.name === right.name &&
    left.email === right.email &&
    left.role === right.role
  );
};

const statesEqual = (left: AuthState, right: AuthState): boolean => {
  return left.loading === right.loading &&
    left.csrfToken === right.csrfToken &&
    usersEqual(left.user, right.user);
};

export const authStateReducer = (state: AuthState, action: AuthStateAction): AuthState => {
  if (action.type === 'set-session') {
    const nextState: AuthState = {
      user: action.user,
      csrfToken: action.csrfToken,
      loading: false,
    };
    return statesEqual(state, nextState) ? state : nextState;
  }

  const clearedState: AuthState = {
    user: null,
    csrfToken: null,
    loading: false,
  };
  return statesEqual(state, clearedState) ? state : clearedState;
};
