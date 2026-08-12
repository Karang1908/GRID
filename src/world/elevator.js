import * as THREE from 'three';

const boxGeom = new THREE.BoxGeometry(1, 1, 1);
const cylGeom = new THREE.CylinderGeometry(1, 1, 1, 16);

/**
 * Elevator System for the Round Skyscraper.
 *
 * State machine:
 *   IDLE → SHOW_UI → DOORS_CLOSING → MOVING → DOORS_OPENING → IDLE
 */

export const FLOOR_INFO = [
  { num: 0, name: 'Grand Reception' },
  { num: 1, name: 'Tech Lab Alpha' },
  { num: 2, name: 'Tech Lab Beta' },
  { num: 3, name: 'Cyber Command' },
  { num: 4, name: 'Executive Suite A' },
  { num: 5, name: 'Executive Suite B' },
  { num: 6, name: 'Executive Boardroom' },
  { num: 7, name: 'Sky Lounge East' },
  { num: 8, name: 'VIP Suite I' },
  { num: 9, name: 'VIP Suite II' },
  { num: 10, name: 'VIP Suite III' },
  { num: 11, name: 'VIP Penthouse' },
  { num: 12, name: 'Presidential Suite' },
  { num: 13, name: 'Royal Penthouse' },
  { num: 14, name: '360° Sky Observation' },
];

export const STATES = {
  IDLE: 'IDLE',
  SHOW_UI: 'SHOW_UI',
  DOORS_CLOSING: 'DOORS_CLOSING',
  MOVING: 'MOVING',
  DOORS_OPENING: 'DOORS_OPENING',
};

export class Elevator {
  constructor(bx, bz, groundY, floorHeight, totalFloors, group, colliders, walkableSurfaces, interactionManager) {
    this.bx = bx;
    this.bz = bz;
    this.groundY = groundY;
    this.floorHeight = floorHeight;
    this.totalFloors = totalFloors;
    this.group = group;
    this.colliders = colliders;
    this.walkableSurfaces = walkableSurfaces;
    this.interactionManager = interactionManager;

    this.currentFloor = 0;
    this.targetFloor = 0;
    this.state = STATES.IDLE;
    this.stateTimer = 0;
    this.cabinY = groundY + 0.2; // Floor surface Y of the cabin

    // Position of elevator shaft inside round building
    this.shaftX = bx + 5.0;
    this.shaftZ = bz + 6.5;
    this.cabinWidth = 3.6;
    this.cabinDepth = 3.6;
    this.cabinHeight = 4.2;
    this.doorWidth = 2.2;
    this.doorSpeed = 3.0; // m/s door slide
    this.moveSpeed = 7.5; // m/s vertical movement
    this.doorOpenAmount = 1.0; // Starts OPEN on ground floor!

    // Materials
    this.shaftFrameMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.2, metalness: 0.9 });
    this.glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.25 });
    this.cabinFloorMat = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.4 });
    this.cabinWallMat = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.3, metalness: 0.7 });
    this.doorMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.15, metalness: 0.95 });
    this.panelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.3, metalness: 0.8 });
    this.neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
    this.neonOrangeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    this.neonGreenMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    this.goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.15 });

    // Build geometry
    this._buildShaftStructure();
    this._buildCabin();
    this._buildFloorEntrances();

    // Dynamic walkable surface inside the cabin
    this.cabinSurface = {
      type: 'flat',
      y: this.cabinY,
      minX: this.shaftX - this.cabinWidth / 2 - 0.2,
      maxX: this.shaftX + this.cabinWidth / 2 + 0.2,
      minZ: this.shaftZ - this.cabinDepth / 2 - 0.2,
      maxZ: this.shaftZ + this.cabinDepth / 2 + 0.2,
    };
    if (walkableSurfaces) walkableSurfaces.push(this.cabinSurface);

    // Register all call buttons (Floors 0 to 14) and cabin panel
    this._registerInteractables();

    this.playerInside = false;
    this.onShowUI = null;
    this.onHideUI = null;
  }

  _buildShaftStructure() {
    const totalH = this.totalFloors * this.floorHeight;
    const hw = this.cabinWidth / 2 + 0.2;
    const hd = this.cabinDepth / 2 + 0.2;

    // 4 Vertical structural corner columns
    const colMat = this.goldMat;
    const colCorners = [
      [-hw, -hd],
      [hw, -hd],
      [-hw, hd],
      [hw, hd]
    ];

    for (const [cx, cz] of colCorners) {
      const col = new THREE.Mesh(boxGeom, colMat);
      col.position.set(this.shaftX + cx, this.groundY + totalH / 2, this.shaftZ + cz);
      col.scale.set(0.18, totalH, 0.18);
      this.group.add(col);
    }

    // Glass walls on Back (-Z), Left (-X), and Right (+X) spanning full height
    const backGlass = new THREE.Mesh(boxGeom, this.glassMat);
    backGlass.position.set(this.shaftX, this.groundY + totalH / 2, this.shaftZ - hd);
    backGlass.scale.set(this.cabinWidth + 0.4, totalH, 0.08);
    this.group.add(backGlass);

    const leftGlass = new THREE.Mesh(boxGeom, this.glassMat);
    leftGlass.position.set(this.shaftX - hw, this.groundY + totalH / 2, this.shaftZ);
    leftGlass.scale.set(0.08, totalH, this.cabinDepth + 0.4);
    this.group.add(leftGlass);

    const rightGlass = new THREE.Mesh(boxGeom, this.glassMat);
    rightGlass.position.set(this.shaftX + hw, this.groundY + totalH / 2, this.shaftZ);
    rightGlass.scale.set(0.08, totalH, this.cabinDepth + 0.4);
    this.group.add(rightGlass);

    // Colliders on Back, Left, Right to keep player inside shaft during ride
    if (this.colliders) {
      // Back wall collider
      this.colliders.push({
        type: 'box',
        minX: this.shaftX - hw, maxX: this.shaftX + hw,
        minZ: this.shaftZ - hd - 0.2, maxZ: this.shaftZ - hd + 0.2,
        minY: this.groundY, maxY: this.groundY + totalH
      });
      // Left wall collider
      this.colliders.push({
        type: 'box',
        minX: this.shaftX - hw - 0.2, maxX: this.shaftX - hw + 0.2,
        minZ: this.shaftZ - hd, maxZ: this.shaftZ + hd,
        minY: this.groundY, maxY: this.groundY + totalH
      });
      // Right wall collider
      this.colliders.push({
        type: 'box',
        minX: this.shaftX + hw - 0.2, maxX: this.shaftX + hw + 0.2,
        minZ: this.shaftZ - hd, maxZ: this.shaftZ + hd,
        minY: this.groundY, maxY: this.groundY + totalH
      });
    }
  }

  _buildCabin() {
    this.cabinGroup = new THREE.Group();
    this.cabinGroup.position.set(this.shaftX, this.cabinY - 0.2, this.shaftZ);
    this.group.add(this.cabinGroup);

    const hw = this.cabinWidth / 2;
    const hd = this.cabinDepth / 2;
    const ch = this.cabinHeight;

    // Cabin Floor Slab
    const floor = new THREE.Mesh(boxGeom, this.cabinFloorMat);
    floor.position.set(0, 0.1, 0);
    floor.scale.set(this.cabinWidth, 0.2, this.cabinDepth);
    this.cabinGroup.add(floor);

    // Floor edge gold trim
    const floorTrim = new THREE.Mesh(boxGeom, this.goldMat);
    floorTrim.position.set(0, 0.18, 0);
    floorTrim.scale.set(this.cabinWidth + 0.05, 0.05, this.cabinDepth + 0.05);
    this.cabinGroup.add(floorTrim);

    // Cabin Ceiling
    const ceiling = new THREE.Mesh(boxGeom, this.cabinWallMat);
    ceiling.position.set(0, ch, 0);
    ceiling.scale.set(this.cabinWidth, 0.2, this.cabinDepth);
    this.cabinGroup.add(ceiling);

    // Illuminated Ceiling Light Panel
    const ceilingLight = new THREE.Mesh(boxGeom, new THREE.MeshBasicMaterial({ color: 0xffeedd }));
    ceilingLight.position.set(0, ch - 0.08, 0);
    ceilingLight.scale.set(2.4, 0.04, 2.4);
    this.cabinGroup.add(ceilingLight);

    // Back Wall (-Z)
    const backWall = new THREE.Mesh(boxGeom, this.cabinWallMat);
    backWall.position.set(0, ch / 2, -hd + 0.06);
    backWall.scale.set(this.cabinWidth, ch, 0.12);
    this.cabinGroup.add(backWall);

    // Full-height mirror on back wall
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xc0d0e0, metalness: 0.98, roughness: 0.02 });
    const mirror = new THREE.Mesh(boxGeom, mirrorMat);
    mirror.position.set(0, ch * 0.52, -hd + 0.13);
    mirror.scale.set(this.cabinWidth * 0.75, ch * 0.7, 0.02);
    this.cabinGroup.add(mirror);

    // Left Wall (-X)
    const leftWall = new THREE.Mesh(boxGeom, this.cabinWallMat);
    leftWall.position.set(-hw + 0.06, ch / 2, 0);
    leftWall.scale.set(0.12, ch, this.cabinDepth);
    this.cabinGroup.add(leftWall);

    // Right Wall (+X)
    const rightWall = new THREE.Mesh(boxGeom, this.cabinWallMat);
    rightWall.position.set(hw - 0.06, ch / 2, 0);
    rightWall.scale.set(0.12, ch, this.cabinDepth);
    this.cabinGroup.add(rightWall);

    // Control Panel on Right Wall (+X)
    const panel = new THREE.Mesh(boxGeom, this.panelMat);
    panel.position.set(hw - 0.14, ch * 0.45, 0.3);
    panel.scale.set(0.08, 0.9, 0.5);
    this.cabinGroup.add(panel);

    const panelScreen = new THREE.Mesh(boxGeom, this.neonCyanMat);
    panelScreen.position.set(hw - 0.19, ch * 0.45, 0.3);
    panelScreen.scale.set(0.02, 0.7, 0.35);
    this.cabinGroup.add(panelScreen);

    // Inside Floor Indicator Screen (above doors at +Z)
    const dh = ch * 0.88;
    this.floorDisplay = new THREE.Mesh(boxGeom, this.neonGreenMat);
    this.floorDisplay.position.set(0, dh + 0.28, hd - 0.08);
    this.floorDisplay.scale.set(1.4, 0.35, 0.04);
    this.cabinGroup.add(this.floorDisplay);

    // Front Sliding Doors (+Z)
    this.doorLeft = new THREE.Mesh(boxGeom, this.doorMat);
    this.doorRight = new THREE.Mesh(boxGeom, this.doorMat);

    this.doorLeft.scale.set(this.doorWidth / 2, dh, 0.1);
    this.doorRight.scale.set(this.doorWidth / 2, dh, 0.1);

    this.doorLeft.position.set(-this.doorWidth / 4, dh / 2, hd - 0.02);
    this.doorRight.position.set(this.doorWidth / 4, dh / 2, hd - 0.02);

    this.cabinGroup.add(this.doorLeft);
    this.cabinGroup.add(this.doorRight);

    // Cabin Door Frame Top & Sides
    const topFrame = new THREE.Mesh(boxGeom, this.goldMat);
    topFrame.position.set(0, dh + 0.08, hd - 0.02);
    topFrame.scale.set(this.doorWidth + 0.3, 0.14, 0.14);
    this.cabinGroup.add(topFrame);
  }

  _buildFloorEntrances() {
    const dh = this.cabinHeight * 0.88;
    const hd = this.cabinDepth / 2 + 0.2;

    for (let f = 0; f < this.totalFloors; f++) {
      const fy = this.groundY + f * this.floorHeight;

      // Outer gold door portal on floor exterior
      const top = new THREE.Mesh(boxGeom, this.goldMat);
      top.position.set(this.shaftX, fy + dh + 0.1, this.shaftZ + hd);
      top.scale.set(this.doorWidth + 0.6, 0.18, 0.25);
      this.group.add(top);

      const sl = new THREE.Mesh(boxGeom, this.goldMat);
      sl.position.set(this.shaftX - this.doorWidth / 2 - 0.18, fy + dh / 2, this.shaftZ + hd);
      sl.scale.set(0.18, dh, 0.25);
      this.group.add(sl);

      const sr = new THREE.Mesh(boxGeom, this.goldMat);
      sr.position.set(this.shaftX + this.doorWidth / 2 + 0.18, fy + dh / 2, this.shaftZ + hd);
      sr.scale.set(0.18, dh, 0.25);
      this.group.add(sr);

      // Floor Call Station & Digital Display Screen beside door
      const station = new THREE.Mesh(boxGeom, this.panelMat);
      station.position.set(this.shaftX + this.doorWidth / 2 + 0.65, fy + 1.4, this.shaftZ + hd);
      station.scale.set(0.5, 0.7, 0.1);
      this.group.add(station);

      const callButtonMesh = new THREE.Mesh(cylGeom, this.neonCyanMat);
      callButtonMesh.position.set(this.shaftX + this.doorWidth / 2 + 0.65, fy + 1.35, this.shaftZ + hd + 0.06);
      callButtonMesh.scale.set(0.1, 0.04, 0.1);
      callButtonMesh.rotation.x = Math.PI / 2;
      this.group.add(callButtonMesh);

      // Floor number header sign
      const floorTag = new THREE.Mesh(boxGeom, this.neonCyanMat);
      floorTag.position.set(this.shaftX, fy + dh + 0.45, this.shaftZ + hd + 0.05);
      floorTag.scale.set(1.6, 0.35, 0.05);
      this.group.add(floorTag);
    }
  }

  _registerInteractables() {
    if (!this.interactionManager) return;

    // Register a Call Button on EVERY Floor (0 to 14)
    this.floorCallButtons = [];
    for (let f = 0; f < this.totalFloors; f++) {
      const fy = this.groundY + f * this.floorHeight;
      const hd = this.cabinDepth / 2 + 0.2;
      const floorIndex = f;

      const callItem = this.interactionManager.register({
        type: 'elevator_call',
        position: new THREE.Vector3(
          this.shaftX + this.doorWidth / 2 + 0.65,
          fy + 1.4,
          this.shaftZ + hd
        ),
        radius: 3.2,
        getPrompt: () => {
          if (this.currentFloor === floorIndex) {
            if (this.state === STATES.IDLE && this.doorOpenAmount > 0.8) {
              return 'WALK INTO ELEVATOR';
            }
            if (this.state === STATES.MOVING || this.state === STATES.DOORS_CLOSING) {
              return `ELEVATOR IN MOTION...`;
            }
            return 'HOLD E: OPEN ELEVATOR';
          } else {
            if (this.state === STATES.MOVING) {
              return `ELEVATOR MOVING (TO FL ${this.targetFloor})...`;
            }
            return `HOLD E: CALL ELEVATOR (TO FL ${floorIndex})`;
          }
        },
        onInteract: (player) => {
          if (this.currentFloor === floorIndex) {
            this.openDoors();
          } else {
            this.goToFloor(floorIndex);
          }
        }
      });

      this.floorCallButtons.push(callItem);
    }

    // Inside Elevator Control Panel Interactable
    this.panelInteractable = this.interactionManager.register({
      type: 'elevator_panel',
      position: new THREE.Vector3(
        this.shaftX + this.cabinWidth / 2 - 0.2,
        this.cabinY + 1.8,
        this.shaftZ + 0.3
      ),
      radius: 2.8,
      getPrompt: () => {
        if (this.state === STATES.MOVING) {
          return `TRANSIT IN PROGRESS... (FL ${this.targetFloor})`;
        }
        return 'HOLD E: CHOOSE FLOOR';
      },
      onInteract: (player) => {
        this.state = STATES.SHOW_UI;
        this.playerInside = true;
        if (this.onShowUI) this.onShowUI(this.currentFloor);
      }
    });
  }

  openDoors() {
    this.state = STATES.DOORS_OPENING;
    this.stateTimer = 0;
  }

  closeDoors() {
    this.state = STATES.DOORS_CLOSING;
    this.stateTimer = 0;
  }

  goToFloor(floorNum) {
    if (floorNum < 0 || floorNum >= this.totalFloors) return;
    if (this.onHideUI) this.onHideUI();

    if (floorNum === this.currentFloor) {
      // Already at floor, just open doors
      this.openDoors();
      return;
    }

    this.targetFloor = floorNum;
    this.state = STATES.DOORS_CLOSING;
    this.stateTimer = 0;
  }

  update(dt, player) {
    switch (this.state) {
      case STATES.IDLE:
        // Keep doors open at current floor for 6 seconds, then auto-close
        if (this.doorOpenAmount > 0) {
          this.stateTimer += dt;
          if (this.stateTimer > 6.0 && !this.playerInside) {
            this.state = STATES.DOORS_CLOSING;
            this.stateTimer = 0;
          }
        }
        break;

      case STATES.SHOW_UI:
        // UI is active; wait for user selection
        break;

      case STATES.DOORS_CLOSING:
        this.doorOpenAmount -= this.doorSpeed * dt;
        if (this.doorOpenAmount <= 0) {
          this.doorOpenAmount = 0;
          this.state = STATES.MOVING;
          this.stateTimer = 0;
        }
        break;

      case STATES.MOVING: {
        const targetY = this.groundY + this.targetFloor * this.floorHeight + 0.2;
        const diff = targetY - this.cabinY;
        const dir = Math.sign(diff);
        const step = this.moveSpeed * dt;

        if (Math.abs(diff) <= step) {
          this.cabinY = targetY;
          this.currentFloor = this.targetFloor;
          this.state = STATES.DOORS_OPENING;
          this.stateTimer = 0;
        } else {
          this.cabinY += dir * step;
        }

        // Check if player is inside cabin to carry player along with elevator
        if (player) {
          const isInside = this.isPlayerInsideCabin(player.position);
          if (isInside || this.playerInside) {
            this.playerInside = true;
            player.position.y = this.cabinY;
            player.velocityY = 0;
          }
        }
        break;
      }

      case STATES.DOORS_OPENING:
        this.doorOpenAmount += this.doorSpeed * dt;
        if (this.doorOpenAmount >= 1.0) {
          this.doorOpenAmount = 1.0;
          this.state = STATES.IDLE;
          this.stateTimer = 0;
          this.playerInside = false;
        }
        break;
    }

    // Synchronize 3D cabin position
    this.cabinGroup.position.set(this.shaftX, this.cabinY - 0.2, this.shaftZ);

    // Update dynamic walkable surface to track cabin floor
    this.cabinSurface.y = this.cabinY;

    // Update control panel interactable position
    if (this.panelInteractable) {
      this.panelInteractable.position.set(
        this.shaftX + this.cabinWidth / 2 - 0.2,
        this.cabinY + 1.8,
        this.shaftZ + 0.3
      );
    }

    // Animate sliding doors
    const slideMax = this.doorWidth / 2 + 0.3;
    const slideOffset = this.doorOpenAmount * slideMax;
    this.doorLeft.position.x = -this.doorWidth / 4 - slideOffset;
    this.doorRight.position.x = this.doorWidth / 4 + slideOffset;

    // Digital floor display status indicator
    if (this.state === STATES.MOVING) {
      this.floorDisplay.material = this.neonOrangeMat;
    } else {
      this.floorDisplay.material = this.neonGreenMat;
    }
  }

  isPlayerInsideCabin(playerPos) {
    const hw = this.cabinWidth / 2 + 0.3;
    const hd = this.cabinDepth / 2 + 0.3;
    return (
      Math.abs(playerPos.x - this.shaftX) < hw &&
      Math.abs(playerPos.z - this.shaftZ) < hd &&
      Math.abs(playerPos.y - this.cabinY) < 3.0
    );
  }
}
