'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function VectorField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
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
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x22d3ee, size: 0.035, transparent: true, opacity: 0.7 }));
    scene.add(points);
    const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.12 }));
    scene.add(lines);

    let mouseX = 0;
    let mouseY = 0;
    const pointerMove = (event) => { mouseX = (event.clientX / window.innerWidth - 0.5) * 0.45; mouseY = (event.clientY / window.innerHeight - 0.5) * 0.3; };
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('resize', resize);
    resize();
    let frame;
    const animate = (time) => {
      points.rotation.y = time * 0.00008 + mouseX;
      points.rotation.x = mouseY;
      lines.rotation.copy(points.rotation);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', pointerMove); geometry.dispose(); points.material.dispose(); lines.material.dispose(); renderer.dispose(); };
  }, []);

  return <canvas ref={canvasRef} className="vector-field" aria-hidden="true" />;
}
