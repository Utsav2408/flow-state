import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../../auth/AuthContext';
import { useAuth } from '../../auth/useAuth';

const mockOnAuthStateChanged = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockFirebaseSignOut = vi.fn();
const mockOnValue = vi.fn();
const mockRef = vi.fn((_, path) => path);

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args) => mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args) => mockSignInWithEmailAndPassword(...args),
  signInWithPopup: (...args) => mockSignInWithPopup(...args),
  signOut: (...args) => mockFirebaseSignOut(...args),
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
}));

vi.mock('../../firebase', () => ({
  auth: { id: 'auth' },
  db: { id: 'db' },
  googleProvider: { id: 'google' },
  ref: (...args) => mockRef(...args),
  onValue: (...args) => mockOnValue(...args),
}));

function AuthConsumer() {
  const auth = useAuth();
  return (
    <div>
      <div>{`loading:${String(auth.loading)}`}</div>
      <div>{`isAdmin:${String(auth.isAdmin)}`}</div>
      <div>{`role:${String(auth.role)}`}</div>
      <div>{`configured:${String(auth.firebaseConfigured)}`}</div>
      <button type="button" onClick={() => auth.signInGoogle()}>
        Google
      </button>
      <button type="button" onClick={() => auth.signInEmail('a@b.com', 'pw')}>
        EmailIn
      </button>
      <button type="button" onClick={() => auth.signUpEmail('a@b.com', 'pw')}>
        EmailUp
      </button>
      <button type="button" onClick={() => auth.signOut()}>
        Out
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithPopup.mockResolvedValue(undefined);
    mockSignInWithEmailAndPassword.mockResolvedValue(undefined);
    mockCreateUserWithEmailAndPassword.mockResolvedValue(undefined);
    mockFirebaseSignOut.mockResolvedValue(undefined);
  });

  it('resolves admin role and exposes auth actions', async () => {
    const unsubAuth = vi.fn();
    const unsubRole = vi.fn();

    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: 'u1', email: 'admin@test.com' });
      return unsubAuth;
    });

    mockOnValue.mockImplementation((_path, onData) => {
      onData({ val: () => 'admin' });
      return unsubRole;
    });

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('loading:false')).toBeInTheDocument();
      expect(screen.getByText('isAdmin:true')).toBeInTheDocument();
      expect(screen.getByText('role:admin')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Google' }));
    await user.click(screen.getByRole('button', { name: 'EmailIn' }));
    await user.click(screen.getByRole('button', { name: 'EmailUp' }));
    await user.click(screen.getByRole('button', { name: 'Out' }));

    expect(mockSignInWithPopup).toHaveBeenCalled();
    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith({ id: 'auth' }, 'a@b.com', 'pw');
    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith({ id: 'auth' }, 'a@b.com', 'pw');
    expect(mockFirebaseSignOut).toHaveBeenCalledWith({ id: 'auth' });
  });

  it('falls back to fan role when role listener errors', async () => {
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: 'u2' });
      return vi.fn();
    });
    mockOnValue.mockImplementation((_path, _onData, onErr) => {
      onErr(new Error('rtdb down'));
      return vi.fn();
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('isAdmin:false')).toBeInTheDocument();
      expect(screen.getByText('role:fan')).toBeInTheDocument();
      expect(screen.getByText('configured:true')).toBeInTheDocument();
    });
  });
});
