import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AnimatePresence, motion } from 'motion/react';
import { MailOpen, RotateCcw } from 'lucide-react';
import { DREAM_FAIRY_CONFIG } from '../config/dreamFairyConfig';
import { dreamPiano } from '../audio/dreamPiano';
import {
  createFluffyCloudField,
  createPastelSkyDome,
  createStudioRenderer,
  disposeSceneGraph,
  scheduleAfterDraw,
} from '../three/sceneUtils';
import { useSceneVisibility } from '../hooks/useSceneVisibility';

export function LetterSection() {
  const { containerRef, isVisibleRef, webglSupported, reducedMotion } = useSceneVisibility();
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const isOpenRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host || !webglSupported || contextLost) return;

    let disposed = false;
    let frameId = 0;

    const bundle = createStudioRenderer(host);
    const { renderer, isSoftwareGl, envTexture } = bundle;

    const scene = new THREE.Scene();
    scene.environment = envTexture;
    scene.fog = new THREE.FogExp2('#EFE7FB', 0.015);

    const w = host.clientWidth || 560;
    const h = host.clientHeight || 420;
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 160);
    camera.position.set(0, 0.8, 7.6);
    camera.lookAt(0, 0, 0);

    const skyDome = createPastelSkyDome('#C7E3FA', '#E5DCFB', '#FADCE8', '#FCFDFE');
    scene.add(skyDome);

    const hemi = new THREE.HemisphereLight('#FFFFFF', '#DFD5FA', 1.2);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#FFF3DC', 1.8);
    keyLight.position.set(6, 10, 8);
    scene.add(keyLight);

    const clouds = createFluffyCloudField({
      clusters: 12,
      puffsPerCluster: 5,
      spreadX: 44,
      spreadY: 12,
      spreadZ: 45,
      minY: -6,
      tintTop: '#FCFDFE',
      tintUnderside: '#E7DDF9',
      opacity: 0.88,
    });
    clouds.mesh.position.z = -12;
    scene.add(clouds.mesh);

    // 3D Glass Envelope Group
    const envelopeGroup = new THREE.Group();
    scene.add(envelopeGroup);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#F5F0FF',
      roughness: 0.14,
      metalness: 0.05,
      clearcoat: 1.0,
      transmission: isSoftwareGl ? 0 : 0.72,
      transparent: true,
      opacity: isSoftwareGl ? 0.65 : 0.94,
      ior: 1.48,
      thickness: 0.5,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: '#E6C98F',
      roughness: 0.24,
      metalness: 0.88,
    });

    const paperMat = new THREE.MeshStandardMaterial({
      color: '#FFFDF9',
      roughness: 0.85,
      metalness: 0.02,
    });

    // Envelope Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.35, 0.18), glassMat);
    envelopeGroup.add(body);

    // Gold border trim frame
    const frameEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(3.82, 2.37, 0.19));
    const frameLines = new THREE.LineSegments(
      frameEdges,
      new THREE.LineBasicMaterial({ color: '#D7B36E' }),
    );
    envelopeGroup.add(frameLines);

    // Inner letter card peeking upward when opened
    const innerCard = new THREE.Mesh(new THREE.BoxGeometry(3.35, 2.0, 0.04), paperMat);
    innerCard.position.set(0, 0.05, 0.02);
    envelopeGroup.add(innerCard);

    // Hinged triangular flap pivoted along top edge
    const flapPivot = new THREE.Group();
    flapPivot.position.set(0, 1.17, 0.1);
    envelopeGroup.add(flapPivot);

    const flapShape = new THREE.Shape();
    flapShape.moveTo(-1.88, 0);
    flapShape.lineTo(1.88, 0);
    flapShape.lineTo(0, -1.35);
    flapShape.closePath();

    const flapGeo = new THREE.ExtrudeGeometry(flapShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    const flapMesh = new THREE.Mesh(flapGeo, glassMat);
    flapPivot.add(flapMesh);

    // Champagne gold wax seal disc
    const sealGroup = new THREE.Group();
    sealGroup.position.set(0, -1.24, 0.08);
    const sealDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.06, 24).rotateX(Math.PI / 2),
      goldMat,
    );
    const sealRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 10, 24), goldMat);
    sealRing.position.z = 0.035;
    sealGroup.add(sealDisc, sealRing);
    flapPivot.add(sealGroup);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const onResize = () => {
      if (!host) return;
      const nw = host.clientWidth || 560;
      const nh = host.clientHeight || 420;
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

        clouds.update(delta * motionFactor, 0.5);

        envelopeGroup.position.y = Math.sin(elapsed * 1.1) * 0.16;
        envelopeGroup.rotation.y = Math.sin(elapsed * 0.55) * 0.14;
        envelopeGroup.rotation.x = Math.cos(elapsed * 0.65) * 0.05;

        const targetFlapAngle = isOpenRef.current ? -Math.PI * 0.78 : 0;
        const targetCardY = isOpenRef.current ? 1.15 : 0.05;
        flapPivot.rotation.x = THREE.MathUtils.damp(flapPivot.rotation.x, targetFlapAngle, 4.5, delta);
        innerCard.position.y = THREE.MathUtils.damp(innerCard.position.y, targetCardY, 3.8, delta);

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
      disposeSceneGraph(scene);
      bundle.dispose();
    };
  }, [webglSupported, contextLost, reducedMotion, isVisibleRef]);

  const handleOpenLetter = () => {
    setIsOpen(true);
    void dreamPiano.start();
    dreamPiano.playChime('envelope');
  };

  const handleCloseLetter = () => {
    setIsOpen(false);
  };

  const { sectionTitle, promptHint, salutation, paragraphs, closing, signature } =
    DREAM_FAIRY_CONFIG.letter;

  return (
    <section
      id="letter"
      ref={containerRef}
      className="py-24 sm:py-32 px-5 sm:px-8 bg-gradient-to-b from-[#F3F8FD] via-[#F7F2FC] to-[#FDF4F8]"
    >
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <p className="text-xs tracking-[0.22em] uppercase text-[#4C5574] font-medium mb-3">
            Sealed With Champagne Gold
          </p>
          <h2 className="font-serif font-semibold text-3xl sm:text-5xl text-[#1B2138] tracking-tight">
            {sectionTitle}
          </h2>
        </motion.div>

        {/* 3D Floating Glass Envelope Stage */}
        <div className="relative max-w-2xl mx-auto mb-10">
          <button
            type="button"
            onClick={isOpen ? handleCloseLetter : handleOpenLetter}
            aria-label={isOpen ? 'Close birthday letter envelope' : 'Open birthday letter envelope'}
            className="w-full block rounded-3xl overflow-hidden border border-[#1B2138]/10 shadow-xl shadow-[#7D6AB8]/12 bg-[#EFE7FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B2138] cursor-pointer relative group"
          >
            {webglSupported && !contextLost ? (
              <div ref={canvasHostRef} className="w-full h-[300px] sm:h-[360px]" />
            ) : (
              <div className="w-full h-[300px] sm:h-[360px] flex items-center justify-center bg-gradient-to-br from-[#DFD5FA] via-[#FADCE8] to-[#CFE8FA]">
                <div className="w-64 h-40 rounded-2xl bg-white/75 border border-[#C8A055]/50 shadow-lg flex items-center justify-center">
                  <span className="w-10 h-10 rounded-full bg-[#E6C98F] shadow-sm" />
                </div>
              </div>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B2138] text-[#FCFDFE] text-xs font-semibold tracking-wider uppercase shadow-md group-hover:bg-[#2A3254] transition-colors whitespace-nowrap">
              {isOpen ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-[#E6C98F]" aria-hidden="true" />
                  <span>Fold Letter Back</span>
                </>
              ) : (
                <>
                  <MailOpen className="w-3.5 h-3.5 text-[#E6C98F]" aria-hidden="true" />
                  <span>Open Your Letter</span>
                </>
              )}
            </div>
          </button>

          {!isOpen && (
            <p className="text-center text-xs text-[#4C5574] mt-3">{promptHint}</p>
          )}
        </div>

        {/* Animated Handwritten-Style Birthday Letter Reveal */}
        <AnimatePresence>
          {isOpen && (
            <motion.article
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-3xl mx-auto rounded-3xl bg-[#FFFDF9] border border-[#E6C98F]/60 shadow-2xl shadow-[#7D6AB8]/12 p-7 sm:p-12 md:p-14"
            >
              <div className="border border-[#E6C98F]/35 rounded-2xl p-6 sm:p-10">
                <p className="font-serif italic text-2xl sm:text-3xl text-[#1B2138] mb-6">
                  {salutation}
                </p>

                <div className="space-y-5 font-serif text-lg sm:text-[1.32rem] leading-[1.75] text-[#28304D]">
                  {paragraphs.map((text, idx) => (
                    <motion.p
                      key={idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: idx * 0.06 }}
                    >
                      {text}
                    </motion.p>
                  ))}
                </div>

                <div className="mt-9 pt-6 border-t border-[#E6C98F]/35 font-serif italic text-xl sm:text-2xl text-[#1B2138]">
                  <p className="text-[#4C5574] text-lg mb-1">{closing}</p>
                  <p className="font-semibold">{signature}</p>
                </div>
              </div>
            </motion.article>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
