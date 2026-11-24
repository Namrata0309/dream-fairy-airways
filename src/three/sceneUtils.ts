import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Detect software WebGL rasterizers (SwiftShader, llvmpipe, WARP) from the GPU renderer string.
 * Used strictly for rendering cost (pixel ratio, shadow maps, antialiasing, frame pacing)
 * without altering scene content, layout, or logic.
 */
export function detectSoftwareGl(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const ok = Boolean(gl);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

export interface StudioRendererBundle {
  renderer: THREE.WebGLRenderer;
  isSoftwareGl: boolean;
  envTexture: THREE.Texture;
  dispose: () => void;
}

export function createStudioRenderer(container: HTMLElement): StudioRendererBundle {
  const isSoftwareGl = detectSoftwareGl();
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
    alpha: false,
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
  roomEnv.dispose();
  pmremGenerator.dispose();

  container.appendChild(renderer.domElement);

  return {
    renderer,
    isSoftwareGl,
    envTexture: envRT.texture,
    dispose: () => {
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}

/**
 * Software-WebGL-friendly frame pacer: waits for GPU draw completion fence before scheduling next tick.
 */
export function scheduleAfterDraw(
  renderer: THREE.WebGLRenderer,
  cb: () => void,
  setTimerId: (id: number) => void,
): void {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  if (typeof gl.fenceSync !== 'function') {
    setTimerId(window.setTimeout(cb, 80));
    return;
  }
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  const poll = () => {
    const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
    if (state === gl.UNSIGNALED) {
      setTimerId(window.setTimeout(poll, 5));
    } else {
      if (sync) gl.deleteSync(sync);
      setTimerId(window.setTimeout(cb, 80));
    }
  };
  setTimerId(window.setTimeout(poll, 5));
}

/**
 * Generates a soft radial glow sprite texture procedurally on an HTML5 Canvas (zero external 404s).
 */
export function createRadialGlowTexture(
  innerColor = 'rgba(255, 255, 255, 1)',
  midColor = 'rgba(230, 201, 143, 0.45)',
  outerColor = 'rgba(223, 213, 250, 0)',
  size = 128,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.35, midColor);
  grad.addColorStop(1, outerColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a smooth vertical pastel sky dome using a custom gradient ShaderMaterial.
 */
export function createPastelSkyDome(
  topHex: string,
  midHex: string,
  horizonHex: string,
  bottomHex: string,
): THREE.Mesh {
  const geo = new THREE.SphereGeometry(220, 32, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(topHex) },
      uMid: { value: new THREE.Color(midHex) },
      uHorizon: { value: new THREE.Color(horizonHex) },
      uBottom: { value: new THREE.Color(bottomHex) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      uniform vec3 uBottom;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        vec3 col = uHorizon;
        if (h >= 0.0) {
          float t1 = smoothstep(0.0, 0.28, h);
          float t2 = smoothstep(0.22, 0.85, h);
          col = mix(uHorizon, uMid, t1);
          col = mix(col, uTop, t2);
        } else {
          col = mix(uHorizon, uBottom, smoothstep(0.0, -0.45, h));
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}

/**
 * Reusable volumetric-look fluffy cloud cluster built as an InstancedMesh of layered organic cloud puffs.
 */
export interface CloudField {
  mesh: THREE.InstancedMesh;
  update: (delta: number, speedMultiplier?: number) => void;
}

interface CloudPuffData {
  baseX: number;
  baseY: number;
  baseZ: number;
  sx: number;
  sy: number;
  sz: number;
  speed: number;
  bobOffset: number;
}

const _dummy = new THREE.Object3D();

export function createFluffyCloudField(options: {
  clusters: number;
  puffsPerCluster?: number;
  spreadX: number;
  spreadY: number;
  spreadZ: number;
  minY: number;
  tintTop?: string;
  tintUnderside?: string;
  opacity?: number;
}): CloudField {
  const puffsPerCluster = options.puffsPerCluster ?? 6;
  const totalCount = options.clusters * puffsPerCluster;

  const geo = new THREE.IcosahedronGeometry(1, 2);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(options.tintTop ?? '#FCFDFE'),
    roughness: 0.92,
    metalness: 0.0,
    transparent: true,
    opacity: options.opacity ?? 0.92,
  });

  const mesh = new THREE.InstancedMesh(geo, mat, totalCount);
  mesh.frustumCulled = false;

  const topCol = new THREE.Color(options.tintTop ?? '#FCFDFE');
  const underCol = new THREE.Color(options.tintUnderside ?? '#E7DDF9');
  const tempCol = new THREE.Color();

  const data: CloudPuffData[] = [];

  for (let c = 0; c < options.clusters; c++) {
    const cx = (Math.random() - 0.5) * options.spreadX;
    const cy = options.minY + Math.random() * options.spreadY;
    const cz = (Math.random() - 0.5) * options.spreadZ;
    const clusterScale = 1.4 + Math.random() * 2.2;
    const speed = 0.6 + Math.random() * 0.9;

    for (let p = 0; p < puffsPerCluster; p++) {
      const idx = c * puffsPerCluster + p;
      const angle = (p / puffsPerCluster) * Math.PI * 2;
      const radius = p === 0 ? 0 : (0.55 + Math.random() * 0.9) * clusterScale;
      const bx = cx + Math.cos(angle) * radius * 1.45;
      const by = cy + (p === 0 ? 0.35 : (Math.random() - 0.35) * 0.55) * clusterScale;
      const bz = cz + Math.sin(angle) * radius * 0.85;

      const sx = clusterScale * (p === 0 ? 1.55 : 0.85 + Math.random() * 0.65);
      const sy = clusterScale * (p === 0 ? 0.85 : 0.55 + Math.random() * 0.4);
      const sz = clusterScale * (0.8 + Math.random() * 0.55);

      data.push({
        baseX: bx,
        baseY: by,
        baseZ: bz,
        sx,
        sy,
        sz,
        speed,
        bobOffset: Math.random() * Math.PI * 2,
      });

      _dummy.position.set(bx, by, bz);
      _dummy.scale.set(sx, sy, sz);
      _dummy.updateMatrix();
      mesh.setMatrixAt(idx, _dummy.matrix);

      tempCol.copy(underCol).lerp(topCol, p === 0 ? 0.85 : 0.45 + Math.random() * 0.5);
      mesh.setColorAt(idx, tempCol);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();

  let elapsed = 0;
  const halfZ = options.spreadZ * 0.5;

  return {
    mesh,
    update(delta: number, speedMultiplier = 1) {
      elapsed += delta;
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        d.baseZ += d.speed * speedMultiplier * delta;
        if (d.baseZ > halfZ) {
          d.baseZ -= options.spreadZ;
        }
        const bob = Math.sin(elapsed * 0.6 + d.bobOffset) * 0.14;
        _dummy.position.set(d.baseX, d.baseY + bob, d.baseZ);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(d.sx, d.sy, d.sz);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

/**
 * Disposes all geometries, materials, and textures in a scene recursively.
 */
export function disposeSceneGraph(scene: THREE.Scene): void {
  scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh || (obj as THREE.Points).isPoints) {
      const renderable = obj as THREE.Mesh;
      renderable.geometry?.dispose();
      const mat = renderable.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else if (mat) {
        mat.dispose();
      }
    }
  });
}
