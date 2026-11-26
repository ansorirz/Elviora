import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { formatCompactRupiah } from '../types';
import type { DonutSegment } from './Charts';

interface Category3DSceneProps {
  segments: DonutSegment[];
  totalCount: number;
  theme: 'light' | 'dark';
  accentHex?: string;
  hoveredLabel: string | null;
  onHoverLabel: (label: string | null) => void;
}

export function Category3DScene({
  segments,
  totalCount,
  theme,
  accentHex = '#5F7D63',
  hoveredLabel,
  onHoverLabel,
}: Category3DSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef<string | null>(hoveredLabel);
  const onHoverRef = useRef(onHoverLabel);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  hoveredRef.current = hoveredLabel;
  onHoverRef.current = onHoverLabel;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 220;

    // Software WebGL detection per GPU/Headless standard
    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Studio IBL reflections via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    camera.position.set(0, 3.35, 4.45);
    camera.lookAt(0, 0.25, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.44;
    controls.target.set(0, 0.25, 0);

    // 3-Point Warm/Cool Studio Lighting
    const hemi = new THREE.HemisphereLight(
      theme === 'dark' ? 0xdbe6dc : 0xfffcf5,
      theme === 'dark' ? 0x1a221c : 0xd9d0c1,
      0.85
    );
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.9);
    keyLight.position.set(4, 6.5, 4.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 16;
      const d = 3;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(new THREE.Color(accentHex), 0.9);
    rimLight.position.set(-4, 3, -3.5);
    scene.add(rimLight);

    // Grounded Contact Shadow Disc + Studio Plinth
    const disposables: { dispose: () => void }[] = [envTex];
    const registerGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      disposables.push(g);
      return g;
    };
    const registerMat = <T extends THREE.Material>(m: T): T => {
      disposables.push(m);
      return m;
    };

    const plinthGeo = registerGeo(new THREE.CylinderGeometry(1.95, 2.08, 0.14, 64));
    const plinthMat = registerMat(
      new THREE.MeshStandardMaterial({
        color: theme === 'dark' ? 0x202922 : 0xf4efe6,
        roughness: 0.72,
        metalness: 0.05,
      })
    );
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -0.07;
    plinth.receiveShadow = !isSoftwareGl;
    scene.add(plinth);

    const goldRingGeo = registerGeo(new THREE.TorusGeometry(1.96, 0.022, 16, 72));
    const goldMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xc69c4d,
        metalness: 0.92,
        roughness: 0.2,
        clearcoat: 0.4,
      })
    );
    const goldRing = new THREE.Mesh(goldRingGeo, goldMat);
    goldRing.rotation.x = Math.PI / 2;
    goldRing.position.y = 0.005;
    scene.add(goldRing);

    // Composite 8-Part Centerpiece: Sculpted Ceramic Vase + Botanical Bouquet Blooms
    const bouquetGroup = new THREE.Group();
    scene.add(bouquetGroup);

    // 1. Lathe ceramic vase profile (bottom-center grounded at y=0)
    const vaseProfile = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.28, 0.0),
      new THREE.Vector2(0.36, 0.18),
      new THREE.Vector2(0.33, 0.42),
      new THREE.Vector2(0.21, 0.62),
      new THREE.Vector2(0.25, 0.72),
      new THREE.Vector2(0.22, 0.72),
    ];
    const vaseGeo = registerGeo(new THREE.LatheGeometry(vaseProfile, 36));
    const vaseMat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: theme === 'dark' ? 0x2d3b30 : 0xfaf7f0,
        roughness: 0.25,
        metalness: 0.05,
        clearcoat: 0.65,
        clearcoatRoughness: 0.18,
      })
    );
    const vaseMesh = new THREE.Mesh(vaseGeo, vaseMat);
    vaseMesh.castShadow = !isSoftwareGl;
    vaseMesh.receiveShadow = !isSoftwareGl;
    bouquetGroup.add(vaseMesh);

    // 2. Gold collar band on vase neck
    const collarGeo = registerGeo(new THREE.TorusGeometry(0.23, 0.018, 12, 36));
    const collar = new THREE.Mesh(collarGeo, goldMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.61;
    bouquetGroup.add(collar);

    // 3. Procedural Botanical Blooms (roses + eucalyptus leaves)
    const rosePinkMat = registerMat(
      new THREE.MeshStandardMaterial({ color: 0xd88c94, roughness: 0.55, metalness: 0.04 })
    );
    const creamBloomMat = registerMat(
      new THREE.MeshStandardMaterial({ color: 0xf7efe4, roughness: 0.6, metalness: 0.02 })
    );
    const sageLeafMat = registerMat(
      new THREE.MeshStandardMaterial({ color: new THREE.Color(accentHex), roughness: 0.62, metalness: 0.05 })
    );

    const bloomGeo = registerGeo(new THREE.DodecahedronGeometry(0.14, 1));
    const petalRingGeo = registerGeo(new THREE.TorusGeometry(0.11, 0.045, 10, 18));
    const leafGeo = registerGeo(new THREE.ConeGeometry(0.085, 0.34, 6));

    const bloomPositions: [number, number, number, boolean][] = [
      [0, 0.96, 0, true],
      [0.18, 0.87, 0.12, false],
      [-0.19, 0.86, 0.1, true],
      [0.05, 0.88, -0.2, false],
      [-0.12, 0.82, -0.14, true],
    ];

    bloomPositions.forEach(([bx, by, bz, isPink], i) => {
      const flower = new THREE.Group();
      flower.position.set(bx, by, bz);
      const core = new THREE.Mesh(bloomGeo, isPink ? rosePinkMat : creamBloomMat);
      core.scale.setScalar(i === 0 ? 1.15 : 0.92);
      core.castShadow = !isSoftwareGl;
      flower.add(core);

      const outerPetals = new THREE.Mesh(petalRingGeo, isPink ? rosePinkMat : creamBloomMat);
      outerPetals.rotation.x = Math.PI / 2.2;
      outerPetals.position.y = -0.02;
      flower.add(outerPetals);
      bouquetGroup.add(flower);
    });

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.3;
      const leaf = new THREE.Mesh(leafGeo, sageLeafMat);
      leaf.position.set(Math.cos(angle) * 0.25, 0.78, Math.sin(angle) * 0.25);
      leaf.rotation.z = -Math.cos(angle) * 0.65;
      leaf.rotation.x = Math.sin(angle) * 0.65;
      leaf.castShadow = !isSoftwareGl;
      bouquetGroup.add(leaf);
    }

    // Extruded 3D Category Ring Arcs around the bouquet
    const validSegments = segments.filter((s) => s.count > 0);
    const arcGroup = new THREE.Group();
    scene.add(arcGroup);

    const arcMeshes: THREE.Mesh[] = [];
    const innerR = 0.88;
    const outerR = 1.54;
    let startAngle = 0;

    validSegments.forEach((seg, idx) => {
      const ratio = totalCount > 0 ? seg.count / totalCount : 1 / validSegments.length;
      const sweep = Math.max(0.18, ratio * Math.PI * 2 - 0.06);

      const shape = new THREE.Shape();
      shape.absarc(0, 0, outerR, startAngle, startAngle + sweep, false);
      shape.lineTo(
        Math.cos(startAngle + sweep) * innerR,
        Math.sin(startAngle + sweep) * innerR
      );
      shape.absarc(0, 0, innerR, startAngle + sweep, startAngle, true);
      shape.closePath();

      const depth = 0.18 + ratio * 0.42;
      const extrudeGeo = registerGeo(
        new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: true,
          bevelThickness: 0.035,
          bevelSize: 0.03,
          bevelSegments: 3,
          curveSegments: 28,
        })
      );
      // Rotate so extrusion stands vertically along +Y
      extrudeGeo.rotateX(-Math.PI / 2);

      const segMat = registerMat(
        new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(seg.color),
          roughness: 0.34,
          metalness: 0.12,
          clearcoat: 0.35,
          clearcoatRoughness: 0.22,
        })
      );

      const arcMesh = new THREE.Mesh(extrudeGeo, segMat);
      arcMesh.position.y = 0.02;
      arcMesh.castShadow = !isSoftwareGl;
      arcMesh.receiveShadow = !isSoftwareGl;
      arcMesh.userData = {
        label: seg.label,
        baseY: 0.02,
        currentLift: 0,
        midAngle: startAngle + sweep / 2,
        index: idx,
      };
      arcGroup.add(arcMesh);
      arcMeshes.push(arcMesh);

      startAngle += ratio * Math.PI * 2;
    });

    // Raycaster for 3D Hover & Click
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerActive = false;

    // On-demand render + exponential damping loop
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();
    let autoSpinActive = true;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const requestRender = () => {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        renderDirty = false;
        const delta = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;

        let needsMore = false;
        const activeHover = hoveredRef.current;

        if (autoSpinActive && !activeHover && !isSoftwareGl) {
          arcGroup.rotation.y += delta * 0.14;
          bouquetGroup.rotation.y -= delta * 0.08;
          needsMore = true;
        }

        arcMeshes.forEach((mesh) => {
          const isTarget = mesh.userData.label === activeHover;
          const targetLift = isTarget ? 0.18 : 0;
          const nextLift = THREE.MathUtils.damp(
            mesh.userData.currentLift as number,
            targetLift,
            10,
            delta
          );
          mesh.userData.currentLift = nextLift;
          mesh.position.y = (mesh.userData.baseY as number) + nextLift;
          const scaleTarget = isTarget ? 1.04 : 1.0;
          const nextScale = THREE.MathUtils.damp(mesh.scale.x, scaleTarget, 10, delta);
          mesh.scale.set(nextScale, 1, nextScale);

          if (Math.abs(targetLift - nextLift) > 0.002) {
            needsMore = true;
          }
        });

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || needsMore) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    requestRenderRef.current = requestRender;

    const handleControlChange = () => {
      requestRender();
    };
    const handleControlStart = () => {
      autoSpinActive = false;
      requestRender();
    };
    controls.addEventListener('change', handleControlChange);
    controls.addEventListener('start', handleControlStart);

    let lastRay = 0;
    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastRay < 32) return;
      lastRay = now;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerActive = true;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(arcMeshes, false);
      if (hits.length > 0) {
        const lbl = hits[0].object.userData.label as string;
        renderer.domElement.style.cursor = 'pointer';
        if (hoveredRef.current !== lbl) {
          onHoverRef.current(lbl);
          requestRender();
        }
      } else {
        renderer.domElement.style.cursor = 'grab';
        if (hoveredRef.current !== null && pointerActive) {
          onHoverRef.current(null);
          requestRender();
        }
      }
    };

    const handlePointerLeave = () => {
      pointerActive = false;
      renderer.domElement.style.cursor = 'grab';
      onHoverRef.current(null);
      requestRender();
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(arcMeshes, false);
      if (hits.length > 0) {
        const lbl = hits[0].object.userData.label as string;
        setSelectedLabel((prev) => (prev === lbl ? null : lbl));
        onHoverRef.current(lbl);
        requestRender();
      }
    };

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('click', handleClick);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(180, Math.floor(entry.contentRect.width));
      const h = Math.max(160, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    requestRender();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('change', handleControlChange);
      controls.removeEventListener('start', handleControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('click', handleClick);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      requestRenderRef.current = null;
    };
  }, [segments, totalCount, theme, accentHex]);

  // Trigger re-render when parent legend hover changes
  useEffect(() => {
    requestRenderRef.current?.();
  }, [hoveredLabel]);

  const focusLabel = hoveredLabel || selectedLabel;
  const focusedSeg = focusLabel ? segments.find((s) => s.label === focusLabel) : null;
  const focusedPct =
    focusedSeg && totalCount > 0 ? Math.round((focusedSeg.count / totalCount) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="relative w-full h-56 rounded-2xl bg-gradient-to-b from-[#FAF8F4] to-[#EFEAE1] dark:from-[#1E2720] dark:to-[#131A15] border border-[#EAE4DA] dark:border-[#344639] overflow-hidden surface-3d-subtle">
        <div ref={mountRef} className="w-full h-full" aria-label="Visualisasi 3D Kategori Pesanan" />

        {/* Subtle non-blur HUD caption (no backdrop-blur over WebGL) */}
        <div className="pointer-events-none absolute top-2.5 left-3 right-3 flex items-center justify-between text-[11px]">
          <span className="font-medium text-[#556257] dark:text-[#D4DFD6]">
            {focusedSeg
              ? `${focusedSeg.label} · ${focusedPct}% (${formatCompactRupiah(focusedSeg.revenue)})`
              : `${totalCount} Total Pesanan`}
          </span>
          <span className="text-[10px] text-[#7D877E] dark:text-[#B2C0B5]">
            Geser untuk putar 3D
          </span>
        </div>
      </div>

      {/* Interactive Legend synced with 3D Extruded Arcs */}
      <div className="space-y-1.5">
        {segments.map((seg) => {
          const pct = totalCount > 0 ? Math.round((seg.count / totalCount) * 100) : 0;
          const isActive = (hoveredLabel || selectedLabel) === seg.label;
          return (
            <button
              key={seg.label}
              type="button"
              onMouseEnter={() => onHoverLabel(seg.label)}
              onMouseLeave={() => onHoverLabel(null)}
              onClick={() => setSelectedLabel((prev) => (prev === seg.label ? null : seg.label))}
              className={`w-full flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#FAF8F4] dark:bg-[#1F2B23] surface-3d-subtle'
                  : 'hover:bg-[#FAF8F4]/70 dark:hover:bg-[#222C24]/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-xs font-medium text-[#233126] dark:text-[#F8FAF7] truncate">
                  {seg.label}
                </span>
                <span className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] tabular-nums shrink-0">
                  ({seg.count})
                </span>
              </div>
              <span className="text-xs font-mono font-semibold text-[#233126] dark:text-[#F8FAF7] tabular-nums shrink-0">
                {pct}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
