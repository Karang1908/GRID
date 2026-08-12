import * as THREE from 'three';

/**
 * Unified Interaction Manager for World Objects:
 * - Cars (Drive / Exit)
 * - TVs (Toggle Screen ON / OFF & change channel)
 * - Drawers (Slide Open / Close with physics easing)
 * - Beds (Lie down to rest / Get up)
 * - Lamps (Toggle Light)
 */
export class InteractionManager {
  constructor() {
    this.interactables = []; // List of registered interactive objects
    this.currentNearby = null;
    this.holdTimer = 0;
    this.requiredHold = 0.45; // 0.45s hold for snappy, satisfying interaction
    this.restingBed = null; // Currently resting bed
    this.seatedObject = null; // Currently seated sofa/chair
  }

  register(item) {
    // item: { type: 'tv'|'drawer'|'bed'|'sofa'|'chair'|'car'|'lamp'|'terminal'|'elevator_call'|'elevator_panel', position: Vector3, radius: number, onInteract: function, getPrompt: function, update: function }
    this.interactables.push(item);
    return item;
  }

  unregister(item) {
    const idx = this.interactables.indexOf(item);
    if (idx !== -1) this.interactables.splice(idx, 1);
  }

  findClosest(playerPos, maxDist = 3.5) {
    let closest = null;
    let minDistSq = maxDist * maxDist;

    for (const item of this.interactables) {
      const dx = item.position.x - playerPos.x;
      const dy = item.position.y - playerPos.y;
      const dz = item.position.z - playerPos.z;
      
      // Vertical clearance check (must be on same floor within 2.2m)
      if (Math.abs(dy) > 2.2) continue;

      const distSq = dx * dx + dz * dz;
      const checkRadius = item.radius || 2.5;
      if (distSq < checkRadius * checkRadius && distSq < minDistSq) {
        minDistSq = distSq;
        closest = item;
      }
    }

    return closest;
  }

  update(dt, player, input, interactPrompt, interactProgress, promptTextEl) {
    // 1. Update all animated interactables (e.g. sliding drawers, pulsing screens)
    for (const item of this.interactables) {
      if (item.update) {
        item.update(dt);
      }
    }

    // 2. If player is currently resting in bed or seated on sofa/chair, handle get-up input
    if (this.restingBed) {
      interactPrompt.classList.add('visible');
      if (promptTextEl) promptTextEl.textContent = 'PRESS SPACE OR E TO GET UP';
      if (interactProgress) interactProgress.style.strokeDashoffset = 88;

      if (input.jump || (input.interact && !player.lastInteract)) {
        this.standUpFromBed(player);
      }
      return;
    }

    if (this.seatedObject) {
      interactPrompt.classList.add('visible');
      if (promptTextEl) promptTextEl.textContent = 'PRESS SPACE OR E TO STAND UP';
      if (interactProgress) interactProgress.style.strokeDashoffset = 88;

      if (input.jump || (input.interact && !player.lastInteract)) {
        this.standUpFromSeat(player);
      }
      return;
    }

    // 3. If driving car, car handles its own exit
    if (player.vehicle) {
      return;
    }

    // 4. Find nearest interactive object
    const nearby = this.findClosest(player.position);
    this.currentNearby = nearby;

    if (nearby) {
      const promptStr = nearby.getPrompt ? nearby.getPrompt() : 'HOLD E TO INTERACT';
      if (!promptStr) {
        interactPrompt.classList.remove('visible');
        return;
      }

      interactPrompt.classList.add('visible');
      if (promptTextEl) {
        promptTextEl.textContent = promptStr;
      }

      if (input.interact) {
        this.holdTimer += dt;
        if (interactProgress) {
          const progress = Math.min(1.0, this.holdTimer / this.requiredHold);
          interactProgress.style.strokeDashoffset = 88 - progress * 88;
        }

        if (this.holdTimer >= this.requiredHold) {
          // Trigger interaction!
          if (nearby.onInteract) {
            nearby.onInteract(player, this);
          }
          this.holdTimer = 0;
          if (interactProgress) interactProgress.style.strokeDashoffset = 88;
        }
      } else {
        this.holdTimer = 0;
        if (interactProgress) interactProgress.style.strokeDashoffset = 88;
      }
    } else {
      this.holdTimer = 0;
      interactPrompt.classList.remove('visible');
      if (interactProgress) interactProgress.style.strokeDashoffset = 88;
    }
  }

  lieDownInBed(player, bedItem) {
    this.restingBed = bedItem;
    player.isResting = true;
    
    // Position player on the bed
    player.position.set(bedItem.position.x, bedItem.position.y + 0.5, bedItem.position.z);
    player.velocityY = 0;
    
    if (player.avatar && player.avatar.root) {
      player.avatar.root.rotation.x = -Math.PI / 2; // Lie down flat
      player.avatar.root.position.y = 0.2;
    }
  }

  standUpFromBed(player) {
    if (!this.restingBed) return;
    
    // Stand up beside bed
    player.position.x += 1.2;
    player.position.y = this.restingBed.position.y;
    player.isResting = false;
    
    if (player.avatar && player.avatar.root) {
      player.avatar.root.rotation.x = 0;
      player.avatar.root.position.y = 0;
    }
    
    this.restingBed = null;
  }

  sitOnSeat(player, seatItem) {
    this.seatedObject = seatItem;
    player.isResting = true; // Prevents movement while seated

    player.position.set(seatItem.position.x, seatItem.position.y + 0.2, seatItem.position.z);
    player.facing = seatItem.facing !== undefined ? seatItem.facing : 0;
    player.velocityY = 0;

    if (player.avatar && player.avatar.root) {
      player.avatar.root.position.y = -0.3; // Lowers into seat
      player.avatar.root.rotation.y = player.facing;
    }
  }

  standUpFromSeat(player) {
    if (!this.seatedObject) return;

    // Step forward from seat
    const forwardX = Math.sin(player.facing || 0) * 1.0;
    const forwardZ = Math.cos(player.facing || 0) * 1.0;
    player.position.x += forwardX;
    player.position.z += forwardZ;
    player.isResting = false;

    if (player.avatar && player.avatar.root) {
      player.avatar.root.position.y = 0;
    }

    this.seatedObject = null;
  }
}

