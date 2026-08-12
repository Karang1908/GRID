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

// -----------------------------------------------------------------------------
// STANDARD CITY BUILDING WITH POLISHED ROOMS & STAIRWAYS
// -----------------------------------------------------------------------------
export function createBuilding(bx, bz, bWidth, bDepth, floors, heightAt, group, colliders, walkableSurfaces, rand, interactionManager = null) {
  const groundY = heightAt(bx, bz);
  const floorHeight = 4.5;
  const wallThickness = 0.5;
  
  const hue = rand();
  const saturation = 0.2 + rand() * 0.25;
  const lightness = 0.35 + rand() * 0.45;
  const buildingColor = new THREE.Color().setHSL(hue, saturation, lightness);
  
  const buildingMat = new THREE.MeshStandardMaterial({ color: buildingColor, roughness: 0.8, flatShading: true });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x333338, roughness: 0.7 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.9 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.45 });
  const interiorWallMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.95 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x44444a, roughness: 0.9 });

  // Concrete sidewalk around building
  const sidewalkW = bWidth + 4;
  const sidewalkD = bDepth + 4;
  const sidewalk = new THREE.Mesh(boxGeom, floorMat);
  sidewalk.position.set(bx, groundY + 0.1, bz);
  sidewalk.scale.set(sidewalkW, 0.2, sidewalkD);
  group.add(sidewalk);

  // Helper to add box mesh and collider
  const addBox = (x, y, z, w, h, d, mat, isSolid = true) => {
    const mesh = new THREE.Mesh(boxGeom, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    group.add(mesh);
    
    if (isSolid && colliders) {
      colliders.push({
        type: 'box',
        minX: x - w / 2, maxX: x + w / 2,
        minZ: z - d / 2, maxZ: z + d / 2,
        minY: y - h / 2, maxY: y + h / 2
      });
    }
    return mesh;
  };

  // Helper to create wall with cutout for windows or doors
  const createWallWithHole = (x, y, z, w, h, d, holeW, holeH, holeOffsetY, isDoor) => {
    if (w > d) {
      // Horizontal wall
      const bottomH = holeOffsetY;
      if (bottomH > 0) addBox(x, y - h / 2 + bottomH / 2, z, w, bottomH, d, buildingMat);
      const topH = h - holeH - holeOffsetY;
      if (topH > 0) addBox(x, y + h / 2 - topH / 2, z, w, topH, d, buildingMat);
      const sideW = (w - holeW) / 2;
      if (sideW > 0) addBox(x - w / 2 + sideW / 2, y - h / 2 + holeOffsetY + holeH / 2, z, sideW, holeH, d, buildingMat);
      if (sideW > 0) addBox(x + w / 2 - sideW / 2, y - h / 2 + holeOffsetY + holeH / 2, z, sideW, holeH, d, buildingMat);
      
      if (!isDoor) {
        const glass = new THREE.Mesh(boxGeom, glassMat);
        glass.position.set(x, y - h / 2 + holeOffsetY + holeH / 2, z);
        glass.scale.set(holeW, holeH, d * 0.2);
        group.add(glass);
        addBox(x, y - h / 2 + holeOffsetY + holeH / 2, z, 0.12, holeH, d * 0.25, trimMat, false);
        addBox(x, y - h / 2 + holeOffsetY + holeH / 2, z, holeW, 0.12, d * 0.25, trimMat, false);
      }
    } else {
      // Vertical wall
      const bottomH = holeOffsetY;
      if (bottomH > 0) addBox(x, y - h / 2 + bottomH / 2, z, w, bottomH, d, buildingMat);
      const topH = h - holeH - holeOffsetY;
      if (topH > 0) addBox(x, y + h / 2 - topH / 2, z, w, topH, d, buildingMat);
      const sideD = (d - holeW) / 2;
      if (sideD > 0) addBox(x, y - h / 2 + holeOffsetY + holeH / 2, z - d / 2 + sideD / 2, w, holeH, sideD, buildingMat);
      if (sideD > 0) addBox(x, y - h / 2 + holeOffsetY + holeH / 2, z + d / 2 - sideD / 2, w, holeH, sideD, buildingMat);
      
      if (!isDoor) {
        const glass = new THREE.Mesh(boxGeom, glassMat);
        glass.position.set(x, y - h / 2 + holeOffsetY + holeH / 2, z);
        glass.scale.set(w * 0.2, holeH, holeW);
        group.add(glass);
        addBox(x, y - h / 2 + holeOffsetY + holeH / 2, z, w * 0.25, holeH, 0.12, trimMat, false);
        addBox(x, y - h / 2 + holeOffsetY + holeH / 2, z, w * 0.25, 0.12, holeW, trimMat, false);
      }
    }
  };

  const stairW = 3.6;
  const halfW = stairW / 2;
  const stairD = 6.4;
  const stairX = bx;
  const stairZ = bz - bDepth / 2 + stairD / 2 + 2.0;

  for (let f = 0; f < floors; f++) {
    const y = groundY + f * floorHeight;
    const wallH = floorHeight;
    const wy = y + wallH / 2;
    
    addBox(bx, y, bz, bWidth, 0.4, bDepth, floorMat, false);

    if (walkableSurfaces) {
      if (f === 0) {
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
          holeMinX: stairX - halfW - 0.5,
          holeMaxX: stairX + halfW + 0.5,
          holeMinZ: stairZ - stairD / 2 - 2.0,
          holeMaxZ: stairZ + stairD / 2 + 0.8
        });
      }
    }

    const isGround = (f === 0);
    const windowW = Math.min(6, bWidth * 0.32); 
    const windowH = floorHeight * 0.62;
    const windowOffsetY = 0.9;
    
    // Exterior Walls
    createWallWithHole(bx, wy, bz + bDepth / 2 - wallThickness / 2, bWidth, wallH, wallThickness, 
      isGround ? 4.8 : windowW, isGround ? 3.8 : windowH, isGround ? 0 : windowOffsetY, isGround);
    
    createWallWithHole(bx, wy, bz - bDepth / 2 + wallThickness / 2, bWidth, wallH, wallThickness, windowW, windowH, windowOffsetY, false);
    createWallWithHole(bx - bWidth / 2 + wallThickness / 2, wy, bz, wallThickness, wallH, bDepth, windowW, windowH, windowOffsetY, false);
    createWallWithHole(bx + bWidth / 2 - wallThickness / 2, wy, bz, wallThickness, wallH, bDepth, windowW, windowH, windowOffsetY, false);
    
    // Interior Partitions & Rooms
    if (bWidth >= 20 && bDepth >= 20) {
      const hallW = 4.8;
      const hwX1 = bx - hallW / 2;
      const hwX2 = bx + hallW / 2;
      const roomD = (bDepth - 2) / 2;
      
      createCeilingLight(bx, y + wallH - 0.1, bz + 3, group);
      createCeilingLight(bx, y + wallH - 0.1, bz - 2, group);

      for (let r = 0; r < 2; r++) {
        const rz = (bz + bDepth / 2 - 1) - roomD / 2 - r * roomD;
        
        createWallWithHole(hwX1, wy, rz, wallThickness, wallH, roomD, 3.6, 3.8, 0, true);
        createWallWithHole(hwX2, wy, rz, wallThickness, wallH, roomD, 3.6, 3.8, 0, true);
        
        if (r > 0) {
          const divZ = (bz + bDepth / 2 - 1) - r * roomD;
          const leftW = (bWidth - hallW) / 2 - 1;
          addBox(bx - hallW / 2 - leftW / 2, wy, divZ, leftW, wallH, 0.4, interiorWallMat, true);
          addBox(bx + hallW / 2 + leftW / 2, wy, divZ, leftW, wallH, 0.4, interiorWallMat, true);
        }
        
        const leftRoomX = bx - bWidth / 2 + 4.0;
        const rightRoomX = bx + bWidth / 2 - 4.0;

        if (r === 0) {
          // ROOM 1: Living Room with Interactive TV & Drawers
          createSofa(leftRoomX, y + 0.2, rz + 1.2, 0, group, colliders, rand);
          createTVUnit(leftRoomX, y + 0.2, rz - 2.4, Math.PI, group, colliders, rand, interactionManager);
          createCupboardWithDrawers(bx - bWidth / 2 + 1.2, y + 0.2, rz, Math.PI / 2, group, colliders, rand, interactionManager);
          createPottedPlant(leftRoomX + 2.2, y + 0.2, rz + 2.0, group);
          createCeilingLight(leftRoomX, y + wallH - 0.1, rz, group);

          // ROOM 2: Master Bedroom with Interactive Bed & Drawers
          createBedroomSuite(rightRoomX, y + 0.2, rz - 0.6, 0, group, colliders, rand, interactionManager);
          createCupboardWithDrawers(bx + bWidth / 2 - 1.2, y + 0.2, rz + 1.4, -Math.PI / 2, group, colliders, rand, interactionManager);
          createTVUnit(rightRoomX, y + 0.2, rz + 2.4, 0, group, colliders, rand, interactionManager);
          createCeilingLight(rightRoomX, y + wallH - 0.1, rz, group);
        } else {
          // ROOM 3: Executive Office
          createOfficeSuite(leftRoomX, y + 0.2, rz, 0, group, colliders, rand);
          createCupboardWithDrawers(bx - bWidth / 2 + 1.2, y + 0.2, rz - 1.2, Math.PI / 2, group, colliders, rand, interactionManager);
          createPottedPlant(leftRoomX + 2.2, y + 0.2, rz + 2.0, group);
          createCeilingLight(leftRoomX, y + wallH - 0.1, rz, group);

          // ROOM 4: Kitchenette & Dining
          createKitchenette(rightRoomX - 0.5, y + 0.2, rz - 1.6, 0, group, colliders, rand);
          createCupboardWithDrawers(bx + bWidth / 2 - 1.2, y + 0.2, rz + 1.2, -Math.PI / 2, group, colliders, rand, interactionManager);
          createSofa(rightRoomX, y + 0.2, rz + 1.6, Math.PI, group, colliders, rand);
          createCeilingLight(rightRoomX, y + wallH - 0.1, rz, group);
        }
      }
    }
    
    // Switchback Hallway Stairs between floors
    if (f < floors - 1) {
      const halfH = floorHeight / 2;
      const steps = 9;
      const stepD = stairD / steps;
      const stepH = halfH / steps;

      for (let s = 0; s < steps; s++) {
        const sx = stairX + halfW / 2;
        const sz = stairZ + stairD / 2 - (s * stepD + stepD / 2);
        const sy = y + s * stepH + stepH / 2;
        addBox(sx, sy, sz, halfW, stepH, stepD, floorMat, false);
      }
      
      addBox(stairX, y + halfH, stairZ - stairD / 2 - 0.9, stairW, 0.4, 1.8, floorMat, false);
      
      for (let s = 0; s < steps; s++) {
        const sx = stairX - halfW / 2;
        const sz = stairZ - stairD / 2 + (s * stepD + stepD / 2);
        const sy = y + halfH + s * stepH + stepH / 2;
        addBox(sx, sy, sz, halfW, stepH, stepD, floorMat, false);
      }

      if (walkableSurfaces) {
        walkableSurfaces.push({
          type: 'ramp',
          minX: stairX, maxX: stairX + stairW / 2 + 0.3,
          minZ: stairZ - stairD / 2, maxZ: stairZ + stairD / 2,
          startY: y + 0.2,
          endY: y + halfH + 0.2,
          dirZ: 1
        });
        
        walkableSurfaces.push({
          type: 'flat',
          y: y + halfH + 0.2,
          minX: stairX - stairW / 2 - 0.3, maxX: stairX + stairW / 2 + 0.3,
          minZ: stairZ - stairD / 2 - 1.8, maxZ: stairZ - stairD / 2
        });

        walkableSurfaces.push({
          type: 'ramp',
          minX: stairX - stairW / 2 - 0.3, maxX: stairX,
          minZ: stairZ - stairD / 2, maxZ: stairZ + stairD / 2,
          startY: y + halfH + 0.2,
          endY: y + floorHeight + 0.2,
          dirZ: -1
        });
      }
    }
    
    // Rooftop
    if (f === floors - 1) {
      const roofY = y + floorHeight;
      addBox(bx, roofY, bz, bWidth, 0.5, bDepth, roofMat, true);
      
      const parapetH = 1.2;
      addBox(bx, roofY + parapetH / 2, bz + bDepth / 2 - 0.2, bWidth, parapetH, 0.4, buildingMat, true);
      addBox(bx, roofY + parapetH / 2, bz - bDepth / 2 + 0.2, bWidth, parapetH, 0.4, buildingMat, true);
      addBox(bx - bWidth / 2 + 0.2, roofY + parapetH / 2, bz, 0.4, parapetH, bDepth, buildingMat, true);
      addBox(bx + bWidth / 2 - 0.2, roofY + parapetH / 2, bz, 0.4, parapetH, bDepth, buildingMat, true);

      addBox(bx - 4, roofY + 1.2, bz - 4, 3.2, 2.0, 2.6, trimMat, true);
      addBox(bx + 4, roofY + 1.2, bz - 4, 3.2, 2.0, 2.6, trimMat, true);

      const antenna = new THREE.Mesh(cylGeom, trimMat);
      antenna.position.set(bx + 5, roofY + 4.5, bz + 5);
      antenna.scale.set(0.12, 8.0, 0.12);
      group.add(antenna);

      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      beacon.position.set(bx + 5, roofY + 8.6, bz + 5);
      group.add(beacon);

      if (walkableSurfaces) {
        walkableSurfaces.push({
          type: 'flat',
          y: roofY + 0.25,
          minX: bx - bWidth / 2, maxX: bx + bWidth / 2,
          minZ: bz - bDepth / 2, maxZ: bz + bDepth / 2
        });
      }
    }
  }
}

// -----------------------------------------------------------------------------
// CENTER SKYSCRAPER: THE MASTERPIECE OF THE GRID
// Polished reception lobby, interactive elevator, themed luxury floors
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
  const interiorWallMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.95 });

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
  // CREATE ELEVATOR (replaces spiral stairs)
  // =========================================================================
  const elevator = new Elevator(bx, bz, groundY, floorHeight, floors, group, colliders, walkableSurfaces, interactionManager);

  // Build each floor
  for (let f = 0; f < floors; f++) {
    const y = groundY + f * floorHeight;
    const wy = y + floorHeight / 2;
    
    // Donut floor slab
    const floorMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.4, segments), f === 0 ? marbleMat : floorMat);
    floorMesh.position.set(bx, y, bz);
    group.add(floorMesh);

    // Glowing rim around each floor exterior
    const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.1, radius + 0.1, 0.12, segments), goldTrimMat);
    rimMesh.position.set(bx, y + 0.2, bz);
    group.add(rimMesh);
    
    // Solid flat walkable surfaces on all floors (no holes — elevator is enclosed)
    if (walkableSurfaces) {
      walkableSurfaces.push({
        type: 'flat',
        y: y + 0.2,
        minX: bx - radius, maxX: bx + radius,
        minZ: bz - radius, maxZ: bz + radius
      });
    }

    // -------------------------------------------------------------------------
    // FACADE WITH 4 OPEN WALK-THROUGH ENTRANCES ON GROUND FLOOR
    // -------------------------------------------------------------------------
    const wallW = (2 * Math.PI * radius) / segments + 0.4;
    for (let i = 0; i < segments; i++) {
      const isGroundDoor = (f === 0 && (
        i === 0 || i === 1 || i === segments - 1 || // South Entrance (+Z)
        i === 6 || i === 7 || i === 5 ||           // East Entrance (+X)
        i === 12 || i === 13 || i === 11 ||        // North Entrance (-Z)
        i === 18 || i === 19 || i === 17           // West Entrance (-X)
      ));

      if (isGroundDoor) continue; // Completely open walkway!
      
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
      // -----------------------------------------------------------------------
      // GROUND FLOOR: POLISHED RECEPTION LOBBY
      // -----------------------------------------------------------------------
      
      // Center Holographic Globe Feature near Core
      const holoRing = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.06, 8, 32), neonBlueMat);
      holoRing.position.set(bx, floorY + 1.8, bz);
      holoRing.rotation.x = Math.PI / 2;
      group.add(holoRing);

      // Second ring at an angle
      const holoRing2 = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.04, 8, 32), neonBlueMat);
      holoRing2.position.set(bx, floorY + 2.2, bz);
      holoRing2.rotation.x = Math.PI / 3;
      holoRing2.rotation.z = Math.PI / 4;
      group.add(holoRing2);

      // Curved Executive Reception Counter — wider, more detailed
      const desk = new THREE.Mesh(boxGeom, buildingMat);
      desk.position.set(bx, floorY + 0.7, bz + 12);
      desk.scale.set(8.0, 1.4, 1.6);
      group.add(desk);
      
      // Desk top surface (lighter)
      const deskTop = new THREE.Mesh(boxGeom, marbleMat);
      deskTop.position.set(bx, floorY + 1.42, bz + 12);
      deskTop.scale.set(8.2, 0.06, 1.7);
      group.add(deskTop);

      // Reception desk monitors (2)
      const monitorMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.1, metalness: 0.9 });
      for (let m = -1; m <= 1; m += 2) {
        const monitor = new THREE.Mesh(boxGeom, monitorMat);
        monitor.position.set(bx + m * 2.2, floorY + 1.9, bz + 11.6);
        monitor.scale.set(1.4, 0.9, 0.06);
        group.add(monitor);
        // Screen glow
        const screen = new THREE.Mesh(boxGeom, new THREE.MeshBasicMaterial({ color: 0x1a3355 }));
        screen.position.set(bx + m * 2.2, floorY + 1.9, bz + 11.55);
        screen.scale.set(1.25, 0.75, 0.02);
        group.add(screen);
      }

      // Desk lamp
      const lampBase = new THREE.Mesh(cylGeom, goldTrimMat);
      lampBase.position.set(bx + 0, floorY + 1.45, bz + 11.4);
      lampBase.scale.set(0.15, 0.08, 0.15);
      group.add(lampBase);
      const lampPole = new THREE.Mesh(cylGeom, goldTrimMat);
      lampPole.position.set(bx + 0, floorY + 1.9, bz + 11.4);
      lampPole.scale.set(0.04, 0.8, 0.04);
      group.add(lampPole);
      const lampShade = new THREE.Mesh(cylGeom, new THREE.MeshBasicMaterial({ color: 0xffeebb }));
      lampShade.position.set(bx + 0, floorY + 2.35, bz + 11.4);
      lampShade.scale.set(0.2, 0.15, 0.2);
      group.add(lampShade);
      
      // Logo Sign behind reception
      const logoSign = new THREE.Mesh(boxGeom, goldTrimMat);
      logoSign.position.set(bx, floorY + 3.0, bz + 12.8);
      logoSign.scale.set(5.0, 1.5, 0.1);
      group.add(logoSign);

      // "ELEVATOR" direction sign
      const elevSign = new THREE.Mesh(boxGeom, new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.3 }));
      elevSign.position.set(elevator.shaftX, floorY + 3.5, elevator.shaftZ + elevator.shaftRadius + 0.5);
      elevSign.scale.set(2.5, 0.6, 0.08);
      group.add(elevSign);
      const elevText = new THREE.Mesh(boxGeom, neonBlueMat);
      elevText.position.set(elevator.shaftX, floorY + 3.5, elevator.shaftZ + elevator.shaftRadius + 0.56);
      elevText.scale.set(2.0, 0.35, 0.02);
      group.add(elevText);

      // East & West Waiting Lounges with Interactive TVs & Cupboards
      createSofa(bx - 12, floorY, bz, Math.PI / 2, group, colliders, null, new THREE.Color(0x223355));
      createTVUnit(bx - 15, floorY, bz, Math.PI / 2, group, colliders, null, interactionManager);
      createCupboardWithDrawers(bx - 12, floorY, bz - 6, 0, group, colliders, null, interactionManager);

      createSofa(bx + 12, floorY, bz, -Math.PI / 2, group, colliders, null, new THREE.Color(0x553322));
      createTVUnit(bx + 15, floorY, bz, -Math.PI / 2, group, colliders, null, interactionManager);
      createCupboardWithDrawers(bx + 12, floorY, bz - 6, 0, group, colliders, null, interactionManager);

      // Decorative Palms
      createPottedPlant(bx - 8, floorY, bz + 9, group);
      createPottedPlant(bx + 8, floorY, bz + 9, group);
      createPottedPlant(bx - 8, floorY, bz - 9, group);
      createPottedPlant(bx + 8, floorY, bz - 9, group);
      // More palms near entrances
      createPottedPlant(bx - 14, floorY, bz + 14, group);
      createPottedPlant(bx + 14, floorY, bz + 14, group);

      // Floor inlay pattern (marble cross pattern)
      const inlayMat = new THREE.MeshStandardMaterial({ color: 0xc8b890, roughness: 0.2, metalness: 0.1 });
      for (let ix = -2; ix <= 2; ix++) {
        const inlay = new THREE.Mesh(boxGeom, inlayMat);
        inlay.position.set(bx + ix * 4, floorY + 0.01, bz);
        inlay.scale.set(0.3, 0.02, 16);
        group.add(inlay);
      }
      for (let iz = -2; iz <= 2; iz++) {
        const inlay = new THREE.Mesh(boxGeom, inlayMat);
        inlay.position.set(bx, floorY + 0.01, bz + iz * 4);
        inlay.scale.set(16, 0.02, 0.3);
        group.add(inlay);
      }

      // Ceiling lights on ground floor
      createCeilingLight(bx - 7, y + floorHeight - 0.1, bz + 7, group);
      createCeilingLight(bx + 7, y + floorHeight - 0.1, bz + 7, group);
      createCeilingLight(bx - 7, y + floorHeight - 0.1, bz - 7, group);
      createCeilingLight(bx + 7, y + floorHeight - 0.1, bz - 7, group);
      createCeilingLight(bx, y + floorHeight - 0.1, bz, group);

    } else if (f === floors - 1) {
      // -----------------------------------------------------------------------
      // FLOOR 14: 360° SKYLINE OBSERVATION LOUNGE & VIP PENTHOUSE
      // -----------------------------------------------------------------------
      createSofa(bx - 11, floorY, bz + 5, Math.PI / 4, group, colliders, null, new THREE.Color(0x882233));
      createTVUnit(bx - 14, floorY, bz + 8, Math.PI / 4, group, colliders, null, interactionManager);
      createCupboardWithDrawers(bx - 12, floorY, bz - 5, Math.PI / 2, group, colliders, null, interactionManager);
      
      createBedroomSuite(bx + 11, floorY, bz + 5, -Math.PI / 4, group, colliders, null, interactionManager);
      createKitchenette(bx + 9, floorY, bz - 8, Math.PI, group, colliders, null);
      createCupboardWithDrawers(bx + 12, floorY, bz - 3, -Math.PI / 2, group, colliders, null, interactionManager);

      createPottedPlant(bx - 12, floorY, bz + 11, group);
      createPottedPlant(bx + 12, floorY, bz + 11, group);

    } else if (f % 2 === 1) {
      // -----------------------------------------------------------------------
      // ODD MID FLOORS: CYBER TECH COMMAND & INNOVATION LABS
      // -----------------------------------------------------------------------
      createOfficeSuite(bx - 11, floorY, bz, Math.PI / 2, group, colliders, null);
      createTVUnit(bx - 14, floorY, bz, Math.PI / 2, group, colliders, null, interactionManager);
      createCupboardWithDrawers(bx - 10, floorY, bz - 6, 0, group, colliders, null, interactionManager);

      createOfficeSuite(bx + 11, floorY, bz, -Math.PI / 2, group, colliders, null);
      createCupboardWithDrawers(bx + 10, floorY, bz - 6, 0, group, colliders, null, interactionManager);
      createPottedPlant(bx + 12, floorY, bz + 6, group);

    } else {
      // -----------------------------------------------------------------------
      // EVEN MID FLOORS: EXECUTIVE VIP SUITES & RELAXATION LOUNGES
      // -----------------------------------------------------------------------
      createSofa(bx - 11, floorY, bz, Math.PI / 2, group, colliders, null);
      createTVUnit(bx - 14, floorY, bz, Math.PI / 2, group, colliders, null, interactionManager);
      createCupboardWithDrawers(bx - 10, floorY, bz + 6, Math.PI, group, colliders, null, interactionManager);

      createBedroomSuite(bx + 11, floorY, bz, -Math.PI / 2, group, colliders, null, interactionManager);
      createCupboardWithDrawers(bx + 10, floorY, bz + 6, Math.PI, group, colliders, null, interactionManager);
      createPottedPlant(bx - 11, floorY, bz - 7, group);
    }

    // -------------------------------------------------------------------------
    // ROOFTOP HELIPAD & SKYDECK
    // -------------------------------------------------------------------------
    if (f === floors - 1) {
      const roofY = y + floorHeight;
      const roofMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.6, segments), buildingMat);
      roofMesh.position.set(bx, roofY, bz);
      group.add(roofMesh);
      
      const padMat = new THREE.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.9 });
      const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 11.5, 0.1, 32), padMat);
      padMesh.position.set(bx, roofY + 0.35, bz);
      group.add(padMesh);
      
      // Helipad Yellow Landing Circle & H
      const hMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      const hBar1 = new THREE.Mesh(boxGeom, hMat);
      hBar1.position.set(bx - 2.4, roofY + 0.42, bz);
      hBar1.scale.set(0.7, 0.04, 6.4);
      group.add(hBar1);

      const hBar2 = new THREE.Mesh(boxGeom, hMat);
      hBar2.position.set(bx + 2.4, roofY + 0.42, bz);
      hBar2.scale.set(0.7, 0.04, 6.4);
      group.add(hBar2);

      const hCross = new THREE.Mesh(boxGeom, hMat);
      hCross.position.set(bx, roofY + 0.42, bz);
      hCross.scale.set(4.1, 0.04, 0.7);
      group.add(hCross);

      // Helipad Glowing Perimeter Beacons
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

