'use client';

import { useEffect, useMemo, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { PillButton } from '@/components/landing/PillButton';

const LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'How it works', href: '#how' },
  { label: 'Principles', href: '#principles' },
  { label: 'Results', href: '/dashboard/results' },
];

function initialsFor(email) {
  if (!email) return 'HL';
  const localPart = email.split('@')[0] || '';
  const words = localPart.replace(/[._-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return localPart.slice(0, 2).toUpperCase() || 'HL';
}

/**
 * Minimal sticky navigation. Session handling (current user, sign-out,
 * mobile menu) is carried over unchanged from the previous Navbar.
 */
export function LandingNav({ onSignIn }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    const onResize = () => {
      if (window.innerWidth > 820) setIsMobileOpen(false);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const closeMenu = () => setIsMobileOpen(false);

  const signIn = () => {
    closeMenu();
    onSignIn?.();
  };

  const signOut = async () => {
    if (!supabase || isSigningOut) return;
    setIsSigningOut(true);
    closeMenu();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out failed:', error);
      setIsSigningOut(false);
    }
  };

  const account = user ? (
    <div className="lp-nav__account">
      <span className="lp-nav__avatar" title={user.email || 'Signed-in user'} aria-label={`Signed in as ${user.email || 'user'}`}>
        {initialsFor(user.email)}
      </span>
      <a className="lp-nav__link" href="/dashboard" onClick={closeMenu}>
        Dashboard
      </a>
      <button type="button" className="lp-nav__text-button" onClick={signOut} disabled={isSigningOut}>
        {isSigningOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  ) : (
    <PillButton onClick={signIn}>Sign in</PillButton>
  );

  return (
    <header className={`lp-nav ${isScrolled ? 'is-scrolled' : ''}`}>
      <div className="lp-nav__shell lp-container">
        <a href="#product" className="lp-nav__brand" onClick={closeMenu} aria-label="HireLabs home">
          HireLabs
        </a>

        <nav className="lp-nav__links" aria-label="Primary navigation">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="lp-nav__link">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="lp-nav__actions">{account}</div>

        <button
          type="button"
          className="lp-nav__toggle"
          onClick={() => setIsMobileOpen((open) => !open)}
          aria-label={isMobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={isMobileOpen}
          aria-controls="lp-mobile-nav"
        >
          <span aria-hidden="true">{isMobileOpen ? '×' : '≡'}</span>
        </button>
      </div>

      <div
        id="lp-mobile-nav"
        className={`lp-nav__panel ${isMobileOpen ? 'is-open' : ''}`}
        inert={!isMobileOpen}
      >
        <nav aria-label="Mobile navigation">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="lp-nav__panel-link" onClick={closeMenu}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="lp-nav__panel-actions">{account}</div>
      </div>
    </header>
  );
}
