import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion } from 'motion/react';
import { RotateCcw } from 'lucide-react';
import { DREAM_FAIRY_CONFIG } from '../config/dreamFairyConfig';
import { dreamPiano } from '../audio/dreamPiano';
import { createDreamFairyAirplane } from '../three/aircraftModel';
import {
  createFluffyCloudField,
  createPastelSkyDome,
  createRadialGlowTexture,
  createStudioRenderer,
  disposeSceneGraph,
  scheduleAfterDraw,
} from '../three/sceneUtils';
import { useSceneVisibility } from '../hooks/useSceneVisibility';

interface FinaleSceneProps {
  onReplay: () => void;
}

interface FireworkBurst {
  points: THREE.Points;
  velocities: Float32Array;
  age: number;
  lifetime: number;
}

export function FinaleScene({ onReplay }: FinaleSceneProps) {
  const { containerRef, isVisibleRef, webglSupported, reducedMotion } = useSceneVisibility();
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host || !webglSupported || contextLost) return;

    let disposed = false;
    let frameId = 0;

    const bundle = createStudioRenderer(host);
    const { renderer, isSoftwareGl, envTexture } = bundle;

    const scene = new THREE.Scene();
    scene.environment = envTexture;
    scene.fog = new THREE.FogExp2('#C79BBF', 0.011);

    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || 760;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 240);
    camera.position.set(0, 3.6, 12.2);
    camera.lookAt(0, 1.5, 0);

    // Golden sunset & twilight sky dome
    const skyDome = createPastelSkyDome('#3B366B', '#B584BC', '#FAD3A8', '#DFD5FA');
    scene.add(skyDome);

    const hemi = new THREE.HemisphereLight('#FFE4CC', '#9E8AC8', 1.25);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#FFE5BC', 2.0);
    keyLight.position.set(8, 12, 10);
    scene.add(keyLight);

    const glowTex = createRadialGlowTexture(
      'rgba(255, 255, 255, 1)',
      'rgba(250, 220, 232, 0.6)',
      'rgba(223, 213, 250, 0)',
    );

    // Clouds floating softly around the celebration
    const clouds = createFluffyCloudField({
      clusters: 14,
      puffsPerCluster: 5,
      spreadX: 60,
      spreadY: 10,
      spreadZ: 60,
      minY: -5.5,
      tintTop: '#FFF7F2',
      tintUnderside: '#DFD5FA',
      opacity: 0.88,
    });
    clouds.mesh.position.z = -18;
    scene.add(clouds.mesh);

    // 1. Composite 3D Two-Tier Birthday Cake (positioned on right/center balance)
    const cakeGroup = new THREE.Group();
    cakeGroup.position.set(2.4, -0.35, 0);

    const goldMat = new THREE.MeshStandardMaterial({
      color: '#E6C98F',
      roughness: 0.22,
      metalness: 0.88,
    });
    const blushFrostingMat = new THREE.MeshStandardMaterial({
      color: '#FADCE8',
      roughness: 0.55,
      metalness: 0.05,
    });
    const lavenderFrostingMat = new THREE.MeshStandardMaterial({
      color: '#DFD5FA',
      roughness: 0.52,
      metalness: 0.05,
    });
    const creamMat = new THREE.MeshStandardMaterial({
      color: '#FCFDFE',
      roughness: 0.45,
      metalness: 0.04,
    });

    // Pedestal stand
    const standPlate = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.05, 0.16, 36), goldMat);
    const standStem = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.72, 0.9, 24), goldMat);
    standStem.position.y = -0.52;
    cakeGroup.add(standPlate, standStem);

    // Bottom cake tier + gold ribbon band
    const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.76, 1.15, 36), blushFrostingMat);
    tier1.position.y = 0.66;
    const tier1Band = new THREE.Mesh(new THREE.CylinderGeometry(1.77, 1.77, 0.14, 36), goldMat);
    tier1Band.position.y = 0.2;
    cakeGroup.add(tier1, tier1Band);

    // Top cake tier + gold ribbon band
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.22, 0.95, 32), lavenderFrostingMat);
    tier2.position.y = 1.7;
    const tier2Band = new THREE.Mesh(new THREE.CylinderGeometry(1.23, 1.23, 0.12, 32), goldMat);
    tier2Band.position.y = 1.3;
    cakeGroup.add(tier2, tier2Band);

    // Piped cream pearl border spheres around tier tops
    const pearlGeo = new THREE.SphereGeometry(0.085, 10, 10);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const p1 = new THREE.Mesh(pearlGeo, creamMat);
      p1.position.set(Math.cos(a) * 1.7, 1.24, Math.sin(a) * 1.7);
      cakeGroup.add(p1);
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const p2 = new THREE.Mesh(pearlGeo, creamMat);
      p2.position.set(Math.cos(a) * 1.16, 2.18, Math.sin(a) * 1.16);
      cakeGroup.add(p2);
    }

    // 5 Glowing Candles with animated flames
    const flames: THREE.Mesh[] = [];
    const candleMat = new THREE.MeshStandardMaterial({ color: '#FFFDF7', roughness: 0.4 });
    const flameMat = new THREE.MeshBasicMaterial({ color: '#FFE08A' });

    for (let c = 0; c < 5; c++) {
      const angle = (c / 5) * Math.PI * 2;
      const r = c === 0 ? 0 : 0.62;
      const cx = Math.cos(angle) * r;
      const cz = Math.sin(angle) * r;

      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.55, 12), candleMat);
      candle.position.set(cx, 2.45, cz);
      cakeGroup.add(candle);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.18, 10), flameMat);
      flame.position.set(cx, 2.82, cz);
      cakeGroup.add(flame);
      flames.push(flame);
    }

    const candleGlow = new THREE.PointLight('#FFD78A', 2.2, 10);
    candleGlow.position.set(0, 3.0, 0);
    cakeGroup.add(candleGlow);

    scene.add(cakeGroup);

    // 2. Floating Pink & Lavender Balloons (LatheGeometry teardrop profile)
    const balloonProfile = [
      new THREE.Vector2(0.001, -0.75),
      new THREE.Vector2(0.12, -0.62),
      new THREE.Vector2(0.45, -0.25),
      new THREE.Vector2(0.62, 0.15),
      new THREE.Vector2(0.55, 0.55),
      new THREE.Vector2(0.28, 0.8),
      new THREE.Vector2(0.001, 0.88),
    ];
    const balloonGeo = new THREE.LatheGeometry(balloonProfile, 24);
    const pinkBalloonMat = new THREE.MeshPhysicalMaterial({
      color: '#F7B7D2',
      roughness: 0.18,
      metalness: 0.05,
      clearcoat: 1.0,
    });
    const lavBalloonMat = new THREE.MeshPhysicalMaterial({
      color: '#C7B5F8',
      roughness: 0.18,
      metalness: 0.05,
      clearcoat: 1.0,
    });
    const stringMat = new THREE.LineBasicMaterial({ color: '#E6C98F', transparent: true, opacity: 0.75 });

    const balloons: { group: THREE.Group; baseY: number; phase: number }[] = [];
    const balloonPositions = [
      [-4.6, 2.4, -2.5],
      [-3.5, 3.3, -4.0],
      [5.4, 2.8, -2.0],
      [6.2, 1.8, -3.6],
      [0.2, 4.1, -4.8],
      [-5.8, 1.3, -1.6],
    ];
    balloonPositions.forEach(([bx, by, bz], idx) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(bx, by, bz);
      const bMesh = new THREE.Mesh(balloonGeo, idx % 2 === 0 ? pinkBalloonMat : lavBalloonMat);
      bGroup.add(bMesh);

      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -0.75, 0),
        new THREE.Vector3(0.06, -1.6, 0.04),
        new THREE.Vector3(-0.04, -2.4, 0),
      ]);
      bGroup.add(new THREE.Line(lineGeo, stringMat));
      scene.add(bGroup);
      balloons.push({ group: bGroup, baseY: by, phase: idx * 1.15 });
    });

    // 3. Celebratory Dream Fairy Airplane circling overhead
    const plane = createDreamFairyAirplane({ withLandingGear: false, isSoftwareGl });
    plane.group.scale.setScalar(0.48);
    scene.add(plane.group);

    // 4. Floating 3D Confetti (InstancedMesh)
    const confettiCount = 120;
    const confettiGeo = new THREE.PlaneGeometry(0.14, 0.08);
    const confettiMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      side: THREE.DoubleSide,
      roughness: 0.35,
      metalness: 0.25,
    });
    const confetti = new THREE.InstancedMesh(confettiGeo, confettiMat, confettiCount);
    confetti.frustumCulled = false;
    const confettiPalette = ['#FADCE8', '#DFD5FA', '#CFE8FA', '#E6C98F', '#FFFFFF'];
    const cCol = new THREE.Color();
    const cData = Array.from({ length: confettiCount }, (_, i) => {
      cCol.set(confettiPalette[i % confettiPalette.length]);
      confetti.setColorAt(i, cCol);
      return {
        x: (Math.random() - 0.5) * 18,
        y: Math.random() * 10 - 1,
        z: (Math.random() - 0.5) * 10,
        speed: 0.6 + Math.random() * 0.9,
        spinX: (Math.random() - 0.5) * 4,
        spinY: (Math.random() - 0.5) * 4,
      };
    });
    if (confetti.instanceColor) confetti.instanceColor.needsUpdate = true;

    // 5. Glowing Stars & 3D Fireworks
    const fireworkBursts: FireworkBurst[] = [];
    const spawnFirework = () => {
      const count = 48;
      const pos = new Float32Array(count * 3);
      const vel = new Float32Array(count * 3);
      const cx = (Math.random() - 0.5) * 12;
      const cy = 3.2 + Math.random() * 3.5;
      const cz = -5 - Math.random() * 6;
      const palette = ['#FADCE8', '#E6C98F', '#DFD5FA', '#CFE8FA'];
      const burstColor = palette[Math.floor(Math.random() * palette.length)];

      for (let i = 0; i < count; i++) {
        pos[i * 3] = cx;
        pos[i * 3 + 1] = cy;
        pos[i * 3 + 2] = cz;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = 1.6 + Math.random() * 2.2;
        vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
        vel[i * 3 + 1] = Math.cos(phi) * speed;
        vel[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.32,
        map: glowTex,
        color: burstColor,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      fireworkBursts.push({ points: pts, velocities: vel, age: 0, lifetime: 2.1 });
    };

    scene.add(confetti);
    spawnFirework();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const onResize = () => {
      if (!host) return;
      const nw = host.clientWidth || window.innerWidth;
      const nh = host.clientHeight || 760;
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

    const dummy = new THREE.Object3D();
    const clock = new THREE.Clock();
    let elapsed = 0;
    let fireworkCooldown = 0.8;

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);

      if (isVisibleRef.current) {
        const motionFactor = reducedMotion ? 0.2 : 1;
        elapsed += delta * motionFactor;

        clouds.update(delta * motionFactor, 0.55);

        // Rotate birthday cake gently & flicker candle flames
        cakeGroup.rotation.y += delta * 0.22 * motionFactor;
        flames.forEach((f, idx) => {
          const s = 0.9 + Math.sin(elapsed * 12 + idx * 1.7) * 0.16;
          f.scale.set(s, s * 1.1, s);
        });

        // Bob balloons gently
        balloons.forEach((b) => {
          b.group.position.y = b.baseY + Math.sin(elapsed * 1.1 + b.phase) * 0.25;
          b.group.rotation.z = Math.sin(elapsed * 0.8 + b.phase) * 0.06;
        });

        // Airplane flying a graceful figure-loop overhead
        const orbitAngle = elapsed * 0.48;
        const px = Math.cos(orbitAngle) * 7.2;
        const pz = Math.sin(orbitAngle) * 4.5 - 3.0;
        const py = 4.1 + Math.sin(orbitAngle * 2) * 0.45;
        plane.group.position.set(px, py, pz);
        plane.group.rotation.set(0.05, -orbitAngle + Math.PI, 0.22);
        for (const prop of plane.propellers) {
          prop.rotation.z += delta * 24;
        }

        // Update tumbling confetti
        for (let i = 0; i < confettiCount; i++) {
          const c = cData[i];
          c.y -= c.speed * delta * motionFactor;
          if (c.y < -2.2) c.y = 8.5;
          dummy.position.set(c.x + Math.sin(elapsed + i) * 0.15, c.y, c.z);
          dummy.rotation.set(elapsed * c.spinX, elapsed * c.spinY, 0);
          dummy.updateMatrix();
          confetti.setMatrixAt(i, dummy.matrix);
        }
        confetti.instanceMatrix.needsUpdate = true;

        // Fireworks lifecycle
        fireworkCooldown -= delta * motionFactor;
        if (fireworkCooldown <= 0 && fireworkBursts.length < 4) {
          spawnFirework();
          fireworkCooldown = 1.25;
        }

        for (let b = fireworkBursts.length - 1; b >= 0; b--) {
          const fw = fireworkBursts[b];
          fw.age += delta * motionFactor;
          const attr = fw.points.geometry.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < attr.count; i++) {
            const vx = fw.velocities[i * 3];
            const vy = fw.velocities[i * 3 + 1] - fw.age * 1.15;
            const vz = fw.velocities[i * 3 + 2];
            attr.setXYZ(
              i,
              attr.getX(i) + vx * delta * motionFactor,
              attr.getY(i) + vy * delta * motionFactor,
              attr.getZ(i) + vz * delta * motionFactor,
            );
          }
          attr.needsUpdate = true;
          (fw.points.material as THREE.PointsMaterial).opacity = Math.max(
            1 - fw.age / fw.lifetime,
            0,
          );
          if (fw.age >= fw.lifetime) {
            scene.remove(fw.points);
            fw.points.geometry.dispose();
            (fw.points.material as THREE.Material).dispose();
            fireworkBursts.splice(b, 1);
          }
        }

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
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      glowTex.dispose();
      disposeSceneGraph(scene);
      bundle.dispose();
    };
  }, [webglSupported, contextLost, reducedMotion, isVisibleRef]);

  const { heading, subtitle, paragraphs, signatureLead, signatureName, replayLabel } =
    DREAM_FAIRY_CONFIG.finale;

  const handleReplay = () => {
    dreamPiano.playChime('boarding');
    onReplay();
  };

  return (
    <section
      id="finale"
      ref={containerRef}
      className="relative min-h-[760px] lg:min-h-[820px] w-full overflow-hidden flex items-center bg-[#322B56]"
    >
      {/* 3D Celebration Viewport */}
      {webglSupported && !contextLost ? (
        <div
          ref={canvasHostRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full z-0"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 w-full h-full z-0 bg-gradient-to-b from-[#3B366B] via-[#B584BC] to-[#FAD3A8]"
        />
      )}

      {/* Measured left-side reading scrim so the 3D cake & balloons shine on the right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[#1D1934]/88 via-[#1D1934]/55 to-transparent lg:w-[66%]"
      />

      {/* Foreground Birthday Message */}
      <div className="relative z-10 max-w-6xl w-full mx-auto px-6 sm:px-10 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl text-[#FCFDFE]"
        >
          <p className="text-xs tracking-[0.22em] uppercase text-[#E6C98F] font-medium mb-4">
            {DREAM_FAIRY_CONFIG.birthdayDate} · Finale Celebration
          </p>

          <h2 className="font-serif font-semibold text-4xl sm:text-5xl lg:text-6xl leading-[1.06] tracking-tight mb-4">
            {heading}
          </h2>

          <p className="font-serif italic text-xl sm:text-2xl text-[#FADCE8] mb-7">
            {subtitle}
          </p>

          <div className="space-y-4 text-base sm:text-lg leading-relaxed text-[#EAE6FA] mb-8">
            {paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          <div className="pt-5 border-t border-white/15 mb-9">
            <p className="text-sm text-[#DFD5FA] mb-1">{signatureLead}</p>
            <p className="font-serif italic text-2xl font-semibold text-[#FFE7BD]">
              {signatureName}
            </p>
          </div>

          <button
            type="button"
            onClick={handleReplay}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#E6C98F] text-[#1B2138] text-xs sm:text-sm font-semibold tracking-wider uppercase shadow-lg hover:bg-[#F3DAB0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C98F] transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>{replayLabel}</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
