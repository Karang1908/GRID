import * as THREE from 'three';
import { Car } from './Car.js';
import { createSofa } from './furniture.js';

const boxGeom = new THREE.BoxGeometry(1, 1, 1);
const cylGeom = new THREE.CylinderGeometry(1, 1, 1, 16);

// Shared Venue Materials
const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x1f2024, roughness: 0.9 });
const concreteMat = new THREE.MeshStandardMaterial({ color: 0xd0d2d8, roughness: 0.8 });
const ronRedMat = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.3, metalness: 0.4 });
const ronYellowMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
const pdmBlueMat = new THREE.MeshStandardMaterial({ color: 0x0055ff, roughness: 0.2, metalness: 0.7 });
const neon247Mat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x66aacc, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.35 });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.95, roughness: 0.05 });
const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x24262c, roughness: 0.4, metalness: 0.6 });

function makeBox(group, mat, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(boxGeom, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  if (rx || ry || rz) mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
}

// -----------------------------------------------------------------------------
// 1. RON GAS STATION & CONVENIENCE SERVICE CENTER
// -----------------------------------------------------------------------------
export function createGasStation(bx, bz, heightAt, parentGroup, colliders, walkableSurfaces, interactionManager = null, soundManager = null, onRefuel = null) {
  const group = new THREE.Group();
  const groundY = heightAt(bx, bz);
  group.position.set(bx, groundY, bz);

  // Concrete Lot Slab
  const lotW = 32;
  const lotD = 32;
  const lot = makeBox(group, concreteMat, 0, 0.1, 0, lotW, 0.2, lotD);

  if (walkableSurfaces) {
    walkableSurfaces.push({
      type: 'flat',
      y: groundY + 0.2,
      minX: bx - lotW / 2, maxX: bx + lotW / 2,
      minZ: bz - lotD / 2, maxZ: bz + lotD / 2
    });
  }

  // Large Overhead Fuel Canopy (Red with yellow glowing rim)
  const canopyH = 6.2;
  const canopyW = 22;
  const canopyD = 14;
  const canopyZ = 6;

  makeBox(group, ronRedMat, 0, canopyH, canopyZ, canopyW, 1.0, canopyD);
  const canopyNeon = makeBox(group, ronYellowMat, 0, canopyH, canopyZ, canopyW + 0.15, 0.2, canopyD + 0.15);

  // 4 Canopy Steel Support Pillars
  for (const px of [-7, 7]) {
    for (const pz of [canopyZ - 4.5, canopyZ + 4.5]) {
      const pillar = makeBox(group, chromeMat, px, canopyH / 2, pz, 0.7, canopyH, 0.7);
      if (colliders) {
        colliders.push({
          type: 'box',
          minX: bx + px - 0.4, maxX: bx + px + 0.4,
          minZ: bz + pz - 0.4, maxZ: bz + pz + 0.4,
          minY: groundY, maxY: groundY + canopyH
        });
      }
    }
  }

  // 4 Fuel Pump Islands
  const pumpOffsets = [
    [-4, canopyZ - 3],
    [4, canopyZ - 3],
    [-4, canopyZ + 3],
    [4, canopyZ + 3]
  ];

  for (let i = 0; i < pumpOffsets.length; i++) {
    const [px, pz] = pumpOffsets[i];
    // Island curb
    makeBox(group, concreteMat, px, 0.25, pz, 1.6, 0.3, 4.0);
    // Pump Housing
    makeBox(group, ronRedMat, px, 1.4, pz, 1.0, 2.0, 1.6);
    makeBox(group, darkMetalMat, px, 1.5, pz, 1.05, 0.9, 1.2);
    // Digital Price/Gallon display
    makeBox(group, new THREE.MeshBasicMaterial({ color: 0x00ffcc }), px + 0.53, 1.6, pz, 0.02, 0.4, 0.8);
    makeBox(group, new THREE.MeshBasicMaterial({ color: 0x00ffcc }), px - 0.53, 1.6, pz, 0.02, 0.4, 0.8);

    if (colliders) {
      colliders.push({
        type: 'box',
        minX: bx + px - 0.8, maxX: bx + px + 0.8,
        minZ: bz + pz - 2.0, maxZ: bz + pz + 2.0,
        minY: groundY, maxY: groundY + 2.6
      });
    }

    // Register Interactive Fuel Pump
    if (interactionManager) {
      interactionManager.register({
        type: 'gas_pump',
        position: new THREE.Vector3(bx + px, groundY + 1.2, bz + pz),
        radius: 3.2,
        getPrompt: () => 'HOLD E: REFUEL VEHICLE ($40)',
        onInteract: (player) => {
          if (soundManager) {
            soundManager.playCashRegister();
            soundManager.playDrinkCan();
          }
          if (onRefuel) onRefuel(player);
        }
      });
    }
  }

  // Attached Convenience Minimart Building (Back of lot)
  const martW = 18;
  const martH = 4.5;
  const martD = 10;
  const martZ = -8;

  makeBox(group, darkMetalMat, 0, martH / 2, martZ, martW, martH, martD);
  makeBox(group, ronRedMat, 0, martH + 0.4, martZ, martW + 0.4, 0.8, martD + 0.4);

  // Large Glass Front Wall
  const martGlass = makeBox(group, glassMat, 0, martH / 2, martZ + martD / 2 + 0.02, martW - 2, martH - 0.6, 0.1);

  // RON Neon Sign on Mart
  const martSign = makeBox(group, ronYellowMat, 0, martH + 0.4, martZ + martD / 2 + 0.25, 8.0, 0.5, 0.1);

  // Snack & Sprunk Cooler beside Mart Door
  makeBox(group, new THREE.MeshBasicMaterial({ color: 0x00ff88 }), -6, 1.4, martZ + martD / 2 + 0.4, 2.0, 2.2, 0.8);

  if (interactionManager) {
    interactionManager.register({
      type: 'sprunk_cooler',
      position: new THREE.Vector3(bx - 6, groundY + 1.2, bz + martZ + martD / 2 + 0.6),
      radius: 2.5,
      getPrompt: () => 'HOLD E: GRAB SPRUNK CAN ($5)',
      onInteract: () => {
        if (soundManager) {
          soundManager.playDrinkCan();
          soundManager.playCashRegister();
        }
      }
    });
  }

  // Fuel Price Totem Sign
  const totemX = 13;
  const totemZ = 13;
  makeBox(group, darkMetalMat, totemX, 4.0, totemZ, 1.2, 8.0, 1.2);
  makeBox(group, ronRedMat, totemX, 6.5, totemZ, 3.2, 3.2, 1.4);
  makeBox(group, ronYellowMat, totemX, 6.5, totemZ + 0.72, 2.6, 1.8, 0.05);

  if (colliders) {
    colliders.push({
      type: 'box',
      minX: bx - martW / 2, maxX: bx + martW / 2,
      minZ: bz + martZ - martD / 2, maxZ: bz + martZ + martD / 2,
      minY: groundY, maxY: groundY + martH + 1.0
    });
    colliders.push({
      type: 'box',
      minX: bx + totemX - 0.8, maxX: bx + totemX + 0.8,
      minZ: bz + totemZ - 0.8, maxZ: bz + totemZ + 0.8,
      minY: groundY, maxY: groundY + 8.0
    });
  }

  parentGroup.add(group);
}

// -----------------------------------------------------------------------------
// 2. PREMIUM DELUXE MOTORSPORT (LUXURY CAR DEALERSHIP)
// -----------------------------------------------------------------------------
export function createCarDealership(bx, bz, heightAt, parentGroup, colliders, walkableSurfaces, interactionManager = null, soundManager = null, onSpawnSupercar = null) {
  const group = new THREE.Group();
  const groundY = heightAt(bx, bz);
  group.position.set(bx, groundY, bz);

  const lotW = 34;
  const lotD = 34;
  makeBox(group, concreteMat, 0, 0.1, 0, lotW, 0.2, lotD);

  if (walkableSurfaces) {
    walkableSurfaces.push({
      type: 'flat',
      y: groundY + 0.2,
      minX: bx - lotW / 2, maxX: bx + lotW / 2,
      minZ: bz - lotD / 2, maxZ: bz + lotD / 2
    });
  }

  // Double-Height Glass Showroom Building
  const showW = 28;
  const showH = 7.5;
  const showD = 22;
  const showZ = -4;

  makeBox(group, darkMetalMat, 0, showH / 2, showZ, showW, showH, showD);
  makeBox(group, pdmBlueMat, 0, showH + 0.5, showZ, showW + 0.5, 1.0, showD + 0.5);

  // Massive Panoramic Glass Showroom Facade
  makeBox(group, glassMat, 0, showH / 2, showZ + showD / 2 + 0.02, showW - 2, showH - 1.2, 0.1);

  // Chrome Showroom Logo Sign
  const logoSign = makeBox(group, new THREE.MeshBasicMaterial({ color: 0x00d4ff }), 0, showH + 0.5, showZ + showD / 2 + 0.3, 16.0, 0.6, 0.1);

  // Elevated Turntable Display Pedestals inside Showroom
  for (const [tx, tz, carColor, carName] of [
    [-7, showZ + 2, 0x00f0ff, 'VAPID BULLET'],
    [7, showZ + 2, 0xff3300, 'GROTTI TURISMO']
  ]) {
    // Chrome circular display stage
    const stage = new THREE.Mesh(cylGeom, chromeMat);
    stage.position.set(tx, 0.4, tz);
    stage.scale.set(3.2, 0.4, 3.2);
    group.add(stage);

    const neonRing = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.05, 8, 24), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
    neonRing.position.set(tx, 0.6, tz);
    neonRing.rotation.x = Math.PI / 2;
    group.add(neonRing);

    // Interactive Test Drive Pedestal
    if (interactionManager) {
      interactionManager.register({
        type: 'dealership_car',
        position: new THREE.Vector3(bx + tx, groundY + 1.0, bz + tz),
        radius: 3.5,
        getPrompt: () => `HOLD E: TEST DRIVE ${carName}`,
        onInteract: (player) => {
          if (soundManager) {
            soundManager.playHorn();
          }
          if (onSpawnSupercar) {
            onSpawnSupercar(player, new THREE.Vector3(bx + tx, groundY + 0.5, bz + showZ + showD / 2 + 4), carColor);
          }
        }
      });
    }
  }

  // Sales Desk & Lounge inside Showroom
  const deskX = 0;
  const deskZ = showZ - 5;
  makeBox(group, chromeMat, deskX, 1.0, deskZ, 4.0, 1.2, 1.4);
  makeBox(group, new THREE.MeshBasicMaterial({ color: 0x00d4ff }), deskX, 1.8, deskZ, 1.2, 0.7, 0.05);

  if (interactionManager) {
    interactionManager.register({
      type: 'dealership_pc',
      position: new THREE.Vector3(bx + deskX, groundY + 1.2, bz + deskZ),
      radius: 2.5,
      getPrompt: () => 'HOLD E: BROWSE MOTORSPORT CATALOG',
      onInteract: () => {
        if (soundManager) soundManager.playDialogueBlip();
      }
    });
  }

  // Client Sofas
  createSofa(bx - 9, groundY + 0.2, bz + showZ - 4, Math.PI / 2, parentGroup, colliders, null, new THREE.Color(0x223366), interactionManager);
  createSofa(bx + 9, groundY + 0.2, bz + showZ - 4, -Math.PI / 2, parentGroup, colliders, null, new THREE.Color(0x223366), interactionManager);

  if (colliders) {
    // Back and side walls of dealership
    colliders.push({
      type: 'box',
      minX: bx - showW / 2, maxX: bx + showW / 2,
      minZ: bz + showZ - showD / 2, maxZ: bz + showZ - showD / 2 + 1.0,
      minY: groundY, maxY: groundY + showH
    });
    colliders.push({
      type: 'box',
      minX: bx - showW / 2, maxX: bx - showW / 2 + 1.0,
      minZ: bz + showZ - showD / 2, maxZ: bz + showZ + showD / 2,
      minY: groundY, maxY: groundY + showH
    });
    colliders.push({
      type: 'box',
      minX: bx + showW / 2 - 1.0, maxX: bx + showW / 2,
      minZ: bz + showZ - showD / 2, maxZ: bz + showZ + showD / 2,
      minY: groundY, maxY: groundY + showH
    });
  }

  parentGroup.add(group);
}

// -----------------------------------------------------------------------------
// 3. 24/7 SUPERMARKET & GENERAL STORE
// -----------------------------------------------------------------------------
export function createGeneralStore(bx, bz, heightAt, parentGroup, colliders, walkableSurfaces, interactionManager = null, soundManager = null, onBuyItem = null) {
  const group = new THREE.Group();
  const groundY = heightAt(bx, bz);
  group.position.set(bx, groundY, bz);

  const storeW = 24;
  const storeH = 5.2;
  const storeD = 18;

  // Concrete foundation
  makeBox(group, concreteMat, 0, 0.1, 0, storeW + 4, 0.2, storeD + 4);

  if (walkableSurfaces) {
    walkableSurfaces.push({
      type: 'flat',
      y: groundY + 0.2,
      minX: bx - storeW / 2 - 2, maxX: bx + storeW / 2 + 2,
      minZ: bz - storeD / 2 - 2, maxZ: bz + storeD / 2 + 2
    });
  }

  // Main Building
  makeBox(group, concreteMat, 0, storeH / 2, 0, storeW, storeH, storeD);

  // Green & Red 24/7 Parapet Roof
  makeBox(group, new THREE.MeshStandardMaterial({ color: 0x008844 }), 0, storeH + 0.3, 0, storeW + 0.3, 0.6, storeD + 0.3);

  // Large Front Windows & Glass Doors
  makeBox(group, glassMat, 0, storeH / 2, storeD / 2 + 0.02, storeW - 4, storeH - 1.2, 0.1);

  // Glowing 24/7 Neon Sign
  const sign = makeBox(group, neon247Mat, 0, storeH + 0.3, storeD / 2 + 0.25, 10.0, 0.7, 0.1);

  // Checkout Register Counter inside
  const regX = -5;
  const regZ = 3;
  makeBox(group, darkMetalMat, regX, 0.6, regZ, 3.2, 1.2, 1.2);
  makeBox(group, new THREE.MeshBasicMaterial({ color: 0x00ff88 }), regX, 1.4, regZ, 0.6, 0.4, 0.5);

  if (interactionManager) {
    interactionManager.register({
      type: 'register',
      position: new THREE.Vector3(bx + regX, groundY + 1.2, bz + regZ),
      radius: 2.5,
      getPrompt: () => 'HOLD E: BUY MEDKIT & REPAIR TOOLS ($50)',
      onInteract: () => {
        if (soundManager) soundManager.playCashRegister();
        if (onBuyItem) onBuyItem('medkit', 50);
      }
    });
  }

  // Soda Fountain / Beverage Wall
  const sodaX = 5;
  const sodaZ = -5;
  makeBox(group, new THREE.MeshBasicMaterial({ color: 0xff3300 }), sodaX, 1.8, sodaZ, 6.0, 3.0, 0.8);

  if (interactionManager) {
    interactionManager.register({
      type: 'soda_fountain',
      position: new THREE.Vector3(bx + sodaX, groundY + 1.2, bz + sodaZ + 1.0),
      radius: 2.5,
      getPrompt: () => 'HOLD E: POUR ECOLA / SPRUNK ($4)',
      onInteract: () => {
        if (soundManager) {
          soundManager.playDrinkCan();
          soundManager.playCashRegister();
        }
      }
    });
  }

  // Store ATM Machine (near entrance)
  const atmX = 8;
  const atmZ = storeD / 2 + 0.4;
  makeBox(group, darkMetalMat, atmX, 1.4, atmZ, 1.2, 2.2, 0.8);
  makeBox(group, new THREE.MeshBasicMaterial({ color: 0x00aaff }), atmX, 1.6, atmZ + 0.41, 0.6, 0.5, 0.05);

  if (interactionManager) {
    interactionManager.register({
      type: 'atm',
      position: new THREE.Vector3(bx + atmX, groundY + 1.2, bz + atmZ + 0.6),
      radius: 2.5,
      getPrompt: () => 'HOLD E: ATM WITHDRAW ($200)',
      onInteract: () => {
        if (soundManager) soundManager.playCashRegister();
        if (onBuyItem) onBuyItem('cash', -200);
      }
    });
  }

  // Store Grocery Aisles (Shelves)
  for (const ax of [-2, 2]) {
    makeBox(group, darkMetalMat, ax, 1.2, -1, 1.2, 2.2, 6.0);
  }

  if (colliders) {
    colliders.push({
      type: 'box',
      minX: bx - storeW / 2, maxX: bx + storeW / 2,
      minZ: bz - storeD / 2, maxZ: bz - storeD / 2 + 1.0,
      minY: groundY, maxY: groundY + storeH
    });
    colliders.push({
      type: 'box',
      minX: bx - storeW / 2, maxX: bx - storeW / 2 + 1.0,
      minZ: bz - storeD / 2, maxZ: bz + storeD / 2,
      minY: groundY, maxY: groundY + storeH
    });
    colliders.push({
      type: 'box',
      minX: bx + storeW / 2 - 1.0, maxX: bx + storeW / 2,
      minZ: bz - storeD / 2, maxZ: bz + storeD / 2,
      minY: groundY, maxY: groundY + storeH
    });
  }

  parentGroup.add(group);
}
