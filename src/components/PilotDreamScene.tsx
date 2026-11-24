import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion } from 'motion/react';
import { PlaneTakeoff, RotateCcw } from 'lucide-react';
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

type TakeoffState = 'idle' | 'taking-off' | 'airborne';

function createRunwayTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;

  // Smooth twilight asphalt base
  ctx.fillStyle = '#2A2D42';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle asphalt grain
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const v = 36 + Math.floor(Math.random() * 18);
    ctx.fillStyle = `rgba(${v}, ${v + 3}, ${v + 16}, 0.35)`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Runway edge lines
  ctx.fillStyle = 'rgba(252, 253, 254, 0.85)';
  ctx.fillRect(28, 0, 10, canvas.height);
  ctx.fillRect(canvas.width - 38, 0, 10, canvas.height);

  // Threshold piano keys near start
  for (let k = 0; k < 8; k++) {
    const x = 58 + k * 52;
    ctx.fillRect(x, canvas.height - 190, 26, 130);
  }

  // Dashed centerline
  for (let y = 40; y < canvas.height - 230; y += 130) {
    ctx.fillRect(canvas.width / 2 - 7, y, 14, 72);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  tex.needsUpdate = true;
  return tex;
}

export function PilotDreamScene({ resetSignal }: { resetSignal: number }) {
  const { containerRef, isVisibleRef, webglSupported, reducedMotion } = useSceneVisibility();
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const takeoffPhaseRef = useRef<TakeoffState>('idle');
  const takeoffTimerRef = useRef(0);
  const [takeoffState, setTakeoffState] = useState<TakeoffState>('idle');
  const [liveAltitude, setLiveAltitude] = useState('0 FT · READY');
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    if (resetSignal > 0) {
      takeoffPhaseRef.current = 'idle';
      takeoffTimerRef.current = 0;
      setTakeoffState('idle');
      setLiveAltitude('0 FT · READY');
    }
  }, [resetSignal]);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host || !webglSupported || contextLost) return;

    let disposed = false;
    let frameId = 0;

    const bundle = createStudioRenderer(host);
    const { renderer, isSoftwareGl, envTexture } = bundle;

    const scene = new THREE.Scene();
    scene.environment = envTexture;
    scene.fog = new THREE.FogExp2('#C79BC0', 0.0095);

    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || 720;
    const camera = new THREE.PerspectiveCamera(44, w / h, 0.1, 360);
    camera.position.set(10.5, 4.2, 19.5);
    camera.lookAt(0, 1.8, -12);

    // Sunset sky dome (twilight lavender -> rose -> golden apricot)
    const skyDome = createPastelSkyDome('#4B4B86', '#B987BE', '#F9C49F', '#322947');
    scene.add(skyDome);

    // Sunset lighting rig
    const hemi = new THREE.HemisphereLight('#FAD6B8', '#382E52', 1.1);
    scene.add(hemi);

    const sunLight = new THREE.DirectionalLight('#FFD29D', 2.4);
    sunLight.position.set(-14, 10, -80);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(1024, 1024);
      sunLight.shadow.camera.left = -28;
      sunLight.shadow.camera.right = 28;
      sunLight.shadow.camera.top = 28;
      sunLight.shadow.camera.bottom = -28;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight('#DFD5FA', 0.9);
    rimLight.position.set(15, 8, 22);
    scene.add(rimLight);

    // Setting Sun Disc + Halo at Runway Horizon
    const glowTex = createRadialGlowTexture(
      'rgba(255, 248, 220, 1)',
      'rgba(249, 180, 150, 0.65)',
      'rgba(201, 139, 184, 0)',
    );
    const sunOrb = new THREE.Mesh(
      new THREE.SphereGeometry(6.5, 24, 24),
      new THREE.MeshBasicMaterial({ color: '#FFE7BD', fog: false }),
    );
    sunOrb.position.set(0, 11, -145);
    scene.add(sunOrb);

    const sunGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: '#FFD19B',
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    sunGlow.position.set(0, 11, -144);
    sunGlow.scale.set(48, 48, 1);
    scene.add(sunGlow);

    // Extended Horizon Ground Apron
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(340, 340),
      new THREE.MeshStandardMaterial({
        color: '#2E2A42',
        roughness: 0.92,
        metalness: 0.05,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // Asphalt Runway with procedural markings
    const runwayTex = createRunwayTexture(renderer.capabilities.getMaxAnisotropy());
    const runwayMat = new THREE.MeshStandardMaterial({
      map: runwayTex,
      roughness: 0.72,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const runway = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 190), runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(0, 0.02, -72);
    runway.receiveShadow = true;
    scene.add(runway);

    // Animated Runway Edge & Center Approach Lights (InstancedMesh)
    const edgeCountPerSide = 26;
    const totalEdgeLights = edgeCountPerSide * 2;
    const lightGeo = new THREE.SphereGeometry(0.14, 10, 10);
    const edgeLightMat = new THREE.MeshBasicMaterial({ color: '#FFE7A3' });
    const edgeLights = new THREE.InstancedMesh(lightGeo, edgeLightMat, totalEdgeLights);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < edgeCountPerSide; i++) {
      const z = 18 - i * 7.2;
      dummy.position.set(-5.9, 0.16, z);
      dummy.updateMatrix();
      edgeLights.setMatrixAt(i * 2, dummy.matrix);

      dummy.position.set(5.9, 0.16, z);
      dummy.updateMatrix();
      edgeLights.setMatrixAt(i * 2 + 1, dummy.matrix);
    }
    edgeLights.instanceMatrix.needsUpdate = true;
    edgeLights.computeBoundingSphere();
    scene.add(edgeLights);

    // Sequential "rabbit" centerline strobe beacons
    const rabbitCount = 16;
    const rabbitGeo = new THREE.SphereGeometry(0.18, 10, 10);
    const rabbitMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    const rabbitLights = new THREE.InstancedMesh(rabbitGeo, rabbitMat, rabbitCount);
    const rabbitCol = new THREE.Color();
    for (let i = 0; i < rabbitCount; i++) {
      dummy.position.set(0, 0.08, 14 - i * 11.5);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      rabbitLights.setMatrixAt(i, dummy.matrix);
      rabbitCol.set('#FFE7A3');
      rabbitLights.setColorAt(i, rabbitCol);
    }
    rabbitLights.instanceMatrix.needsUpdate = true;
    if (rabbitLights.instanceColor) rabbitLights.instanceColor.needsUpdate = true;
    rabbitLights.frustumCulled = false;
    scene.add(rabbitLights);

    // Composite 3D Airport Control Tower (7 parts)
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-14.5, 0, -24);

    const concreteMat = new THREE.MeshStandardMaterial({
      color: '#D9D7E8',
      roughness: 0.65,
      metalness: 0.08,
    });
    const cabGlassMat = new THREE.MeshPhysicalMaterial({
      color: '#1E2A45',
      roughness: 0.1,
      metalness: 0.2,
      clearcoat: 1,
      emissive: '#F5C97B',
      emissiveIntensity: 0.35,
    });
    const towerAccentMat = new THREE.MeshStandardMaterial({
      color: '#9F8CE0',
      roughness: 0.35,
      metalness: 0.4,
    });

    const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.0, 2.2, 20), concreteMat);
    towerBase.position.y = 1.1;
    towerBase.castShadow = true;
    towerGroup.add(towerBase);

    const towerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.25, 9.2, 20), concreteMat);
    towerShaft.position.y = 6.7;
    towerShaft.castShadow = true;
    towerGroup.add(towerShaft);

    const towerCollar = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.0, 1.1, 20), towerAccentMat);
    towerCollar.position.y = 11.5;
    towerGroup.add(towerCollar);

    const towerCab = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.05, 1.8, 16), cabGlassMat);
    towerCab.position.y = 12.9;
    towerGroup.add(towerCab);

    const towerRoof = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.55, 0.45, 20), concreteMat);
    towerRoof.position.y = 14.0;
    towerGroup.add(towerRoof);

    const radarMount = new THREE.Group();
    radarMount.position.y = 14.65;
    const radarPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.9, 10), concreteMat);
    const radarBar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.28, 0.18), towerAccentMat);
    radarBar.position.y = 0.4;
    const towerBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshBasicMaterial({ color: '#F9A8D4' }),
    );
    towerBeacon.position.y = 0.85;
    radarMount.add(radarPole, radarBar, towerBeacon);
    towerGroup.add(radarMount);

    scene.add(towerGroup);

    // Hero Airplane lined up on Runway
    const plane = createDreamFairyAirplane({ withLandingGear: true, isSoftwareGl });
    plane.group.position.set(0, 1.02, 7.5);
    plane.group.rotation.set(0, Math.PI, 0); // +Z nose rotated to face -Z down the runway
    plane.group.scale.setScalar(0.95);
    scene.add(plane.group);

    // Sunset Pastel Clouds above horizon
    const sunsetClouds = createFluffyCloudField({
      clusters: 18,
      puffsPerCluster: 5,
      spreadX: 110,
      spreadY: 16,
      spreadZ: 120,
      minY: 14,
      tintTop: '#FADCE8',
      tintUnderside: '#9C82BE',
      opacity: 0.84,
    });
    sunsetClouds.mesh.position.z = -45;
    scene.add(sunsetClouds.mesh);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const onResize = () => {
      if (!host) return;
      const nw = host.clientWidth || window.innerWidth;
      const nh = host.clientHeight || 720;
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
        const motionFactor = reducedMotion ? 0.25 : 1;
        elapsed += delta * motionFactor;

        radarMount.rotation.y += delta * 1.15;
        sunsetClouds.update(delta * motionFactor, 0.55);

        // Sequential runway rabbit lights
        const strobeSpeed = takeoffPhaseRef.current === 'idle' ? 7.5 : 16;
        const activeIndex = Math.floor(elapsed * strobeSpeed) % rabbitCount;
        for (let i = 0; i < rabbitCount; i++) {
          const isLit = i === activeIndex || i === (activeIndex + 1) % rabbitCount;
          rabbitCol.set(isLit ? '#FFFFFF' : '#B9925B');
          rabbitLights.setColorAt(i, rabbitCol);
        }
        if (rabbitLights.instanceColor) rabbitLights.instanceColor.needsUpdate = true;

        // Plane kinematics for idle vs taking-off vs airborne
        const phase = takeoffPhaseRef.current;
        if (phase === 'idle') {
          for (const prop of plane.propellers) {
            prop.rotation.z += delta * 14;
          }
          plane.group.position.x = THREE.MathUtils.damp(plane.group.position.x, 0, 4, delta);
          plane.group.position.y = THREE.MathUtils.damp(plane.group.position.y, 1.02, 4, delta);
          plane.group.position.z = THREE.MathUtils.damp(plane.group.position.z, 7.5, 4, delta);
          plane.group.rotation.set(0, Math.PI, 0);
          plane.landingGear.scale.setScalar(1);
          plane.landingGear.visible = true;

          // Subtle cinematic idle orbit
          const camX = 9.8 + Math.sin(elapsed * 0.28) * 1.6;
          const camY = 4.0 + Math.cos(elapsed * 0.22) * 0.35;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, camX, 2.5, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, camY, 2.5, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, 19.5, 2.5, delta);
          camera.fov = THREE.MathUtils.damp(camera.fov, 44, 3, delta);
          camera.updateProjectionMatrix();
          camera.lookAt(0, 1.9, -10);
        } else {
          takeoffTimerRef.current += delta;
          const t = takeoffTimerRef.current;

          for (const prop of plane.propellers) {
            prop.rotation.z += delta * 42;
          }

          // Phase A (0 -> 1.4s): spool up + roll down runway
          // Phase B (1.4 -> 6.5s): rotate nose up, liftoff, retract gear, climb into sunset sky
          const rollAccel = Math.pow(Math.max(t - 0.35, 0), 2.05) * 4.8;
          const planeZ = 7.5 - Math.min(rollAccel, 155);
          const climbT = Math.max(t - 1.55, 0);
          const planeY = 1.02 + Math.pow(climbT, 1.75) * 3.1;
          const pitchUp = THREE.MathUtils.clamp(climbT * 0.24, 0, 0.31);
          const gentleRoll = Math.sin(Math.max(climbT - 1.2, 0) * 0.7) * 0.12;

          plane.group.position.set(0, planeY, planeZ);
          plane.group.rotation.set(-pitchUp, Math.PI, gentleRoll);

          // Retract landing gear smoothly 1s after liftoff
          if (climbT > 0.9) {
            const gearScale = Math.max(1 - (climbT - 0.9) * 1.4, 0);
            plane.landingGear.scale.set(1, gearScale, 1);
            if (gearScale <= 0.02) plane.landingGear.visible = false;
          }

          // Dynamic chase camera sweeps upward watching the plane soar toward the sun
          const targetCamX = THREE.MathUtils.clamp(9.8 - t * 1.35, 3.8, 10);
          const targetCamY = 3.6 + Math.min(planeY * 0.48, 12);
          const targetCamZ = 18.5 - Math.min(Math.max(t - 1.2, 0) * 9.5, 72);

          camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 2.8, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 2.8, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 2.6, delta);
          camera.fov = THREE.MathUtils.damp(camera.fov, 52, 2.2, delta);
          camera.updateProjectionMatrix();
          camera.lookAt(0, plane.group.position.y + 0.8, plane.group.position.z - 8);

          if (t > 2.4 && takeoffPhaseRef.current === 'taking-off') {
            takeoffPhaseRef.current = 'airborne';
            setTakeoffState('airborne');
            setLiveAltitude('UNLIMITED');
          } else if (t > 1.5 && takeoffPhaseRef.current === 'taking-off') {
            const ft = Math.min(Math.round((t - 1.5) * 4200), 9800);
            setLiveAltitude(`${ft.toLocaleString()} FT ↗`);
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
      runwayTex.dispose();
      glowTex.dispose();
      disposeSceneGraph(scene);
      bundle.dispose();
    };
  }, [webglSupported, contextLost, reducedMotion, isVisibleRef]);

  const handleTakeoff = () => {
    takeoffPhaseRef.current = 'taking-off';
    takeoffTimerRef.current = 0;
    setTakeoffState('taking-off');
    setLiveAltitude('V1 · ROTATE');
    void dreamPiano.start();
    dreamPiano.playChime('takeoff');
  };

  const handleResetRunway = () => {
    takeoffPhaseRef.current = 'idle';
    takeoffTimerRef.current = 0;
    setTakeoffState('idle');
    setLiveAltitude('0 FT · READY');
  };

  const { heading, message, ctaLabel, takeoffQuote, dashboard } = DREAM_FAIRY_CONFIG.pilotDream;

  return (
    <section
      id="pilot-dream"
      ref={containerRef}
      className="relative min-h-[760px] lg:min-h-[840px] w-full overflow-hidden flex flex-col justify-between bg-[#2D2644]"
    >
      {/* Full-bleed 3D Sunset Runway Canvas */}
      {webglSupported && !contextLost ? (
        <div
          ref={canvasHostRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full z-0"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 w-full h-full z-0 bg-gradient-to-b from-[#4B4B86] via-[#C98BB8] to-[#F9C49F]"
        />
      )}

      {/* Subtle top & bottom gradient scrims for crisp readability without blocking center runway */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 z-[1] bg-gradient-to-b from-[#1A162D]/82 via-[#1A162D]/40 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-72 z-[1] bg-gradient-to-t from-[#171326]/92 via-[#171326]/60 to-transparent"
      />

      {/* Top Narrative Overlay */}
      <div className="relative z-10 max-w-6xl w-full mx-auto px-5 sm:px-8 pt-16 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <p className="text-xs tracking-[0.22em] uppercase text-[#E6C98F] font-medium mb-3">
            Runway 06 · Sunset Departure
          </p>
          <h2 className="font-serif font-semibold text-3xl sm:text-5xl text-[#FCFDFE] tracking-tight leading-[1.1] mb-4">
            {heading}
          </h2>
          <p className="text-base sm:text-lg text-[#EAE6FA] leading-relaxed max-w-xl">
            {message}
          </p>
        </motion.div>

        {/* Post-takeoff Proud Captain Quote */}
        {takeoffState === 'airborne' && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 max-w-xl rounded-2xl px-6 py-4 bg-[#19152B]/85 border border-[#E6C98F]/40 text-[#FCFDFE]"
          >
            <p className="font-serif italic text-xl sm:text-2xl leading-relaxed text-[#FFF3D6]">
              “{takeoffQuote}”
            </p>
          </motion.div>
        )}
      </div>

      {/* Bottom Interactive Cockpit-Inspired Avionics Bar */}
      <div className="relative z-10 max-w-6xl w-full mx-auto px-5 sm:px-8 pb-10 sm:pb-12">
        <div className="rounded-3xl bg-[#161326]/90 border border-[#DFD5FA]/20 p-5 sm:p-6 shadow-2xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5 items-center">
            {dashboard.map((metric) => {
              const displayValue =
                metric.label === 'ALTITUDE' && takeoffState !== 'idle'
                  ? liveAltitude
                  : metric.value;

              return (
                <div key={metric.label} className="min-w-0">
                  <div className="text-[10px] font-mono tracking-[0.18em] text-[#B8AED8] uppercase mb-1">
                    {metric.label}
                  </div>
                  <div className="font-mono text-xs sm:text-sm font-medium text-[#FCFDFE] tabular-nums truncate">
                    {displayValue}
                  </div>
                </div>
              );
            })}

            <div className="col-span-2 sm:col-span-3 lg:col-span-1 flex lg:justify-end">
              {takeoffState === 'airborne' ? (
                <button
                  type="button"
                  onClick={handleResetRunway}
                  className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#DFD5FA] text-[#1B2138] text-xs font-semibold tracking-wider uppercase hover:bg-[#ECE5FD] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFD5FA] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset Runway</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTakeoff}
                  disabled={takeoffState === 'taking-off'}
                  className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#E6C98F] text-[#1B2138] text-xs font-semibold tracking-wider uppercase hover:bg-[#F2DAAB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C98F] transition-colors disabled:opacity-75 whitespace-nowrap cursor-pointer"
                >
                  <PlaneTakeoff className="w-4 h-4" aria-hidden="true" />
                  <span>{takeoffState === 'taking-off' ? 'TAKING OFF…' : ctaLabel}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
