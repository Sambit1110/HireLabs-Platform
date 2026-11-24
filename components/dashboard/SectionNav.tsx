"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

import { activeSection } from "@/lib/dashboard/sections";

type Section = { id: string; label: string };

/** How long a click keeps its pill highlighted while the smooth scroll passes other sections. */
const CLICK_LOCK_MS = 1200;

/**
 * "On this page": a sticky row of pills under the dashboard header. A pill scrolls to its
 * section; while you scroll, the pill of the section you are reading is highlighted.
 */
export default function SectionNav({ sections }: { sections: Section[] }) {
  const navRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const sectionsRef = useRef(sections);
  const lockRef = useRef<{ id: string; until: number } | null>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    sectionsRef.current = sections;
  });

  // Publish the sticky header's and this bar's heights, so jump targets land just below both.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const header = document.querySelector<HTMLElement>(".dashboard-header");
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty("--dashboard-header-h", `${header?.offsetHeight ?? 0}px`);
      root.style.setProperty("--section-nav-h", `${nav.offsetHeight}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    if (header) observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--dashboard-header-h");
      root.style.removeProperty("--section-nav-h");
    };
  }, []);

  // Scroll spy: re-measure on scroll, on resize and whenever the page's content changes height.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const nav = navRef.current;
      if (!nav) return;
      const line = nav.getBoundingClientRect().bottom + 16;
      const tops = sectionsRef.current.map(({ id }) => ({
        id,
        top: document.getElementById(id)?.getBoundingClientRect().top ?? Number.NaN,
      }));

      const lock = lockRef.current;
      if (lock) {
        const target = tops.find((item) => item.id === lock.id);
        const arrived = target !== undefined && Math.abs(target.top - line) < 2;
        if (!arrived && performance.now() < lock.until) return;
        lockRef.current = null;
      }

      const scroller = document.scrollingElement || document.documentElement;
      const atBottom = window.innerHeight + window.scrollY >= scroller.scrollHeight - 2;
      setActive(activeSection(tops, line, atBottom));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Keep the highlighted pill in view when the row scrolls sideways (narrow screens).
  useEffect(() => {
    const list = listRef.current;
    const pill = active ? list?.querySelector<HTMLElement>(`[data-section="${active}"]`) : null;
    if (!list || !pill || list.scrollWidth <= list.clientWidth) return;
    const left = pill.offsetLeft - (list.clientWidth - pill.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  const jump = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return; // Let the browser handle the link.
    event.preventDefault();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    lockRef.current = { id, until: performance.now() + (reduceMotion ? 150 : CLICK_LOCK_MS) };
    setActive(id);
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    window.history.replaceState(window.history.state, "", `#${id}`);

    // Keyboard users continue from the section they jumped to.
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };

  return (
    <nav ref={navRef} className="section-nav" aria-label="On this page">
      <span className="section-nav__label" aria-hidden="true">
        On this page
      </span>
      <ul ref={listRef} className="section-nav__list">
        {sections.map(({ id, label }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              data-section={id}
              className="section-nav__link"
              aria-current={active === id ? "location" : undefined}
              onClick={(event) => jump(event, id)}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
