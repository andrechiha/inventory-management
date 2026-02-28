import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import './Login.css';

type Mode = 'sign-in' | 'sign-up';

interface FieldError {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function getPasswordStrength(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: '' };
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: 1, label: 'Weak' };
  if (s <= 2) return { score: 2, label: 'Fair' };
  if (s <= 3) return { score: 3, label: 'Good' };
  return { score: 4, label: 'Strong' };
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="btn-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
  </svg>
);

export default function Login() {
  const { user, role, loading: storeLoading, error: storeError, signIn, signUp } = useAuthStore();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (storeError) {
      showToast('error', storeError);
    }
  }, [storeError]);

  useEffect(() => {
    if (signUpSuccess) {
      showToast('success', 'Account created! Check your email for a confirmation link.');
    }
  }, [signUpSuccess]);

  if (user && !storeLoading) {
    const dest = role === 'client' ? '/shop' : '/dashboard';
    return <Navigate to={dest} replace />;
  }

  const isSignIn = mode === 'sign-in';
  const strength = getPasswordStrength(password);

  const fieldErrors: FieldError = useMemo(() => {
    const e: FieldError = {};
    if (!isSignIn && touched.fullName && !fullName.trim()) e.fullName = 'Full name is required';
    if (touched.email && email && !isValidEmail(email)) e.email = 'Enter a valid email address';
    if (!isSignIn && touched.password && password && password.length < 6) e.password = 'Must be at least 6 characters';
    if (!isSignIn && touched.confirmPassword && confirmPassword && password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  }, [isSignIn, touched, fullName, email, password, confirmPassword]);

  const isFormValid = useMemo(() => {
    if (!email || !password) return false;
    if (!isValidEmail(email)) return false;
    if (!isSignIn) {
      if (!fullName.trim()) return false;
      if (password.length < 6) return false;
      if (password !== confirmPassword) return false;
    }
    return true;
  }, [email, password, isSignIn, fullName, confirmPassword]);

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  }

  function markTouched(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    useAuthStore.setState({ error: null });

    try {
      if (isSignIn) {
        const ok = await signIn(email, password);
        if (ok) {
          const r = useAuthStore.getState().role;
          navigate(r === 'client' ? '/shop' : '/dashboard', { replace: true });
        }
      } else {
        const ok = await signUp(email, password, { full_name: fullName.trim() });
        if (ok) {
          setSignUpSuccess(true);
          setMode('sign-in');
          setPassword('');
          setConfirmPassword('');
          setFullName('');
          setTouched({});
        }
      }
    } catch {
      showToast('error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
    setSignUpSuccess(false);
    setTouched({});
    useAuthStore.setState({ error: null });
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb--1" />
      <div className="auth-bg-orb auth-bg-orb--2" />
      <div className="auth-bg-orb auth-bg-orb--3" />

      {toast && (
        <div className={`auth-toast auth-toast--${toast.type}`}>
          <span className="auth-toast-icon">{toast.type === 'success' ? '✓' : '!'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      <div className={`auth-card ${mounted ? 'auth-card--visible' : ''}`}>
        <div className="auth-brand">
          <div className="auth-logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="url(#logo-grad)" />
              <path d="M8 14.5L12 18.5L20 10.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="28" y2="28">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="auth-title">Inventory</h1>
          <p className="auth-subtitle">
            {isSignIn ? 'Welcome back. Sign in to continue.' : 'Create your account to get started.'}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${isSignIn ? 'auth-tab--active' : ''}`}
            onClick={() => mode !== 'sign-in' && toggleMode()}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${!isSignIn ? 'auth-tab--active' : ''}`}
            onClick={() => mode !== 'sign-up' && toggleMode()}
          >
            Sign Up
          </button>
          <div className={`auth-tab-indicator ${isSignIn ? '' : 'auth-tab-indicator--right'}`} />
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {!isSignIn && (
            <div className="auth-field">
              <label className="auth-label" htmlFor="fullName">Full Name</label>
              <div className={`auth-input-wrap ${fieldErrors.fullName ? 'auth-input-wrap--error' : ''}`}>
                <input
                  id="fullName"
                  type="text"
                  className="auth-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => markTouched('fullName')}
                  placeholder="John Doe"
                  autoComplete="name"
                />
              </div>
              {fieldErrors.fullName && <span className="auth-field-error">{fieldErrors.fullName}</span>}
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email</label>
            <div className={`auth-input-wrap ${fieldErrors.email ? 'auth-input-wrap--error' : ''}`}>
              <input
                id="email"
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => markTouched('email')}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <div className={`auth-input-wrap auth-input-wrap--pw ${fieldErrors.password ? 'auth-input-wrap--error' : ''}`}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => markTouched('password')}
                placeholder="Enter your password"
                autoComplete={isSignIn ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {fieldErrors.password && <span className="auth-field-error">{fieldErrors.password}</span>}
            {!isSignIn && password && (
              <div className="pw-strength">
                <div className="pw-strength-track">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`pw-strength-segment ${i <= strength.score ? `pw-strength--${strength.score}` : ''}`}
                    />
                  ))}
                </div>
                <span className={`pw-strength-label pw-strength-label--${strength.score}`}>{strength.label}</span>
              </div>
            )}
          </div>

          {!isSignIn && (
            <div className="auth-field">
              <label className="auth-label" htmlFor="confirmPassword">Confirm Password</label>
              <div className={`auth-input-wrap auth-input-wrap--pw ${fieldErrors.confirmPassword ? 'auth-input-wrap--error' : ''}`}>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="auth-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => markTouched('confirmPassword')}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-pw-toggle"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <span className="auth-field-error">{fieldErrors.confirmPassword}</span>}
              {!fieldErrors.confirmPassword && touched.confirmPassword && confirmPassword && password === confirmPassword && (
                <span className="auth-field-success">Passwords match</span>
              )}
            </div>
          )}

          {isSignIn && (
            <div className="auth-row">
              <label className="auth-checkbox-label">
                <input type="checkbox" className="auth-checkbox" />
                <span className="auth-checkbox-custom" />
                <span>Remember me</span>
              </label>
              <button type="button" className="auth-link-btn" onClick={() => showToast('error', 'Contact your administrator to reset your password.')}>
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={!isFormValid || submitting}
          >
            {submitting && <SpinnerIcon />}
            <span>{submitting ? (isSignIn ? 'Signing in...' : 'Creating account...') : (isSignIn ? 'Sign In' : 'Create Account')}</span>
          </button>
        </form>

        <p className="auth-footer-text">
          {isSignIn ? "Don't have an account?" : 'Already have an account?'}
          <button type="button" className="auth-switch-btn" onClick={toggleMode}>
            {isSignIn ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
