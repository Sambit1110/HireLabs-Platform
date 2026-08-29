'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Full-page fixed Three.js background.
 * Renders floating particles, connecting lines, and slow-rotating wireframe
 * geometry that stays visible behind all content while scrolling.
 */
export function VectorField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Renderer ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // ── Scene & Camera ────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    camera.position.z = 30;

    // ── Particle cloud ────────────────────────────────────────
    const particleCount = 320;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3]     = (Math.random() - 0.5) * 60;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      particleSpeeds[i] = 0.002 + Math.random() * 0.006;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xff6500,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // ── Secondary particles (slate blue, smaller) ─────────────
    const secCount = 180;
    const secGeometry = new THREE.BufferGeometry();
    const secPositions = new Float32Array(secCount * 3);

    for (let i = 0; i < secCount; i++) {
      secPositions[i * 3]     = (Math.random() - 0.5) * 50;
      secPositions[i * 3 + 1] = (Math.random() - 0.5) * 35;
      secPositions[i * 3 + 2] = (Math.random() - 0.5) * 15 - 5;
    }

    secGeometry.setAttribute('position', new THREE.BufferAttribute(secPositions, 3));

    const secMaterial = new THREE.PointsMaterial({
      color: 0x1e3e62,
      size: 0.05,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    });

    const secParticles = new THREE.Points(secGeometry, secMaterial);
    scene.add(secParticles);

    // ── Connecting lines (nearby particles) ───────────────────
    const lineGeometry = new THREE.BufferGeometry();
    const maxLines = 200;
    const linePositions = new Float32Array(maxLines * 6);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setDrawRange(0, 0);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff6500,
      transparent: true,
      opacity: 0.07,
    });

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // ── Wireframe geometry accents ────────────────────────────
    const icoGeo = new THREE.IcosahedronGeometry(2.5, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: 0xff6500,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
    });
    const ico = new THREE.Mesh(icoGeo, icoMat);
    ico.position.set(-12, 5, -8);
    scene.add(ico);

    const octGeo = new THREE.OctahedronGeometry(1.8, 0);
    const octMat = new THREE.MeshBasicMaterial({
      color: 0x1e3e62,
      wireframe: true,
      transparent: true,
      opacity: 0.05,
    });
    const oct = new THREE.Mesh(octGeo, octMat);
    oct.position.set(14, -4, -10);
    scene.add(oct);

    const torGeo = new THREE.TorusGeometry(3, 0.08, 16, 64);
    const torMat = new THREE.MeshBasicMaterial({
      color: 0xff8533,
      transparent: true,
      opacity: 0.04,
    });
    const tor = new THREE.Mesh(torGeo, torMat);
    tor.position.set(0, -8, -12);
    scene.add(tor);

    // ── Resize handler ────────────────────────────────────────
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', resize);
    resize();

    // ── Reduced motion: static render ─────────────────────────
    if (reduceMotion) {
      renderer.render(scene, camera);
      return () => {
        window.removeEventListener('resize', resize);
        particleGeometry.dispose();
        particleMaterial.dispose();
        secGeometry.dispose();
        secMaterial.dispose();
        lineGeometry.dispose();
        lineMaterial.dispose();
        icoGeo.dispose(); icoMat.dispose();
        octGeo.dispose(); octMat.dispose();
        torGeo.dispose(); torMat.dispose();
        renderer.dispose();
      };
    }

    // ── Update connecting lines each frame ────────────────────
    const updateLines = () => {
      const pos = particleGeometry.attributes.position.array;
      let lineIdx = 0;
      const threshold = 8;

      for (let i = 0; i < particleCount && lineIdx < maxLines; i++) {
        const ax = pos[i * 3];
        const ay = pos[i * 3 + 1];
        const az = pos[i * 3 + 2];

        for (let j = i + 1; j < particleCount && lineIdx < maxLines; j++) {
          const bx = pos[j * 3];
          const by = pos[j * 3 + 1];
          const bz = pos[j * 3 + 2];
          const dx = ax - bx;
          const dy = ay - by;
          const dz = az - bz;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < threshold) {
            linePositions[lineIdx * 6]     = ax;
            linePositions[lineIdx * 6 + 1] = ay;
            linePositions[lineIdx * 6 + 2] = az;
            linePositions[lineIdx * 6 + 3] = bx;
            linePositions[lineIdx * 6 + 4] = by;
            linePositions[lineIdx * 6 + 5] = bz;
            lineIdx++;
          }
        }
      }

      lineGeometry.setDrawRange(0, lineIdx * 2);
      lineGeometry.attributes.position.needsUpdate = true;
    };

    // ── Animation loop ────────────────────────────────────────
    let frame;
    let tick = 0;

    const animate = (time) => {
      tick++;

      // Slow global rotation
      particles.rotation.y = time * 0.000025;
      particles.rotation.x = Math.sin(time * 0.000015) * 0.08;
      secParticles.rotation.y = -time * 0.00002;
      secParticles.rotation.x = Math.cos(time * 0.00001) * 0.05;

      // Drift individual particles
      const pos = particleGeometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3 + 1] += Math.sin(time * 0.0001 + i) * particleSpeeds[i] * 0.3;
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Rotate wireframes
      ico.rotation.x = time * 0.0001;
      ico.rotation.y = time * 0.00008;
      oct.rotation.x = -time * 0.00012;
      oct.rotation.z = time * 0.00009;
      tor.rotation.x = time * 0.00006;
      tor.rotation.y = -time * 0.00004;

      // Update lines every 4th frame for performance
      if (tick % 4 === 0) updateLines();

      lines.rotation.copy(particles.rotation);

      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      particleGeometry.dispose();
      particleMaterial.dispose();
      secGeometry.dispose();
      secMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      icoGeo.dispose(); icoMat.dispose();
      octGeo.dispose(); octMat.dispose();
      torGeo.dispose(); torMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="vector-field-bg"
      aria-hidden="true"
    />
  );
}
