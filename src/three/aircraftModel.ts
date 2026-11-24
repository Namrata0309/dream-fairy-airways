import * as THREE from 'three';

export interface DreamPlaneRig {
  group: THREE.Group;
  propellers: THREE.Object3D[];
  landingGear: THREE.Group;
  landingLights: THREE.Mesh[];
}

/**
 * Builds a composite 10+ part Dream Fairy Airways luxury airliner in Three.js:
 * - LatheGeometry aerodynamic fuselage with nose cone & tapered tail
 * - Pastel lavender livery belly & tail stripe
 * - Champagne gold trim pinstripe
 * - Extruded swept main wings with upturned winglets
 * - Horizontal & vertical tail stabilizers
 * - Twin under-wing turbofan nacelles with metallic intake rings & spinning fan blades
 * - Wraparound tinted optical cockpit windshield
 * - Optional retractable landing gear + glowing wingtip/landing lights
 */
export function createDreamFairyAirplane(options?: {
  withLandingGear?: boolean;
  isSoftwareGl?: boolean;
}): DreamPlaneRig {
  const group = new THREE.Group();
  const propellers: THREE.Object3D[] = [];
  const landingLights: THREE.Mesh[] = [];

  // Materials with calibrated roughness/metalness contrast (>= 0.25 delta)
  const hullMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#FCFDFE'),
    roughness: 0.2,
    metalness: 0.06,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });

  const lavenderLiveryMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#B7A3F2'),
    roughness: 0.28,
    metalness: 0.1,
    clearcoat: 0.7,
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#E6C98F'),
    roughness: 0.22,
    metalness: 0.88,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#DCE6F2'),
    roughness: 0.16,
    metalness: 0.92,
  });

  const darkCarbonMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#27304D'),
    roughness: 0.65,
    metalness: 0.2,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#253152'),
    roughness: 0.08,
    metalness: 0.15,
    clearcoat: 1.0,
    transmission: options?.isSoftwareGl ? 0 : 0.35,
    transparent: true,
    opacity: 0.9,
  });

  // 1. Fuselage using LatheGeometry oriented along Z (+Z is nose forward)
  const lathePoints: THREE.Vector2[] = [
    new THREE.Vector2(0.001, -4.4),
    new THREE.Vector2(0.18, -3.9),
    new THREE.Vector2(0.42, -2.9),
    new THREE.Vector2(0.62, -1.6),
    new THREE.Vector2(0.68, -0.3),
    new THREE.Vector2(0.68, 1.5),
    new THREE.Vector2(0.62, 2.55),
    new THREE.Vector2(0.46, 3.25),
    new THREE.Vector2(0.24, 3.72),
    new THREE.Vector2(0.001, 3.95),
  ];
  const fuselageGeo = new THREE.LatheGeometry(lathePoints, 32);
  fuselageGeo.rotateX(Math.PI / 2);
  const fuselage = new THREE.Mesh(fuselageGeo, hullMat);
  fuselage.castShadow = true;
  fuselage.receiveShadow = true;
  group.add(fuselage);

  // 2. Champagne gold belly stripe ring accents
  const stripeGeo = new THREE.CylinderGeometry(0.692, 0.692, 2.8, 32, 1, true);
  stripeGeo.rotateX(Math.PI / 2);
  const stripeMesh = new THREE.Mesh(stripeGeo, lavenderLiveryMat);
  stripeMesh.position.set(0, -0.02, 0.45);
  stripeMesh.scale.set(1.0, 0.38, 1.0);
  group.add(stripeMesh);

  const goldRingGeo = new THREE.TorusGeometry(0.685, 0.018, 12, 36);
  const goldRingFront = new THREE.Mesh(goldRingGeo, goldTrimMat);
  goldRingFront.position.set(0, 0, 1.85);
  group.add(goldRingFront);

  // 3. Cockpit wraparound windshield
  const canopyGeo = new THREE.SphereGeometry(0.48, 24, 16, 0, Math.PI, 0, Math.PI * 0.55);
  canopyGeo.rotateX(-Math.PI * 0.38);
  const canopy = new THREE.Mesh(canopyGeo, glassMat);
  canopy.position.set(0, 0.25, 2.88);
  canopy.scale.set(0.92, 0.68, 1.45);
  group.add(canopy);

  // 4. Swept Main Wings (ExtrudeGeometry with smooth bevels)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.7);
  wingShape.lineTo(3.9, -1.05);
  wingShape.lineTo(4.05, -1.65);
  wingShape.lineTo(0, -0.65);
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.04,
    bevelSegments: 3,
  });
  wingGeo.rotateX(-Math.PI / 2);

  const rightWing = new THREE.Mesh(wingGeo, hullMat);
  rightWing.position.set(0.5, -0.14, 0.5);
  rightWing.rotation.z = 0.05; // slight dihedral
  rightWing.castShadow = true;
  rightWing.receiveShadow = true;
  group.add(rightWing);

  const leftWing = rightWing.clone();
  leftWing.scale.x = -1;
  leftWing.position.set(-0.5, -0.14, 0.5);
  leftWing.rotation.z = -0.05;
  group.add(leftWing);

  // 5. Lavender Winglets at wing tips
  const wingletShape = new THREE.Shape();
  wingletShape.moveTo(0, 0);
  wingletShape.lineTo(0.28, 0.62);
  wingletShape.lineTo(0.05, 0.68);
  wingletShape.lineTo(-0.35, 0);
  wingletShape.closePath();

  const wingletGeo = new THREE.ExtrudeGeometry(wingletShape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  wingletGeo.rotateY(Math.PI / 2);

  const rightWinglet = new THREE.Mesh(wingletGeo, lavenderLiveryMat);
  rightWinglet.position.set(4.42, 0.08, -0.78);
  rightWinglet.rotation.z = -0.22;
  group.add(rightWinglet);

  const leftWinglet = new THREE.Mesh(wingletGeo, lavenderLiveryMat);
  leftWinglet.position.set(-4.42, 0.08, -0.78);
  leftWinglet.rotation.z = 0.22;
  group.add(leftWinglet);

  // 6. Vertical Tail Fin (Lavender) + Gold Trim Leading Edge
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.lineTo(-1.35, 1.85);
  tailShape.lineTo(-1.95, 1.85);
  tailShape.lineTo(-1.55, 0);
  tailShape.closePath();

  const tailGeo = new THREE.ExtrudeGeometry(tailShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 2,
  });
  tailGeo.rotateY(-Math.PI / 2);
  tailGeo.translate(0.04, 0.3, -2.55);
  const verticalTail = new THREE.Mesh(tailGeo, lavenderLiveryMat);
  verticalTail.castShadow = true;
  group.add(verticalTail);

  // 7. Horizontal Tail Stabilizers
  const hStabShape = new THREE.Shape();
  hStabShape.moveTo(0, 0.2);
  hStabShape.lineTo(1.45, -0.45);
  hStabShape.lineTo(1.5, -0.78);
  hStabShape.lineTo(0, -0.4);
  hStabShape.closePath();

  const hStabGeo = new THREE.ExtrudeGeometry(hStabShape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  hStabGeo.rotateX(-Math.PI / 2);

  const rightStab = new THREE.Mesh(hStabGeo, hullMat);
  rightStab.position.set(0.18, 0.14, -3.55);
  rightStab.rotation.z = 0.06;
  group.add(rightStab);

  const leftStab = rightStab.clone();
  leftStab.scale.x = -1;
  leftStab.position.set(-0.18, 0.14, -3.55);
  leftStab.rotation.z = -0.06;
  group.add(leftStab);

  // 8. Twin Under-Wing Turbofan Engines with Chrome Intakes & Spinning Fans
  const buildEngine = (xSign: number) => {
    const engineGroup = new THREE.Group();
    engineGroup.position.set(xSign * 1.65, -0.34, 0.42);

    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.65), hullMat);
    pylon.position.set(0, 0.2, 0.0);
    engineGroup.add(pylon);

    const cowlGeo = new THREE.CylinderGeometry(0.28, 0.25, 1.05, 24);
    cowlGeo.rotateX(Math.PI / 2);
    const cowl = new THREE.Mesh(cowlGeo, hullMat);
    cowl.castShadow = true;
    engineGroup.add(cowl);

    const lipGeo = new THREE.TorusGeometry(0.275, 0.032, 12, 24);
    const lip = new THREE.Mesh(lipGeo, chromeMat);
    lip.position.z = 0.52;
    engineGroup.add(lip);

    const coreCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.21, 0.42, 20).rotateX(-Math.PI / 2),
      darkCarbonMat,
    );
    coreCone.position.z = -0.58;
    engineGroup.add(coreCone);

    const fanHub = new THREE.Group();
    fanHub.position.z = 0.46;
    const spinner = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.2, 14).rotateX(Math.PI / 2),
      goldTrimMat,
    );
    fanHub.add(spinner);

    for (let b = 0; b < 8; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.22, 0.015), darkCarbonMat);
      const angle = (b / 8) * Math.PI * 2;
      blade.position.set(Math.cos(angle) * 0.13, Math.sin(angle) * 0.13, -0.02);
      blade.rotation.z = angle + 0.35;
      blade.rotation.y = 0.4;
      fanHub.add(blade);
    }

    engineGroup.add(fanHub);
    propellers.push(fanHub);
    group.add(engineGroup);
  };

  buildEngine(1);
  buildEngine(-1);

  // 9. Cabin Windows (subtle dark tinted row along fuselage sides)
  const windowGeo = new THREE.BoxGeometry(0.02, 0.09, 0.08);
  for (let i = 0; i < 11; i++) {
    const z = 1.9 - i * 0.34;
    const winR = new THREE.Mesh(windowGeo, glassMat);
    winR.position.set(0.675, 0.14, z);
    group.add(winR);

    const winL = new THREE.Mesh(windowGeo, glassMat);
    winL.position.set(-0.675, 0.14, z);
    group.add(winL);
  }

  // 10. Wingtip Navigation & Landing Lights
  const tipLightGeo = new THREE.SphereGeometry(0.055, 12, 12);
  const blushLight = new THREE.Mesh(
    tipLightGeo,
    new THREE.MeshBasicMaterial({ color: '#F9A8D4' }),
  );
  blushLight.position.set(-4.45, 0.72, -0.78);
  group.add(blushLight);
  landingLights.push(blushLight);

  const goldLight = new THREE.Mesh(
    tipLightGeo,
    new THREE.MeshBasicMaterial({ color: '#FDE68A' }),
  );
  goldLight.position.set(4.45, 0.72, -0.78);
  group.add(goldLight);
  landingLights.push(goldLight);

  // 11. Retractable Landing Gear (for Pilot Dream runway scene)
  const landingGear = new THREE.Group();
  if (options?.withLandingGear) {
    const tireMat = new THREE.MeshStandardMaterial({
      color: '#1E2336',
      roughness: 0.85,
      metalness: 0.08,
    });

    const addStrut = (x: number, y: number, z: number, height: number, dualWheel: boolean) => {
      const strutGroup = new THREE.Group();
      strutGroup.position.set(x, y, z);

      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, height, 10), chromeMat);
      leg.position.y = -height / 2;
      strutGroup.add(leg);

      const wheelGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16);
      wheelGeo.rotateZ(Math.PI / 2);
      if (dualWheel) {
        const w1 = new THREE.Mesh(wheelGeo, tireMat);
        w1.position.set(-0.08, -height, 0);
        const w2 = new THREE.Mesh(wheelGeo, tireMat);
        w2.position.set(0.08, -height, 0);
        strutGroup.add(w1, w2);
      } else {
        const w = new THREE.Mesh(wheelGeo, tireMat);
        w.position.set(0, -height, 0);
        strutGroup.add(w);
      }
      landingGear.add(strutGroup);
    };

    addStrut(0, -0.52, 2.45, 0.48, false);
    addStrut(0.95, -0.45, -0.25, 0.56, true);
    addStrut(-0.95, -0.45, -0.25, 0.56, true);

    const noseLamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshBasicMaterial({ color: '#FFFBEB' }),
    );
    noseLamp.position.set(0, -0.66, 2.5);
    landingGear.add(noseLamp);
    landingLights.push(noseLamp);
  }
  group.add(landingGear);

  return { group, propellers, landingGear, landingLights };
}
