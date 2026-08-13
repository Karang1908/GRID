import * as THREE from 'three';
import { createBuilding, createRoundSkyscraper } from './building.js';
import { createGasStation, createCarDealership, createGeneralStore } from './venues.js';

const boxGeom = new THREE.BoxGeometry(1, 1, 1);
const cylGeom = new THREE.CylinderGeometry(1, 1, 1, 16);

export function createCity(scene, heightAt, colliders, walkableSurfaces, treeManager = null, interactionManager = null, soundManager = null, onRefuel = null, onSpawnSupercar = null, onBuyItem = null, { seed = 1234 } = {}) {
  const group = new THREE.Group();
  group.name = 'city';

  // Seeded RNG
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Material Palette
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.9 });
  const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });
  const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f7 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xc4c7cc, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x888b90, roughness: 0.8 });
  const metalPoleMat = new THREE.MeshStandardMaterial({ color: 0x33373e, metalness: 0.8, roughness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x4f96e8, transparent: true, opacity: 0.35 });

  const CITY_SIZE = 140;
  const BLOCK_SIZE = 45;
  const ROAD_WIDTH = 10;
  const SIDEWALK_WIDTH = 2.4;
  const BUILDING_MARGIN = 2.5;

  function makeBox(mat, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) {
    const mesh = new THREE.Mesh(boxGeom, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    if (rx || ry || rz) mesh.rotation.set(rx, ry, rz);
    group.add(mesh);
    return mesh;
  }

  // ---------------------------------------------------------------------------
  // 1. ROAD NETWORK WITH DOUBLE YELLOW LINES, DASHED LANES & CROSSWALKS
  // ---------------------------------------------------------------------------
  const roadY = 0.05;

  // E-W Roads
  for (let z = -CITY_SIZE / 2; z <= CITY_SIZE / 2; z += BLOCK_SIZE) {
    // Asphalt base
    makeBox(roadMat, 0, roadY, z, CITY_SIZE, 0.02, ROAD_WIDTH);

    // Double solid yellow center lines
    makeBox(yellowLineMat, 0, roadY + 0.01, z - 0.12, CITY_SIZE, 0.01, 0.12);
    makeBox(yellowLineMat, 0, roadY + 0.01, z + 0.12, CITY_SIZE, 0.01, 0.12);

    // White dashed lane markers
    for (let x = -CITY_SIZE / 2; x <= CITY_SIZE / 2; x += 6) {
      makeBox(whiteLineMat, x, roadY + 0.01, z - 2.5, 3.0, 0.01, 0.15);
      makeBox(whiteLineMat, x, roadY + 0.01, z + 2.5, 3.0, 0.01, 0.15);
    }
  }

  // N-S Roads
  for (let x = -CITY_SIZE / 2; x <= CITY_SIZE / 2; x += BLOCK_SIZE) {
    makeBox(roadMat, x, roadY, 0, ROAD_WIDTH, 0.02, CITY_SIZE);
    makeBox(yellowLineMat, x - 0.12, roadY + 0.01, 0, 0.12, 0.01, CITY_SIZE);
    makeBox(yellowLineMat, x + 0.12, roadY + 0.01, 0, 0.12, 0.01, CITY_SIZE);

    for (let z = -CITY_SIZE / 2; z <= CITY_SIZE / 2; z += 6) {
      makeBox(whiteLineMat, x - 2.5, roadY + 0.01, z, 0.15, 0.01, 3.0);
      makeBox(whiteLineMat, x + 2.5, roadY + 0.01, z, 0.15, 0.01, 3.0);
    }
  }

  // Pedestrian Zebra Crosswalks at Intersections
  for (let x = -CITY_SIZE / 2; x <= CITY_SIZE / 2; x += BLOCK_SIZE) {
    for (let z = -CITY_SIZE / 2; z <= CITY_SIZE / 2; z += BLOCK_SIZE) {
      // 4 Crosswalks per intersection (North, South, East, West)
      for (const offZ of [-ROAD_WIDTH / 2 - 1.5, ROAD_WIDTH / 2 + 1.5]) {
        for (let i = -ROAD_WIDTH / 2 + 1; i <= ROAD_WIDTH / 2 - 1; i += 1.2) {
          makeBox(whiteLineMat, x + i, roadY + 0.015, z + offZ, 0.6, 0.01, 2.4);
        }
      }
      for (const offX of [-ROAD_WIDTH / 2 - 1.5, ROAD_WIDTH / 2 + 1.5]) {
        for (let i = -ROAD_WIDTH / 2 + 1; i <= ROAD_WIDTH / 2 - 1; i += 1.2) {
          makeBox(whiteLineMat, x + offX, roadY + 0.015, z + i, 2.4, 0.01, 0.6);
        }
      }
    }
  }

  // Extended Outskirts Highway
  makeBox(roadMat, 0, roadY, 260, ROAD_WIDTH + 2, 0.02, 400);
  makeBox(yellowLineMat, -0.15, roadY + 0.01, 260, 0.14, 0.01, 400);
  makeBox(yellowLineMat, 0.15, roadY + 0.01, 260, 0.14, 0.01, 400);
  for (let z = 60; z <= 460; z += 8) {
    makeBox(whiteLineMat, -2.8, roadY + 0.01, z, 0.15, 0.01, 4.0);
    makeBox(whiteLineMat, 2.8, roadY + 0.01, z, 0.15, 0.01, 4.0);
  }

  // ---------------------------------------------------------------------------
  // 2. ELEVATED SIDEWALKS & CORNER CURBS
  // ---------------------------------------------------------------------------
  const sidewalkY = 0.15;
  for (let bx = -CITY_SIZE / 2 + BLOCK_SIZE / 2; bx < CITY_SIZE / 2; bx += BLOCK_SIZE) {
    for (let bz = -CITY_SIZE / 2 + BLOCK_SIZE / 2; bz < CITY_SIZE / 2; bz += BLOCK_SIZE) {
      const swW = BLOCK_SIZE - ROAD_WIDTH;
      const swD = BLOCK_SIZE - ROAD_WIDTH;
      makeBox(sidewalkMat, bx, sidewalkY / 2, bz, swW, sidewalkY, swD);
      // Curb frame
      makeBox(curbMat, bx, sidewalkY / 2, bz - swD / 2, swW + 0.2, sidewalkY, 0.3);
      makeBox(curbMat, bx, sidewalkY / 2, bz + swD / 2, swW + 0.2, sidewalkY, 0.3);
      makeBox(curbMat, bx - swW / 2, sidewalkY / 2, bz, 0.3, sidewalkY, swD + 0.2);
      makeBox(curbMat, bx + swW / 2, sidewalkY / 2, bz, 0.3, sidewalkY, swD + 0.2);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. URBAN STREET FURNITURE (Traffic Lights, Bus Shelters, Billboards, Palms)
  // ---------------------------------------------------------------------------
  // Overhead Traffic Light Gantries at Intersections
  for (let x = -CITY_SIZE / 2 + BLOCK_SIZE; x < CITY_SIZE / 2; x += BLOCK_SIZE) {
    for (let z = -CITY_SIZE / 2 + BLOCK_SIZE; z < CITY_SIZE / 2; z += BLOCK_SIZE) {
      // Mast pole
      const mastX = x + ROAD_WIDTH / 2 + 1.2;
      const mastZ = z + ROAD_WIDTH / 2 + 1.2;
      makeBox(metalPoleMat, mastX, 3.8, mastZ, 0.25, 7.5, 0.25);
      // Cantilever arm over road
      makeBox(metalPoleMat, mastX - 4.5, 7.2, mastZ, 9.0, 0.2, 0.2);

      // Signal housings (Red, Yellow, Green LEDs)
      for (const sigOff of [-2.5, -6.5]) {
        makeBox(metalPoleMat, mastX + sigOff, 6.4, mastZ, 0.5, 1.4, 0.5);
        makeBox(new THREE.MeshBasicMaterial({ color: 0xff1111 }), mastX + sigOff, 6.8, mastZ + 0.26, 0.2, 0.2, 0.05);
        makeBox(new THREE.MeshBasicMaterial({ color: 0xffaa00 }), mastX + sigOff, 6.4, mastZ + 0.26, 0.2, 0.2, 0.05);
        makeBox(new THREE.MeshBasicMaterial({ color: 0x00ff66 }), mastX + sigOff, 6.0, mastZ + 0.26, 0.2, 0.2, 0.05);
      }
    }
  }

  // Bus Stop Shelters
  const busStops = [
    { x: -18, z: 24, rot: 0 },
    { x: 18, z: -24, rot: Math.PI }
  ];

  for (const bs of busStops) {
    const bsg = new THREE.Group();
    bsg.position.set(bs.x, 0, bs.z);
    bsg.rotation.y = bs.rot;

    makeBox(metalPoleMat, 0, 1.4, -1.0, 4.2, 2.8, 0.1);
    makeBox(glassMat, 0, 1.4, -0.9, 4.0, 2.6, 0.05);
    makeBox(metalPoleMat, 0, 2.85, 0, 4.4, 0.15, 2.2);
    // Wooden Bench inside shelter
    makeBox(new THREE.MeshStandardMaterial({ color: 0x6a4025 }), 0, 0.5, -0.4, 3.2, 0.1, 0.6);

    // Transit Route Poster
    makeBox(new THREE.MeshBasicMaterial({ color: 0x00aaff }), 1.4, 1.5, -0.85, 0.8, 1.2, 0.02);

    group.add(bsg);

    if (colliders) {
      colliders.push({
        type: 'box',
        minX: bs.x - 2.2, maxX: bs.x + 2.2,
        minZ: bs.z - 1.2, maxZ: bs.z + 1.2,
        minY: 0, maxY: 3.0
      });
    }
  }

  // GTA Parody Billboards
  const billboards = [
    { x: -52, z: 0, rot: Math.PI / 2, title: 'LIFEINVADER', color: 0xee2233, sub: 'Dock your life' },
    { x: 52, z: 0, rot: -Math.PI / 2, title: 'SPRUNK', color: 0x00cc44, sub: 'The Essence of Life' },
    { x: 0, z: 52, rot: Math.PI, title: 'eCOLA', color: 0xcc1111, sub: 'Deliciously Infectious' },
    { x: 0, z: -52, rot: 0, title: 'MAZE BANK', color: 0xd4af37, sub: 'Invest in Los Santos' }
  ];

  for (const bb of billboards) {
    const bbg = new THREE.Group();
    bbg.position.set(bb.x, 0, bb.z);
    bbg.rotation.y = bb.rot;

    // Dual Steel Support Pillars
    makeBox(metalPoleMat, -3.5, 5.0, 0, 0.4, 10.0, 0.4);
    makeBox(metalPoleMat, 3.5, 5.0, 0, 0.4, 10.0, 0.4);

    // Billboard Frame
    makeBox(metalPoleMat, 0, 8.5, 0, 10.5, 4.8, 0.4);
    // Glowing Ad Face
    makeBox(new THREE.MeshBasicMaterial({ color: bb.color }), 0, 8.5, 0.22, 10.0, 4.2, 0.05);

    group.add(bbg);

    if (colliders) {
      colliders.push({
        type: 'box',
        minX: bb.x - 4.0, maxX: bb.x + 4.0,
        minZ: bb.z - 0.6, maxZ: bb.z + 0.6,
        minY: 0, maxY: 11.0
      });
    }
  }

  // California Fan Palms along Sidewalks
  const palmTrunkGeom = new THREE.CylinderGeometry(0.18, 0.28, 6.5, 8);
  const palmMat = new THREE.MeshStandardMaterial({ color: 0x5a4230, roughness: 0.9 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2e7535, roughness: 0.7 });

  for (let px = -CITY_SIZE / 2 + 10; px <= CITY_SIZE / 2 - 10; px += 20) {
    for (const pz of [-ROAD_WIDTH / 2 - 1.5, ROAD_WIDTH / 2 + 1.5]) {
      if (Math.abs(px) < 15) continue; // Don't block center

      const palm = new THREE.Group();
      const trunk = new THREE.Mesh(palmTrunkGeom, palmMat);
      trunk.position.y = 3.25;
      palm.add(trunk);

      // Fronds canopy
      for (let f = 0; f < 7; f++) {
        const frondAngle = (f / 7) * Math.PI * 2;
        const frond = new THREE.Mesh(boxGeom, frondMat);
        frond.position.set(Math.cos(frondAngle) * 1.4, 6.4, Math.sin(frondAngle) * 1.4);
        frond.rotation.set(0.4 * Math.sin(frondAngle), frondAngle, 0.4 * Math.cos(frondAngle));
        frond.scale.set(0.6, 0.1, 2.2);
        palm.add(frond);
      }

      palm.position.set(px, 0.15, pz);
      group.add(palm);

      if (colliders) {
        colliders.push({
          type: 'circle',
          x: px, z: pz,
          r: 0.35
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. VENUE AND BUILDING GENERATION ACROSS CITY BLOCKS
  // ---------------------------------------------------------------------------
  const elevators = [];

  for (let bx = -CITY_SIZE / 2 + BLOCK_SIZE / 2; bx < CITY_SIZE / 2; bx += BLOCK_SIZE) {
    for (let bz = -CITY_SIZE / 2 + BLOCK_SIZE / 2; bz < CITY_SIZE / 2; bz += BLOCK_SIZE) {
      // 1. Center of City -> Grand Maze Bank Centerpiece Skyscraper
      if (Math.abs(bx) < 10 && Math.abs(bz) < 10) {
        const skyscraperElevator = createRoundSkyscraper(bx, bz, heightAt, group, colliders, walkableSurfaces, interactionManager);
        if (skyscraperElevator) elevators.push(skyscraperElevator);
        continue;
      }

      // 2. Block (-45, 45) -> RON Gas Station
      if (bx < -10 && bz > 10) {
        createGasStation(bx, bz, heightAt, group, colliders, walkableSurfaces, interactionManager, soundManager, onRefuel);
        continue;
      }

      // 3. Block (45, 45) -> Premium Deluxe Motorsport (Car Dealership)
      if (bx > 10 && bz > 10) {
        createCarDealership(bx, bz, heightAt, group, colliders, walkableSurfaces, interactionManager, soundManager, onSpawnSupercar);
        continue;
      }

      // 4. Block (45, -45) -> 24/7 Supermarket & General Store
      if (bx > 10 && bz < -10) {
        createGeneralStore(bx, bz, heightAt, group, colliders, walkableSurfaces, interactionManager, soundManager, onBuyItem);
        continue;
      }

      // 5. Remaining Blocks -> Realistic Apartment Buildings with Central Stairs & Elevators
      const bWidth = BLOCK_SIZE - ROAD_WIDTH - BUILDING_MARGIN * 2;
      const bDepth = BLOCK_SIZE - ROAD_WIDTH - BUILDING_MARGIN * 2;
      const floors = 3 + Math.floor(rand() * 4); // 3 to 6 floors

      const bldgElevator = createBuilding(bx, bz, bWidth, bDepth, floors, heightAt, group, colliders, walkableSurfaces, rand, interactionManager);
      if (bldgElevator) elevators.push(bldgElevator);
    }
  }

  scene.add(group);
  return { group, elevators };
}
