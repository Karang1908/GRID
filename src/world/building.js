import * as THREE from 'three';
import {
  createCupboardWithDrawers,
  createTVUnit,
  createSofa,
  createOfficeSuite,
  createBedroomSuite,
  createKitchenette,
  createPottedPlant,
  createCeilingLight
} from './furniture.js';
import { Elevator } from './elevator.js';

const boxGeom = new THREE.BoxGeometry(1, 1, 1);
const cylGeom = new THREE.CylinderGeometry(1, 1, 1, 16);

// Shared Architectural & Interior Materials Palette
const whiteStuccoMat = new THREE.MeshStandardMaterial({ color: 0xeeece8, roughness: 0.85 });
const brickTerracottaMat = new THREE.MeshStandardMaterial({ color: 0x8b3a2b, roughness: 0.9 });
const graniteCorniceMat = new THREE.MeshStandardMaterial({ color: 0xdddbd5, roughness: 0.7 });
const darkCompositeMat = new THREE.MeshStandardMaterial({ color: 0x242830, roughness: 0.4, metalness: 0.5 });
const darkWoodPanelMat = new THREE.MeshStandardMaterial({ color: 0x3d281a, roughness: 0.8 });
const cyanGlassMat = new THREE.MeshStandardMaterial({ color: 0x4f96e8, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.4 });
const darkMirrorGlassMat = new THREE.MeshStandardMaterial({ color: 0x162030, roughness: 0.05, metalness: 0.95, transparent: true, opacity: 0.5 });
const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.15 });
const blackSteelMat = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.6, metalness: 0.8 });
const hvacMetalMat = new THREE.MeshStandardMaterial({ color: 0x777c88, roughness: 0.5, metalness: 0.7 });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.1 });
const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
const neonOrangeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
const neonGreenMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
const waterTowerWoodMat = new THREE.MeshStandardMaterial({ color: 0x5a4230, roughness: 0.9 });
const concreteFloorMat = new THREE.MeshStandardMaterial({ color: 0x2c2e35, roughness: 0.7 });

// Apartment Interior Materials
const wallInteriorMat = new THREE.MeshStandardMaterial({ color: 0xe8e6e1, roughness: 0.9 });
const wallCorridorMat = new THREE.MeshStandardMaterial({ color: 0x383c46, roughness: 0.7, metalness: 0.2 });
const doorframeMat = new THREE.MeshStandardMaterial({ color: 0x241711, roughness: 0.6 });
const carpetCorridorMat = new THREE.MeshStandardMaterial({ color: 0x5a1820, roughness: 0.95 });
const woodFloorMat = new THREE.MeshStandardMaterial({ color: 0x755338, roughness: 0.7 });
const stairMat = new THREE.MeshStandardMaterial({ color: 0x202228, roughness: 0.5, metalness: 0.6 });
const brassPlaqueMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });

function makeBox(group, mat, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(boxGeom, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  if (rx || ry || rz) mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
}

// -----------------------------------------------------------------------------
// WALKABLE MULTI-FLIGHT STAIRCASE SYSTEM
// -----------------------------------------------------------------------------
function buildWalkableStairs(group, sx, sy, sz, floorH, f, totalFloors, colliders, walkableSurfaces) {
  if (f >= totalFloors - 1) return; // Top floor connects to rooftop

  const stairW = 1.3;
  const stairDepth = 3.8;
  const midH = floorH / 2;
  const numSteps = 8;

  // 1. Flight 1 (Climbing from Floor Level Y to Mid-Landing at Y + midH)
  const f1ZStart = sz - stairDepth / 2;
  const f1ZEnd = sz;
  for (let i = 0; i < numSteps; i++) {
    const fraction = (i + 0.5) / numSteps;
    const stepX = sx - stairW / 2;
    const stepY = sy + fraction * midH;
    const stepZ = f1ZStart + fraction * (f1ZEnd - f1ZStart);
    makeBox(group, stairMat, stepX, stepY - 0.08, stepZ, stairW - 0.05, 0.16, (stairDepth / 2) / numSteps + 0.05);
  }

  // Walkable ramp for Flight 1
  if (walkableSurfaces) {
    walkableSurfaces.push({
      type: 'ramp',
      dirZ: -1,
      minX: sx - stairW, maxX: sx,
      minZ: f1ZStart, maxZ: f1ZEnd,
      startY: sy + 0.15,
      endY: sy + midH + 0.15
    });
  }

  // 2. Mid-Landing Platform
  const landingY = sy + midH;
  const landingZ = sz + 0.3;
  makeBox(group, stairMat, sx, landingY, landingZ, stairW * 2 + 0.2, 0.2, 1.4);
  if (walkableSurfaces) {
    walkableSurfaces.push({
      type: 'flat',
      y: landingY + 0.1,
      minX: sx - stairW - 0.1, maxX: sx + stairW + 0.1,
      minZ: landingZ - 0.7, maxZ: landingZ + 0.7
    });
  }

  // Handrail along outer edge of landing
  makeBox(group, blackSteelMat, sx, landingY + 0.6, landingZ + 0.65, stairW * 2 + 0.2, 1.0, 0.05);

  // 3. Flight 2 (Climbing from Mid-Landing to Upper Floor Level Y + floorH)
  const f2ZStart = landingZ - 0.6;
  const f2ZEnd = sz - stairDepth / 2;
  for (let i = 0; i < numSteps; i++) {
    const fraction = (i + 0.5) / numSteps;
    const stepX = sx + stairW / 2;
    const stepY = landingY + fraction * midH;
    const stepZ = f2ZStart - fraction * (f2ZStart - f2ZEnd);
    makeBox(group, stairMat, stepX, stepY - 0.08, stepZ, stairW - 0.05, 0.16, (stairDepth / 2) / numSteps + 0.05);
  }

  // Walkable ramp for Flight 2
  if (walkableSurfaces) {
    walkableSurfaces.push({
      type: 'ramp',
      dirZ: 1,
      minX: sx, maxX: sx + stairW,
      minZ: f2ZEnd, maxZ: f2ZStart,
      startY: landingY + 0.15,
      endY: sy + floorH + 0.15
    });
  }

  // Center divider railing between Flight 1 and Flight 2
  makeBox(group, blackSteelMat, sx, sy + floorH / 2, sz, 0.06, floorH - 0.4, stairDepth);
}

// -----------------------------------------------------------------------------
// INDIVIDUAL APARTMENT FLAT BUILDER (4 FLATS PER FLOOR)
// -----------------------------------------------------------------------------
function buildApartmentFlat(group, flatNum, fx, fy, fz, fw, fd, isFront, isLeft, colliders, rand, interactionManager) {
  const wallH = 4.2;
  const wt = 0.3; // Wall thickness

  // Hardwood floor for the flat
  makeBox(group, woodFloorMat, fx, fy + 0.12, fz, fw - 0.2, 0.04, fd - 0.2);

  // Demising Wall separating Front and Back flat (along Z boundary)
  const demisingZ = isFront ? fz - fd / 2 : fz + fd / 2;
  makeBox(group, wallInteriorMat, fx, fy + wallH / 2, demisingZ, fw, wallH, wt);

  // Corridor Entryway Doorframe & Plaque on the corridor-facing wall
  const corridorX = isLeft ? fx + fw / 2 : fx - fw / 2;
  const doorZ = isFront ? fz - fd / 4 : fz + fd / 4;
  const doorW = 1.4;
  const doorH = 2.8;

  // Wall segments to the left and right of flat entrance door
  const wallZ1Len = Math.abs((doorZ - doorW / 2) - (fz - fd / 2));
  const wallZ1Mid = (fz - fd / 2) + wallZ1Len / 2;
  makeBox(group, wallCorridorMat, corridorX, fy + wallH / 2, wallZ1Mid, wt, wallH, wallZ1Len);

  const wallZ2Len = Math.abs((fz + fd / 2) - (doorZ + doorW / 2));
  const wallZ2Mid = (fz + fd / 2) - wallZ2Len / 2;
  makeBox(group, wallCorridorMat, corridorX, fy + wallH / 2, wallZ2Mid, wt, wallH, wallZ2Len);

  // Door lintel header above entrance
  makeBox(group, wallCorridorMat, corridorX, fy + doorH + (wallH - doorH) / 2, doorZ, wt, wallH - doorH, doorW);

  // Mahogany Door Frame Trim
  makeBox(group, doorframeMat, corridorX, fy + doorH / 2, doorZ - doorW / 2, wt + 0.08, doorH, 0.12);
  makeBox(group, doorframeMat, corridorX, fy + doorH / 2, doorZ + doorW / 2, wt + 0.08, doorH, 0.12);
  makeBox(group, doorframeMat, corridorX, fy + doorH + 0.06, doorZ, wt + 0.08, 0.12, doorW + 0.2);

  // Golden Apartment Plaque (e.g. FLAT 101, FLAT 102...)
  const plaque = makeBox(group, brassPlaqueMat, corridorX + (isLeft ? 0.2 : -0.2), fy + doorH + 0.35, doorZ, 0.04, 0.25, 0.6);

  // Colliders for corridor walls (leaving doorway open)
  if (colliders) {
    colliders.push({
      type: 'box',
      minX: corridorX - wt / 2, maxX: corridorX + wt / 2,
      minZ: (fz - fd / 2), maxZ: doorZ - doorW / 2,
      minY: fy, maxY: fy + wallH
    });
    colliders.push({
      type: 'box',
      minX: corridorX - wt / 2, maxX: corridorX + wt / 2,
      minZ: doorZ + doorW / 2, maxZ: (fz + fd / 2),
      minY: fy, maxY: fy + wallH
    });
    // Demising wall collider
    colliders.push({
      type: 'box',
      minX: fx - fw / 2, maxX: fx + fw / 2,
      minZ: demisingZ - wt / 2, maxZ: demisingZ + wt / 2,
      minY: fy, maxY: fy + wallH
    });
  }

  // ---------------------------------------------------------------------------
  // INTERIOR ROOM PARTITIONS (Living Room, Bedroom, Kitchenette, Bathroom)
  // ---------------------------------------------------------------------------
  const bedPartitionX = isLeft ? fx - fw / 6 : fx + fw / 6;
  const bedDoorZ = isFront ? fz + fd / 4 : fz - fd / 4;
  const bDoorW = 1.3;

  // Partition wall separating Living Lounge and Master Bedroom
  makeBox(group, wallInteriorMat, bedPartitionX, fy + wallH / 2, (fz + fd / 2 + bedDoorZ + bDoorW / 2) / 2, wt, wallH, Math.abs(fd / 2 - (bedDoorZ + bDoorW / 2)));
  makeBox(group, wallInteriorMat, bedPartitionX, fy + wallH / 2, (fz - fd / 2 + bedDoorZ - bDoorW / 2) / 2, wt, wallH, Math.abs((bedDoorZ - bDoorW / 2) - (-fd / 2)));
  makeBox(group, wallInteriorMat, bedPartitionX, fy + doorH + (wallH - doorH) / 2, bedDoorZ, wt, wallH - doorH, bDoorW);

  // 1. MASTER BEDROOM SUITE
  const bedX = isLeft ? fx - fw / 3 : fx + fw / 3;
  const bedZ = isFront ? fz + fd / 4 : fz - fd / 4;
  createBedroomSuite(bedX, fy + 0.2, bedZ, isLeft ? Math.PI / 2 : -Math.PI / 2, group, colliders, rand, interactionManager);
  createCupboardWithDrawers(bedX + (isLeft ? 2.5 : -2.5), fy + 0.2, bedZ, isLeft ? -Math.PI / 2 : Math.PI / 2, group, colliders, rand, interactionManager);
  createCeilingLight(bedX, fy + wallH - 0.1, bedZ, group);

  // 2. LIVING ROOM & ENTERTAINMENT SUITE
  const loungeX = isLeft ? fx + fw / 8 : fx - fw / 8;
  const loungeZ = isFront ? fz + fd / 4 : fz - fd / 4;
  createSofa(loungeX, fy + 0.2, loungeZ - 0.8, isFront ? 0 : Math.PI, group, colliders, rand, null, interactionManager);
  createTVUnit(loungeX, fy + 0.2, loungeZ + 1.8, isFront ? Math.PI : 0, group, colliders, rand, interactionManager);
  createPottedPlant(loungeX + (isLeft ? -1.8 : 1.8), fy + 0.2, loungeZ + 1.8, group);
  createCeilingLight(loungeX, fy + wallH - 0.1, loungeZ, group);

  // 3. KITCHENETTE & DINING AREA
  const kitX = isLeft ? fx - fw / 4 : fx + fw / 4;
  const kitZ = isFront ? fz - fd / 3.5 : fz + fd / 3.5;
  createKitchenette(kitX, fy + 0.2, kitZ, isFront ? 0 : Math.PI, group, colliders, rand, interactionManager);
  createCupboardWithDrawers(kitX + (isLeft ? 2.2 : -2.2), fy + 0.2, kitZ, 0, group, colliders, rand, interactionManager);
}

// -----------------------------------------------------------------------------
// ROOFTOP INFRASTRUCTURE
// -----------------------------------------------------------------------------
function addRooftopInfrastructure(group, bx, roofY, bz, bWidth, bDepth, styleType, colliders, walkableSurfaces) {
  const parapetH = 1.1;
  makeBox(group, darkCompositeMat, bx, roofY + parapetH / 2, bz - bDepth / 2 + 0.15, bWidth, parapetH, 0.3);
  makeBox(group, darkCompositeMat, bx, roofY + parapetH / 2, bz + bDepth / 2 - 0.15, bWidth, parapetH, 0.3);
  makeBox(group, darkCompositeMat, bx - bWidth / 2 + 0.15, roofY + parapetH / 2, bz, 0.3, parapetH, bDepth);
  makeBox(group, darkCompositeMat, bx + bWidth / 2 - 0.15, roofY + parapetH / 2, bz, 0.3, parapetH, bDepth);

  // Central Stairwell & Elevator Penthouse Room
  const phW = 7.0;
  const phD = 8.0;
  const phH = 3.5;
  makeBox(group, darkCompositeMat, bx, roofY + phH / 2, bz, phW, phH, phD);
  // Penthouse exit door onto roof
  makeBox(group, doorframeMat, bx + phW / 2 + 0.05, roofY + 1.4, bz + 1.5, 0.1, 2.6, 1.4);
  makeBox(group, new THREE.MeshStandardMaterial({ color: 0x8899aa }), bx + phW / 2 + 0.06, roofY + 1.4, bz + 1.5, 0.05, 2.4, 1.2);

  // HVAC Chiller Units
  const hvac = makeBox(group, hvacMetalMat, bx - 6, roofY + 1.2, bz - 5, 4.2, 2.4, 3.2);
  const fan1 = new THREE.Mesh(cylGeom, blackSteelMat);
  fan1.position.set(bx - 7, roofY + 2.45, bz - 5);
  fan1.scale.set(1.2, 0.2, 1.2);
  group.add(fan1);

  // Communications Antenna Mast with Beacon
  const mast = new THREE.Mesh(cylGeom, chromeMat);
  mast.position.set(bx + 6, roofY + 4.5, bz + 5);
  mast.scale.set(0.12, 9.0, 0.12);
  group.add(mast);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
  beacon.position.set(bx + 6, roofY + 9.1, bz + 5);
  group.add(beacon);

  if (walkableSurfaces) {
    walkableSurfaces.push({
      type: 'flat',
      y: roofY + 0.2,
      minX: bx - bWidth / 2, maxX: bx + bWidth / 2,
      minZ: bz - bDepth / 2, maxZ: bz + bDepth / 2
    });
  }
}

// -----------------------------------------------------------------------------
// COMPLETE APARTMENT BUILDING BUILDER WITH CENTRAL ELEVATOR & STAIRS
// -----------------------------------------------------------------------------
export function createBuilding(bx, bz, bWidth, bDepth, floors, heightAt, group, colliders, walkableSurfaces, rand, interactionManager = null) {
  const groundY = heightAt(bx, bz);
  const floorHeight = 4.6;
  const wallThickness = 0.5;
  const styleType = Math.floor(rand() * 4);

  // Determine styling facade
  let facadeMat, trimMat, windowGlassMat;
  if (styleType === 0) {
    facadeMat = whiteStuccoMat;
    trimMat = darkWoodPanelMat;
    windowGlassMat = cyanGlassMat;
  } else if (styleType === 1) {
    facadeMat = darkCompositeMat;
    trimMat = goldTrimMat;
    windowGlassMat = cyanGlassMat;
  } else if (styleType === 2) {
    facadeMat = brickTerracottaMat;
    trimMat = graniteCorniceMat;
    windowGlassMat = darkMirrorGlassMat;
  } else {
    facadeMat = darkCompositeMat;
    trimMat = chromeMat;
    windowGlassMat = cyanGlassMat;
  }

  // ===========================================================================
  // 1. CENTRAL ELEVATOR IN EVERY BUILDING
  // ===========================================================================
  const elevator = new Elevator(
    bx, bz, groundY, floorHeight, floors, group, colliders, walkableSurfaces, interactionManager,
    -1.4, 0
  );

  const corridorWidth = 5.6;
  const halfCorridor = corridorWidth / 2;
  const stairX = bx + 1.4;
  const stairZ = bz;

  // Build each floor
  for (let f = 0; f < floors; f++) {
    const y = groundY + f * floorHeight;
    const isGround = (f === 0);

    // Floor Slab with cutouts for elevator shaft and stairwell
    makeBox(group, concreteFloorMat, bx, y + 0.1, bz, bWidth, 0.2, bDepth);

    // Architectural Trim Bands
    makeBox(group, trimMat, bx, y + floorHeight, bz, bWidth + 0.3, 0.25, bDepth + 0.3);

    // Walkable floor slab with cutouts on upper floors
    if (walkableSurfaces) {
      if (isGround) {
        walkableSurfaces.push({
          type: 'flat',
          y: y + 0.2,
          minX: bx - bWidth / 2, maxX: bx + bWidth / 2,
          minZ: bz - bDepth / 2, maxZ: bz + bDepth / 2
        });
      } else {
        walkableSurfaces.push({
          type: 'flat',
          y: y + 0.2,
          minX: bx - bWidth / 2, maxX: bx + bWidth / 2,
          minZ: bz - bDepth / 2, maxZ: bz + bDepth / 2,
          holeMinX: bx - halfCorridor,
          holeMaxX: bx + halfCorridor,
          holeMinZ: bz - 2.8,
          holeMaxZ: bz + 2.8
        });
      }
    }

    // -------------------------------------------------------------------------
    // CENTRAL CORRIDOR RUNNER & CEILING LIGHTS
    // -------------------------------------------------------------------------
    makeBox(group, carpetCorridorMat, bx, y + 0.13, bz, 2.2, 0.02, bDepth - 1.0);
    createCeilingLight(bx, y + floorHeight - 0.1, bz - bDepth / 4, group);
    createCeilingLight(bx, y + floorHeight - 0.1, bz + bDepth / 4, group);

    // -------------------------------------------------------------------------
    // WALKABLE STAIRS IN CENTRAL CORE
    // -------------------------------------------------------------------------
    buildWalkableStairs(group, stairX, y, stairZ, floorHeight, f, floors, colliders, walkableSurfaces);

    // -------------------------------------------------------------------------
    // EXTERIOR FACADE WALLS & WINDOWS
    // -------------------------------------------------------------------------
    const wallH = floorHeight;
    const wy = y + wallH / 2;

    // Front Wall (+Z)
    if (isGround) {
      // Lobby street entrance
      makeBox(group, facadeMat, bx - bWidth / 3, wy, bz + bDepth / 2, bWidth / 3, wallH, wallThickness);
      makeBox(group, facadeMat, bx + bWidth / 3, wy, bz + bDepth / 2, bWidth / 3, wallH, wallThickness);
      makeBox(group, trimMat, bx, wy + wallH / 3, bz + bDepth / 2 + 1.2, 6.0, 0.25, 2.4);
    } else {
      makeBox(group, windowGlassMat, bx, wy, bz + bDepth / 2, bWidth - 2, wallH - 1.2, wallThickness);
      makeBox(group, facadeMat, bx - bWidth / 2 + 0.5, wy, bz + bDepth / 2, 1.0, wallH, wallThickness);
      makeBox(group, facadeMat, bx + bWidth / 2 - 0.5, wy, bz + bDepth / 2, 1.0, wallH, wallThickness);
    }

    // Back Wall (-Z)
    makeBox(group, windowGlassMat, bx, wy, bz - bDepth / 2, bWidth - 2, wallH - 1.2, wallThickness);
    makeBox(group, facadeMat, bx - bWidth / 2 + 0.5, wy, bz - bDepth / 2, 1.0, wallH, wallThickness);
    makeBox(group, facadeMat, bx + bWidth / 2 - 0.5, wy, bz - bDepth / 2, 1.0, wallH, wallThickness);

    // Left Wall (-X) & Right Wall (+X)
    makeBox(group, facadeMat, bx - bWidth / 2, wy, bz, wallThickness, wallH, bDepth);
    makeBox(group, facadeMat, bx + bWidth / 2, wy, bz, wallThickness, wallH, bDepth);

    // Perimeter Colliders
    if (colliders) {
      if (!isGround) {
        colliders.push({
          type: 'box',
          minX: bx - bWidth / 2, maxX: bx + bWidth / 2,
          minZ: bz + bDepth / 2 - wallThickness, maxZ: bz + bDepth / 2 + wallThickness,
          minY: y, maxY: y + wallH
        });
      } else {
        colliders.push({
          type: 'box',
          minX: bx - bWidth / 2, maxX: bx - 2.5,
          minZ: bz + bDepth / 2 - wallThickness, maxZ: bz + bDepth / 2 + wallThickness,
          minY: y, maxY: y + wallH
        });
        colliders.push({
          type: 'box',
          minX: bx + 2.5, maxX: bx + bWidth / 2,
          minZ: bz + bDepth / 2 - wallThickness, maxZ: bz + bDepth / 2 + wallThickness,
          minY: y, maxY: y + wallH
        });
      }

      colliders.push({
        type: 'box',
        minX: bx - bWidth / 2, maxX: bx + bWidth / 2,
        minZ: bz - bDepth / 2 - wallThickness, maxZ: bz - bDepth / 2 + wallThickness,
        minY: y, maxY: y + wallH
      });
      colliders.push({
        type: 'box',
        minX: bx - bWidth / 2 - wallThickness, maxX: bx - bWidth / 2 + wallThickness,
        minZ: bz - bDepth / 2, maxZ: bz + bDepth / 2,
        minY: y, maxY: y + wallH
      });
      colliders.push({
        type: 'box',
        minX: bx + bWidth / 2 - wallThickness, maxX: bx + bWidth / 2 + wallThickness,
        minZ: bz - bDepth / 2, maxZ: bz + bDepth / 2,
        minY: y, maxY: y + wallH
      });
    }

    // -------------------------------------------------------------------------
    // 4 APARTMENT FLATS PER FLOOR ("2 on each side of the floor")
    // -------------------------------------------------------------------------
    const flatW = (bWidth - corridorWidth) / 2;
    const flatD = (bDepth - 1.0) / 2;

    const leftWingX = bx - halfCorridor - flatW / 2;
    const rightWingX = bx + halfCorridor + flatW / 2;
    const frontWingZ = bz + flatD / 2;
    const backWingZ = bz - flatD / 2;

    if (isGround) {
      // Ground Floor Lobby Features: Mailboxes, Concierge Desk & Plants
      const desk = makeBox(group, darkWoodPanelMat, bx - 1.5, y + 0.7, bz + 8.5, 3.2, 1.4, 1.2);
      makeBox(group, graniteCorniceMat, bx - 1.5, y + 1.42, bz + 8.5, 3.4, 0.05, 1.3);

      // Mailboxes wall for all apartments
      makeBox(group, brassPlaqueMat, bx + 2.5, y + 1.8, bz + 7.5, 0.1, 1.8, 3.6);

      createSofa(bx + 1.5, y + 0.2, bz + 8.5, -Math.PI / 2, group, colliders, rand, null, interactionManager);
      createPottedPlant(bx - 2.2, y + 0.2, bz + 10.5, group);
      createPottedPlant(bx + 2.2, y + 0.2, bz + 10.5, group);
    }

    // Flat 1: Front-Left (Apt 101, 201...)
    buildApartmentFlat(group, `${f + 1}01`, leftWingX, y, frontWingZ, flatW, flatD, true, true, colliders, rand, interactionManager);

    // Flat 2: Back-Left (Apt 102, 202...)
    buildApartmentFlat(group, `${f + 1}02`, leftWingX, y, backWingZ, flatW, flatD, false, true, colliders, rand, interactionManager);

    // Flat 3: Front-Right (Apt 103, 203...)
    buildApartmentFlat(group, `${f + 1}03`, rightWingX, y, frontWingZ, flatW, flatD, true, false, colliders, rand, interactionManager);

    // Flat 4: Back-Right (Apt 104, 204...)
    buildApartmentFlat(group, `${f + 1}04`, rightWingX, y, backWingZ, flatW, flatD, false, false, colliders, rand, interactionManager);
  }

  // Rooftop Infrastructure
  const roofY = groundY + floors * floorHeight;
  addRooftopInfrastructure(group, bx, roofY, bz, bWidth, bDepth, styleType, colliders, walkableSurfaces);

  return elevator;
}

// -----------------------------------------------------------------------------
// CENTERPIECE MAZE BANK SKYSCRAPER (15 FLOORS)
// -----------------------------------------------------------------------------
export function createRoundSkyscraper(bx, bz, heightAt, group, colliders, walkableSurfaces, interactionManager = null) {
  const groundY = heightAt(bx, bz);
  const floors = 15;
  const floorHeight = 5.0;
  const radius = 19;
  const segments = 24;
  const wallThickness = 0.6;

  const buildingMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.15, metalness: 0.9, flatShading: true });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x4f86f7, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.35 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.15 });
  const neonBlueMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.25, metalness: 0.05 });

  const coreRadius = 2.0;
  const coreHeight = floors * floorHeight;
  const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(coreRadius, coreRadius, coreHeight, 16), buildingMat);
  coreMesh.position.set(bx, groundY + coreHeight / 2, bz);
  group.add(coreMesh);

  if (colliders) {
    colliders.push({
      type: 'circle',
      x: bx, z: bz,
      r: coreRadius + 0.1
    });
  }

  // Grand Skyscraper Central Elevator
  const elevator = new Elevator(bx, bz, groundY, floorHeight, floors, group, colliders, walkableSurfaces, interactionManager, 4.5, 6.0);

  // Build each floor
  for (let f = 0; f < floors; f++) {
    const y = groundY + f * floorHeight;
    const wy = y + floorHeight / 2;

    const floorMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.4, segments), f === 0 ? marbleMat : floorMat);
    floorMesh.position.set(bx, y, bz);
    group.add(floorMesh);

    const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.1, radius + 0.1, 0.12, segments), goldTrimMat);
    rimMesh.position.set(bx, y + 0.2, bz);
    group.add(rimMesh);

    if (walkableSurfaces) {
      if (f === 0) {
        walkableSurfaces.push({
          type: 'flat',
          y: y + 0.2,
          minX: bx - radius, maxX: bx + radius,
          minZ: bz - radius, maxZ: bz + radius
        });
      } else {
        walkableSurfaces.push({
          type: 'flat',
          y: y + 0.2,
          minX: bx - radius, maxX: bx + radius,
          minZ: bz - radius, maxZ: bz + radius,
          holeMinX: elevator.shaftX - 2.0,
          holeMaxX: elevator.shaftX + 2.0,
          holeMinZ: elevator.shaftZ - 2.0,
          holeMaxZ: elevator.shaftZ + 2.0
        });
      }
    }

    // Outer Perimeter Wall Segments
    const wallW = (2 * Math.PI * radius) / segments + 0.4;
    for (let i = 0; i < segments; i++) {
      const isGroundDoor = (f === 0 && (
        i === 0 || i === 1 || i === segments - 1 ||
        i === 6 || i === 7 || i === 5 ||
        i === 12 || i === 13 || i === 11 ||
        i === 18 || i === 19 || i === 17
      ));

      if (isGroundDoor) continue;

      const angle = (i / segments) * Math.PI * 2;
      const wx = bx + Math.sin(angle) * radius;
      const wz = bz + Math.cos(angle) * radius;

      const isWindow = (f > 0 && i % 2 === 0);
      const mesh = new THREE.Mesh(boxGeom, isWindow ? glassMat : buildingMat);

      mesh.position.set(wx, wy, wz);
      mesh.rotation.y = angle;
      mesh.scale.set(wallW, floorHeight, wallThickness);
      group.add(mesh);

      if (!isWindow && colliders) {
        colliders.push({
          type: 'circle',
          x: wx, z: wz,
          r: 0.5,
          minY: wy - floorHeight / 2,
          maxY: wy + floorHeight / 2
        });
      }
    }

    // Floor Suites
    const floorY = y + 0.2;
    if (f === 0) {
      // Grand Reception Lobby
      const desk = makeBox(group, buildingMat, bx, floorY + 0.7, bz + 12, 8.0, 1.4, 1.6);
      makeBox(group, marbleMat, bx, floorY + 1.42, bz + 12, 8.2, 0.06, 1.7);

      createSofa(bx - 12, floorY, bz, Math.PI / 2, group, colliders, null, new THREE.Color(0x223355), interactionManager);
      createTVUnit(bx - 15, floorY, bz, Math.PI / 2, group, colliders, null, interactionManager);
      createSofa(bx + 12, floorY, bz, -Math.PI / 2, group, colliders, null, new THREE.Color(0x553322), interactionManager);
      createTVUnit(bx + 15, floorY, bz, -Math.PI / 2, group, colliders, null, interactionManager);
      createPottedPlant(bx - 8, floorY, bz + 9, group);
      createPottedPlant(bx + 8, floorY, bz + 9, group);
    } else {
      // Partitioned Skyscraper Suites
      createOfficeSuite(bx - 11, floorY, bz, Math.PI / 2, group, colliders, null, interactionManager);
      createTVUnit(bx - 14, floorY, bz, Math.PI / 2, group, colliders, null, interactionManager);
      createBedroomSuite(bx + 11, floorY, bz, -Math.PI / 2, group, colliders, null, interactionManager);
      createKitchenette(bx + 8, floorY, bz - 7, Math.PI, group, colliders, null, interactionManager);
      createCupboardWithDrawers(bx - 10, floorY, bz - 6, 0, group, colliders, null, interactionManager);
      createPottedPlant(bx + 12, floorY, bz + 6, group);
    }

    // Rooftop Helipad on Floor 14
    if (f === floors - 1) {
      const roofY = y + floorHeight;
      makeBox(group, buildingMat, bx, roofY, bz, radius * 2, 0.6, radius * 2);

      const padMat = new THREE.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.9 });
      const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 11.5, 0.1, 32), padMat);
      padMesh.position.set(bx, roofY + 0.35, bz);
      group.add(padMesh);

      const hMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      makeBox(group, hMat, bx - 2.4, roofY + 0.42, bz, 0.7, 0.04, 6.4);
      makeBox(group, hMat, bx + 2.4, roofY + 0.42, bz, 0.7, 0.04, 6.4);
      makeBox(group, hMat, bx, roofY + 0.42, bz, 4.1, 0.04, 0.7);

      if (walkableSurfaces) {
        walkableSurfaces.push({
          type: 'flat',
          y: roofY + 0.4,
          minX: bx - radius, maxX: bx + radius,
          minZ: bz - radius, maxZ: bz + radius
        });
      }
    }
  }

  return elevator;
}
