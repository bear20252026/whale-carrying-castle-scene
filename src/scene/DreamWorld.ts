import * as THREE from 'three';
import { createFerrisWheel } from './ferrisWheel';
import { skyFragmentShader, skyVertexShader, worldFragmentShader, worldVertexShader } from './shaders';
import { views, type RenderQuality, type ViewIndex } from './views';

export interface WorldOptions {
  view: ViewIndex;
  paused: boolean;
  petals: boolean;
  quality: RenderQuality;
}

type Petal = { x: number; y: number; z: number; speed: number; phase: number };

export class DreamWorld {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120);
  private subject = new THREE.Group();
  private worldMaterial?: THREE.ShaderMaterial;
  private skyMaterial?: THREE.ShaderMaterial;
  private worldMesh?: THREE.Mesh;
  private wheel?: ReturnType<typeof createFerrisWheel>;
  private foreground?: THREE.Mesh;
  private distantCloud?: THREE.Mesh;
  private petals?: THREE.InstancedMesh;
  private petalData: Petal[] = [];
  private birds: THREE.Group[] = [];
  private resources: THREE.Texture[] = [];
  private options: WorldOptions;
  private disposed = false;
  private ready = false;
  private needsRender = true;
  private width = 1;
  private height = 1;
  private worldWidth = 20;
  private worldHeight = 12.612;
  private subjectWidth = 15;
  private subjectHeight = 8.4375;
  private mobile = false;
  private time = 0;
  private lastTime = 0;
  private frame = 0;
  private pointer = new THREE.Vector2();
  private smoothPointer = new THREE.Vector2();
  private pan = new THREE.Vector2();
  private panTarget = new THREE.Vector2();
  private userZoom = 1;
  private dragStart = new THREE.Vector2();
  private dragOrigin = new THREE.Vector2();
  private dragging = false;
  private pointers = new Map<number, THREE.Vector2>();
  private pinchDistance = 0;
  private pinchZoom = 1;
  private cameraTarget = new THREE.Vector3(0, 0, 20);
  private cameraLook = new THREE.Vector3();
  private dummy = new THREE.Object3D();
  private observer: ResizeObserver;

  constructor(
    private container: HTMLDivElement,
    options: WorldOptions,
    private onReady: () => void,
    private onError: () => void,
  ) {
    this.options = options;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor('#6baec5');
    this.renderer.setPixelRatio(this.pixelRatio());
    this.camera.position.set(0, 0, 20);
    this.renderer.domElement.setAttribute('aria-label', 'An animated whale carrying a pastel castle through the clouds. Drag to pan and scroll to zoom.');
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.className = 'world-canvas';
    this.container.appendChild(this.renderer.domElement);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(container);
    this.addEvents();
    this.resize();
    void this.initialize();
  }

  private pixelRatio() {
    const cap = this.options.quality === 'high' ? 2 : this.options.quality === 'gentle' ? 1 : 1.5;
    return Math.min(window.devicePixelRatio || 1, cap);
  }

  private async initialize() {
    try {
      const loader = new THREE.TextureLoader();
      const textures = await Promise.all([
        loader.loadAsync('/images/world.webp'),
        loader.loadAsync('/images/depth.webp'),
        loader.loadAsync('/images/sky.webp'),
        loader.loadAsync('/images/clouds.webp'),
      ]);
      if (this.disposed) {
        textures.forEach((texture) => texture.dispose());
        return;
      }
      this.resources.push(...textures);
      const [world, depth, sky, clouds] = textures;
      for (const texture of [world, sky, clouds]) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
      }

      this.skyMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: sky },
          uAspect: { value: this.width / this.height },
          uTime: { value: 0 },
          uPointer: { value: this.smoothPointer },
        },
        vertexShader: skyVertexShader,
        fragmentShader: skyFragmentShader,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
      const skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.skyMaterial);
      skyMesh.frustumCulled = false;
      skyMesh.renderOrder = -100;
      this.scene.add(skyMesh);

      this.worldMaterial = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: world }, uDepth: { value: depth }, uTime: { value: 0 } },
        vertexShader: worldVertexShader,
        fragmentShader: worldFragmentShader,
        transparent: true,
        depthWrite: true,
        toneMapped: false,
      });
      this.worldMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 160, 90), this.worldMaterial);
      this.worldMesh.renderOrder = 2;
      this.subject.add(this.worldMesh);

      this.wheel = createFerrisWheel(1);
      this.wheel.group.rotation.y = 0.38;
      this.wheel.group.rotation.z = -0.06;
      this.subject.add(this.wheel.group);
      this.scene.add(this.subject);

      this.scene.add(new THREE.HemisphereLight('#e7f6ff', '#7a8a9e', 2.6));
      const sunlight = new THREE.DirectionalLight('#fff1dc', 3.2);
      sunlight.position.set(-7, 9, 12);
      this.scene.add(sunlight);
      const fill = new THREE.DirectionalLight('#9ecae3', 0.65);
      fill.position.set(8, 1, 5);
      this.scene.add(fill);

      const cloudMaterial = new THREE.MeshBasicMaterial({
        map: clouds, transparent: true, depthWrite: false, opacity: 0.93,
        toneMapped: false, color: '#ecf2fa',
      });
      this.foreground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), cloudMaterial);
      this.foreground.renderOrder = 4;
      this.scene.add(this.foreground);
      this.distantCloud = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), cloudMaterial.clone());
      (this.distantCloud.material as THREE.MeshBasicMaterial).opacity = 0.36;
      this.distantCloud.renderOrder = 3;
      this.scene.add(this.distantCloud);
      this.createPetals();
      this.createBirds();
      this.ready = true;
      this.resize();
      this.updateCameraTarget();
      this.camera.position.copy(this.cameraTarget);
      this.cameraLook.set(this.camera.position.x, this.camera.position.y, 0);
      this.camera.lookAt(this.cameraLook);
      this.renderer.render(this.scene, this.camera);
      this.onReady();
      this.frame = requestAnimationFrame(this.animate);
    } catch (error) {
      if (!this.disposed) {
        console.warn('The illustrated preview is active because WebGL could not initialize.', error);
        this.onError();
      }
    }
  }

  private createPetals() {
    const silhouette = new THREE.Shape();
    silhouette.moveTo(0, -0.028);
    silhouette.bezierCurveTo(-0.018, -0.008, -0.023, 0.015, -0.008, 0.026);
    silhouette.bezierCurveTo(-0.002, 0.031, 0, 0.021, 0.003, 0.025);
    silhouette.bezierCurveTo(0.017, 0.031, 0.022, 0.012, 0.014, -0.008);
    silhouette.quadraticCurveTo(0.009, -0.02, 0, -0.028);
    const geometry = new THREE.ShapeGeometry(silhouette, 5);
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      positions.setZ(i, Math.sin(positions.getY(i) * 45) * 0.009);
    }
    geometry.computeVertexNormals();
    this.petals = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({
      color: '#edb5ca', roughness: 0.85, side: THREE.DoubleSide,
      transparent: true, opacity: 0.85,
    }), 38);
    this.petals.frustumCulled = false;
    this.petals.renderOrder = 5;
    this.scene.add(this.petals);
    const random = THREE.MathUtils.seededRandom;
    random(42);
    this.petalData = Array.from({ length: 38 }, () => ({
      x: random() - 0.5, y: random(), z: random() * 3 + 0.7,
      speed: random() * 0.018 + 0.009, phase: random() * Math.PI * 2,
    }));
  }

  private createBirds() {
    const material = new THREE.MeshBasicMaterial({ color: '#5f859c', side: THREE.DoubleSide });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0, 0.09, 0.04, 0, 0.18, 0.018, 0,
      0, 0, 0, 0.18, 0.018, 0, 0.06, 0.007, 0,
    ], 3));
    for (let i = 0; i < 5; i++) {
      const bird = new THREE.Group();
      const right = new THREE.Mesh(geometry, material);
      const left = new THREE.Mesh(geometry, material);
      left.scale.x = -1;
      bird.add(right, left);
      bird.scale.setScalar(i % 2 === 0 ? 0.55 : 0.8);
      this.scene.add(bird);
      this.birds.push(bird);
    }
  }

  setOptions(options: WorldOptions) {
    const old = this.options;
    this.options = options;
    this.needsRender = true;
    if (old.view !== options.view) this.reset();
    if (old.quality !== options.quality) {
      this.renderer.setPixelRatio(this.pixelRatio());
      this.resize();
    }
  }

  reset() {
    this.panTarget.set(0, 0);
    this.userZoom = 1;
    this.needsRender = true;
  }

  zoomBy(amount: number) {
    this.userZoom = THREE.MathUtils.clamp(this.userZoom * amount, 0.85, 1.7);
    this.needsRender = true;
  }

  capture(): string | undefined {
    if (!this.ready) return undefined;
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  private resize = () => {
    if (this.disposed) return;
    this.needsRender = true;
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(rect.width, 1);
    this.height = Math.max(rect.height, 1);
    const aspect = this.width / this.height;
    this.mobile = this.width <= 800 && this.height > this.width;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.worldWidth = this.worldHeight * aspect;
    this.subjectWidth = this.mobile
      ? this.worldWidth * 1.07
      : Math.min(this.worldWidth * 0.75, this.worldHeight * 1.43);
    this.subjectHeight = this.subjectWidth / (16 / 9);
    if (this.worldMesh) this.worldMesh.scale.set(this.subjectWidth, this.subjectHeight, 1);
    if (this.skyMaterial) this.skyMaterial.uniforms.uAspect.value = aspect;
    this.subject.position.set(
      this.worldWidth * (this.mobile ? 0.03 : 0.15),
      this.worldHeight * (this.mobile ? -0.045 : 0.035),
      0,
    );
    if (this.wheel) {
      const radius = (116 / 1280) * this.subjectWidth;
      this.wheel.group.scale.setScalar(radius);
      this.wheel.group.position.set(
        (0.681 - 0.5) * this.subjectWidth,
        (0.683 - 0.5) * this.subjectHeight,
        -radius * 0.48,
      );
    }
    if (this.foreground && this.distantCloud) {
      const width = this.worldWidth * (this.mobile ? 3.2 : 2.35);
      this.foreground.scale.set(width, width / (16 / 9), 1);
      this.foreground.position.set(-this.worldWidth * 0.49, this.worldHeight * (this.mobile ? -0.28 : 0.055), 1.65);
      this.distantCloud.scale.set(width * 1.1, width * 1.1 / (16 / 9), 1);
      this.distantCloud.position.set(this.worldWidth * 0.23, -this.worldHeight * 0.19, 0.8);
    }
  };

  private updateCameraTarget() {
    const view = views[this.options.view];
    const zoom = view.zoom * this.userZoom;
    let x = 0;
    let y = 0;
    if (this.options.view !== 0) {
      x = this.subject.position.x + (view.focus[0] - 0.5) * this.subjectWidth;
      y = this.subject.position.y + (view.focus[1] - 0.5) * this.subjectHeight;
      x -= (this.worldWidth / zoom) * (this.mobile ? 0 : 0.15);
      y += (this.worldHeight / zoom) * (this.mobile ? 0.05 : -0.015);
    }
    this.cameraTarget.set(x + this.pan.x, y + this.pan.y, 20 / zoom);
  }

  private animate = (now: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    const dt = Math.min((now - (this.lastTime || now)) / 1000, 0.15);
    this.lastTime = now;
    if (document.hidden) return;
    if (!this.options.paused) this.time += dt;
    const ease = 1 - Math.exp(-dt * 3.1);
    this.smoothPointer.lerp(this.pointer, ease);
    this.pan.lerp(this.panTarget, ease);
    this.updateCameraTarget();
    this.camera.position.lerp(this.cameraTarget, ease);
    const pointerStrength = this.mobile ? 0.014 : 0.065;
    this.cameraLook.set(
      this.camera.position.x + this.smoothPointer.x * pointerStrength,
      this.camera.position.y - this.smoothPointer.y * pointerStrength,
      0,
    );
    this.camera.lookAt(this.cameraLook);
    if (this.options.paused && !this.needsRender
      && this.camera.position.distanceTo(this.cameraTarget) < 0.001
      && this.smoothPointer.distanceTo(this.pointer) < 0.001
      && this.pan.distanceTo(this.panTarget) < 0.001) return;
    this.subject.position.y = this.worldHeight * (this.mobile ? -0.045 : 0.035) + Math.sin(this.time * 0.43) * 0.052;
    this.subject.rotation.z = Math.sin(this.time * 0.31) * 0.0017;
    if (this.worldMaterial) this.worldMaterial.uniforms.uTime.value = this.time;
    if (this.skyMaterial) this.skyMaterial.uniforms.uTime.value = this.time;
    this.wheel?.update(this.time);
    if (this.foreground) {
      this.foreground.position.x = -this.worldWidth * 0.49 + Math.sin(this.time * 0.045) * 0.38;
    }
    if (this.distantCloud) {
      this.distantCloud.position.x = this.worldWidth * 0.23 + Math.sin(this.time * 0.035 + 2) * 0.25;
    }
    if (this.petals) {
      this.petals.visible = this.options.petals;
      this.petalData.forEach((petal, i) => {
        const falling = (petal.y - this.time * petal.speed) % 1;
        const y = (falling < 0 ? falling + 1 : falling) - 0.5;
        this.dummy.position.set(
          this.subject.position.x + petal.x * this.subjectWidth * 0.78 + Math.sin(this.time * 0.18 + petal.phase) * 0.3,
          y * this.subjectHeight * 1.05,
          petal.z,
        );
        this.dummy.rotation.set(this.time * 0.45 + petal.phase, this.time * 0.31 + i, this.time * 0.2 + i);
        this.dummy.scale.setScalar(0.55 + (i % 3) * 0.2);
        this.dummy.updateMatrix();
        this.petals!.setMatrixAt(i, this.dummy.matrix);
      });
      this.petals.instanceMatrix.needsUpdate = true;
    }
    this.birds.forEach((bird, i) => {
      const phase = ((i / 5 + this.time * 0.003) % 1) - 0.5;
      bird.position.set(phase * this.worldWidth * 1.4, this.worldHeight * (0.07 + (i % 3) * 0.065) + Math.sin(this.time * 0.25 + i) * 0.08, -3 - i);
      bird.children[0].rotation.x = Math.sin(this.time * 2.4 + i * 2) * 0.6;
      bird.children[1].rotation.x = -Math.sin(this.time * 2.4 + i * 2) * 0.6;
    });
    this.renderer.render(this.scene, this.camera);
    this.needsRender = false;
  };

  private pointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    this.pointers.set(event.pointerId, new THREE.Vector2(event.clientX, event.clientY));
    this.renderer.domElement.setPointerCapture(event.pointerId);
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDistance = a.distanceTo(b);
      this.pinchZoom = this.userZoom;
      this.dragging = false;
    } else {
      this.dragging = true;
      this.dragStart.set(event.clientX, event.clientY);
      this.dragOrigin.copy(this.panTarget);
    }
    this.renderer.domElement.classList.add('is-dragging');
  };

  private pointerMove = (event: PointerEvent) => {
    this.pointer.set((event.clientX / this.width - 0.5) * 2, (event.clientY / this.height - 0.5) * 2);
    if (this.pointers.has(event.pointerId)) this.pointers.set(event.pointerId, new THREE.Vector2(event.clientX, event.clientY));
    if (this.pointers.size === 2 && this.pinchDistance > 0) {
      const [a, b] = [...this.pointers.values()];
      this.userZoom = THREE.MathUtils.clamp(this.pinchZoom * a.distanceTo(b) / this.pinchDistance, 0.85, 1.7);
    } else if (this.dragging) {
      const zoom = views[this.options.view].zoom * this.userZoom;
      this.panTarget.set(
        THREE.MathUtils.clamp(this.dragOrigin.x - (event.clientX - this.dragStart.x) / this.width * this.worldWidth / zoom, -2.4 / zoom, 2.4 / zoom),
        THREE.MathUtils.clamp(this.dragOrigin.y + (event.clientY - this.dragStart.y) / this.height * this.worldHeight / zoom, -1.7 / zoom, 1.7 / zoom),
      );
    }
  };

  private pointerUp = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId);
    this.dragging = false;
    this.renderer.domElement.classList.remove('is-dragging');
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) this.renderer.domElement.releasePointerCapture(event.pointerId);
  };

  private pointerLeave = () => {
    if (!this.dragging) this.pointer.set(0, 0);
  };

  private wheelEvent = (event: WheelEvent) => {
    event.preventDefault();
    this.zoomBy(Math.exp(-event.deltaY * 0.0008));
  };

  private contextLost = (event: Event) => {
    event.preventDefault();
    this.ready = false;
    cancelAnimationFrame(this.frame);
    this.onError();
  };

  private addEvents() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointercancel', this.pointerUp);
    canvas.addEventListener('pointerleave', this.pointerLeave);
    canvas.addEventListener('wheel', this.wheelEvent, { passive: false });
    canvas.addEventListener('webglcontextlost', this.contextLost);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.pointerDown);
    canvas.removeEventListener('pointermove', this.pointerMove);
    canvas.removeEventListener('pointerup', this.pointerUp);
    canvas.removeEventListener('pointercancel', this.pointerUp);
    canvas.removeEventListener('pointerleave', this.pointerLeave);
    canvas.removeEventListener('wheel', this.wheelEvent);
    canvas.removeEventListener('webglcontextlost', this.contextLost);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach((material: THREE.Material) => materials.add(material));
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.resources.forEach((texture) => texture.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}