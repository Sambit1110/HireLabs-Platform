'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function VectorField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    // Respect users who prefer reduced motion.
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.z = 7;

    const geometry = new THREE.BufferGeometry();

    const count = 180;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );

    const pointsMaterial = new THREE.PointsMaterial({
      color: 0x22d3ee,
      size: 0.035,
      transparent: true,
      opacity: 0.7,
    });

    const points = new THREE.Points(geometry, pointsMaterial);
    scene.add(points);

    const linesMaterial = new THREE.LineBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.12,
    });

    const lines = new THREE.LineSegments(geometry, linesMaterial);
    scene.add(lines);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();

      if (!width || !height) return;

      renderer.setSize(width, height, false);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.render(scene, camera);
    };

    // Keep the background completely independent from the mouse.
    window.addEventListener('resize', resize);

    resize();

    // Static background for reduced-motion users.
    if (reduceMotion) {
      renderer.render(scene, camera);

      return () => {
        window.removeEventListener('resize', resize);

        geometry.dispose();
        pointsMaterial.dispose();
        linesMaterial.dispose();
        renderer.dispose();
      };
    }

    /*
     * Very subtle automatic movement.
     * There is NO pointer/mouse interaction anymore.
     */
    let frame;

    const animate = (time) => {
      points.rotation.y = time * 0.00003;
      points.rotation.x = Math.sin(time * 0.00002) * 0.03;

      lines.rotation.copy(points.rotation);

      renderer.render(scene, camera);

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);

      window.removeEventListener('resize', resize);

      geometry.dispose();
      pointsMaterial.dispose();
      linesMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="vector-field"
      aria-hidden="true"
    />
  );
}