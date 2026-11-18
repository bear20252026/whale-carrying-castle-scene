import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function createFerrisWheel(radius: number) {
  const wheel = new THREE.Group();
  const rotor = new THREE.Group();
  const gondolas: THREE.Group[] = [];
  const paint = new THREE.MeshStandardMaterial({
    color: '#dfa1b1', metalness: 0.42, roughness: 0.33,
  });
  const lightPaint = new THREE.MeshStandardMaterial({
    color: '#f6d6db', metalness: 0.28, roughness: 0.38,
  });
  const cream = new THREE.MeshStandardMaterial({
    color: '#fff4dc', metalness: 0.15, roughness: 0.4,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#6d9da7', roughness: 0.2, metalness: 0.35,
    transparent: true, opacity: 0.7,
  });
  const rodGeometry = new THREE.CylinderGeometry(1, 1, 1, 7);
  const up = new THREE.Vector3(0, 1, 0);

  function rod(a: THREE.Vector3, b: THREE.Vector3, thickness: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(rodGeometry, material);
    const direction = b.clone().sub(a);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.scale.set(thickness, direction.length(), thickness);
    mesh.quaternion.setFromUnitVectors(up, direction.normalize());
    return mesh;
  }

  const depth = radius * 0.13;
  for (const z of [-depth / 2, depth / 2]) {
    for (const ringRadius of [radius, radius * 0.951]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(ringRadius, radius * 0.008, 7, 100), paint);
      hoop.position.z = z;
      rotor.add(hoop);
    }
    const innerHoop = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.67, radius * 0.004, 5, 80), lightPaint);
    innerHoop.position.z = z;
    rotor.add(innerHoop);

    for (let i = 0; i < 24; i++) {
      const theta = (i / 24) * Math.PI * 2;
      const next = theta + Math.PI / 12;
      const rim = new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, z);
      const hub = new THREE.Vector3(Math.cos(theta) * radius * 0.09, Math.sin(theta) * radius * 0.09, z);
      rotor.add(rod(hub, rim, radius * 0.0033, lightPaint));
      rotor.add(rod(
        new THREE.Vector3(Math.cos(theta) * radius * 0.67, Math.sin(theta) * radius * 0.67, z),
        new THREE.Vector3(Math.cos(next) * radius, Math.sin(next) * radius, z),
        radius * 0.0025, paint,
      ));
      if (z > 0) {
        rotor.add(rod(rim, new THREE.Vector3(rim.x, rim.y, -depth / 2), radius * 0.004, cream));
      }
    }
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.072, radius * 0.072, depth * 1.9, 24), paint);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub, rotor);

  for (const z of [-depth * 0.8, depth * 0.8]) {
    const top = new THREE.Vector3(0, 0.02, z);
    const left = new THREE.Vector3(-radius * 0.52, -radius * 1.14, z);
    const right = new THREE.Vector3(radius * 0.52, -radius * 1.14, z);
    wheel.add(rod(top, left, radius * 0.021, paint));
    wheel.add(rod(top, right, radius * 0.021, paint));
    wheel.add(rod(left, right, radius * 0.016, lightPaint));
    wheel.add(rod(
      new THREE.Vector3(-radius * 0.25, -radius * 0.55, z),
      new THREE.Vector3(radius * 0.52, -radius * 1.14, z),
      radius * 0.006, lightPaint,
    ));
  }

  const floorGeometry = new THREE.CylinderGeometry(radius * 0.049, radius * 0.043, radius * 0.025, 12);
  const glassGeometry = new THREE.CylinderGeometry(radius * 0.038, radius * 0.038, radius * 0.069, 12, 1, true);
  const roofGeometry = new THREE.SphereGeometry(radius * 0.052, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let i = 0; i < 24; i++) {
    const gondola = new THREE.Group();
    const floor = new THREE.Mesh(floorGeometry, paint);
    floor.position.y = -radius * 0.105;
    const window = new THREE.Mesh(glassGeometry, glass);
    window.position.y = -radius * 0.059;
    const roof = new THREE.Mesh(roofGeometry, lightPaint);
    roof.scale.y = 0.42;
    roof.position.y = -radius * 0.022;
    gondola.add(floor, window, roof);
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2;
      const x = Math.cos(a) * radius * 0.039;
      const z = Math.sin(a) * radius * 0.039;
      gondola.add(rod(new THREE.Vector3(x, -radius * 0.025, z), new THREE.Vector3(x, -radius * 0.1, z), radius * 0.0026, cream));
    }
    gondola.add(rod(new THREE.Vector3(0, 0.015, 0), new THREE.Vector3(0, -radius * 0.022, 0), radius * 0.0034, paint));
    wheel.add(gondola);
    gondolas.push(gondola);
  }

  // Merge the trusses and instance the cabins so the wheel costs a handful of draws.
  const sourceGeometries = new Set<THREE.BufferGeometry>();
  wheel.traverse((object) => {
    if (object instanceof THREE.Mesh) sourceGeometries.add(object.geometry);
  });
  function mergeByMaterial(group: THREE.Group) {
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const child of [...group.children]) {
      if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) continue;
      child.updateMatrix();
      const transformed = child.geometry.clone().applyMatrix4(child.matrix);
      const geometries = batches.get(child.material) ?? [];
      geometries.push(transformed);
      batches.set(child.material, geometries);
      group.remove(child);
    }
    const result: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
    batches.forEach((geometries, material) => {
      const geometry = mergeGeometries(geometries);
      geometries.forEach((part) => part.dispose());
      if (geometry) result.push({ geometry, material });
    });
    return result;
  }
  for (const group of [rotor, wheel]) {
    mergeByMaterial(group).forEach(({ geometry, material }) => group.add(new THREE.Mesh(geometry, material)));
  }
  const cabinBatches = mergeByMaterial(gondolas[0]).map(({ geometry, material }) => {
    const batch = new THREE.InstancedMesh(geometry, material, gondolas.length);
    batch.frustumCulled = false;
    wheel.add(batch);
    return batch;
  });
  gondolas.forEach((gondola) => {
    wheel.remove(gondola);
    gondola.clear();
  });
  sourceGeometries.forEach((geometry) => geometry.dispose());

  return {
    group: wheel,
    update(time: number) {
      const angle = time * 0.026;
      rotor.rotation.z = angle;
      gondolas.forEach((gondola, i) => {
        const theta = (i / gondolas.length) * Math.PI * 2 + angle;
        gondola.position.set(Math.cos(theta) * radius, Math.sin(theta) * radius, 0);
        gondola.rotation.z = Math.sin(time * 0.6 + i) * 0.018;
        gondola.updateMatrix();
        cabinBatches.forEach((batch) => batch.setMatrixAt(i, gondola.matrix));
      });
      cabinBatches.forEach((batch) => { batch.instanceMatrix.needsUpdate = true; });
    },
  };
}