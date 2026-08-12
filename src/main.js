// GDGoC The Grid — AAA Los Santos Open World Game
//
// Wires: scene/camera/renderer, world + venues, NPC manager, day/night lighting engine,
// procedural sound & radio engine, GTA V HUD & radar minimap, local player, camera rig,
// vehicle physics, and multiplayer network client.

import * as THREE from 'three';
import { createWorld } from './world/createWorld.js';
import { createCity } from './world/city.js';
import { createCampsite } from './world/campsite.js';
import { Car } from './world/Car.js';
import { createAvatar } from './avatar/createAvatar.js';
import { scatterProps } from './world/props.js';
import { resolveCollisions } from './world/collisions.js';
import { PointerLockInput } from './camera/PointerLockInput.js';
import { CameraRig } from './camera/CameraRig.js';
import { InputState } from './player/InputState.js';
import { LocalPlayer } from './player/LocalPlayer.js';
import { RemotePlayer } from './player/RemotePlayer.js';
import { NetworkClient } from './net/NetworkClient.js';
import { BreakableTreeManager } from './world/breakableTrees.js';
import { InteractionManager } from './world/interactions.js';
import { FLOOR_INFO } from './world/elevator.js';
import { SoundManager } from './audio/soundManager.js';
import { EnvironmentManager } from './world/environment.js';
import { NPCManager } from './world/npcManager.js';

const SEND_INTERVAL_MS = 100; // 10 Hz outbound state

// DOM Elements
const overlay = document.getElementById('overlay');
const statusEl = document.getElementById('status');
const statusText = document.getElementById('status-text');
const appEl = document.getElementById('app');
const joinForm = document.getElementById('join-form');
const nameInput = document.getElementById('name-input');
const playBtn = document.getElementById('play-btn');
const minimapCanvas = document.getElementById('minimap');
const bigmapCanvas = document.getElementById('bigmap');
const bigmapContainer = document.getElementById('bigmap-container');
const interactPrompt = document.getElementById('interact-prompt');
const promptText = interactPrompt?.querySelector('.text');
const interactProgress = interactPrompt?.querySelector('.progress');
const speedometer = document.getElementById('speedometer');
const speedValue = document.getElementById('speed-value');
const elevatorUI = document.getElementById('elevator-ui');
const elevatorFloorsContainer = document.getElementById('elevator-floors');
const elevatorCurrentFloorEl = document.getElementById('elevator-current-floor');

// GTA V HUD Elements
const moneyValEl = document.getElementById('money-val');
const moneyDeltaEl = document.getElementById('money-delta');
const radioHud = document.getElementById('radio-hud');
const radioStationName = document.getElementById('radio-station-name');
const radioStationGenre = document.getElementById('radio-station-genre');
const dialogueBox = document.getElementById('dialogue-box');
const dialogueSpeaker = document.getElementById('dialogue-speaker');
const dialogueText = document.getElementById('dialogue-text');

// Economy State
let playerMoney = 2500;
let moneyDeltaTimer = null;

function modifyMoney(delta) {
  playerMoney = Math.max(0, playerMoney + delta);
  if (moneyValEl) {
    moneyValEl.textContent = '$' + playerMoney.toLocaleString();
  }
  if (moneyDeltaEl && delta !== 0) {
    moneyDeltaEl.textContent = (delta > 0 ? '+$' : '-$') + Math.abs(delta).toLocaleString();
    moneyDeltaEl.className = delta > 0 ? 'pos' : 'neg';
    if (moneyDeltaTimer) clearTimeout(moneyDeltaTimer);
    moneyDeltaTimer = setTimeout(() => {
      moneyDeltaEl.className = 'hidden';
    }, 2000);
  }
}

// Restore saved username
const savedName = localStorage.getItem('grid_player_name');
if (savedName && nameInput) {
  nameInput.value = savedName;
}

// --- Scene + renderer ---------------------------------------------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
appEl.appendChild(renderer.domElement);

const colliders = [];
const walkableSurfaces = [];
const treeManager = new BreakableTreeManager(scene);
const interactionManager = new InteractionManager();
const soundManager = new SoundManager();
const envManager = new EnvironmentManager(scene);

const { heightAt } = createWorld(scene);
scatterProps(scene, heightAt, colliders, treeManager);

// Spawn City with Venues
const cars = [];

function handleSpawnSupercar(player, spawnPos, color) {
  const c = new Car(`supercar_${Date.now()}`, spawnPos, color);
  cars.push(c);
  scene.add(c.group);

  interactionManager.register({
    type: 'car',
    position: c.group.position,
    radius: 3.5,
    getPrompt: () => 'HOLD E TO DRIVE SUPERCAR',
    onInteract: (p) => {
      p.vehicle = c;
      p.avatar.root.visible = false;
      interactPrompt.classList.remove('visible');
      speedometer.classList.add('visible');
      soundManager.startRadio();
    }
  });

  // Mount player directly into supercar
  player.vehicle = c;
  player.avatar.root.visible = false;
  interactPrompt.classList.remove('visible');
  speedometer.classList.add('visible');
  soundManager.startRadio();
}

const { elevator } = createCity(
  scene, heightAt, colliders, walkableSurfaces, treeManager, interactionManager, soundManager,
  (player) => {
    modifyMoney(-40);
  },
  (player, spawnPos, color) => {
    handleSpawnSupercar(player, spawnPos, color);
  },
  (item, cost) => {
    modifyMoney(-cost);
  }
);

createCampsite(scene, heightAt, colliders);

// NPC Manager
const npcManager = new NPCManager(scene, heightAt, interactionManager, soundManager);
npcManager.spawnCityNPCs();

// --- Elevator UI Setup --------------------------------------------------------
let elevatorUIVisible = false;

function buildElevatorUI(currentFloor) {
  if (!elevatorFloorsContainer) return;
  elevatorFloorsContainer.innerHTML = '';
  for (const fi of FLOOR_INFO) {
    const btn = document.createElement('button');
    btn.className = 'elevator-floor-btn' + (fi.num === currentFloor ? ' current' : '');
    btn.innerHTML = `<span class="floor-num">${fi.num}</span>${fi.name}`;
    btn.addEventListener('click', () => {
      if (elevator) {
        soundManager.playElevatorChime();
        elevator.goToFloor(fi.num);
      }
    });
    elevatorFloorsContainer.appendChild(btn);
  }
  if (elevatorCurrentFloorEl) elevatorCurrentFloorEl.textContent = currentFloor;
}

function showElevatorUI(currentFloor) {
  elevatorUIVisible = true;
  buildElevatorUI(currentFloor);
  if (elevatorUI) elevatorUI.classList.add('visible');
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
}

function hideElevatorUI() {
  elevatorUIVisible = false;
  if (elevatorUI) elevatorUI.classList.remove('visible');
  pointerLock.requestLock();
}

if (elevator) {
  elevator.onShowUI = showElevatorUI;
  elevator.onHideUI = hideElevatorUI;
}

// Spawn 4 Cars near Campsite
const carPositions = [
  new THREE.Vector3(3.5, 0, 442),
  new THREE.Vector3(-3.5, 0, 442),
  new THREE.Vector3(3.5, 0, 448),
  new THREE.Vector3(-3.5, 0, 448)
];
const carColors = [0xd42424, 0x2455d4, 0x1f9e42, 0xd9b310];

for (let i = 0; i < 4; i++) {
  const c = new Car(`car_${i}`, carPositions[i], carColors[i]);
  cars.push(c);
  scene.add(c.group);

  interactionManager.register({
    type: 'car',
    position: c.group.position,
    radius: 3.5,
    getPrompt: () => 'HOLD E TO DRIVE',
    onInteract: (player) => {
      player.vehicle = c;
      player.avatar.root.visible = false;
      interactPrompt.classList.remove('visible');
      speedometer.classList.add('visible');
      soundManager.startRadio();
    }
  });
}

// --- Camera + input -----------------------------------------------------------
const rig = new CameraRig(camera);
const input = new InputState(window);
input.attach();
input.onToggleCamera(() => rig.toggleMode());
input.onToggleMap(() => {
  if (bigmapContainer) bigmapContainer.classList.toggle('visible');
});

let hasJoined = false;

const pointerLock = new PointerLockInput(renderer.domElement, {
  onLockChange: (locked) => {
    if (!hasJoined) {
      overlay.classList.toggle('hidden', locked);
    } else {
      overlay.classList.add('hidden');
    }
    
    const target = document.pointerLockElement;
    const targetName = target ? (target.tagName + (target.id ? '#' + target.id : '')) : 'none';
    statusText.textContent = locked
      ? `connected · locked on ${targetName}`
      : 'connected · unlocked (click to resume)';
  },
});
pointerLock.attach();

// Handle username form submission & enter world
const initialName = (nameInput?.value.trim()) || 'Player';

function enterWorld() {
  hasJoined = true;
  if (overlay) {
    overlay.classList.add('hidden');
  }

  try {
    soundManager.init();
    soundManager.resume();
  } catch (e) {
    console.warn('Audio init error:', e);
  }

  const chosenName = nameInput?.value.trim() || 'Player';
  try {
    localStorage.setItem('grid_player_name', chosenName);
  } catch (e) {}

  if (localPlayer) {
    localPlayer.setName(chosenName);
  }

  try {
    network.sendName(chosenName);
  } catch (e) {}

  if (pointerLock) {
    pointerLock.requestLock();
  }
}

joinForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  enterWorld();
});

playBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  enterWorld();
});

// Keyboard hotkeys for Radio ('R') and Horn ('H') and ESC for UI
let radioHudTimer = null;
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'r' && localPlayer.vehicle) {
    const station = soundManager.cycleRadio();
    if (radioStationName) radioStationName.textContent = station.name;
    if (radioStationGenre) radioStationGenre.textContent = station.genre;
    if (radioHud) {
      radioHud.classList.add('visible');
      if (radioHudTimer) clearTimeout(radioHudTimer);
      radioHudTimer = setTimeout(() => {
        radioHud.classList.remove('visible');
      }, 2500);
    }
  }

  if (e.key.toLowerCase() === 'h' && localPlayer.vehicle) {
    soundManager.playHorn();
  }

  if (e.key === 'Escape' && elevatorUIVisible) {
    if (elevator) elevator.state = 'IDLE';
    hideElevatorUI();
  }
});

// --- Local player -------------------------------------------------------------
const localPlayer = new LocalPlayer({ id: 'pending', color: 0x4f86f7, name: initialName, heightAt });
scene.add(localPlayer.avatar.root);

// --- Network ------------------------------------------------------------------
const remotePlayers = new Map();
const remoteContainer = new THREE.Group();
remoteContainer.name = 'remotePlayers';
scene.add(remoteContainer);

const network = new NetworkClient({
  onInit: (msg) => {
    localPlayer.id = msg.id;
    localPlayer.color = msg.color;
    const fresh = swapAvatarColor(localPlayer, msg.color);
    if (fresh) {
      scene.remove(localPlayer.avatar.root);
      localPlayer.avatar = fresh.avatar;
      localPlayer.animState.baseHipY = fresh.avatar.parts.hips.position.y;
      scene.add(localPlayer.avatar.root);
    }
    if (localPlayer.name) {
      network.sendName(localPlayer.name);
    }
    for (const p of msg.players) {
      if (p.id === msg.id) continue;
      const rp = new RemotePlayer({ id: p.id, color: p.color, name: p.name || 'Player', heightAt });
      rp.applyState(p);
      remotePlayers.set(p.id, rp);
      remoteContainer.add(rp.avatar.root);
    }
  },
  onJoin: (msg) => {
    if (remotePlayers.has(msg.id)) return;
    const rp = new RemotePlayer({ id: msg.id, color: msg.color, name: msg.name || 'Player', heightAt });
    rp.applyState(msg);
    remotePlayers.set(msg.id, rp);
    remoteContainer.add(rp.avatar.root);
  },
  onLeave: (msg) => {
    const rp = remotePlayers.get(msg.id);
    if (!rp) return;
    remoteContainer.remove(rp.avatar.root);
    remotePlayers.delete(msg.id);
  },
  onState: (msg) => {
    const rp = remotePlayers.get(msg.id);
    if (!rp) return;
    rp.applyState(msg);
  },
  onName: (msg) => {
    const rp = remotePlayers.get(msg.id);
    if (!rp) return;
    rp.setName(msg.name);
  },
  onStatusChange: (status) => {
    if (status === 'open') {
      statusEl.classList.add('connected');
    } else {
      statusEl.classList.remove('connected');
      statusText.textContent = 'disconnected · reconnecting...';
    }
  },
});

try {
  network.connect();
} catch (e) {
  console.warn('WebSocket connect failed:', e);
}

function swapAvatarColor(player, newColor) {
  const av = createAvatar({ color: newColor, name: player.name });
  return { avatar: av };
}

// --- GTA V Radar Minimap Renderer ---------------------------------------------
function drawRadarMinimap(canvas, playerPos, playerFacing, isBig = false) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const scale = isBig ? 1.0 : 2.2;

  ctx.clearRect(0, 0, w, h);

  // Background radar disc
  ctx.fillStyle = '#080c14';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(cx, cy);
  if (!isBig) {
    ctx.rotate(-playerFacing);
  }

  // Draw Grid Roads
  ctx.strokeStyle = '#222730';
  ctx.lineWidth = 14 * scale;

  for (let z = -70; z <= 70; z += 45) {
    ctx.beginPath();
    ctx.moveTo((-70 - playerPos.x) * scale, (z - playerPos.z) * scale);
    ctx.lineTo((70 - playerPos.x) * scale, (z - playerPos.z) * scale);
    ctx.stroke();
  }
  for (let x = -70; x <= 70; x += 45) {
    ctx.beginPath();
    ctx.moveTo((x - playerPos.x) * scale, (-70 - playerPos.z) * scale);
    ctx.lineTo((x - playerPos.x) * scale, (70 - playerPos.z) * scale);
    ctx.stroke();
  }

  // Outskirts Highway
  ctx.beginPath();
  ctx.moveTo((0 - playerPos.x) * scale, (60 - playerPos.z) * scale);
  ctx.lineTo((0 - playerPos.x) * scale, (460 - playerPos.z) * scale);
  ctx.stroke();

  // Draw Yellow Centerlines
  ctx.strokeStyle = '#ffb703';
  ctx.lineWidth = 1.5;
  for (let z = -70; z <= 70; z += 45) {
    ctx.beginPath();
    ctx.moveTo((-70 - playerPos.x) * scale, (z - playerPos.z) * scale);
    ctx.lineTo((70 - playerPos.x) * scale, (z - playerPos.z) * scale);
    ctx.stroke();
  }
  for (let x = -70; x <= 70; x += 45) {
    ctx.beginPath();
    ctx.moveTo((x - playerPos.x) * scale, (-70 - playerPos.z) * scale);
    ctx.lineTo((x - playerPos.x) * scale, (70 - playerPos.z) * scale);
    ctx.stroke();
  }

  // Draw Venue Blips
  const blips = [
    { x: 0, z: 0, name: 'MAZE BANK', color: '#d4af37' },
    { x: -45, z: 45, name: 'RON GAS', color: '#ff3300' },
    { x: 45, z: 45, name: 'PDM MOTORS', color: '#00f0ff' },
    { x: 45, z: -45, name: '24/7 STORE', color: '#00ff66' },
    { x: 0, z: 445, name: 'CAMPSITE', color: '#ffaa00' }
  ];

  for (const b of blips) {
    const bx = (b.x - playerPos.x) * scale;
    const bz = (b.z - playerPos.z) * scale;

    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(bx, bz, 4.5, 0, Math.PI * 2);
    ctx.fill();

    if (isBig) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(b.name, bx + 6, bz + 3);
    }
  }

  ctx.restore();

  // Draw Player Marker (Cyan Triangle in Center)
  ctx.save();
  ctx.translate(cx, cy);
  if (isBig) {
    ctx.rotate(playerFacing);
  }
  ctx.fillStyle = '#00ffff';
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// --- Render + game loop -------------------------------------------------------
let lastTime = performance.now();
let lastSendTime = 0;

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  const yaw = pointerLock.yaw || 0;
  const pitch = pointerLock.pitch || 0;

  // 1. Update Day/Night Cycle & Sky
  envManager.update(dt);

  // 2. Update NPCs and Dialogue HUD
  npcManager.update(dt, camera);
  if (npcManager.activeDialogue && dialogueBox) {
    dialogueBox.classList.add('visible');
    if (dialogueSpeaker) dialogueSpeaker.textContent = npcManager.activeDialogue.npcName;
    if (dialogueText) dialogueText.textContent = `"${npcManager.activeDialogue.text}"`;
  } else if (dialogueBox) {
    dialogueBox.classList.remove('visible');
  }

  // 3. Update local player only if unlocked or joined
  if (pointerLock.locked || hasJoined) {
    const p = input.poll();

    // If driving vehicle
    if (localPlayer.vehicle) {
      interactPrompt.classList.remove('visible');
      speedometer.classList.add('visible');
      const spd = Math.round(Math.abs(localPlayer.vehicle.speed) * 3.6);
      speedValue.textContent = spd;

      // Update engine audio & drifting
      soundManager.updateEngine(spd, true);
      if (Math.abs(localPlayer.vehicle.steer) > 0.4 && spd > 35) {
        soundManager.playTireSkid();
      }

      if (p.interact && !localPlayer.lastInteract) {
        // Step out of car
        localPlayer.position.x += 2.5;
        localPlayer.vehicle = null;
        localPlayer.avatar.root.visible = true;
        speedometer.classList.remove('visible');
        soundManager.updateEngine(0, false);
        soundManager.stopRadio();
      }
    } else {
      speedometer.classList.remove('visible');
      soundManager.updateEngine(0, false);
      // Update interactive objects (TVs, Drawers, Beds, Cars, Sofas, Workstations, Venues)
      interactionManager.update(dt, localPlayer, p, interactPrompt, interactProgress, promptText);
    }
    
    localPlayer.lastInteract = p.interact;

    if (localPlayer.vehicle) {
      localPlayer.vehicle.update(dt, p, heightAt, colliders, treeManager);
      localPlayer.position.copy(localPlayer.vehicle.group.position);
      localPlayer.position.y += 0.6; 
      localPlayer.facing = localPlayer.vehicle.facing;
    } else if (!localPlayer.isResting) {
      localPlayer.update(dt, p, yaw, colliders, walkableSurfaces);
    }
  }

  // Update dynamic physics particles and falling trees
  treeManager.update(dt);

  // Update elevator
  if (elevator) {
    elevator.update(dt, localPlayer);
  }

  // Update camera rig
  rig.update(localPlayer.position, yaw, pitch, !!localPlayer.vehicle);

  // Update Radar Minimap
  drawRadarMinimap(minimapCanvas, localPlayer.position, localPlayer.facing, false);
  if (bigmapContainer && bigmapContainer.classList.contains('visible')) {
    drawRadarMinimap(bigmapCanvas, localPlayer.position, localPlayer.facing, true);
  }

  // Interpolate / animate remotes
  for (const rp of remotePlayers.values()) {
    rp.update(dt, colliders, walkableSurfaces);
  }

  // Outbound network state at 10Hz
  if (now - lastSendTime >= SEND_INTERVAL_MS && localPlayer.id !== 'pending') {
    lastSendTime = now;
    network.sendState(localPlayer.getState());
  }

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

// --- Window resize ------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
