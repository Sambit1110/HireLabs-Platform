'use client';

import { useEffect } from 'react';

export function CustomCursor() {
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cursor = document.querySelector('.custom-cursor');
    const ring = document.querySelector('.custom-cursor-ring');
    let frame;
    let x = -100;
    let y = -100;
    let ringX = -100;
    let ringY = -100;

    const render = () => {
      ringX += (x - ringX) * 0.16;
      ringY += (y - ringY) * 0.16;
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      frame = requestAnimationFrame(render);
    };
    const move = (event) => { x = event.clientX; y = event.clientY; };
    const enterInteractive = () => document.body.classList.add('cursor-hover');
    const leaveInteractive = () => document.body.classList.remove('cursor-hover');
    const selectors = 'a, button, input, textarea, [role="button"]';

    window.addEventListener('pointermove', move);
    document.querySelectorAll(selectors).forEach((element) => {
      element.addEventListener('pointerenter', enterInteractive);
      element.addEventListener('pointerleave', leaveInteractive);
    });
    frame = requestAnimationFrame(render);
    return () => {
      window.removeEventListener('pointermove', move);
      document.querySelectorAll(selectors).forEach((element) => {
        element.removeEventListener('pointerenter', enterInteractive);
        element.removeEventListener('pointerleave', leaveInteractive);
      });
      cancelAnimationFrame(frame);
    };
  }, []);

  return <><span className="custom-cursor" /><span className="custom-cursor-ring" /></>;
}
