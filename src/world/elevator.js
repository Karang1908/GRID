import * as THREE from 'three';

const boxGeom = new THREE.BoxGeometry(1, 1, 1);

export const STATES = {
  IDLE: 'IDLE',
  SHOW_UI: 'SHOW_UI',
  DOORS_CLOSING: 'DOORS_CLOSING',
  MOVING: 'MOVING',
  DOORS_OPENING: 'DOORS_OPENING',
};

export class Elevator {
  constructor(bx, bz, groundY, floorHeight, totalFloors, group, colliders, walkableSurfaces, interactionManager, shaftOffsetX = -1.2, shaftOffsetZ = 0) {
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
    this.cabinY = groundY + 0.2; // Floor surface Y of cabin

    this.shaftX = bx + shaftOffsetX;
    this.shaftZ = bz + shaftOffsetZ;
    this.cabinWidth = 3.0;
    this.cabinDepth = 3.0;
    this.cabinHeight = 4.0;
    this.doorWidth = 1.8;
    this.doorSpeed = 3.2; // m/s door slide
    this.moveSpeed = 7.5; // m/s vertical movement
    this.doorOpenAmount = 1.0; // Starts open on floor 0

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

    // Dynamic walkable surface inside cabin
    this.cabinSurface = {
      type: 'flat',
      y: this.cabinY,
      minX: this.shaftX - this.cabinWidth / 2 - 0.2,
      maxX: this.shaftX + this.cabinWidth / 2 + 0.2,
      minZ: this.shaftZ - this.cabinDepth / 2 - 0.2,
      maxZ: this.shaftZ + this.cabinDepth / 2 + 0.2,
    };
    if (walkableSurfaces) walkableSurfaces.push(this.cabinSurface);

    this._registerInteractables();

    this.playerInside = false;
    this.onShowUI = null;
    this.onHideUI = null;
  }

  getFloorInfo() {
    const list = [];
    for (let f = 0; f < this.totalFloors; f++) {
      if (f === 0) {
        list.push({ num: 0, name: 'Ground Lobby & Reception' });
      } else if (f === this.totalFloors - 1) {
        list.push({ num: f, name: `Floor ${f} · Penthouse & Roof` });
      } else {
        list.push({ num: f, name: `Floor ${f} · Suites 1-4` });
      }
    }
    return list;
  }

  _buildShaftStructure() {
    const totalH = this.totalFloors * this.floorHeight;
    const hw = this.cabinWidth / 2 + 0.15;
    const hd = this.cabinDepth / 2 + 0.15;

    // 4 Corner structural pillars
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
      col.scale.set(0.15, totalH, 0.15);
      this.group.add(col);
    }

    // Glass walls on Back (-Z), Left (-X), and Right (+X)
    const backGlass = new THREE.Mesh(boxGeom, this.glassMat);
    backGlass.position.set(this.shaftX, this.groundY + totalH / 2, this.shaftZ - hd);
    backGlass.scale.set(this.cabinWidth + 0.3, totalH, 0.06);
    this.group.add(backGlass);

    const leftGlass = new THREE.Mesh(boxGeom, this.glassMat);
    leftGlass.position.set(this.shaftX - hw, this.groundY + totalH / 2, this.shaftZ);
    leftGlass.scale.set(0.06, totalH, this.cabinDepth + 0.3);
    this.group.add(leftGlass);

    const rightGlass = new THREE.Mesh(boxGeom, this.glassMat);
    rightGlass.position.set(this.shaftX + hw, this.groundY + totalH / 2, this.shaftZ);
    rightGlass.scale.set(0.06, totalH, this.cabinDepth + 0.3);
    this.group.add(rightGlass);
  }

  _buildCabin() {
    this.cabinGroup = new THREE.Group();
    this.cabinGroup.name = 'elevator_cabin';

    const cw = this.cabinWidth;
    const cd = this.cabinDepth;
    const ch = this.cabinHeight;

    // Cabin floor slab
    const floor = new THREE.Mesh(boxGeom, this.cabinFloorMat);
    floor.position.set(0, 0.1, 0);
    floor.scale.set(cw, 0.2, cd);
    this.cabinGroup.add(floor);

    // Cabin ceiling
    const ceiling = new THREE.Mesh(boxGeom, this.cabinFloorMat);
    ceiling.position.set(0, ch - 0.1, 0);
    ceiling.scale.set(cw, 0.2, cd);
    this.cabinGroup.add(ceiling);

    // Ceiling recessed spotlight
    const lightMesh = new THREE.Mesh(boxGeom, new THREE.MeshBasicMaterial({ color: 0xfff0dd }));
    lightMesh.position.set(0, ch - 0.18, 0);
    lightMesh.scale.set(1.4, 0.04, 1.4);
    this.cabinGroup.add(lightMesh);

    // Cabin Back wall (-Z)
    const backWall = new THREE.Mesh(boxGeom, this.cabinWallMat);
    backWall.position.set(0, ch / 2, -cd / 2 + 0.06);
    backWall.scale.set(cw, ch, 0.12);
    this.cabinGroup.add(backWall);

    // Mirror on back wall
    const mirror = new THREE.Mesh(boxGeom, new THREE.MeshStandardMaterial({ color: 0xaaccff, roughness: 0.05, metalness: 0.98 }));
    mirror.position.set(0, ch / 2, -cd / 2 + 0.14);
    mirror.scale.set(cw - 0.6, ch - 1.0, 0.02);
    this.cabinGroup.add(mirror);

    // Cabin Left wall (-X)
    const leftWall = new THREE.Mesh(boxGeom, this.cabinWallMat);
    leftWall.position.set(-cw / 2 + 0.06, ch / 2, 0);
    leftWall.scale.set(0.12, ch, cd);
    this.cabinGroup.add(leftWall);

    // Cabin Right wall (+X)
    const rightWall = new THREE.Mesh(boxGeom, this.cabinWallMat);
    rightWall.position.set(cw / 2 - 0.06, ch / 2, 0);
    rightWall.scale.set(0.12, ch, cd);
    this.cabinGroup.add(rightWall);

    // Front wall (+Z) - doorframe on left and right of doorway
    const doorSideW = (cw - this.doorWidth) / 2;
    const frontL = new THREE.Mesh(boxGeom, this.cabinWallMat);
    frontL.position.set(-cw / 2 + doorSideW / 2, ch / 2, cd / 2 - 0.06);
    frontL.scale.set(doorSideW, ch, 0.12);
    this.cabinGroup.add(frontL);

    const frontR = new THREE.Mesh(boxGeom, this.cabinWallMat);
    frontR.position.set(cw / 2 - doorSideW / 2, ch / 2, cd / 2 - 0.06);
    frontR.scale.set(doorSideW, ch, 0.12);
    this.cabinGroup.add(frontR);

    // Header above door
    const doorH = 2.8;
    const headerH = ch - doorH;
    const header = new THREE.Mesh(boxGeom, this.cabinWallMat);
    header.position.set(0, doorH + headerH / 2, cd / 2 - 0.06);
    header.scale.set(this.doorWidth, headerH, 0.12);
    this.cabinGroup.add(header);

    // Sliding cabin doors
    this.doorLeft = new THREE.Mesh(boxGeom, this.doorMat);
    this.doorLeft.position.set(-this.doorWidth / 4, doorH / 2, cd / 2);
    this.doorLeft.scale.set(this.doorWidth / 2 - 0.02, doorH, 0.06);
    this.cabinGroup.add(this.doorLeft);

    this.doorRight = new THREE.Mesh(boxGeom, this.doorMat);
    this.doorRight.position.set(this.doorWidth / 4, doorH / 2, cd / 2);
    this.doorRight.scale.set(this.doorWidth / 2 - 0.02, doorH, 0.06);
    this.cabinGroup.add(this.doorRight);

    // Interior Control Panel on right wall
    const panel = new THREE.Mesh(boxGeom, this.panelMat);
    panel.position.set(cw / 2 - 0.14, 1.8, 0.3);
    panel.scale.set(0.04, 1.4, 0.45);
    this.cabinGroup.add(panel);

    // Digital floor display screen
    this.floorDisplay = new THREE.Mesh(boxGeom, this.neonGreenMat);
    this.floorDisplay.position.set(cw / 2 - 0.17, 2.3, 0.3);
    this.floorDisplay.scale.set(0.02, 0.18, 0.35);
    this.cabinGroup.add(this.floorDisplay);

    this.cabinGroup.position.set(this.shaftX, this.cabinY - 0.2, this.shaftZ);
    this.group.add(this.cabinGroup);
  }

  _buildFloorEntrances() {
    const cd = this.cabinDepth;
    const doorH = 2.8;

    for (let f = 0; f < this.totalFloors; f++) {
      const fy = this.groundY + f * this.floorHeight;

      // Floor Landing Call Station on +Z side
      const callBox = new THREE.Mesh(boxGeom, this.panelMat);
      callBox.position.set(this.shaftX + this.cabinWidth / 2 + 0.3, fy + 1.6, this.shaftZ + cd / 2 + 0.1);
      callBox.scale.set(0.25, 0.5, 0.1);
      this.group.add(callBox);

      const callButton = new THREE.Mesh(boxGeom, this.neonCyanMat);
      callButton.position.set(this.shaftX + this.cabinWidth / 2 + 0.3, fy + 1.6, this.shaftZ + cd / 2 + 0.16);
      callButton.scale.set(0.12, 0.12, 0.04);
      this.group.add(callButton);

      // Floor indicator header plaque
      const headerPlaque = new THREE.Mesh(boxGeom, this.goldMat);
      headerPlaque.position.set(this.shaftX, fy + doorH + 0.3, this.shaftZ + cd / 2 + 0.05);
      headerPlaque.scale.set(this.doorWidth + 0.4, 0.35, 0.08);
      this.group.add(headerPlaque);
    }
  }

  _registerInteractables() {
    if (!this.interactionManager) return;
    const cd = this.cabinDepth;

    // 1. Outside Floor Call Buttons for all floors
    for (let f = 0; f < this.totalFloors; f++) {
      const fy = this.groundY + f * this.floorHeight;
      const floorNum = f;

      this.interactionManager.register({
        type: 'elevator_call',
        position: new THREE.Vector3(this.shaftX + this.cabinWidth / 2 + 0.3, fy + 1.6, this.shaftZ + cd / 2 + 0.3),
        radius: 2.5,
        getPrompt: () => {
          if (this.state === STATES.MOVING) return 'ELEVATOR IS MOVING...';
          if (this.currentFloor === floorNum && this.doorOpenAmount > 0.8) return `FLOOR ${floorNum} (OPEN)`;
          return `HOLD E: CALL ELEVATOR TO FLOOR ${floorNum}`;
        },
        onInteract: () => {
          this.callToFloor(floorNum);
        }
      });
    }

    // 2. Cabin Control Panel
    this.panelInteractable = this.interactionManager.register({
      type: 'elevator_panel',
      position: new THREE.Vector3(
        this.shaftX + this.cabinWidth / 2 - 0.2,
        this.cabinY + 1.8,
        this.shaftZ + 0.3
      ),
      radius: 2.2,
      getPrompt: () => {
        if (this.state === STATES.MOVING) return 'ELEVATOR IN MOTION';
        return `HOLD E: CHOOSE FLOOR (CURRENT: ${this.currentFloor})`;
      },
      onInteract: () => {
        if (this.state === STATES.IDLE || this.doorOpenAmount > 0.5) {
          this.state = STATES.SHOW_UI;
          if (this.onShowUI) {
            this.onShowUI(this.currentFloor, this);
          }
        }
      }
    });
  }

  callToFloor(floor) {
    if (this.state === STATES.MOVING) return;
    if (this.currentFloor === floor && this.doorOpenAmount > 0.8) return;

    this.targetFloor = floor;
    if (this.currentFloor === floor) {
      this.state = STATES.DOORS_OPENING;
    } else {
      this.state = STATES.DOORS_CLOSING;
    }
  }

  goToFloor(floor) {
    if (floor < 0 || floor >= this.totalFloors) return;
    this.targetFloor = floor;
    if (this.onHideUI) this.onHideUI();

    if (this.currentFloor === floor) {
      this.state = STATES.DOORS_OPENING;
    } else {
      this.state = STATES.DOORS_CLOSING;
    }
  }

  update(dt, player) {
    switch (this.state) {
      case STATES.IDLE:
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

        // Keep player safely grounded inside cabin while moving
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

    // Update dynamic walkable surface
    this.cabinSurface.y = this.cabinY;

    // Update control panel position
    if (this.panelInteractable) {
      this.panelInteractable.position.set(
        this.shaftX + this.cabinWidth / 2 - 0.2,
        this.cabinY + 1.8,
        this.shaftZ + 0.3
      );
    }

    // Animate sliding doors
    const slideMax = this.doorWidth / 2 + 0.25;
    const slideOffset = this.doorOpenAmount * slideMax;
    this.doorLeft.position.x = -this.doorWidth / 4 - slideOffset;
    this.doorRight.position.x = this.doorWidth / 4 + slideOffset;

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
