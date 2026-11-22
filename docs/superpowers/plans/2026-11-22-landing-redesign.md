# HireLabs Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the light editorial landing page (`/`) with a dark, cinematic, scroll-driven page in the style of liminalrecruitment.com plus four jamiewindell.com touches, and restyle the sign-in pop-up to match, without changing any sign-in behaviour.

**Architecture:** New focused section components under `components/landing/` composed by `app/page.jsx`, which keeps all existing auth state and handlers. Pure helpers in `lib/landing/` (theme lookup, word splitting, wheel geometry) are unit-tested; visual behaviour is driven by the `motion` library (`motion/react`) and CSS, with all styles in `styles/landing.css`. A fixed background layer changes colour based on which section is in view.

**Tech Stack:** Next.js 16 App Router, React 19, `motion` (new), `next/font/google` (Fraunces, Libre Franklin), plain CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-22-landing-redesign-design.md`

## Global Constraints

- Style only: no text, images, logos, icons, font files or code copied from liminalrecruitment.com or jamiewindell.com; use the HireLabs wording in the spec verbatim.
- No fake credibility: no testimonials, client logos, user counts, accuracy numbers or pricing.
- Colour tokens exactly: `--ink #0F0F0F`, `--slate #262632`, `--lavender #BCBBFF`, `--mint #9CFFE6`, `--sun #F1E044`, `--line rgba(188,187,255,0.22)`.
- Fonts: Fraunces (weight 200–300) for display, Libre Franklin (300/400/600) for body/UI, loaded with `next/font/google`. Read `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` first (AGENTS.md).
- Animation only via `motion` + CSS; no GSAP, no Three.js/WebGL.
- `prefers-reduced-motion: reduce` → no door, blur, wheel rotation, slab drift or badge spin; content shown in final state.
- Text stays in the DOM and readable by screen readers while visually blurred; body-text contrast meets WCAG AA.
- No horizontal scroll at ≥ 360px wide; wheel becomes a static list below 768px.
- Landing page is always dark (ignores the visitor's light/dark setting).
- Scope: `/` and the sign-in pop-up only; dashboard and `/auth/*` pages untouched.
- Sign-in behaviour unchanged: `?auth=signin&next=…` auto-open, `afterLogin` redirect, sign-up, reset, friendly errors.
- `npm run check` (lint, typecheck, tests) and `npm run build` must pass. Run builds in a copy **outside** `~/Desktop` (it is iCloud-synced and produces " 2" duplicate files that break builds).

## Review Focus

1. **Reduced motion:** with reduced motion on, every headline is fully sharp and visible and no element animates. (Task 2 helper test + Task 8 browser check.)
2. **Sign-in still works:** visiting `/dashboard` signed out lands on `/` with the restyled pop-up open and "Please sign in to continue."; signing in returns to the requested page. (Task 7 + Task 8 browser check.)
3. **Phone width:** at 375px no horizontal scroll; the wheel renders as a list; the door intro doesn't trap scrolling. (Task 8 browser check.)
4. **Blurred text is real text:** `get_page_text` on `/` returns every headline in full reading order. (Task 2 `FocusText` renders plain words; Task 8 check.)
5. **Banned content never lands:** no "Jamie", "Windell", "Liminal", "testimonial", "pricing" or "$" price strings in landing source. (Task 7 content-guard test.)

---

### Task 1: Foundations (dependency, fonts, tokens, pure helpers)

**Files:**
- Modify: `package.json`, `package-lock.json` (add `motion`)
- Modify: `app/layout.jsx` (fonts as CSS variables on `<html>`)
- Create: `styles/landing.css` (tokens, base typography, `.lp-*` utility classes)
- Create: `lib/landing/theme.js`, `lib/landing/text.js`, `lib/landing/wheel.js`
- Test: `tests/landing-helpers.test.js`

**Interfaces:**
- Produces:
  - `THEMES: { ink: {bg:'#0F0F0F', fg:'#BCBBFF'}, slate: {bg:'#262632', fg:'#BCBBFF'}, lavender: {bg:'#BCBBFF', fg:'#0F0F0F'} }` and `themeFor(name: string): {bg: string, fg: string}` (unknown name → `THEMES.ink`) in `lib/landing/theme.js`.
  - `splitWords(text: string): string[]` in `lib/landing/text.js`: splits on any whitespace, keeps punctuation attached to its word, drops empties.
  - `wheelPositions(count: number): { angle: number }[]` in `lib/landing/wheel.js`: `angle = i * 360 / count`, `count <= 0` → `[]`.
  - CSS variables `--font-display`, `--font-body` set on `<html>`.

- [ ] **Step 1: Write failing tests** in `tests/landing-helpers.test.js`:
  - `themeFor('lavender')` → `{ bg: '#BCBBFF', fg: '#0F0F0F' }`; `themeFor('nope')` → `THEMES.ink`.
  - `splitWords('Find the people behind the resume.')` → `['Find','the','people','behind','the','resume.']`; `splitWords('  a\n b ')` → `['a','b']`; `splitWords('')` → `[]`.
  - `wheelPositions(8)` has 8 entries, `[0].angle === 0`, `[2].angle === 90`; `wheelPositions(0)` → `[]`.
- [ ] **Step 2: Run** `npx vitest run tests/landing-helpers.test.js`. Expected: FAIL (modules not found).
- [ ] **Step 3: Implement the three helper modules** with the signatures above.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Install** `npm install motion` (latest 12.x). Confirm `import { motion } from 'motion/react'` resolves via `npm run typecheck`.
- [ ] **Step 6: Fonts.** In `app/layout.jsx`, load `Fraunces({ subsets:['latin'], weight:['200','300'], variable:'--font-display', display:'swap' })` and `Libre_Franklin({ subsets:['latin'], weight:['300','400','600'], variable:'--font-body', display:'swap' })`; add both `.variable` classes to `<html>`. Keep the existing `index.css` import.
- [ ] **Step 7: Create `styles/landing.css`** with the six tokens on `.lp` (the landing root class), base type (`.lp-display` uses `var(--font-display)`, weight 200, `clamp(48px, 8vw, 112px)`, line-height 1.02; body `var(--font-body)`), `.lp-eyebrow` (11px, uppercase, 0.14em tracking) and a `@media (prefers-reduced-motion: reduce)` block that sets `animation: none` and `transition: none` on `.lp *`.
- [ ] **Step 8: Run** `npm run check`. Expected: lint, typecheck and all tests pass.
- [ ] **Step 9: Commit** `feat(landing): add motion, fonts, tokens and landing helpers`.

### Task 2: Shared primitives (background, focus text, pill button, circular badge)

**Files:**
- Create: `components/landing/ScrollBackground.jsx`, `components/landing/FocusText.jsx`, `components/landing/PillButton.jsx`, `components/landing/CircularBadge.jsx`
- Modify: `styles/landing.css`
- Test: `tests/landing-helpers.test.js` (add reduced-motion helper test)
- Create: `lib/landing/motion-prefs.js`

**Interfaces:**
- Consumes: `themeFor`, `splitWords` (Task 1).
- Produces:
  - `<ScrollBackground />`: renders a fixed full-viewport `div.lp-bg` behind content; uses `IntersectionObserver` (threshold 0.5) on every `[data-lp-theme]` element and sets `--lp-bg` / `--lp-fg` on the `.lp` root from `themeFor(el.dataset.lpTheme)`; CSS `transition: background-color 700ms ease, color 700ms ease`.
  - `<FocusText as="h1"|"h2"|"p" text={string} className? delay?={number} />`: renders the element with `aria-label={text}`; each word from `splitWords` is a `motion.span` (`aria-hidden`) animating `filter: blur(12px)→blur(0)`, `opacity 0.15→1`, stagger 0.06s, `whileInView` once, viewport amount 0.6. With reduced motion (`useReducedMotion()` from `motion/react`), render plain final-state words.
  - `<PillButton as="button"|"a" href? onClick? variant="mint"|"ghost">`: Jamie-style pill, 1.5px `#0F0F0F` outline, `box-shadow: 4px 4px 0 #0F0F0F`, hover shifts to `2px 2px`, active `0 0`.
  - `<CircularBadge text="AI-ASSISTED · HUMAN-DECIDED · " />`: 120px SVG circle with `textPath`, `--sun` fill disc, slow CSS rotation (20s linear infinite), paused under reduced motion.
  - `shouldAnimate(prefersReducedMotion: boolean | null): boolean` in `lib/landing/motion-prefs.js` (`true` only when the value is exactly `false`).

- [ ] **Step 1: Write failing test:** `shouldAnimate(false) === true`, `shouldAnimate(true) === false`, `shouldAnimate(null) === false` (motion's hook returns `null` before it knows, so treat that as "don't animate yet" to avoid a flash of blur).
- [ ] **Step 2: Run** `npx vitest run tests/landing-helpers.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `shouldAnimate`, then the four components above, using `shouldAnimate(useReducedMotion())` to choose animated vs final-state rendering.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Run** `npm run check`. Expected: pass.
- [ ] **Step 6: Commit** `feat(landing): add scroll background, focus text, pill button and badge`.

### Task 3: Nav and threshold hero, wired into the page

**Files:**
- Create: `components/landing/LandingNav.jsx`, `components/landing/ThresholdHero.jsx`
- Modify: `app/page.jsx` (render `.lp` root, `<ScrollBackground/>`, `<LandingNav/>`, `<ThresholdHero/>` in place of `Navbar`/`HeroSection`; import `styles/landing.css`)
- Modify: `styles/landing.css`

**Interfaces:**
- Consumes: Task 2 primitives; `openAuth` from `app/page.jsx`.
- Produces:
  - `<LandingNav onSignIn={() => void} />`: moves the session logic from `components/layout/Navbar.jsx` (Supabase user lookup, initials, sign-out, mobile menu) unchanged into a new markup: wordmark left; links Product (`#product`), How it works (`#how`), Principles (`#principles`), Results (`/dashboard/results`); right: `Sign in` pill (calls `onSignIn`) or, when signed in, `Dashboard` link + sign-out. Background becomes `rgba(15,15,15,0.7)` with backdrop blur after 24px of scroll.
  - `<ThresholdHero onTrySample={() => void} onSignIn={() => void} />` with `data-lp-theme="ink"`, `id="product"`: door = a lavender glowing rounded slab using CSS 3D (`perspective: 1200px`, `rotateY 0→-100deg` over 1.2s on mount via `motion`), then `FocusText as="h1"` *"Find the people behind the resume."*, the sub-line and two buttons from the spec (§ Page structure item 2), and `<CircularBadge/>`. Under reduced motion the slab is not rendered.

- [ ] **Step 1: Build the two components** and replace the nav and hero in `app/page.jsx`. Keep every auth-related state, effect and handler in `app/page.jsx` exactly as is.
- [ ] **Step 2: Run** `npm run check`. Expected: pass.
- [ ] **Step 3: Browser check** (dev server on a free port, from a copy outside `~/Desktop`): door opens once, headline resolves, "Sign in" opens the pop-up, `?auth=signin` auto-opens it.
- [ ] **Step 4: Commit** `feat(landing): add Liminal-style nav and threshold hero`.

### Task 4: Word wheel and keyword statement

**Files:**
- Create: `components/landing/WordWheel.jsx`, `components/landing/Statement.jsx`
- Modify: `app/page.jsx`, `styles/landing.css`

**Interfaces:**
- Consumes: `wheelPositions` (Task 1), `FocusText` (Task 2).
- Produces:
  - `<WordWheel words={string[]} label="What we read for" />` with `data-lp-theme="ink"`: section ~250vh tall with a sticky inner stage; words placed with `transform: rotateX(angle) translateZ(220px)` on a cylinder tilted `rotateZ(-18deg)`; `useScroll({ target })` progress → `rotateX` of the cylinder over one full turn. Below 768px or with reduced motion: a static vertical list. Words: *Skills, Experience, Projects, Education, Evidence, Gaps, Fit, Interview focus*.
  - `<Statement lines={string[]} theme="slate" />`: each line is a `FocusText as="h2"`. Used with *"Stop filtering for keywords."* and *"Start reading for evidence."*

- [ ] **Step 1: Build both components and add them after the hero** in `app/page.jsx`.
- [ ] **Step 2: Run** `npm run check`. Expected: pass.
- [ ] **Step 3: Browser check:** wheel rotates with scroll on desktop; static list at 375px; background shifts to slate at the statement.
- [ ] **Step 4: Commit** `feat(landing): add rotating word wheel and keyword statement`.

### Task 5: How it works and sample preview

**Files:**
- Create: `components/landing/HowItWorks.jsx`, `components/landing/StickerIcon.jsx`, `components/landing/SamplePreview.jsx`
- Modify: `app/page.jsx`, `styles/landing.css`

**Interfaces:**
- Produces:
  - `<StickerIcon kind="parse"|"match"|"explain"|"fair" />`: 44px original SVG shapes (document, two linked circles, speech bubble, balance), `--sun` or `--mint` fill with a 1.5px ink outline, rotated −6°.
  - `<HowItWorks />` with `id="how"`, `data-lp-theme="slate"`: four thin-outlined cards (`1px solid var(--line)`, 20px radius) with step number, `StickerIcon`, title and the exact card copy from the spec (§ item 5, card 4 = the audit wording).
  - `<SamplePreview />` with `data-lp-theme="slate"`: eyebrow "PRODUCT PREVIEW · SAMPLE DATA", the three existing fictional profiles (move the array from `components/landing/InteractiveDemo.jsx`), dark outlined cards, the middle card rotated 2°.

- [ ] **Step 1: Build the three components; wire the "Try the sample" hero button** (`scrollToDemo`) to scroll to `SamplePreview` (`id="demo"`).
- [ ] **Step 2: Run** `npm run check`. Expected: pass.
- [ ] **Step 3: Commit** `feat(landing): add how-it-works cards with stickers and sample preview`.

### Task 6: Principles, comparison, two paths, closing CTA and footer

**Files:**
- Create: `components/landing/Principles.jsx`, `components/landing/KeywordsVsEvidence.jsx`, `components/landing/TwoPaths.jsx`, `components/landing/ClosingCta.jsx`, `components/landing/LandingFooter.jsx`
- Modify: `app/page.jsx`, `styles/landing.css`

**Interfaces:**
- Consumes: `FocusText`, `PillButton`.
- Produces:
  - `<Principles />` with `id="principles"`, `data-lp-theme="lavender"`: "Our principles" + the three lines and security note from the spec (§ item 7); 5 absolutely positioned translucent slabs (`rgba(255,255,255,0.28)`, 18px radius, rotated −12° to 8°) drifting with `useScroll` → `y` parallax (±60px); static under reduced motion.
  - `<KeywordsVsEvidence />` with `data-lp-theme="slate"`: two-column list, rows with thin `--line` dividers. Rows (left = keyword filters, right = HireLabs): "Matches exact words" / "Understands meaning"; "Misses transferable skills" / "Finds evidence across the resume"; "A score with no reasons" / "Matched and missing skills, with quotes"; "Easy to game with keyword stuffing" / "Reads for demonstrated experience".
  - `<TwoPaths onScreen={() => void} />` with `data-lp-theme="slate"`: heading and two outlined cards from the spec (§ item 9); "Screen candidates" → `/dashboard` (the proxy sends signed-out users to sign-in), "See how our models perform" → `/dashboard/results`.
  - `<ClosingCta onGetStarted={() => void} />` with `data-lp-theme="ink"`: "Ready to read between the lines?" + "Get started" pill that opens the pop-up in **sign-up** mode.
  - `<LandingFooter />`: dark panel with 32px top radius, wordmark, the five links, and "A college project by the HireLabs team."
- In `app/page.jsx`, add `openSignUp()` = `openAuth()` then `setAuthMode('signup')`.

- [ ] **Step 1: Build the five components and add them in spec order.**
- [ ] **Step 2: Run** `npm run check`. Expected: pass.
- [ ] **Step 3: Browser check:** page turns lavender with dark text at Principles and back to slate after; "Get started" opens sign-up mode.
- [ ] **Step 4: Commit** `feat(landing): add principles, comparison, two paths, CTA and footer`.

### Task 7: Restyle sign-in pop-up, remove old landing code, content guard

**Files:**
- Modify: `app/page.jsx` (delete the old inline `<style>` block's landing rules; keep or move only the `.hl-auth*` / `.hl-modal*` rules, restyled), `components/ui/Modal.jsx` only if a class hook is needed
- Delete: `components/landing/HeroSection.jsx`, `FeaturesGrid.jsx`, `ArchitectureFlow.jsx`, `ComparisonTable.jsx`, `SecuritySection.jsx`, `InteractiveDemo.jsx`, `PricingSection.jsx`, `FAQSection.jsx`, `VectorField.jsx`, `ProfileJson.jsx`, `components/layout/Navbar.jsx`, `components/layout/Footer.jsx`, `components/ui/ScrollReveal.jsx`, `components/ui/CustomCursor.jsx` — each only after `grep -rn` shows no remaining importer
- Modify: `package.json` (remove `three` and `@types/three` if no importer remains)
- Test: `tests/landing-content.test.js`

**Interfaces:**
- Consumes: everything above.
- Produces: the final landing page and a guard test.

- [ ] **Step 1: Write the failing guard test** `tests/landing-content.test.js`: read every file in `components/landing/` and `app/page.jsx`; assert none matches `/jamie|windell|liminal|testimonial|pricing|\$\d/i`; assert `app/page.jsx` still contains `params.get('auth') !== 'signin'`, `safeRedirectPath(` and `friendlyAuthError(` (sign-in behaviour preserved).
- [ ] **Step 2: Run** `npx vitest run tests/landing-content.test.js`. Expected: FAIL until the old components with "Pricing" are deleted.
- [ ] **Step 3: Restyle the pop-up:** dark panel `#151519` with `1px var(--line)` border and 24px radius, lavender text, inputs on `#0F0F0F` with `--line` borders, mint focus ring, primary submit = mint `PillButton` style, message box on `#1C1C22`. Fraunces for the pop-up heading.
- [ ] **Step 4: Delete old components and the old inline landing CSS; remove unused `three` packages.**
- [ ] **Step 5: Run** `npx vitest run tests/landing-content.test.js` then `npm run check`. Expected: PASS / all pass.
- [ ] **Step 6: Commit** `refactor(landing): restyle sign-in pop-up and remove old landing sections`.

### Task 8: Verification

**Files:** none (fix forward in the owning task's files if a check fails)

- [ ] **Step 1: Clean build** in a copy outside `~/Desktop`: `git worktree add <tmp> feature/landing-redesign && cd <tmp> && npm ci && npm run check && npm run build`. Expected: all pass.
- [ ] **Step 2: Desktop browser check** (1440×900): door, focus text, wheel rotation, background ink→slate→lavender→slate→ink, badge spinning, stickers, pills with offset shadow, two-path links, footer.
- [ ] **Step 3: Phone check** (375×812): no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`), wheel is a list, nav menu works.
- [ ] **Step 4: Reduced motion:** in DevTools-equivalent (`matchMedia('(prefers-reduced-motion: reduce)')` emulation, or temporarily force `shouldAnimate` to return false), confirm all headlines are sharp and nothing moves.
- [ ] **Step 5: Text check:** `get_page_text` on `/` lists every headline in full, in order.
- [ ] **Step 6: Sign-in check:** `/dashboard` signed out → `/` with the dark pop-up open and "Please sign in to continue."; wrong password shows the friendly message; "Get started" opens sign-up.
- [ ] **Step 7: Commit any fixes; push the branch** (PR only when Sambit asks).
