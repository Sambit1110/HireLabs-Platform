# HireLabs landing page redesign: design

Date: 2026-11-22 · Owner: Sambit · Status: draft for approval

## Intent and why

The public landing page (`/`) currently has a calm, light, editorial look (beige `#F5F1E8`, Georgia serif headings, DM Sans). Sambit wants it to feel like **liminalrecruitment.com**, a dark, cinematic, scroll-driven recruitment site he loves, **with a few playful touches from jamiewindell.com**. The goal is a landing page that feels premium and memorable in the college demo and makes HireLabs look like a real AI hiring product, not a template.

## What we are taking from each reference (style only)

**From Liminal (the base):**
- Near-black background that **shifts colour as you scroll** (black → dusky slate → soft lavender → charcoal).
- Very large, **very thin serif headlines** that **come into focus word by word** (blur → sharp) as they scroll into view.
- A **cinematic opening**: a glowing slab that swings open like a door (a threshold), then the headline resolves.
- A **tilted 3D word wheel** that rotates with scroll.
- **Floating translucent slabs** behind a "principles" statement.
- **Thin-outlined cards**, generous empty space, lavender text and one mint accent.

**From Jamie Windell (a few touches only):**
- A **rotating circular text badge**.
- Small **sticker icons** on cards.
- **Chunky pill buttons** with a dark outline and an offset shadow.
- A **dark rounded footer** with a simple sitemap.

**Hard rule:** recreate the *style*, never the content. No text, images, logos, icons, fonts files or code are copied from either site. All wording below is HireLabs' own.

## Goals

1. A dark, cinematic landing page with Liminal's scroll choreography (door intro, blur-to-focus headlines, colour-shifting background, word wheel, slabs).
2. The four Jamie touches, used sparingly so the calm premium feel stays dominant.
3. HireLabs' real story told clearly: parse → match → explain → fair, with links into the real product (`/dashboard`, `/dashboard/results`).
4. The sign-in pop-up restyled to match (dark panel, lavender text, mint primary button), with **all sign-in behaviour unchanged**.
5. Fast and reliable on a normal laptop during a live demo.

## Non-goals

- The dashboard (`/dashboard`, `/dashboard/resumes`, `/dashboard/results`) keeps its current look.
- The auth pages `/auth/callback` and `/auth/update-password` keep their current look.
- No new backend, API or database changes.
- No real 3D/WebGL.

## Anti-goals (failure even if it "works")

- Copying either site's words, imagery, logos or code.
- Animation that hides content, blocks reading, or makes scrolling laggy in the demo.
- Breaking sign-in: the `?auth=signin&next=…` auto-open, safe redirect after login, sign-up, password reset and all friendly error messages must keep working exactly as today.
- Fake credibility: no made-up testimonials, client logos, user counts, accuracy numbers or pricing.

## Constraints

- Next.js 16 (App Router), React 19, plain CSS (no Tailwind). `AGENTS.md`: read `node_modules/next/dist/docs/` before using Next APIs (e.g. fonts).
- New dependency: **`motion`** (Framer Motion's current package; import from `motion/react`) for scroll-linked animation. No GSAP, no Three.js.
- Fonts must be free: a thin serif close to Liminal's display face (proposed: **Fraunces** at weight 200–300, via `next/font/google`) and **Libre Franklin** for body text.
- `prefers-reduced-motion: reduce` → no door, no blur, no wheel rotation, no slab motion; everything shows in its final state.
- Content must stay in the DOM and readable by screen readers even while visually blurred; colour contrast must meet WCAG AA for body text.
- Must work at phone width (≥ 360px) with no horizontal scroll; heavy effects simplify on small screens.

## Visual system

| Token | Value | Use |
|---|---|---|
| `--ink` | `#0F0F0F` | Page background (start) |
| `--slate` | `#262632` | Mid-page background |
| `--lavender` | `#BCBBFF` | Primary text on dark; background in the "principles" band |
| `--mint` | `#9CFFE6` | Single accent: primary buttons, focus rings, small highlights |
| `--sun` | `#F1E044` | Jamie touch only: circular badge and sticker icons |
| `--line` | `rgba(188,187,255,0.22)` | Thin card outlines and dividers |

- Display: Fraunces, weight 200–300, sizes up to ~112px desktop / ~48px mobile, tight leading, sentence case.
- Body and UI: Libre Franklin 300/400/600, small uppercase letter-spaced labels for nav and eyebrows.
- Buttons: Jamie-style pills, mint fill, 1.5px dark outline, 3–4px offset shadow that shifts on hover/press.

## Page structure (top to bottom)

1. **Nav (sticky, minimal).** Small HireLabs wordmark left; right: Product · How it works · Principles · Results · **Sign in** (pill). Uppercase, letter-spaced, lavender. Becomes slightly opaque on scroll. Keeps the existing "Sign in" behaviour (opens the auth pop-up).
2. **Threshold intro (hero).** Full-height, near-black. On load a glowing lavender slab swings open (CSS 3D, ~1.2s), revealing the headline, which resolves word by word:
   *"Find the people behind the resume."*
   Sub-line: *"HireLabs reads every resume for evidence, ranks candidates by meaning, and explains every score, so your team decides with confidence."*
   Buttons: **Try the sample** (scrolls to the sample) and **Sign in** (pill).
   **Jamie touch:** rotating circular badge near the corner: *"AI-ASSISTED · HUMAN-DECIDED ·"*.
3. **What HireLabs reads (word wheel).** Tilted 3D wheel of words that rotates as you scroll: *Skills · Experience · Projects · Education · Evidence · Gaps · Fit · Interview focus*. Small vertical label: *"What we read for"*. Background starts shifting from black to slate.
4. **Statement 1 (blur-to-focus).** *"Stop filtering for keywords."* then *"Start reading for evidence."*
5. **How it works (four outlined cards).** Each has a small sticker icon (**Jamie touch**) and a step number:
   1. **Parse:** "Upload PDFs and Word files. Our parser pulls out names, roles, skills and experience."
   2. **Match:** "Paste a job description. Our matching model ranks your candidates by meaning, not keyword overlap."
   3. **Explain:** "Every score comes with matched skills, missing skills and quotes from the resume."
   4. **Stay fair:** "A fairness audit checks that names and gender don't move the score." *(Builder's call: blind screening isn't built yet, so the card describes only the audit. Update it if blind screening ships.)*
6. **Sample preview.** The existing sample profiles (`InteractiveDemo`, clearly labelled SAMPLE DATA) restyled as dark outlined cards, one slightly tilted (**Jamie touch**).
7. **Principles (lavender band with floating slabs).** Background becomes soft lavender; text turns near-black. Headline *"Our principles"*, then three short lines that come into focus:
   *"AI suggests. People decide."* · *"Every score shows its reasons."* · *"Your candidates belong to your team."* (with a one-line note on private storage and row-level security).
8. **Keyword filters vs HireLabs.** The current comparison restyled as a minimal two-column list with thin dividers on slate.
9. **Two paths (Liminal's two-choice cards).** Heading *"You're probably here for one of two things"*:
   - **"Screen candidates"** → `/dashboard` (opens sign-in if signed out).
   - **"See how our models perform"** → `/dashboard/results`.
10. **Closing call to action.** *"Ready to read between the lines?"* + **Get started** pill (opens sign-up).
11. **Footer (Jamie touch).** Dark rounded top corners, wordmark, links: Product, How it works, Principles, Results, Sign in; a one-line note: *"A college project by the HireLabs team."*

## Behaviour details

- **Background colour shift:** one fixed full-page layer whose colour is driven by overall scroll progress through section markers (ink → slate → lavender → slate → ink).
- **Blur-to-focus words:** each word animates `filter: blur(12px)` → `blur(0)` and `opacity 0.15` → `1`, staggered, triggered as the line enters the viewport; runs once.
- **Word wheel:** words placed around a `rotateX` cylinder; `useScroll` progress drives rotation over the section's pinned scroll distance (~150vh). On mobile, a static vertical list with the active word highlighted.
- **Door intro:** plays once per page load; skippable by scrolling; skipped entirely with reduced motion.
- **Slabs:** 4–6 translucent rounded rectangles that drift slightly with scroll (parallax), behind the principles text.
- **Circular badge:** SVG text on a circle, rotating slowly (20s per turn), paused for reduced motion.

## Approaches considered

| Approach | Trade-off | Decision |
|---|---|---|
| **Motion library + CSS** | React-native API, ~30 KB, readable for the team, built-in reduced-motion support; 3D is CSS-faked rather than true 3D | **Chosen by Sambit** |
| GSAP + ScrollTrigger | Most precise scroll choreography; imperative, heavier, harder for the team to maintain | Not chosen |
| Three.js / WebGL | Most cinematic true 3D; slowest to build, heavy on older laptops, riskiest in a live demo | Not chosen |

## Decided by Sambit

- Direction: **Liminal as the base, with Jamie Windell touches**.
- Build approach: **Motion library + CSS**.
- Scope: landing page + sign-in pop-up only (proposed and not objected to).

## Calls made while writing this (check these)

- **Removed sections:** `ArchitectureFlow`, `FeaturesGrid` and `SecuritySection` are replaced by "How it works" (5) and "Principles" (7), which carry the same messages more briefly. `PricingSection` and `FAQSection` (already not rendered) stay out.
- **Always dark:** the landing page uses the dark palette regardless of the visitor's light/dark setting, as Liminal does.
- **Footer note** "A college project by the HireLabs team." is included for honesty; remove it if you prefer.
- **All headline and card wording** above is a first draft by Claude. Change anything that doesn't sound like your team.

## Left to the builder

- Exact component split and file names under `components/landing/` (old landing components can be deleted once replaced).
- Exact easing, durations and stagger values within the ranges above.
- Sticker icon artwork (simple original SVG shapes; no emoji, no copied icons).
- Whether to remove the now-unused `three` dependency and `VectorField.jsx` (recommended if nothing else imports them).
- Moving the large inline `<style>` blocks out of `app/page.jsx` into a landing stylesheet.
