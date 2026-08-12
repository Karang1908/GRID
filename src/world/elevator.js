import * as THREE from 'three';

const boxGeom = new THREE.BoxGeometry(1, 1, 1);
const cylGeom = new THREE.CylinderGeometry(1, 1, 1, 16);

/**
 * Elevator System for the Round Skyscraper.
 *
 * State machine:
 *   IDLE → SHOW_UI → DOORS_CLOSING → MOVING → DOORS_OPENING → IDLE
 *
 * The elevator cabin is a physical box that moves up/down a shaft.
 * It exposes a dynamic walkable surface that rides with the cabin,
 * and an interactable for the control panel inside.
 */

// Floor metadata for UI labels
const FLOOR_INFO = [
  { num: 0, name: 'Reception Lobby' },
  { num: 1, name: 'Tech Lab Alpha' },
  { num: 2, name: 'Tech Lab Beta' },
  { num: 3, name: 'Tech Lab Gamma' },
  { num: 4, name: 'Executive Suite A' },
  { num: 5, name: 'Executive Suite B' },
  { num: 6, name: 'Boardroom Level' },
  { num: 7, name: 'Sky Lounge East' },
  { num: 8, name: 'VIP Suite I' },
  { num: 9, name: 'VIP Suite II' },
  { num: 10, name: 'VIP Suite III' },
  { num: 11, name: 'VIP Penthouse' },
  { num: 12, name: 'Presidential Suite' },
  { num: 13, name: 'Royal Suite' },
  { num: 14, name: '360° Sky Lounge' },
];

export { FLOOR_INFO };

const STATES = {
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

    this.currentFloor = 0;
    this.targetFloor = 0;
    this.state = STATES.IDLE;
    this.stateTimer = 0;
    this.cabinY = groundY + 0.2; // Floor surface Y of the cabin

    // Elevator shaft position: offset from building center toward south entrance
    this.shaftX = bx + 5;
    this.shaftZ = bz + 8;
    this.shaftRadius = 2.8;
    this.cabinWidth = 3.6;
    this.cabinDepth = 3.6;
    this.cabinHeight = 4.2;
    this.doorWidth = 2.0;
    this.doorSpeed = 2.5; // meters per second for door slide
    this.moveSpeed = 8.0; // meters per second vertical travel
    this.doorOpenAmount = 0; // 0 = closed, 1 = fully open

    // Materials
    this.shaftMat = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.2, metalness: 0.9 });
    this.cabinFloorMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5 });
    this.cabinWallMat = new THREE.MeshStandardMaterial({ color: 0x28292e, roughness: 0.4, metalness: 0.6 });
    this.doorMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.15, metalness: 0.95 });
    this.panelMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.3, metalness: 0.8 });
    this.neonMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
    this.goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.15 });

    // Build geometry
    this._buildShaft();
    this._buildCabin();
    this._buildDoors();
    this._buildFloorIndicators();

    // Dynamic walkable surface for inside the cabin
    this.cabinSurface = {
      type: 'flat',
      y: this.cabinY,
      minX: this.shaftX - this.cabinWidth / 2,
      maxX: this.shaftX + this.cabinWidth / 2,
      minZ: this.shaftZ - this.cabinDepth / 2,
      maxZ: this.shaftZ + this.cabinDepth / 2,
    };
    if (walkableSurfaces) walkableSurfaces.push(this.cabinSurface);

    // Register interactables
    this._registerInteractables(interactionManager);

    // Player reference
    this.playerInside = false;

    // UI callbacks
    this.onShowUI = null;
    this.onHideUI = null;
  }

  _buildShaft() {
    const shaftHeight = this.totalFloors * this.floorHeight;
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(this.shaftRadius, this.shaftRadius, shaftHeight, 20),
      this.shaftMat
    );
    shaft.position.set(this.shaftX, this.groundY + shaftHeight / 2, this.shaftZ);
    this.group.add(shaft);

    if (this.colliders) {
      this.colliders.push({
        type: 'circle',
        x: this.shaftX,
        z: this.shaftZ,
        r: this.shaftRadius + 0.1,
      });
    }
  }

  _buildCabin() {
    this.cabinGroup = new THREE.Group();
    this.cabinGroup.position.set(this.shaftX, this.groundY, this.shaftZ);
    this.group.add(this.cabinGroup);

    const hw = this.cabinWidth / 2;
    const hd = this.cabinDepth / 2;
    const ch = this.cabinHeight;

    // Floor
    const floor = new THREE.Mesh(boxGeom, this.cabinFloorMat);
    floor.position.set(0, 0.1, 0);
    floor.scale.set(this.cabinWidth, 0.2, this.cabinDepth);
    this.cabinGroup.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(boxGeom, this.cabinWallMat);
    ceiling.position.set(0, ch, 0);
    ceiling.scale.set(this.cabinWidth, 0.15, this.cabinDepth);
    this.cabinGroup.add(ceiling);

    // Ceiling light
    const ceilingLight = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.05, 1.5),
      new THREE.MeshBasicMaterial({ color: 0xffeedd })
    );
    ceilingLight.position.set(0, ch - 0.1, 0);
    this.cabinGroup.add(ceilingLight);

    // Back wall (-Z side)
    const backWall = new THREE.Mesh(boxGeom, this.cabinWallMat);
    backWall.position.set(0, ch / 2, -hd);
    backWall.scale.set(this.cabinWidth, ch, 0.15);
    this.cabinGroup.add(backWall);

    // Left wall (-X)
    const leftWall = new THREE.Mesh(boxGeom, this.cabinWallMat);
    leftWall.position.set(-hw, ch / 2, 0);
    leftWall.scale.set(0.15, ch, this.cabinDepth);
    this.cabinGroup.add(leftWall);

    // Right wall (+X)
    const rightWall = new THREE.Mesh(boxGeom, this.cabinWallMat);
    rightWall.position.set(hw, ch / 2, 0);
    rightWall.scale.set(0.15, ch, this.cabinDepth);
    this.cabinGroup.add(rightWall);

    // Control panel on right wall
    const panel = new THREE.Mesh(boxGeom, this.panelMat);
    panel.position.set(hw - 0.15, ch * 0.45, 0.4);
    panel.scale.set(0.08, 0.6, 0.4);
    this.cabinGroup.add(panel);

    // Panel button dots
    for (let i = 0; i < 5; i++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 6, 6),
        this.neonMat
      );
      dot.position.set(hw - 0.1, ch * 0.35 + i * 0.12, 0.4);
      this.cabinGroup.add(dot);
    }

    // Gold trim strip at bottom
    const trim = new THREE.Mesh(boxGeom, this.goldMat);
    trim.position.set(0, 0.25, 0);
    trim.scale.set(this.cabinWidth + 0.1, 0.08, this.cabinDepth + 0.1);
    this.cabinGroup.add(trim);

    // Mirror on back wall
    const mirror = new THREE.Mesh(boxGeom,
      new THREE.MeshStandardMaterial({ color: 0xaabbcc, metalness: 0.98, roughness: 0.02 })
    );
    mirror.position.set(0, ch * 0.55, -hd + 0.1);
    mirror.scale.set(this.cabinWidth * 0.6, ch * 0.45, 0.04);
    this.cabinGroup.add(mirror);
  }

  _buildDoors() {
    const hd = this.cabinDepth / 2;
    const dh = this.cabinHeight * 0.9;

    this.doorLeft = new THREE.Mesh(boxGeom, this.doorMat);
    this.doorRight = new THREE.Mesh(boxGeom, this.doorMat);

    this.doorLeft.scale.set(this.doorWidth / 2, dh, 0.1);
    this.doorRight.scale.set(this.doorWidth / 2, dh, 0.1);

    this.doorLeft.position.set(-this.doorWidth / 4, dh / 2, hd + 0.05);
    this.doorRight.position.set(this.doorWidth / 4, dh / 2, hd + 0.05);

    this.cabinGroup.add(this.doorLeft);
    this.cabinGroup.add(this.doorRight);

    // Door frame
    const frameMat = this.goldMat;
    const topFrame = new THREE.Mesh(boxGeom, frameMat);
    topFrame.position.set(0, dh + 0.1, hd + 0.05);
    topFrame.scale.set(this.doorWidth + 0.4, 0.15, 0.15);
    this.cabinGroup.add(topFrame);

    const sideL = new THREE.Mesh(boxGeom, frameMat);
    sideL.position.set(-this.doorWidth / 2 - 0.1, dh / 2, hd + 0.05);
    sideL.scale.set(0.12, dh, 0.15);
    this.cabinGroup.add(sideL);

    const sideR = new THREE.Mesh(boxGeom, frameMat);
    sideR.position.set(this.doorWidth / 2 + 0.1, dh / 2, hd + 0.05);
    sideR.scale.set(0.12, dh, 0.15);
    this.cabinGroup.add(sideR);

    // Door frames at each floor level on the shaft exterior
    this._buildFloorDoorFrames();
  }

  _buildFloorDoorFrames() {
    const dh = this.cabinHeight * 0.9;

    for (let f = 0; f < this.totalFloors; f++) {
      const fy = this.groundY + f * this.floorHeight;
      const frameMat = this.goldMat;

      const top = new THREE.Mesh(boxGeom, frameMat);
      top.position.set(this.shaftX, fy + dh + 0.1, this.shaftZ + this.shaftRadius);
      top.scale.set(this.doorWidth + 0.5, 0.15, 0.2);
      this.group.add(top);

      const sl = new THREE.Mesh(boxGeom, frameMat);
      sl.position.set(this.shaftX - this.doorWidth / 2 - 0.15, fy + dh / 2, this.shaftZ + this.shaftRadius);
      sl.scale.set(0.12, dh, 0.2);
      this.group.add(sl);

      const sr = new THREE.Mesh(boxGeom, frameMat);
      sr.position.set(this.shaftX + this.doorWidth / 2 + 0.15, fy + dh / 2, this.shaftZ + this.shaftRadius);
      sr.scale.set(0.12, dh, 0.2);
      this.group.add(sr);

      // Floor number sign next to the door
      const sign = new THREE.Mesh(boxGeom, this.panelMat);
      sign.position.set(this.shaftX + this.doorWidth / 2 + 0.6, fy + dh * 0.6, this.shaftZ + this.shaftRadius);
      sign.scale.set(0.5, 0.5, 0.08);
      this.group.add(sign);

      const numLight = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.02),
        new THREE.MeshBasicMaterial({ color: 0x00d4ff })
      );
      numLight.position.set(this.shaftX + this.doorWidth / 2 + 0.6, fy + dh * 0.6, this.shaftZ + this.shaftRadius + 0.05);
      this.group.add(numLight);
    }
  }

  _buildFloorIndicators() {
    this.floorDisplay = new THREE.Mesh(
      boxGeom,
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    const hd = this.cabinDepth / 2;
    const dh = this.cabinHeight * 0.9;
    this.floorDisplay.position.set(0, dh + 0.35, hd + 0.02);
    this.floorDisplay.scale.set(0.8, 0.3, 0.04);
    this.cabinGroup.add(this.floorDisplay);
  }

  _registerInteractables(interactionManager) {
    if (!interactionManager) return;

    // Call button outside the elevator
    this.callButtonInteractable = interactionManager.register({
      type: 'elevator_call',
      position: new THREE.Vector3(
        this.shaftX,
        this.groundY + 1.5,
        this.shaftZ + this.shaftRadius + 1.0
      ),
      radius: 3.0,
      getPrompt: () => {
        if (this.state === STATES.IDLE && this.doorOpenAmount > 0.8) {
          return 'WALK INTO ELEVATOR';
        }
        if (this.state !== STATES.IDLE) {
          return 'ELEVATOR IN USE...';
        }
        return 'HOLD E: CALL ELEVATOR';
      },
      onInteract: () => {
        if (this.state === STATES.IDLE && this.doorOpenAmount < 0.1) {
          this.state = STATES.DOORS_OPENING;
          this.stateTimer = 0;
        }
      },
    });

    // Control panel inside the cabin
    this.panelInteractable = interactionManager.register({
      type: 'elevator_panel',
      position: new THREE.Vector3(
        this.shaftX + this.cabinWidth / 2 - 0.3,
        this.groundY + this.cabinHeight * 0.45,
        this.shaftZ + 0.4
      ),
      radius: 2.5,
      getPrompt: () => {
        if (this.state !== STATES.IDLE || this.doorOpenAmount < 0.5) {
          return '';
        }
        return 'HOLD E: SELECT FLOOR';
      },
      onInteract: () => {
        if (this.state === STATES.IDLE && this.doorOpenAmount > 0.5) {
          this.state = STATES.SHOW_UI;
          this.playerInside = true;
          if (this.onShowUI) this.onShowUI(this.currentFloor);
        }
      },
    });
  }

  goToFloor(floorNum) {
    if (floorNum < 0 || floorNum >= this.totalFloors) return;
    if (floorNum === this.currentFloor) {
      this.state = STATES.IDLE;
      if (this.onHideUI) this.onHideUI();
      return;
    }
    this.targetFloor = floorNum;
    this.state = STATES.DOORS_CLOSING;
    this.stateTimer = 0;
    if (this.onHideUI) this.onHideUI();
  }

  update(dt, player) {
    switch (this.state) {
      case STATES.IDLE:
        if (this.doorOpenAmount > 0) {
          this.stateTimer += dt;
          if (this.stateTimer > 5.0) {
            this.state = STATES.DOORS_CLOSING;
            this.stateTimer = 0;
          }
        }
        break;

      case STATES.SHOW_UI:
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

        // Move player with cabin
        if (this.playerInside && player) {
          player.position.y = this.cabinY;
          player.velocityY = 0;
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

    // Update cabin position
    this.cabinGroup.position.set(this.shaftX, this.cabinY - 0.2, this.shaftZ);

    // Update dynamic walkable surface
    this.cabinSurface.y = this.cabinY;

    // Update panel interactable position to track cabin
    if (this.panelInteractable) {
      this.panelInteractable.position.y = this.cabinY + this.cabinHeight * 0.45;
    }

    // Update call button position to track current floor
    if (this.callButtonInteractable) {
      this.callButtonInteractable.position.y = this.cabinY + 1.3;
    }

    // Door slide animation
    const slideMax = this.doorWidth / 2 + 0.3;
    const slideOffset = this.doorOpenAmount * slideMax;
    this.doorLeft.position.x = -this.doorWidth / 4 - slideOffset;
    this.doorRight.position.x = this.doorWidth / 4 + slideOffset;

    // Floor display color
    if (this.state === STATES.MOVING) {
      this.floorDisplay.material.color.setHex(0xff6600);
    } else {
      this.floorDisplay.material.color.setHex(0x00ff88);
    }
  }

  isPlayerInsideCabin(playerPos) {
    const hw = this.cabinWidth / 2 + 0.5;
    const hd = this.cabinDepth / 2 + 0.5;
    return (
      Math.abs(playerPos.x - this.shaftX) < hw &&
      Math.abs(playerPos.z - this.shaftZ) < hd &&
      Math.abs(playerPos.y - this.cabinY) < 2.0
    );
  }
}
