import * as THREE from 'three';

/**
 * AAA Day/Night Cycle & Atmospheric Lighting Engine
 * Controls dynamic sun/moon orbit, sky colors, streetlights, and vehicle headlights.
 */
export class EnvironmentManager {
  constructor(scene) {
    this.scene = scene;
    this.timeOfDay = 0.25; // Starts at bright midday (12:00 PM)
    this.timeSpeed = 0.004; // ~4 minutes per full day cycle (smooth, visible progression)

    // Sun & Moon Directional Lights
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    this.sunLight.castShadow = false; // Kept high-performance
    this.scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0xdde8ff, 0.7);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x77aaff, 0x443322, 0.4);
    this.scene.add(this.hemisphereLight);

    // Fog for atmospheric depth
    this.scene.fog = new THREE.FogExp2(0x99bbdd, 0.0022);

    // Night light registry
    this.nightLights = [];
    this.isNight = false;
  }

  registerNightLight(lightMesh) {
    this.nightLights.push(lightMesh);
  }

  update(dt) {
    this.timeOfDay = (this.timeOfDay + this.timeSpeed * dt) % 1.0;

    // Sun orbit math
    const sunAngle = this.timeOfDay * Math.PI * 2 - Math.PI / 2;
    const sunDist = 350;
    const sunX = Math.cos(sunAngle) * sunDist;
    const sunY = Math.sin(sunAngle) * sunDist;
    const sunZ = 50;

    this.sunLight.position.set(sunX, Math.max(10, sunY), sunZ);

    const isDaytime = sunY > 0;
    this.isNight = sunY < 20;

    // Smooth Color Transitions (Noon -> Sunset -> Midnight -> Dawn)
    if (this.timeOfDay >= 0.15 && this.timeOfDay <= 0.4) {
      // 1. Midday Sun
      this.sunLight.intensity = 1.3;
      this.sunLight.color.setHex(0xfffaed);
      this.ambientLight.intensity = 0.65;
      this.ambientLight.color.setHex(0xcce2ff);
      this.scene.background = new THREE.Color(0x7eb3ff);
      if (this.scene.fog) this.scene.fog.color.setHex(0x99c2ff);
    } else if (this.timeOfDay > 0.4 && this.timeOfDay <= 0.55) {
      // 2. Golden Hour Sunset
      const sunsetT = (this.timeOfDay - 0.4) / 0.15;
      this.sunLight.intensity = THREE.MathUtils.lerp(1.3, 0.4, sunsetT);
      this.sunLight.color.setRGB(1.0, 0.55, 0.25);
      this.ambientLight.intensity = THREE.MathUtils.lerp(0.65, 0.35, sunsetT);
      this.ambientLight.color.setRGB(0.8, 0.45, 0.3);
      this.scene.background = new THREE.Color().setRGB(
        THREE.MathUtils.lerp(0.49, 0.15, sunsetT),
        THREE.MathUtils.lerp(0.70, 0.12, sunsetT),
        THREE.MathUtils.lerp(1.0, 0.30, sunsetT)
      );
      if (this.scene.fog) this.scene.fog.color.copy(this.scene.background);
    } else if (this.timeOfDay > 0.55 && this.timeOfDay <= 0.85) {
      // 3. Cyberpunk Night
      this.sunLight.intensity = 0.2;
      this.sunLight.color.setHex(0x5577aa); // Moonlight
      this.ambientLight.intensity = 0.25;
      this.ambientLight.color.setHex(0x182038);
      this.scene.background = new THREE.Color(0x060a14);
      if (this.scene.fog) this.scene.fog.color.setHex(0x08101e);
    } else {
      // 4. Dawn / Sunrise
      const dawnT = (this.timeOfDay > 0.85) ? (this.timeOfDay - 0.85) / 0.3 : (this.timeOfDay + 0.15) / 0.3;
      this.sunLight.intensity = THREE.MathUtils.lerp(0.2, 1.3, dawnT);
      this.sunLight.color.setRGB(1.0, 0.85, 0.65);
      this.ambientLight.intensity = THREE.MathUtils.lerp(0.25, 0.65, dawnT);
      this.scene.background = new THREE.Color().setRGB(
        THREE.MathUtils.lerp(0.06, 0.49, dawnT),
        THREE.MathUtils.lerp(0.10, 0.70, dawnT),
        THREE.MathUtils.lerp(0.18, 1.0, dawnT)
      );
      if (this.scene.fog) this.scene.fog.color.copy(this.scene.background);
    }

    // Toggle emissive intensity of streetlights & signage at night
    for (const light of this.nightLights) {
      if (light.material) {
        light.material.opacity = this.isNight ? 1.0 : 0.4;
      }
    }
  }

  getTimeFormatted() {
    const totalMinutes = Math.floor(this.timeOfDay * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }
}
