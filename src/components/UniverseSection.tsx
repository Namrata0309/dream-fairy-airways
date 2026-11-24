import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { DREAM_FAIRY_CONFIG } from '../config/dreamFairyConfig';
import { dreamPiano } from '../audio/dreamPiano';
import {
  createRadialGlowTexture,
  createStudioRenderer,
  disposeSceneGraph,
  scheduleAfterDraw,
} from '../three/sceneUtils';
import { useSceneVisibility } from '../hooks/useSceneVisibility';

export function UniverseSection() {
  const { containerRef, isVisibleRef, webglSupported, reducedMotion } = useSceneVisibility();
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const pulseRef = useRef(0);
  const [pulseCount, setPulseCount] = useState(0);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host || !webglSupported || contextLost) return;

    let disposed = false;
    let frameId = 0;

    const bundle = createStudioRenderer(host);
    const { renderer, isSoftwareGl, envTexture } = bundle;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#191D33');
    scene.environment = envTexture;
    scene.fog = new THREE.FogExp2('#191D33', 0.025);

    const w = host.clientWidth || 560;
    const h = host.clientHeight || 440;
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 120);
    camera.position.set(0, 2.3, 8.8);
    camera.lookAt(0, 0, 0);

    const hemi = new THREE.HemisphereLight('#DFD5FA', '#181B2E', 0.8);
    scene.add(hemi);

    const glowTex = createRadialGlowTexture(
      'rgba(255, 255, 255, 1)',
      'rgba(230, 201, 143, 0.5)',
      'rgba(27, 33, 56, 0)',
    );

    // Orbital plane group tilted gently
    const orbitGroup = new THREE.Group();
    orbitGroup.rotation.set(0.32, 0.2, -0.18);
    scene.add(orbitGroup);

    // Orbital ring
    const ringGeo = new THREE.TorusGeometry(2.35, 0.014, 12, 96);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#DFD5FA',
      transparent: true,
      opacity: 0.35,
    });
    const orbitRing = new THREE.Mesh(ringGeo, ringMat);
    orbitGroup.add(orbitRing);

    // Star 1 (Sharavani - warm champagne blush)
    const starAGroup = new THREE.Group();
    const starACore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.46, 3),
      new THREE.MeshStandardMaterial({
        color: '#FFF3D1',
        emissive: '#F5C487',
        emissiveIntensity: 1.5,
        roughness: 0.2,
      }),
    );
    const starAGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: '#FADCE8',
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    starAGlow.scale.set(2.9, 2.9, 1);
    const starALight = new THREE.PointLight('#FDE2B8', 2.4, 16);
    starAGroup.add(starACore, starAGlow, starALight);
    orbitGroup.add(starAGroup);

    // Star 2 (Yours Dreamfairy - luminous lavender baby-blue)
    const starBGroup = new THREE.Group();
    const starBCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.42, 3),
      new THREE.MeshStandardMaterial({
        color: '#E9F4FF',
        emissive: '#A5C7FA',
        emissiveIntensity: 1.5,
        roughness: 0.2,
      }),
    );
    const starBGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: '#DFD5FA',
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    starBGlow.scale.set(2.7, 2.7, 1);
    const starBLight = new THREE.PointLight('#C7D8FF', 2.2, 16);
    starBGroup.add(starBCore, starBGlow, starBLight);
    orbitGroup.add(starBGroup);

    // Connecting luminous resonance filament
    const linkPoints = [new THREE.Vector3(), new THREE.Vector3()];
    const linkGeo = new THREE.BufferGeometry().setFromPoints(linkPoints);
    const linkMat = new THREE.LineBasicMaterial({
      color: '#E6C98F',
      transparent: true,
      opacity: 0.45,
    });
    const linkLine = new THREE.Line(linkGeo, linkMat);
    orbitGroup.add(linkLine);

    // Expanding harmonic pulse ring
    const pulseRingGeo = new THREE.RingGeometry(0.3, 0.38, 48);
    pulseRingGeo.rotateX(Math.PI / 2);
    const pulseRingMat = new THREE.MeshBasicMaterial({
      color: '#E6C98F',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
    orbitGroup.add(pulseRing);

    // Background deep-sky starfield
    const count = 260;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 32;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = -4 - Math.random() * 24;
    }
    const fieldGeo = new THREE.BufferGeometry();
    fieldGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const fieldMat = new THREE.PointsMaterial({
      size: 0.24,
      map: glowTex,
      color: '#EAE2FD',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Points(fieldGeo, fieldMat));

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let targetTiltX = 0.32;
    let targetTiltY = 0.2;

    const onPointerMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetTiltX = 0.32 + ny * 0.25;
      targetTiltY = 0.2 + nx * 0.35;
    };
    host.addEventListener('pointermove', onPointerMove, { passive: true });

    const onResize = () => {
      if (!host) return;
      const nw = host.clientWidth || 560;
      const nh = host.clientHeight || 440;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const clock = new THREE.Clock();
    let elapsed = 0;

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);

      if (isVisibleRef.current) {
        const motionFactor = reducedMotion ? 0.2 : 1;
        elapsed += delta * motionFactor;

        const orbitSpeed = 0.72 + pulseRef.current * 1.4;
        const angle = elapsed * orbitSpeed;
        const rx = 2.35;
        const rz = 2.15;

        starAGroup.position.set(Math.cos(angle) * rx, Math.sin(angle * 2) * 0.16, Math.sin(angle) * rz);
        starBGroup.position.set(
          Math.cos(angle + Math.PI) * rx,
          Math.sin((angle + Math.PI) * 2) * 0.16,
          Math.sin(angle + Math.PI) * rz,
        );

        starACore.rotation.y += delta * 0.6;
        starBCore.rotation.y -= delta * 0.6;

        const scalePulse = 1 + pulseRef.current * 0.35;
        starAGlow.scale.set(2.9 * scalePulse, 2.9 * scalePulse, 1);
        starBGlow.scale.set(2.7 * scalePulse, 2.7 * scalePulse, 1);

        // Update link filament
        const lineAttr = linkGeo.getAttribute('position') as THREE.BufferAttribute;
        lineAttr.setXYZ(0, starAGroup.position.x, starAGroup.position.y, starAGroup.position.z);
        lineAttr.setXYZ(1, starBGroup.position.x, starBGroup.position.y, starBGroup.position.z);
        lineAttr.needsUpdate = true;

        // Animate harmonic pulse wave
        if (pulseRef.current > 0.01) {
          pulseRef.current = THREE.MathUtils.damp(pulseRef.current, 0, 1.8, delta);
          const s = (1 - pulseRef.current) * 8.5 + 1;
          pulseRing.scale.set(s, 1, s);
          pulseRingMat.opacity = pulseRef.current * 0.75;
        } else {
          pulseRingMat.opacity = 0;
        }

        orbitGroup.rotation.x = THREE.MathUtils.damp(orbitGroup.rotation.x, targetTiltX, 3, delta);
        orbitGroup.rotation.y = THREE.MathUtils.damp(orbitGroup.rotation.y, targetTiltY, 3, delta);

        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        scheduleAfterDraw(renderer, tick, (id) => {
          frameId = id;
        });
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      host.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      glowTex.dispose();
      disposeSceneGraph(scene);
      bundle.dispose();
    };
  }, [webglSupported, contextLost, reducedMotion, isVisibleRef]);

  const handleSyncPulse = () => {
    pulseRef.current = 1;
    setPulseCount((c) => c + 1);
    dreamPiano.playChime('envelope');
  };

  return (
    <section
      id="universe"
      ref={containerRef}
      className="py-24 sm:py-32 px-5 sm:px-8 bg-gradient-to-b from-[#F3F8FD] via-[#F7F3FC] to-[#FDF6F9]"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left: 3D Binary Stars Viewport */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 relative rounded-3xl overflow-hidden border border-[#1B2138]/10 shadow-xl shadow-[#1B2138]/10 bg-[#191D33] min-h-[380px] sm:min-h-[460px]"
        >
          {webglSupported && !contextLost ? (
            <div ref={canvasHostRef} className="w-full h-[380px] sm:h-[460px]" />
          ) : (
            <div className="w-full h-[380px] sm:h-[460px] flex items-center justify-center bg-gradient-to-br from-[#191D33] via-[#2B254A] to-[#3B2E58]">
              <div className="relative w-52 h-52 rounded-full border border-[#DFD5FA]/30 flex items-center justify-between px-6">
                <span className="w-8 h-8 rounded-full bg-[#FCE7B2] shadow-lg shadow-[#FDE2B8]/70" />
                <span className="w-8 h-8 rounded-full bg-[#C4DDFB] shadow-lg shadow-[#C4DDFB]/70" />
              </div>
            </div>
          )}

          {/* Subtle Bottom Bar inside Universe Viewport */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#191D33]/85 border border-white/10 text-[#FCFDFE]">
            <div className="flex items-center gap-2 text-xs text-[#DFD5FA]">
              <span>{DREAM_FAIRY_CONFIG.universe.starLabels.left}</span>
              <span aria-hidden="true">·</span>
              <span>{DREAM_FAIRY_CONFIG.universe.starLabels.right}</span>
            </div>
            <button
              type="button"
              onClick={handleSyncPulse}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E6C98F] text-[#1B2138] text-xs font-semibold hover:bg-[#F1D8A6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C98F] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{pulseCount > 0 ? 'Resonance Sent' : 'Send Star Pulse'}</span>
            </button>
          </div>
        </motion.div>

        {/* Right: Storytelling Copy */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6"
        >
          <p className="text-xs tracking-[0.22em] uppercase text-[#4C5574] font-medium mb-4">
            Our Little Universe
          </p>

          <h2 className="font-serif font-semibold text-3xl sm:text-5xl leading-[1.12] text-[#1B2138] mb-7">
            {DREAM_FAIRY_CONFIG.universe.heading}
          </h2>

          <div className="space-y-4 text-base sm:text-lg leading-relaxed text-[#353D5E]">
            {DREAM_FAIRY_CONFIG.universe.paragraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
