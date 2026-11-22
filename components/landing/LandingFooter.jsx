const LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'How it works', href: '#how' },
  { label: 'Principles', href: '#principles' },
  { label: 'Results', href: '/dashboard/results' },
  { label: 'Sign in', href: '/?auth=signin' },
];

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer__inner">
        <span className="lp-footer__brand">HireLabs</span>
        <nav aria-label="Footer navigation" className="lp-footer__links">
          {LINKS.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <p className="lp-footer__note">A college project by the HireLabs team.</p>
      </div>
    </footer>
  );
}
