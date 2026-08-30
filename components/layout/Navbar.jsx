import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '../../lib/supabase/client';

/**
 * HireLabs Navigation
 *
 * Minimal editorial navigation system using the
 * Cream / Espresso / Olive visual language.
 *
 * Existing functionality preserved:
 * - Auth modal
 * - Desktop navigation
 * - Mobile navigation drawer
 * - Scroll state
 * - Launch ATS anchor
 */
export function Navbar({ onOpenAuthModal }) {
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

  const getUserInitials = (email) => {
    if (!email) return 'HL';

    const localPart = email.split('@')[0] || '';
    const words = localPart
      .replace(/[._-]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    return localPart.slice(0, 2).toUpperCase() || 'HL';
  };

  const getAvatarStyle = (email) => {
    let hash = 0;

    for (let index = 0; index < (email || '').length; index += 1) {
      hash = (hash * 31 + email.charCodeAt(index)) >>> 0;
    }

    const hue = hash % 360;
    const secondHue = (hue + 42) % 360;

    return {
      background: `linear-gradient(135deg, hsl(${hue} 18% 24%), hsl(${secondHue} 22% 38%))`,
    };
  };

  const userInitials = getUserInitials(user?.email);
  const userAvatarStyle = getAvatarStyle(user?.email);

  const handleSignOut = async () => {
    if (!supabase || isSigningOut) return;

    setIsSigningOut(true);
    closeMobileMenu();

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

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setUser(data.user ?? null);
    };

    void loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    const handleResize = () => {
      if (window.innerWidth > 820) {
        setIsMobileOpen(false);
      }
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  const scrollToDemo = () => {
    closeMobileMenu();

    const element = document.getElementById('demo');

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  const navigation = [
    {
      label: 'Features',
      href: '#features',
    },
    {
      label: 'Sandbox',
      href: '#demo',
    },
    {
      label: 'Architecture',
      href: '#architecture',
    },
    {
      label: 'Comparison',
      href: '#comparison',
    },
    {
      label: 'Security',
      href: '#security',
    },
  ];

  return (
    <>
      <style>{`
        .hl-navbar {
          --cream: #F5F1E8;
          --white: #FFFFFF;
          --espresso: #211C18;
          --espresso-soft: #6C6259;
          --olive: #6F7D55;
          --olive-dark: #596544;
          --border: #DED7CA;

          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;

          background: rgba(245, 241, 232, 0.78);

          border-bottom: 1px solid rgba(222, 215, 202, 0.72);

          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);

          transition:
            background 220ms ease,
            box-shadow 220ms ease,
            border-color 220ms ease;
        }

        .hl-navbar.scrolled {
          background: rgba(245, 241, 232, 0.94);
          border-bottom-color: var(--border);
          box-shadow:
            0 8px 28px rgba(33, 28, 24, 0.045);
        }

        .hl-navbar-shell {
          width: min(1280px, calc(100% - 48px));
          min-height: 76px;
          margin: 0 auto;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
        }

        /* -------------------------
           Brand
           ------------------------- */

        .hl-navbar-brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;

          color: var(--espresso);

          text-decoration: none;
          flex-shrink: 0;
        }

        .hl-brand-mark {
          width: 36px;
          height: 36px;

          display: grid;
          place-items: center;

          border-radius: 11px;

          background: var(--espresso);
          color: var(--cream);

          box-shadow:
            0 5px 14px rgba(33, 28, 24, 0.1);

          transition:
            transform 180ms ease,
            background 180ms ease;
        }

        .hl-navbar-brand:hover .hl-brand-mark {
          transform: translateY(-1px);
          background: var(--olive-dark);
        }

        .hl-brand-wordmark {
          display: inline-flex;
          align-items: baseline;

          font-family:
            'DM Sans',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;

          font-size: 21px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: -0.045em;
        }

        .hl-brand-wordmark span {
          color: var(--olive);
        }

        .hl-brand-version {
          display: inline-flex;
          align-items: center;
          gap: 6px;

          margin-left: 3px;

          padding: 7px 9px;

          border: 1px solid var(--border);
          border-radius: 999px;

          background: rgba(255, 255, 255, 0.5);

          color: #756C63;

          font-size: 7px;
          line-height: 1;

          font-weight: 900;

          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .hl-brand-version-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--olive);
        }

        .hl-navbar-user-area {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .hl-navbar-avatar {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(111, 125, 85, 0.3);
          border-radius: 50%;
          background: linear-gradient(135deg, #211C18, #596544);
          color: #F5F1E8;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.04em;
          box-shadow: 0 5px 14px rgba(33, 28, 24, 0.12);
          user-select: none;
        }

        .hl-navbar-avatar[title] {
          cursor: default;
        }

        .hl-navbar-signout {
          min-height: 38px;
          padding: 0 14px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.56);
          color: #746B62;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition: background 180ms ease, color 180ms ease, transform 180ms ease;
        }

        .hl-navbar-signout:hover {
          background: var(--espresso);
          color: var(--cream);
          transform: translateY(-1px);
        }

        .hl-navbar-signout:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        /* -------------------------
           Desktop navigation
           ------------------------- */

        .hl-navbar-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 29px;

          margin-left: auto;
        }

        .hl-navbar-link {
          position: relative;

          padding: 8px 0;

          color: #746B62;

          font-size: 11px;
          line-height: 1;

          font-weight: 700;

          letter-spacing: -0.005em;

          text-decoration: none;

          transition:
            color 170ms ease;
        }

        .hl-navbar-link::after {
          content: '';

          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;

          height: 1px;

          background: var(--olive);

          transform: scaleX(0);
          transform-origin: center;

          transition:
            transform 190ms ease;
        }

        .hl-navbar-link:hover {
          color: var(--espresso);
        }

        .hl-navbar-link:hover::after {
          transform: scaleX(1);
        }

        /* -------------------------
           Actions
           ------------------------- */

        .hl-navbar-actions {
          display: flex;
          align-items: center;
          gap: 9px;

          flex-shrink: 0;
        }

        .hl-navbar-signin {
          min-height: 38px;

          padding: 0 12px;

          border: 1px solid transparent;

          border-radius: 10px;

          background: transparent;

          color: #756C63;

          font-family:
            'DM Sans',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;

          font-size: 10px;
          font-weight: 800;

          cursor: pointer;

          transition:
            color 170ms ease,
            background 170ms ease,
            border-color 170ms ease,
            transform 170ms ease;
        }

        .hl-navbar-signin:hover {
          color: var(--espresso);
          border-color: var(--border);
          background: rgba(255,255,255,0.45);
          transform: translateY(-1px);
        }

        .hl-navbar-launch {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;

          min-height: 40px;

          padding: 0 15px;

          border: 1px solid var(--espresso);
          border-radius: 11px;

          background: var(--espresso);
          color: var(--cream);

          font-family:
            'DM Sans',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;

          font-size: 10px;
          font-weight: 800;

          cursor: pointer;

          box-shadow:
            0 8px 18px rgba(33, 28, 24, 0.1);

          transition:
            transform 180ms ease,
            background 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .hl-navbar-launch:hover {
          transform: translateY(-1px);

          background: var(--olive-dark);
          border-color: var(--olive-dark);

          box-shadow:
            0 11px 24px rgba(89, 101, 68, 0.14);
        }

        .hl-navbar-launch svg {
          transition:
            transform 170ms ease;
        }

        .hl-navbar-launch:hover svg {
          transform: translateX(2px);
        }

        /* -------------------------
           Mobile trigger
           ------------------------- */

        .hl-mobile-toggle {
          width: 40px;
          height: 40px;

          display: none;

          place-items: center;

          border: 1px solid var(--border);
          border-radius: 11px;

          background: rgba(255,255,255,0.52);
          color: var(--espresso);

          cursor: pointer;

          transition:
            background 170ms ease,
            border-color 170ms ease;
        }

        .hl-mobile-toggle:hover {
          background: var(--white);
          border-color: #CEC5B7;
        }

        /* -------------------------
           Mobile menu
           ------------------------- */

        .hl-mobile-panel {
          position: fixed;
          top: 76px;
          left: 14px;
          right: 14px;

          padding: 12px;

          border: 1px solid var(--border);
          border-radius: 20px;

          background: rgba(255,255,255,0.95);

          box-shadow:
            0 24px 65px rgba(33, 28, 24, 0.12);

          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);

          transform:
            translateY(-10px)
            scale(0.98);

          opacity: 0;
          pointer-events: none;

          transition:
            opacity 180ms ease,
            transform 220ms ease;
        }

        .hl-mobile-panel.open {
          transform:
            translateY(0)
            scale(1);

          opacity: 1;
          pointer-events: auto;
        }

        .hl-mobile-nav {
          display: grid;
          gap: 3px;
        }

        .hl-mobile-link {
          display: flex;
          align-items: center;
          justify-content: space-between;

          min-height: 52px;

          padding: 0 14px;

          border-radius: 13px;

          color: var(--espresso);

          font-family:
            'DM Sans',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;

          font-size: 13px;
          font-weight: 700;

          text-decoration: none;

          transition:
            background 160ms ease,
            color 160ms ease;
        }

        .hl-mobile-link:hover {
          background: #F0ECE3;
          color: var(--olive-dark);
        }

        .hl-mobile-link::after {
          content: '→';
          color: #9B9388;
          font-size: 13px;
        }

        .hl-mobile-divider {
          height: 1px;
          margin: 8px 4px;
          background: var(--border);
        }

        .hl-mobile-actions {
          display: grid;
          gap: 7px;
        }

        .hl-mobile-signin,
        .hl-mobile-launch {
          width: 100%;
          min-height: 48px;

          border-radius: 12px;

          font-size: 11px;
          font-weight: 800;

          cursor: pointer;
        }

        .hl-mobile-signin {
          border: 1px solid var(--border);
          background: var(--cream);
          color: var(--espresso);
        }

        .hl-mobile-launch {
          border: 1px solid var(--espresso);
          background: var(--espresso);
          color: var(--cream);
        }

        @media (max-width: 1050px) {
          .hl-navbar-nav {
            gap: 20px;
          }

          .hl-navbar-link {
            font-size: 10px;
          }
        }

        @media (max-width: 820px) {
          .hl-navbar-shell {
            min-height: 70px;
            width: min(100% - 28px, 1280px);
          }

          .hl-navbar-nav,
          .hl-navbar-signin,
          .hl-navbar-launch {
            display: none;
          }

          .hl-mobile-toggle {
            display: grid;
          }

          .hl-brand-version {
            display: none;
          }

          .hl-mobile-panel {
            top: 76px;
          }
        }

        @media (max-width: 480px) {
          .hl-brand-wordmark {
            font-size: 19px;
          }

          .hl-brand-mark {
            width: 34px;
            height: 34px;
          }

          .hl-navbar-shell {
            min-height: 66px;
          }

          .hl-mobile-panel {
            top: 70px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hl-navbar,
          .hl-navbar-link::after,
          .hl-navbar-link,
          .hl-navbar-launch,
          .hl-navbar-launch svg,
          .hl-navbar-signin,
          .hl-brand-mark,
          .hl-mobile-panel {
            transition: none;
          }
        }
      `}</style>

      <header
        className={`hl-navbar ${isScrolled ? 'scrolled' : ''}`}
      >
        <div className="hl-navbar-shell">
          {/* Brand */}
          <a
            href="#heroSection"
            className="hl-navbar-brand"
            onClick={closeMobileMenu}
            aria-label="HireLabs home"
          >
            <span className="hl-brand-mark">
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </span>

            <span className="hl-brand-wordmark">
              Hire<span>Labs</span>
            </span>

            <span className="hl-brand-version">
              <span className="hl-brand-version-dot" />
              v2.4 live
            </span>
          </a>

          {/* Desktop navigation */}
          <nav
            className="hl-navbar-nav"
            aria-label="Primary navigation"
          >
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hl-navbar-link"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hl-navbar-actions">
            {user ? (
              <div className="hl-navbar-user-area">
                <span
                  className="hl-navbar-avatar"
                  style={userAvatarStyle}
                  title={user.email || 'Signed-in user'}
                  aria-label={`Signed in as ${user.email || 'user'}`}
                >
                  {userInitials}
                </span>

                <button
                  type="button"
                  className="hl-navbar-signout"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="hl-navbar-signin"
                onClick={onOpenAuthModal}
              >
                Sign in
              </button>
            )}

            <button
              type="button"
              className="hl-navbar-launch"
              onClick={scrollToDemo}
            >
              <span>Launch ATS</span>

              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Mobile trigger */}
          <button
            type="button"
            className="hl-mobile-toggle"
            onClick={() => setIsMobileOpen((current) => !current)}
            aria-label={
              isMobileOpen
                ? 'Close navigation'
                : 'Open navigation'
            }
            aria-expanded={isMobileOpen}
            aria-controls="hirelabs-mobile-navigation"
          >
            {isMobileOpen ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile navigation panel */}
        <div
          id="hirelabs-mobile-navigation"
          className={`hl-mobile-panel ${
            isMobileOpen ? 'open' : ''
          }`}
        >
          <nav
            className="hl-mobile-nav"
            aria-label="Mobile navigation"
          >
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hl-mobile-link"
                onClick={closeMobileMenu}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hl-mobile-divider" />

          <div className="hl-mobile-actions">
            {user ? (
              <div className="hl-navbar-user-area" style={{ justifyContent: 'space-between', width: '100%' }}>
                <span
                  className="hl-navbar-avatar"
                  style={userAvatarStyle}
                  title={user.email || 'Signed-in user'}
                  aria-label={`Signed in as ${user.email || 'user'}`}
                >
                  {userInitials}
                </span>

                <button
                  type="button"
                  className="hl-mobile-signin"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="hl-mobile-signin"
                onClick={() => {
                  closeMobileMenu();
                  onOpenAuthModal?.();
                }}
              >
                Sign in
              </button>
            )}

            <button
              type="button"
              className="hl-mobile-launch"
              onClick={scrollToDemo}
            >
              Launch ATS
            </button>
          </div>
        </div>
      </header>
    </>
  );
}