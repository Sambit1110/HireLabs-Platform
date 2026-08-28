import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';

/**
 * HireLabs Navigation Component
 * Features: Fixed blur, active state tracking, mobile responsive drawer, status badge
 */
export function Navbar({ onOpenAuthModal }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`navbar-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-container">
        {/* Brand */}
        <a href="#" className="nav-brand">
          <div className="brand-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <span>
            Hire<span className="text-gradient">Labs</span>
          </span>
          <span className="brand-pill-status">
            <span className="live-pulse" /> v2.4 Live
          </span>
        </a>

        {/* Desktop Navigation Links */}
        <nav className={`nav-menu ${isMobileOpen ? 'open' : ''}`}>
          <a href="#features" className="nav-link" onClick={() => setIsMobileOpen(false)}>Features</a>
          <a href="#demo" className="nav-link" onClick={() => setIsMobileOpen(false)}>Interactive Sandbox</a>
          <a href="#architecture" className="nav-link" onClick={() => setIsMobileOpen(false)}>Architecture</a>
          <a href="#comparison" className="nav-link" onClick={() => setIsMobileOpen(false)}>Comparison</a>
          <a href="#security" className="nav-link" onClick={() => setIsMobileOpen(false)}>Security & RLS</a>
        </nav>

        {/* Action CTAs */}
        <div className="nav-actions">
          <Button variant="ghost" size="sm" onClick={onOpenAuthModal}>
            Sign In
          </Button>
          <Button variant="primary" size="sm" onClick={() => {
            const el = document.getElementById('demo');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}>
            <span>Launch ATS</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Button>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="Toggle navigation"
          >
            {isMobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
