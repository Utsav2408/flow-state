import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from '../../auth/useAuth';
import { AuthContext } from '../../auth/context';

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
  });

  it('returns context value when provider is present', () => {
    const value = {
      user: { uid: 'u1' },
      role: 'admin',
      isAdmin: true,
      loading: false,
      firebaseConfigured: true,
      signInGoogle: () => {},
      signInEmail: () => {},
      signUpEmail: () => {},
      signOut: () => {},
    };

    const wrapper = ({ children }) => <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current).toBe(value);
  });
});
