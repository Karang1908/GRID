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

// Shared Architectural Materials Palette
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
const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
const neonOrangeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
const neonGreenMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
const waterTowerWoodMat = new THREE.MeshStandardMaterial({ color: 0x5a4230, roughness: 0.9 });
const concreteFloorMat = new THREE.MeshStandardMaterial({ color: 0x2c2e35, roughness: 0.7 });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.1 });

function makeBox(group, mat, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(boxGeom, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  if (rx || ry || rz) mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
}

// -----------------------------------------------------------------------------
// ROOFTOP INFRASTRUCTURE (HVAC, Water Towers, Cellular Antenna Array)
// -----------------------------------------------------------------------------
function addRooftopInfrastructure(group, bx, roofY, bz, bWidth, bDepth, styleType, colliders, walkableSurfaces) {
  // Parapet rim around roof edge
  const parapetH = 1.0;
  makeBox(group, darkCompositeMat, bx, roofY + parapetH / 2, bz - bDepth / 2 + 0.15, bWidth, parapetH, 0.3);
  makeBox(group, darkCompositeMat, bx, roofY + parapetH / 2, bz + bDepth / 2 - 0.15, bWidth, parapetH, 0.3);
  makeBox(group, darkCompositeMat, bx - bWidth / 2 + 0.15, roofY + parapetH / 2, bz, 0.3, parapetH, bDepth);
  makeBox(group, darkCompositeMat, bx + bWidth / 2 - 0.15, roofY + parapetH / 2, bz, 0.3, parapetH, bDepth);

  // Style 1 & 2: Modern HVAC Chiller Box Array
  if (styleType === 0 || styleType === 1 || styleType === 3) {
    const hvac = makeBox(group, hvacMetalMat, bx - 3, roofY + 1.2, bz - 2, 4.2, 2.4, 3.2);
    // Exhaust fans on top
    const fan1 = new THREE.Mesh(cylGeom, blackSteelMat);
    fan1.position.set(bx - 4, roofY + 2.45, bz - 2);
    fan1.scale.set(1.2, 0.2, 1.2);
    group.add(fan1);

    const fan2 = new THREE.Mesh(cylGeom, blackSteelMat);
    fan2.position.set(bx - 2, roofY + 2.45, bz - 2);
    fan2.scale.set(1.2, 0.2, 1.2);
    group.add(fan2);

    // Communications Antenna Mast with Red Warning Light
    const mast = new THREE.Mesh(cylGeom, chromeMat);
    mast.position.set(bx + 4, roofY + 4.0, bz + 3);
    mast.scale.set(0.12, 8.0, 0.12);
    group.add(mast);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
    beacon.position.set(bx + 4, roofY + 8.1, bz + 3);
    group.add(beacon);
  }

  // Style 3: Classic Wooden Water Tower on Steel Stilt Frame
  if (styleType === 2) {
    const wtBaseY = roofY + 2.5;
    // 4 Steel Stilts
    for (const sx of [-1.5, 1.5]) {
      for (const sz of [-1.5, 1.5]) {
        const leg = new THREE.Mesh(cylGeom, blackSteelMat);
        leg.position.set(bx + sx, roofY + 1.25, bz + sz);
        leg.scale.set(0.12, 2.5, 0.12);
        group.add(leg);
      }
    }
    // Wooden Water Barrel
    const barrel = new THREE.Mesh(cylGeom, waterTowerWoodMat);
    barrel.position.set(bx, wtBaseY + 1.8, bz);
    barrel.scale.set(2.8, 3.6, 2.8);
    group.add(barrel);

    // Conical Roof on Water Tower
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.4, 16), darkCompositeMat);
    cone.position.set(bx, wtBaseY + 3.6 + 0.7, bz);
    group.add(cone);
  }

  // Make roof surface walkable
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
// 5 DISTINCT ARCHITECTURAL BUILDING STYLES
// -----------------------------------------------------------------------------
export function createBuilding(bx, bz, bWidth, bDepth, floors, heightAt, group, colliders, walkableSurfaces, rand, interactionManager = null) {
  const groundY = heightAt(bx, bz);
  const floorHeight = 4.8;
  const wallThickness = 0.5;

  // Select 1 of 4 building styles (or Center Skyscraper for centerpiece)
  const styleType = Math.floor(rand() * 4);

  // Determine styling materials per archetype
  let facadeMat, trimMat, windowGlassMat;
  if (styleType === 0) {
    // 1. Vinewood Luxury Commercial Plaza
    facadeMat = whiteStuccoMat;
    trimMat = darkWoodPanelMat;
    windowGlassMat = cyanGlassMat;
  } else if (styleType === 1) {
    // 2. Downtown Terraced High-Rise Condos
    facadeMat = darkCompositeMat;
    trimMat = goldTrimMat;
    windowGlassMat = cyanGlassMat;
  } else if (styleType === 2) {
    // 3. Historic Brick & Deco Tower
    facadeMat = brickTerracottaMat;
    trimMat = graniteCorniceMat;
    windowGlassMat = darkMirrorGlassMat;
  } else {
    // 4. Corporate Glass Skyscraper
    facadeMat = darkCompositeMat;
    trimMat = chromeMat;
    windowGlassMat = cyanGlassMat;
  }

  // Exterior Fire Escapes on Side for Historic Brick Buildings
  if (styleType === 2) {
    for (let f = 1; f < floors; f++) {
      const fy = groundY + f * floorHeight;
      const feX = bx + bWidth / 2 + 0.7;
      // Balcony platform
      makeBox(group, blackSteelMat, feX, fy + 0.1, bz, 1.4, 0.1, 4.2);
      // Railing
      makeBox(group, blackSteelMat, feX + 0.65, fy + 0.6, bz, 0.06, 1.0, 4.2);
      makeBox(group, blackSteelMat, feX, fy + 0.6, bz - 2.05, 1.4, 1.0, 0.06);
      makeBox(group, blackSteelMat, feX, fy + 0.6, bz + 2.05, 1.4, 1.0, 0.06);
      // Iron Ladder connecting floors
      const ladder = new THREE.Mesh(cylGeom, blackSteelMat);
      ladder.position.set(feX, fy - floorHeight / 2, bz + 1.6);
      ladder.scale.set(0.08, floorHeight, 0.4);
      group.add(ladder);
    }
  }

  // Diagonal Cross-Braces for Corporate Glass Towers (IAA/FIB style)
  if (styleType === 3) {
    const totalH = floors * floorHeight;
    const braceMat = chromeMat;
    // Front Diagonal X-Braces
    const brace1 = makeBox(group, braceMat, bx, groundY + totalH / 2, bz + bDepth / 2 + 0.15, 0.35, Math.sqrt(bWidth * bWidth + totalH * totalH), 0.35);
    brace1.rotation.z = Math.atan2(bWidth, totalH);
    const brace2 = makeBox(group, braceMat, bx, groundY + totalH / 2, bz + bDepth / 2 + 0.15, 0.35, Math.sqrt(bWidth * bWidth + totalH * totalH), 0.35);
    brace2.rotation.z = -Math.atan2(bWidth, totalH);
  }

  // Build each floor
  for (let f = 0; f < floors; f++) {
    const y = groundY + f * floorHeight;
    const isGround = (f === 0);

    // Floor Slab
    makeBox(group, concreteFloorMat, bx, y + 0.1, bz, bWidth, 0.2, bDepth);

    // Architectural Trim Bands between floors
    makeBox(group, trimMat, bx, y + floorHeight, bz, bWidth + 0.3, 0.3, bDepth + 0.3);

    // Walkable floor surface
    if (walkableSurfaces) {
      walkableSurfaces.push({
        type: 'flat',
        y: y + 0.2,
        minX: bx - bWidth / 2, maxX: bx + bWidth / 2,
        minZ: bz - bDepth / 2, maxZ: bz + bDepth / 2
      });
    }

    // Outer Walls & Glass Windows with Open Ground Doorway
    const wallH = floorHeight;
    const wy = y + wallH / 2;

    // Front Wall (+Z)
    if (isGround) {
      // Ground floor features a wide welcoming double door entrance
      makeBox(group, facadeMat, bx - bWidth / 3, wy, bz + bDepth / 2, bWidth / 3, wallH, wallThickness);
      makeBox(group, facadeMat, bx + bWidth / 3, wy, bz + bDepth / 2, bWidth / 3, wallH, wallThickness);
      // Entrance canopy / awning
      makeBox(group, trimMat, bx, wy + wallH / 3, bz + bDepth / 2 + 1.2, 6.0, 0.25, 2.4);
    } else {
      // Upper floor panoramic ribbon windows
      makeBox(group, windowGlassMat, bx, wy, bz + bDepth / 2, bWidth - 2, wallH - 1.2, wallThickness);
      makeBox(group, facadeMat, bx - bWidth / 2 + 0.5, wy, bz + bDepth / 2, 1.0, wallH, wallThickness);
      makeBox(group, facadeMat, bx + bWidth / 2 - 0.5, wy, bz + bDepth / 2, 1.0, wallH, wallThickness);
    }

    // Back Wall (-Z)
    makeBox(group, windowGlassMat, bx, wy, bz - bDepth / 2, bWidth - 2, wallH - 1.2, wallThickness);
    makeBox(group, facadeMat, bx - bWidth / 2 + 0.5, wy, bz - bDepth / 2, 1.0, wallH, wallThickness);
    makeBox(group, facadeMat, bx + bWidth / 2 - 0.5, wy, bz - bDepth / 2, 1.0, wallH, wallThickness);

    // Left Wall (-X)
    makeBox(group, facadeMat, bx - bWidth / 2, wy, bz, wallThickness, wallH, bDepth);
    // Right Wall (+X)
    makeBox(group, facadeMat, bx + bWidth / 2, wy, bz, wallThickness, wallH, bDepth);

    // Colliders for outer perimeter walls
    if (colliders) {
      if (!isGround) {
        colliders.push({
          type: 'box',
          minX: bx - bWidth / 2, maxX: bx + bWidth / 2,
          minZ: bz + bDepth / 2 - wallThickness, maxZ: bz + bDepth / 2 + wallThickness,
          minY: y, maxY: y + wallH
        });
      } else {
        // Leave front doorway open in collider
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
    // THEMED INTERIOR ROOMS WITH 100% INTERACTIVITY
    // -------------------------------------------------------------------------
    for (let r = 0; r < 2; r++) {
      const rz = bz + (r === 0 ? -bDepth / 4 : bDepth / 4);
      const leftRoomX = bx - bWidth / 4;
      const rightRoomX = bx + bWidth / 4;

      if (r === 0) {
        // Living Room Suite with Interactive TV, Drawers & Sofa
        createSofa(leftRoomX, y + 0.2, rz + 1.2, 0, group, colliders, rand, null, interactionManager);
        createTVUnit(leftRoomX, y + 0.2, rz - 2.4, Math.PI, group, colliders, rand, interactionManager);
        createCupboardWithDrawers(bx - bWidth / 2 + 1.2, y + 0.2, rz, Math.PI / 2, group, colliders, rand, interactionManager);
        createPottedPlant(leftRoomX + 2.2, y + 0.2, rz + 2.0, group);
        createCeilingLight(leftRoomX, y + wallH - 0.1, rz, group);

        // Master Bedroom with Interactive Bed & Drawers
        createBedroomSuite(rightRoomX, y + 0.2, rz - 0.6, 0, group, colliders, rand, interactionManager);
        createCupboardWithDrawers(bx + bWidth / 2 - 1.2, y + 0.2, rz + 1.4, -Math.PI / 2, group, colliders, rand, interactionManager);
        createTVUnit(rightRoomX, y + 0.2, rz + 2.4, 0, group, colliders, rand, interactionManager);
        createCeilingLight(rightRoomX, y + wallH - 0.1, rz, group);
      } else {
        // Executive Workstation Office
        createOfficeSuite(leftRoomX, y + 0.2, rz, 0, group, colliders, rand, interactionManager);
        createCupboardWithDrawers(bx - bWidth / 2 + 1.2, y + 0.2, rz - 1.2, Math.PI / 2, group, colliders, rand, interactionManager);
        createPottedPlant(leftRoomX + 2.2, y + 0.2, rz + 2.0, group);
        createCeilingLight(leftRoomX, y + wallH - 0.1, rz, group);

        // Kitchenette & Lounge
        createKitchenette(rightRoomX - 0.5, y + 0.2, rz - 1.6, 0, group, colliders, rand, interactionManager);
        createCupboardWithDrawers(bx + bWidth / 2 - 1.2, y + 0.2, rz + 1.2, -Math.PI / 2, group, colliders, rand, interactionManager);
        createSofa(rightRoomX, y + 0.2, rz + 1.6, Math.PI, group, colliders, rand, null, interactionManager);
        createCeilingLight(rightRoomX, y + wallH - 0.1, rz, group);
      }
    }
  }

  // Rooftop Infrastructure & Walkable Roof
  const roofY = groundY + floors * floorHeight;
  addRooftopInfrastructure(group, bx, roofY, bz, bWidth, bDepth, styleType, colliders, walkableSurfaces);
}

// -----------------------------------------------------------------------------
// 5. CENTERPIECE SKYSCRAPER: THE MASTERPIECE OF THE GRID
// Polished reception lobby, 15-floor interactive elevator, themed luxury suites
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

  // Central Core Structural Pillar with vertical neon accent channels
  const coreRadius = 2.0;
  const coreHeight = floors * floorHeight;
  const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(coreRadius, coreRadius, coreHeight, 16), buildingMat);
  coreMesh.position.set(bx, groundY + coreHeight / 2, bz);
  group.add(coreMesh);

  // Vertical glowing neon light pillars on the central core
  for (let c = 0; c < 4; c++) {
    const cAngle = (c / 4) * Math.PI * 2;
    const cx = bx + Math.sin(cAngle) * (coreRadius + 0.05);
    const cz = bz + Math.cos(cAngle) * (coreRadius + 0.05);
    const neonStrip = new THREE.Mesh(boxGeom, neonBlueMat);
    neonStrip.position.set(cx, groundY + coreHeight / 2, cz);
    neonStrip.rotation.y = cAngle;
    neonStrip.scale.set(0.1, coreHeight, 0.04);
    group.add(neonStrip);
  }

  if (colliders) {
    colliders.push({
      type: 'circle',
      x: bx, z: bz,
      r: coreRadius + 0.1
    });
  }

  // =========================================================================
  // CREATE ELEVATOR
  // =========================================================================
  const elevator = new Elevator(bx, bz, groundY, floorHeight, floors, group, colliders, walkableSurfaces, interactionManager);

  // Build each floor
  for (let f = 0; f < floors; f++) {
    const y = groundY + f * floorHeight;
    const wy = y + floorHeight / 2;

    // Floor slab
    const floorMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.4, segments), f === 0 ? marbleMat : floorMat);
    floorMesh.position.set(bx, y, bz);
    group.add(floorMesh);

    // Glowing rim around each floor exterior
    const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.1, radius + 0.1, 0.12, segments), goldTrimMat);
    rimMesh.position.set(bx, y + 0.2, bz);
    group.add(rimMesh);

    // Walkable surface with shaft cutouts on upper floors
    if (walkableSurfaces) {
      if (f === 0) {
        walkableSurfaces.push({
          type: 'flat',
          y: y + 0.2,
          minX: bx - radius, maxX: bx + radius,
          minZ: bz - radius, maxZ: bz + radius
        });
      } else {
        const eHw = elevator.cabinWidth / 2 + 0.3;
        const eHd = elevator.cabinDepth / 2 + 0.3;
        walkableSurfaces.push({
          type: 'flat',
          y: y + 0.2,
          minX: bx - radius, maxX: bx + radius,
          minZ: bz - radius, maxZ: bz + radius,
          holeMinX: elevator.shaftX - eHw,
          holeMaxX: elevator.shaftX + eHw,
          holeMinZ: elevator.shaftZ - eHd,
          holeMaxZ: elevator.shaftZ + eHd
        });
      }
    }

    // Facade with 4 Open Walk-Through Entrances on Ground Floor
    const wallW = (2 * Math.PI * radius) / segments + 0.4;
    for (let i = 0; i < segments; i++) {
      const isGroundDoor = (f === 0 && (
        i === 0 || i === 1 || i === segments - 1 || // South Entrance (+Z)
        i === 6 || i === 7 || i === 5 ||           // East Entrance (+X)
        i === 12 || i === 13 || i === 11 ||        // North Entrance (-Z)
        i === 18 || i === 19 || i === 17           // West Entrance (-X)
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

    // -------------------------------------------------------------------------
    // THEMED INTERIOR FLOORS WITH FULL INTERACTION
    // -------------------------------------------------------------------------
    const floorY = y + 0.2;
    if (f === 0) {
      // Ground Floor Reception Lobby
      const holoRing = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.06, 8, 32), neonBlueMat);
      holoRing.position.set(bx, floorY + 1.8, bz);
      holoRing.rotation.x = Math.PI / 2;
      group.add(holoRing);

      const holoRing2 = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.04, 8, 32), neonBlueMat);
      holoRing2.position.set(bx, floorY + 2.2, bz);
      holoRing2.rotation.x = Math.PI / 3;
      holoRing2.rotation.z = Math.PI / 4;
      group.add(holoRing2);

      // Curved Executive Reception Counter
      const desk = makeBox(group, buildingMat, bx, floorY + 0.7, bz + 12, 8.0, 1.4, 1.6);
      makeBox(group, marbleMat, bx, floorY + 1.42, bz + 12, 8.2, 0.06, 1.7);

      // Reception desk monitors (2)
      for (let m = -1; m <= 1; m += 2) {
        makeBox(group, buildingMat, bx + m * 2.2, floorY + 1.9, bz + 11.6, 1.4, 0.9, 0.06);
        const screen = makeBox(group, new THREE.MeshBasicMaterial({ color: 0x1a3355 }), bx + m * 2.2, floorY + 1.9, bz + 11.55, 1.25, 0.75, 0.02);

        if (interactionManager) {
          let checkedIn = false;
          interactionManager.register({
            type: 'terminal',
            position: new THREE.Vector3(bx + m * 2.2, floorY + 1.9, bz + 11.6),
            radius: 2.6,
            getPrompt: () => checkedIn ? 'HOLD E: VIEW DIRECTORY' : 'HOLD E: CHECK IN VISITOR',
            onInteract: () => {
              checkedIn = !checkedIn;
              screen.material = checkedIn ? new THREE.MeshBasicMaterial({ color: 0x00ff88 }) : new THREE.MeshBasicMaterial({ color: 0x1a3355 });
            }
          });
        }
      }

      // Desk lamp
      makeBox(group, goldTrimMat, bx, floorY + 1.45, bz + 11.4, 0.3, 0.08, 0.3);
      const lampShade = makeBox(group, new THREE.MeshBasicMaterial({ color: 0xffeebb }), bx, floorY + 2.35, bz + 11.4, 0.4, 0.3, 0.4);

      if (interactionManager) {
        let lampOn = true;
        interactionManager.register({
          type: 'lamp',
          position: new THREE.Vector3(bx, floorY + 1.9, bz + 11.4),
          radius: 2.5,
          getPrompt: () => lampOn ? 'HOLD E: TOGGLE DESK LAMP (OFF)' : 'HOLD E: TOGGLE DESK LAMP (ON)',
          onInteract: () => {
            lampOn = !lampOn;
            lampShade.material = lampOn ? new THREE.MeshBasicMaterial({ color: 0xffeebb }) : new THREE.MeshStandardMaterial({ color: 0x332211 });
          }
        });
      }

      // Logo Sign
      makeBox(group, goldTrimMat, bx, floorY + 3.0, bz + 12.8, 5.0, 1.5, 0.1);

      // East & West Lounges
      createSofa(bx - 12, floorY, bz, Math.PI / 2, group, colliders, null, new THREE.Color(0x223355), interactionManager);
      createTVUnit(bx - 15, floorY, bz, Math.PI / 2, group, colliders, null, interactionManager);
      createCupboardWithDrawers(bx - 12, floorY, bz - 6, 0, group, colliders, null, interactionManager);

      createSofa(bx + 12, floorY, bz, -Math.PI / 2, group, colliders, null, new THREE.Color(0x553322), interactionManager);
      createTVUnit(bx + 15, floorY, bz, -Math.PI / 2, group, colliders, null, interactionManager);
      createCupboardWithDrawers(bx + 12, floorY, bz - 6, 0, group, colliders, null, interactionManager);

      createPottedPlant(bx - 8, floorY, bz + 9, group);
      createPottedPlant(bx + 8, floorY, bz + 9, group);
      createPottedPlant(bx - 14, floorY, bz + 14, group);
      createPottedPlant(bx + 14, floorY, bz + 14, group);

      createCeilingLight(bx - 7, y + floorHeight - 0.1, bz + 7, group);
      createCeilingLight(bx + 7, y + floorHeight - 0.1, bz + 7, group);
      createCeilingLight(bx, y + floorHeight - 0.1, bz, group);

    } else if (f === floors - 1) {
      // Floor 14: Skyline Penthouse
      createSofa(bx - 11, floorY, bz + 5, Math.PI / 4, group, colliders, null, new THREE.Color(0x882233), interactionManager);
      createTVUnit(bx - 14, floorY, bz + 8, Math.PI / 4, group, colliders, null, interactionManager);
      createCupboardWithDrawers(bx - 12, floorY, bz - 5, Math.PI / 2, group, colliders, null, interactionManager);

      createBedroomSuite(bx + 11, floorY, bz + 5, -Math.PI / 4, group, colliders, null, interactionManager);
      createKitchenette(bx + 9, floorY, bz - 8, Math.PI, group, colliders, null, interactionManager);
      createCupboardWithDrawers(bx + 12, floorY, bz - 3, -Math.PI / 2, group, colliders, null, interactionManager);
      createPottedPlant(bx - 12, floorY, bz + 11, group);
      createPottedPlant(bx + 12, floorY, bz + 11, group);

    } else if (f % 2 === 1) {
      // Tech Innovation Labs
      createOfficeSuite(bx - 11, floorY, bz, Math.PI / 2, group, colliders, null, interactionManager);
      createTVUnit(bx - 14, floorY, bz, Math.PI / 2, group, colliders, null, interactionManager);
      createCupboardWithDrawers(bx - 10, floorY, bz - 6, 0, group, colliders, null, interactionManager);

      createOfficeSuite(bx + 11, floorY, bz, -Math.PI / 2, group, colliders, null, interactionManager);
      createCupboardWithDrawers(bx + 10, floorY, bz - 6, 0, group, colliders, null, interactionManager);
      createPottedPlant(bx + 12, floorY, bz + 6, group);

    } else {
      // Executive VIP Lounges
      createSofa(bx - 11, floorY, bz, Math.PI / 2, group, colliders, null, null, interactionManager);
      createTVUnit(bx - 14, floorY, bz, Math.PI / 2, group, colliders, null, interactionManager);
      createCupboardWithDrawers(bx - 10, floorY, bz + 6, Math.PI, group, colliders, null, interactionManager);

      createBedroomSuite(bx + 11, floorY, bz, -Math.PI / 2, group, colliders, null, interactionManager);
      createCupboardWithDrawers(bx + 10, floorY, bz + 6, Math.PI, group, colliders, null, interactionManager);
      createPottedPlant(bx - 11, floorY, bz - 7, group);
    }

    // Rooftop Helipad on Floor 14
    if (f === floors - 1) {
      const roofY = y + floorHeight;
      makeBox(group, buildingMat, bx, roofY, bz, radius * 2, 0.6, radius * 2);

      const padMat = new THREE.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.9 });
      const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 11.5, 0.1, 32), padMat);
      padMesh.position.set(bx, roofY + 0.35, bz);
      group.add(padMesh);

      // Helipad Yellow Landing H
      const hMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      makeBox(group, hMat, bx - 2.4, roofY + 0.42, bz, 0.7, 0.04, 6.4);
      makeBox(group, hMat, bx + 2.4, roofY + 0.42, bz, 0.7, 0.04, 6.4);
      makeBox(group, hMat, bx, roofY + 0.42, bz, 4.1, 0.04, 0.7);

      // Helipad Glowing Beacons
      for (let b = 0; b < 12; b++) {
        const bAngle = (b / 12) * Math.PI * 2;
        const bX = bx + Math.sin(bAngle) * 11.0;
        const bZ = bz + Math.cos(bAngle) * 11.0;
        const bLight = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: (b % 2 === 0) ? 0x00ff66 : 0x0088ff }));
        bLight.position.set(bX, roofY + 0.5, bZ);
        group.add(bLight);
      }

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
