import { useEffect, useRef } from "react";
import * as THREE from "three";

const PARTICLE_COUNT = 100;
const MAX_CONNECT_DIST = 180;
const BASE_SPEED = 0.25;
const MOUSE_RADIUS = 120;
const MOUSE_FORCE = 1.2;
const DAMPING = 0.06;

export default function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    let halfW = W / 2;
    let halfH = H / 2;

    const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, -500, 500);
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    function isDark() {
      return document.documentElement.classList.contains("dark");
    }
    function getColors() {
      return isDark()
        ? { dot: 0x93c5fd, line: 0x60a5fa }
        : { dot: 0x3b82f6, line: 0x60a5fa };
    }

    // Particles — positions + base velocities + live velocities
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const baseVel: [number, number][] = [];
    const vel: [number, number][] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * W;
      positions[i * 3 + 1] = (Math.random() - 0.5) * H;
      positions[i * 3 + 2] = 0;
      const a = Math.random() * Math.PI * 2;
      const bvx = Math.cos(a) * BASE_SPEED;
      const bvy = Math.sin(a) * BASE_SPEED;
      baseVel.push([bvx, bvy]);
      vel.push([bvx, bvy]);
    }

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const c0 = getColors();
    const dotMat = new THREE.PointsMaterial({
      size: 3, color: c0.dot, transparent: true,
      opacity: isDark() ? 0.55 : 0.45, sizeAttenuation: false,
    });
    scene.add(new THREE.Points(dotGeo, dotMat));

    const MAX_SEGS = (PARTICLE_COUNT * (PARTICLE_COUNT - 1)) / 2;
    const lineBuf = new Float32Array(MAX_SEGS * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(lineBuf, 3));
    lineGeo.setDrawRange(0, 0);
    const lineMat = new THREE.LineBasicMaterial({
      color: c0.line, transparent: true,
      opacity: isDark() ? 0.13 : 0.10,
    });
    scene.add(new THREE.LineSegments(lineGeo, lineMat));

    // Mouse world-coords (parked off-screen initially)
    const mouse = { x: 1e6, y: 1e6 };
    function onMouseMove(e: MouseEvent) {
      mouse.x =  e.clientX - halfW;
      mouse.y = -(e.clientY - halfH);
    }
    window.addEventListener("mousemove", onMouseMove);

    // Scroll impulse
    let scrollImpulse = 0;
    function onWheel(e: WheelEvent) {
      scrollImpulse += e.deltaY * 0.005;
    }
    window.addEventListener("wheel", onWheel, { passive: true });

    let animId: number;

    function animate() {
      animId = requestAnimationFrame(animate);

      // Decay scroll impulse and distribute it
      if (Math.abs(scrollImpulse) > 0.001) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          vel[i][1] -= scrollImpulse * 0.06;
        }
        scrollImpulse *= 0.88;
      }

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Mouse repulsion
        const dx = positions[i * 3]     - mouse.x;
        const dy = positions[i * 3 + 1] - mouse.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < MOUSE_RADIUS * MOUSE_RADIUS && dist2 > 0.001) {
          const dist = Math.sqrt(dist2);
          const force = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE;
          vel[i][0] += (dx / dist) * force;
          vel[i][1] += (dy / dist) * force;
        }

        // Damping back toward base velocity
        vel[i][0] += (baseVel[i][0] - vel[i][0]) * DAMPING;
        vel[i][1] += (baseVel[i][1] - vel[i][1]) * DAMPING;

        // Move
        positions[i * 3]     += vel[i][0];
        positions[i * 3 + 1] += vel[i][1];

        // Wrap edges
        if (positions[i * 3]     >  halfW) positions[i * 3]     = -halfW;
        if (positions[i * 3]     < -halfW) positions[i * 3]     =  halfW;
        if (positions[i * 3 + 1] >  halfH) positions[i * 3 + 1] = -halfH;
        if (positions[i * 3 + 1] < -halfH) positions[i * 3 + 1] =  halfH;
      }
      dotGeo.attributes.position.needsUpdate = true;

      // Lines
      let seg = 0;
      const d2max = MAX_CONNECT_DIST * MAX_CONNECT_DIST;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          const dx = positions[i * 3] - positions[j * 3];
          const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
          if (dx * dx + dy * dy < d2max) {
            lineBuf[seg * 6]     = positions[i * 3];
            lineBuf[seg * 6 + 1] = positions[i * 3 + 1];
            lineBuf[seg * 6 + 2] = 0;
            lineBuf[seg * 6 + 3] = positions[j * 3];
            lineBuf[seg * 6 + 4] = positions[j * 3 + 1];
            lineBuf[seg * 6 + 5] = 0;
            seg++;
          }
        }
      }
      lineGeo.setDrawRange(0, seg * 2);
      lineGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }
    animate();

    // Theme observer
    const observer = new MutationObserver(() => {
      const c = getColors();
      dotMat.color.set(c.dot);
      lineMat.color.set(c.line);
      dotMat.opacity  = isDark() ? 0.55 : 0.45;
      lineMat.opacity = isDark() ? 0.13 : 0.10;
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    // Resize
    function onResize() {
      W = window.innerWidth;
      H = window.innerHeight;
      halfW = W / 2;
      halfH = H / 2;
      camera.left   = -halfW;
      camera.right  =  halfW;
      camera.top    =  halfH;
      camera.bottom = -halfH;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      dotGeo.dispose();
      dotMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
