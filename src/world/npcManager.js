import * as THREE from 'three';
import { createAvatar } from '../avatar/createAvatar.js';
import { animateAvatar } from '../avatar/animateAvatar.js';

/**
 * Living Pedestrian & Citizen NPC System
 * Manages autonomous walking, sitting, shopping, and interactive dialogue.
 */

const NPC_NAMES = [
  'Franklin', 'Trevor', 'Michael', 'Lamar', 'Lester', 'Devin',
  'Tracey', 'Jimmy', 'Amanda', 'Wade', 'Ron', 'Floyd', 'Tanisha'
];

const DIALOGUES = [
  'Nice ride, partner! Los Santos traffic is wild today.',
  'Just grabbed an ice cold Sprunk from the 24/7!',
  'Did you see that helicopter on the Maze Bank skyscraper?',
  'Heading over to Vinewood Boulevard for some coffee.',
  'Check out the showroom supercars at Premium Deluxe Motorsport!',
  'Fuel prices at the RON station are actually pretty good today.',
  'Love the view from the Sky Lounge observation deck.',
  'Stay safe out there in the Grid!'
];

export class NPCManager {
  constructor(scene, heightAt, interactionManager = null, soundManager = null) {
    this.scene = scene;
    this.heightAt = heightAt;
    this.interactionManager = interactionManager;
    this.soundManager = soundManager;
    this.npcs = [];
    this.group = new THREE.Group();
    this.group.name = 'npcs';
    this.scene.add(this.group);

    this.activeDialogue = null;
    this.dialogueTimer = 0;
  }

  spawnCityNPCs() {
    const npcConfigs = [
      // Sidewalk Walkers
      { x: -18, z: 20, waypoints: [[-18, 20], [-18, 50], [-18, -20]], color: 0x3366cc, name: 'Franklin' },
      { x: 18, z: 30, waypoints: [[18, 30], [18, -30], [18, 50]], color: 0xcc3333, name: 'Lamar' },
      { x: 25, z: 18, waypoints: [[25, 18], [55, 18], [-25, 18]], color: 0x228833, name: 'Jimmy' },
      { x: -35, z: -18, waypoints: [[-35, -18], [-55, -18], [15, -18]], color: 0xddaa22, name: 'Trevor' },
      { x: 0, z: 120, waypoints: [[0, 120], [0, 250], [0, 80]], color: 0x8844aa, name: 'Michael' },

      // Gas Station Attendant & Customers
      { x: -48, z: 52, isStationary: true, facing: 0, color: 0xd62828, name: 'Ron (RON Attendant)' },
      { x: -42, z: 40, isStationary: true, facing: Math.PI / 2, color: 0x4488aa, name: 'Wade' },

      // Car Dealership Salesman & Shopper
      { x: 45, z: 40, isStationary: true, facing: Math.PI, color: 0x0055ff, name: 'Simeon (Dealer)' },
      { x: 38, z: 42, isStationary: true, facing: -Math.PI / 2, color: 0xffaa00, name: 'Devin' },

      // 24/7 Supermarket Clerk & Shopper
      { x: 40, z: -42, isStationary: true, facing: 0, color: 0x00aa44, name: 'Apu (24/7 Clerk)' },
      { x: 50, z: -50, isStationary: true, facing: Math.PI / 2, color: 0xcc5588, name: 'Tracey' },

      // Skyscraper Reception Guests
      { x: -12, z: 0, isSitting: true, facing: Math.PI / 2, color: 0x334466, name: 'Amanda' },
      { x: 12, z: 0, isSitting: true, facing: -Math.PI / 2, color: 0x664433, name: 'Lester' }
    ];

    for (const cfg of npcConfigs) {
      this._createNPC(cfg);
    }
  }

  _createNPC(cfg) {
    const avatar = createAvatar({ color: cfg.color, name: cfg.name });
    this.group.add(avatar.root);

    const posY = this.heightAt(cfg.x, cfg.z);
    avatar.root.position.set(cfg.x, posY, cfg.z);

    const npc = {
      avatar,
      position: new THREE.Vector3(cfg.x, posY, cfg.z),
      name: cfg.name,
      color: cfg.color,
      isStationary: !!cfg.isStationary,
      isSitting: !!cfg.isSitting,
      facing: cfg.facing || 0,
      waypoints: cfg.waypoints || [],
      currentWpIndex: 0,
      speed: cfg.isStationary || cfg.isSitting ? 0 : 1.8,
      animState: {
        speed: cfg.isStationary || cfg.isSitting ? 0 : 1.8,
        isRunning: false,
        isJumping: false,
        isProne: false,
        baseHipY: avatar.parts.hips.position.y
      }
    };

    if (cfg.isSitting) {
      avatar.root.position.y -= 0.3;
      avatar.root.rotation.y = cfg.facing;
    }

    // Register interactive dialogue
    if (this.interactionManager) {
      this.interactionManager.register({
        type: 'npc',
        position: npc.position,
        radius: 2.8,
        getPrompt: () => `HOLD E: TALK TO ${cfg.name.split(' ')[0].toUpperCase()}`,
        onInteract: () => {
          this.triggerDialogue(npc);
        }
      });
    }

    this.npcs.push(npc);
  }

  triggerDialogue(npc) {
    const text = DIALOGUES[Math.floor(Math.random() * DIALOGUES.length)];
    this.activeDialogue = {
      npcName: npc.name,
      text,
      x: npc.position.x,
      y: npc.position.y + 2.2,
      z: npc.position.z
    };
    this.dialogueTimer = 4.5; // Displays for 4.5 seconds

    if (this.soundManager) {
      this.soundManager.playDialogueBlip();
    }
  }

  update(dt, camera) {
    // 1. Update dialogue popup timer
    if (this.activeDialogue) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) {
        this.activeDialogue = null;
      }
    }

    // 2. Update each NPC's movement and animation
    for (const npc of this.npcs) {
      if (!npc.isStationary && !npc.isSitting && npc.waypoints.length > 0) {
        const targetWp = npc.waypoints[npc.currentWpIndex];
        const tx = targetWp[0];
        const tz = targetWp[1];

        const dx = tx - npc.position.x;
        const dz = tz - npc.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 1.0) {
          // Switch to next waypoint
          npc.currentWpIndex = (npc.currentWpIndex + 1) % npc.waypoints.length;
        } else {
          // Move towards waypoint
          const moveStep = Math.min(dist, npc.speed * dt);
          npc.position.x += (dx / dist) * moveStep;
          npc.position.z += (dz / dist) * moveStep;
          npc.position.y = this.heightAt(npc.position.x, npc.position.z);

          npc.facing = Math.atan2(dx, dz);
          npc.avatar.root.position.copy(npc.position);
          npc.avatar.root.rotation.y = npc.facing;

          npc.animState.speed = npc.speed;
        }
      }

      // Animate limbs
      animateAvatar(npc.avatar.parts, npc.animState, dt);
    }
  }
}
