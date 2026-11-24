import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion } from 'motion/react';
import { Plane, Sparkles } from 'lucide-react';
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

interface HeroFlightSceneProps {
  onBoardFlight: () => void;
}

const _pointer = new THREE.Vector2(0, 0);

export function HeroFlightScene({ onBoardFlight }: HeroFlightSceneProps) {
  const { containerRef, isVisibleRef, webglSupported, reducedMotion } = useSceneVisibility();
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const boardingActiveRef = useRef(false);
  const boardingProgressRef = useRef(0);
  const [isBoarding, setIsBoarding] = useState(false);
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
    scene.fog = new THREE.FogExp2('#EAE3FA', 0.011);

    const width = host.clientWidth || window.innerWidth;
    const height = host.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 320);
    camera.position.set(5.4, 2.35, 9.6);
    camera.lookAt(0, 0.3, 0);

    // Warm sunlit key + pastel sky/ground hemisphere + gentle lavender rim
    const hemi = new THREE.HemisphereLight('#DDF0FF', '#FADCE8', 1.15);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#FFF3DC', 1.9);
    keyLight.position.set(14, 18, 12);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#DFD5FA', 0.9);
    rimLight.position.set(-10, 6, -14);
    scene.add(rimLight);

    // Dreamy pastel sky dome
    const skyDome = createPastelSkyDome('#9FD4F7', '#DFD5FA', '#FADCE8', '#FFF4EC');
    scene.add(skyDome);

    // Soft sun halo sprite in distance
    const glowTex = createRadialGlowTexture(
      'rgba(255, 251, 240, 1)',
      'rgba(250, 220, 232, 0.5)',
      'rgba(207, 232, 250, 0)',
    );
    const sunHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    sunHalo.position.set(-28, 20, -90);
    sunHalo.scale.set(55, 55, 1);
    scene.add(sunHalo);

    // Composite Dream Fairy Airplane
    const plane = createDreamFairyAirplane({ withLandingGear: false, isSoftwareGl });
    plane.group.position.set(1.3, 0.45, 0);
    plane.group.rotation.set(0.03, -0.58, 0.09);
    plane.group.scale.setScalar(0.86);
    scene.add(plane.group);

    // Volumetric fluffy cloud layers above and below
    const lowerClouds = createFluffyCloudField({
      clusters: 22,
      puffsPerCluster: 6,
      spreadX: 70,
      spreadY: 6,
      spreadZ: 95,
      minY: -7.5,
      tintTop: '#FCFDFE',
      tintUnderside: '#DFD5FA',
      opacity: 0.94,
    });
    scene.add(lowerClouds.mesh);

    const highClouds = createFluffyCloudField({
      clusters: 12,
      puffsPerCluster: 5,
      spreadX: 80,
      spreadY: 9,
      spreadZ: 100,
      minY: 6.5,
      tintTop: '#FFFFFF',
      tintUnderside: '#FADCE8',
      opacity: 0.72,
    });
    scene.add(highClouds.mesh);

    // Floating glowing fairy dust & tiny stars
    const starCount = 160;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 46;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 48;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.55,
      map: glowTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Soft contrails behind the twin engines
    const trailCount = 70;
    const trailPos = new Float32Array(trailCount * 3);
    for (let i = 0; i < trailCount; i++) {
      trailPos[i * 3] = (i % 2 === 0 ? 1.4 : -1.4) + (Math.random() - 0.5) * 0.25;
      trailPos[i * 3 + 1] = 0.1 + (Math.random() - 0.5) * 0.15;
      trailPos[i * 3 + 2] = -2.2 - (i / trailCount) * 16;
    }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    const trailMat = new THREE.PointsMaterial({
      size: 0.75,
      map: glowTex,
      color: '#FCFDFE',
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const contrail = new THREE.Points(trailGeo, trailMat);
    plane.group.add(contrail);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const onPointerMove = (e: PointerEvent) => {
      _pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      _pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onResize = () => {
      if (!host) return;
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
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
        const motionFactor = reducedMotion ? 0.15 : 1;
        elapsed += delta * motionFactor;

        // Spin turbofan blades
        for (const prop of plane.propellers) {
          prop.rotation.z += delta * (boardingActiveRef.current ? 34 : 18);
        }

        // Boarding cinematic climb into the clouds
        if (boardingActiveRef.current) {
          boardingProgressRef.current = Math.min(boardingProgressRef.current + delta * 0.62, 1);
        } else if (boardingProgressRef.current > 0) {
          boardingProgressRef.current = THREE.MathUtils.damp(
            boardingProgressRef.current,
            0,
            2.5,
            delta,
          );
        }

        const p = boardingProgressRef.current;
        const speedMult = 1 + p * 4.5;

        lowerClouds.update(delta * motionFactor, speedMult);
        highClouds.update(delta * motionFactor, speedMult * 0.75);

        // Gentle glide + pointer parallax + boarding climb
        const targetPlaneX = 1.35 + _pointer.x * 0.55 - p * 3.8;
        const targetPlaneY =
          0.42 + Math.sin(elapsed * 1.1) * 0.22 + _pointer.y * 0.35 + p * 3.4;
        const targetPlaneZ = -p * 11.5;

        plane.group.position.x = THREE.MathUtils.damp(plane.group.position.x, targetPlaneX, 3.2, delta);
        plane.group.position.y = THREE.MathUtils.damp(plane.group.position.y, targetPlaneY, 3.2, delta);
        plane.group.position.z = THREE.MathUtils.damp(plane.group.position.z, targetPlaneZ, 2.8, delta);

        const targetPitch = -0.03 - _pointer.y * 0.08 - p * 0.24;
        const targetBank = 0.09 - _pointer.x * 0.18 + Math.sin(elapsed * 0.75) * 0.04;
        plane.group.rotation.x = THREE.MathUtils.damp(plane.group.rotation.x, targetPitch, 3.5, delta);
        plane.group.rotation.z = THREE.MathUtils.damp(plane.group.rotation.z, targetBank, 3.5, delta);
        plane.group.rotation.y = THREE.MathUtils.damp(
          plane.group.rotation.y,
          -0.58 - p * 0.32,
          2.6,
          delta,
        );

        // Camera smooth follow & FOV bloom during boarding
        const targetCamX = 5.4 + _pointer.x * 0.9 - p * 2.5;
        const targetCamY = 2.35 + _pointer.y * 0.45 + p * 1.1;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 2.4, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 2.4, delta);
        camera.fov = THREE.MathUtils.damp(camera.fov, 44 + p * 12, 3, delta);
        camera.updateProjectionMatrix();
        camera.lookAt(plane.group.position.x * 0.4, plane.group.position.y * 0.65, plane.group.position.z * 0.4);

        // Drift fairy dust particles slowly toward viewer
        const posAttr = starGeo.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < starCount; i++) {
          let z = posAttr.getZ(i) + delta * 1.4 * speedMult * motionFactor;
          if (z > 24) z -= 48;
          posAttr.setZ(i, z);
        }
        posAttr.needsUpdate = true;

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
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      glowTex.dispose();
      disposeSceneGraph(scene);
      bundle.dispose();
    };
  }, [webglSupported, contextLost, reducedMotion, isVisibleRef]);

  const handleBoardClick = () => {
    if (isBoarding) return;
    setIsBoarding(true);
    boardingActiveRef.current = true;
    void dreamPiano.start();
    dreamPiano.playChime('boarding');

    window.setTimeout(() => {
      onBoardFlight();
      window.setTimeout(() => {
        boardingActiveRef.current = false;
        setIsBoarding(false);
      }, 900);
    }, 1350);
  };

  return (
    <section
      id="flight-ready"
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden flex items-center"
    >
      {/* 3D WebGL Viewport */}
      {webglSupported && !contextLost ? (
        <div
          ref={canvasHostRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full z-0"
        />
      ) : (
        /* Graceful CSS Pastel Sky Fallback */
        <div
          aria-hidden="true"
          className="absolute inset-0 w-full h-full z-0 bg-gradient-to-b from-[#A8D6F7] via-[#DFD5FA] to-[#FADCE8]"
        >
          <div className="cloud-drift absolute top-1/4 left-10 w-64 h-24 rounded-full bg-white/75 blur-xl" />
          <div className="cloud-drift absolute bottom-1/4 right-12 w-80 h-28 rounded-full bg-white/80 blur-xl" />
        </div>
      )}

      {/* Subtle left-side reading gradient so typography keeps >7:1 legibility while leaving the 3D airplane clear on the right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[#FCFDFE]/88 via-[#FCFDFE]/52 to-transparent md:w-[68%]"
      />

      {/* Semantic Foreground Story & CTA */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 sm:px-10 pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl"
        >
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase font-medium text-[#4C5574] mb-5">
            {DREAM_FAIRY_CONFIG.airlineName} · {DREAM_FAIRY_CONFIG.birthdayDate}
          </p>

          <blockquote className="font-serif italic text-xl sm:text-2xl leading-relaxed text-[#2D3452] mb-7 max-w-lg">
            “{DREAM_FAIRY_CONFIG.hero.quote}”
          </blockquote>

          <h1 className="font-serif font-semibold text-4xl sm:text-5xl lg:text-[3.75rem] leading-[1.08] tracking-tight text-[#1B2138] mb-4">
            {DREAM_FAIRY_CONFIG.hero.greeting}
          </h1>

          <p className="text-lg sm:text-xl text-[#313957] leading-relaxed mb-9 max-w-md">
            {DREAM_FAIRY_CONFIG.hero.subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleBoardClick}
              disabled={isBoarding}
              className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-xl bg-[#1B2138] text-[#FCFDFE] text-sm font-semibold tracking-wider uppercase shadow-lg shadow-[#1B2138]/15 hover:bg-[#2A3254] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B2138] transition-all duration-200 active:scale-[0.98] disabled:opacity-80 whitespace-nowrap cursor-pointer"
            >
              <Plane className="w-4 h-4 text-[#E6C98F] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <span>{isBoarding ? 'CLIMBING INTO THE CLOUDS…' : DREAM_FAIRY_CONFIG.hero.ctaLabel}</span>
            </button>

            <span className="inline-flex items-center gap-1.5 text-xs text-[#4C5574]">
              <Sparkles className="w-3.5 h-3.5 text-[#B48A3E]" aria-hidden="true" />
              <span>Move cursor to bank aircraft</span>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
