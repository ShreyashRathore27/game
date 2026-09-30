/**
 * Ultra-Enhanced Three.js 3D Wrestling Arena & Anatomical Wrestler Engine
 * Features sculpted muscular anatomy (pecs, abs, traps, deltoids, lats, quads),
 * character-specific gear (Stone Cold vest & knee braces, Rey Mysterio lucha mask,
 * Undertaker long hair & gothic singlet, Rock Polynesian tattoos & Brahma Bull trunks),
 * canvas dust shockwave particle physics, hit-stop impact freezes, and dynamic camera choreography.
 */

import * as THREE from 'three';
import { WrestlerFighter, WrestlerProfile, BodyPart } from './types';
import { ROSTER } from './roster';
import { audioEngine } from './audioEngine';
import { haptics } from './haptics';

export class WrestlingArenaScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  // Ring Elements
  private ringRopes: THREE.Line[] = [];
  private ropeBasePoints: THREE.Vector3[][] = [];
  private ropeWobble: number[] = [0, 0, 0, 0];
  private matMesh: THREE.Mesh | null = null;
  private bloodDecals: THREE.Mesh[] = [];

  // Particle Effects (Canvas Dust, Hit Sparks & 3D Strike Impact Rings)
  private dustRings: { mesh: THREE.Mesh; life: number; maxLife: number; scale: number }[] = [];
  private hitSparks: { mesh: THREE.Points; velocities: THREE.Vector3[]; life: number }[] = [];
  private strikeImpactRings: {
    mesh: THREE.Mesh;
    life: number;
    maxLife: number;
    startScale: number;
    targetScale: number;
  }[] = [];

  // Lighting
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;
  private spotLights: THREE.SpotLight[] = [];
  private cameraFlashLights: THREE.PointLight[] = [];

  // Weapons (Steel Chairs)
  private steelChairs: THREE.Group[] = [];

  // Wrestler 3D Rigs
  private wrestlerRigs: Map<number, WrestlerRig> = new Map();

  // 3D Player Identification & Target Markers
  private p1MarkerGroup: THREE.Group = new THREE.Group();
  private p2MarkerGroup: THREE.Group = new THREE.Group();
  private p1GroundRing: THREE.Mesh | null = null;
  private p2GroundRing: THREE.Mesh | null = null;

  // Camera tracking & Impact freeze
  private cameraTarget = new THREE.Vector3(0, 1.2, 0);
  private cameraShake = { x: 0, y: 0, z: 0, timer: 0, intensity: 0 };
  private isFinisherCinematic: boolean = false;
  private cinematicTimer: number = 0;
  private hitStopTimer: number = 0; // Frozen time on impact for crunch feel!

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene setup with atmospheric dark arena fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06080e);
    this.scene.fog = new THREE.FogExp2(0x06080e, 0.02);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    this.camera.position.set(0, 6.2, 12.0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    this.ambientLight = new THREE.AmbientLight(0x334155, 1.4);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfff7ed, 2.6);
    this.dirLight.position.set(6, 16, 9);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.bias = -0.001;
    this.scene.add(this.dirLight);

    this.setupArenaLights();
    this.buildRingEnvironment();
    this.buildStadiumCrowd();
    this.spawnSteelChairs();
    this.setupPlayerIndicators();

    window.addEventListener('resize', this.onResize);
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  /**
   * Dynamic spotlights and flashing cameras in the crowd
   */
  private setupArenaLights() {
    const spotColors = [0xef4444, 0x3b82f6, 0xeab308, 0xa855f7];
    const spotPositions = [
      new THREE.Vector3(-10, 13, -10),
      new THREE.Vector3(10, 13, -10),
      new THREE.Vector3(-10, 13, 10),
      new THREE.Vector3(10, 13, 10),
    ];

    for (let i = 0; i < 4; i++) {
      const spot = new THREE.SpotLight(spotColors[i], 4.0, 32, Math.PI / 6, 0.4, 1.2);
      spot.position.copy(spotPositions[i]);
      spot.target.position.set(0, 1, 0);
      this.scene.add(spot);
      this.scene.add(spot.target);
      this.spotLights.push(spot);
    }

    // Camera flash lights in crowd
    for (let i = 0; i < 8; i++) {
      const flash = new THREE.PointLight(0xffffff, 0, 20);
      flash.position.set(
        (Math.random() - 0.5) * 36,
        4 + Math.random() * 8,
        (Math.random() - 0.5) * 36
      );
      this.scene.add(flash);
      this.cameraFlashLights.push(flash);
    }
  }

  /**
   * Wrestling Ring, Posts, Ropes, Mat, and Turnbuckles
   */
  private buildRingEnvironment() {
    const ringWidth = 8.0;
    const ringHeight = 1.0;

    // 1. Ring Mat (Canvas)
    const matGeo = new THREE.BoxGeometry(ringWidth, ringHeight, ringWidth);
    const matMat = new THREE.MeshStandardMaterial({
      color: 0xdedede,
      roughness: 0.85,
      metalness: 0.05,
    });
    this.matMesh = new THREE.Mesh(matGeo, matMat);
    this.matMesh.position.set(0, ringHeight / 2, 0);
    this.matMesh.receiveShadow = true;
    this.scene.add(this.matMesh);

    // Ring Center SmackDown Logo / Graphic
    const canvasTexture = this.createRingCanvasTexture();
    const logoGeo = new THREE.PlaneGeometry(5.4, 5.4);
    const logoMat = new THREE.MeshBasicMaterial({
      map: canvasTexture,
      transparent: true,
      opacity: 0.9,
    });
    const logoMesh = new THREE.Mesh(logoGeo, logoMat);
    logoMesh.rotation.x = -Math.PI / 2;
    logoMesh.position.set(0, ringHeight + 0.002, 0);
    this.scene.add(logoMesh);

    // 2. Ring Apron Skirt
    const skirtGeo = new THREE.BoxGeometry(ringWidth + 0.1, ringHeight * 0.95, ringWidth + 0.1);
    const skirtMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a, // Classic SmackDown Royal Blue
      roughness: 0.85,
    });
    const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
    skirtMesh.position.set(0, (ringHeight * 0.95) / 2, 0);
    this.scene.add(skirtMesh);

    // 3. Four Steel Ring Corner Posts
    const postGeo = new THREE.CylinderGeometry(0.13, 0.13, 3.2, 16);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.9,
      roughness: 0.15,
    });

    const postOffset = ringWidth / 2;
    const postCoords = [
      new THREE.Vector3(-postOffset, 1.6, -postOffset),
      new THREE.Vector3(postOffset, 1.6, -postOffset),
      new THREE.Vector3(postOffset, 1.6, postOffset),
      new THREE.Vector3(-postOffset, 1.6, postOffset),
    ];

    postCoords.forEach((pos, idx) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.copy(pos);
      post.castShadow = true;
      this.scene.add(post);

      // Turnbuckle Pads
      const padHeights = [1.5, 2.1, 2.7];
      padHeights.forEach((ph) => {
        const padGeo = new THREE.BoxGeometry(0.32, 0.24, 0.32);
        const padMat = new THREE.MeshStandardMaterial({
          color: idx % 2 === 0 ? 0xdc2626 : 0x2563eb,
          roughness: 0.55,
        });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(pos.x * 0.93, ph, pos.z * 0.93);
        this.scene.add(pad);
      });
    });

    // 4. Ring Ropes (3 levels on 4 sides)
    const ropeHeights = [1.5, 2.1, 2.7];
    const ropeColors = [0xef4444, 0xf8fafc, 0x2563eb];

    for (let level = 0; level < 3; level++) {
      const y = ropeHeights[level];
      const corners = [
        new THREE.Vector3(-postOffset * 0.95, y, -postOffset * 0.95),
        new THREE.Vector3(postOffset * 0.95, y, -postOffset * 0.95),
        new THREE.Vector3(postOffset * 0.95, y, postOffset * 0.95),
        new THREE.Vector3(-postOffset * 0.95, y, postOffset * 0.95),
        new THREE.Vector3(-postOffset * 0.95, y, -postOffset * 0.95),
      ];

      for (let s = 0; s < 4; s++) {
        const p1 = corners[s];
        const p2 = corners[s + 1];
        const pts = [p1.clone(), p1.clone().lerp(p2, 0.5), p2.clone()];
        this.ropeBasePoints.push([p1.clone(), p2.clone()]);

        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMat = new THREE.LineBasicMaterial({
          color: ropeColors[level],
          linewidth: 3,
        });
        const ropeLine = new THREE.Line(lineGeo, lineMat);
        this.scene.add(ropeLine);
        this.ringRopes.push(ropeLine);
      }
    }

    // 5. Floor & Ringside Mats
    const floorGeo = new THREE.PlaneGeometry(40, 40);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f1d,
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ringside Black Protective Floor Mats
    const ringsideMatGeo = new THREE.RingGeometry(4.2, 7.5, 4);
    const ringsideMat = new THREE.MeshStandardMaterial({
      color: 0x12141a,
      roughness: 0.95,
    });
    const ringsideMesh = new THREE.Mesh(ringsideMatGeo, ringsideMat);
    ringsideMesh.rotation.x = -Math.PI / 2;
    ringsideMesh.rotation.z = Math.PI / 4;
    ringsideMesh.position.y = 0.01;
    ringsideMesh.receiveShadow = true;
    this.scene.add(ringsideMesh);
  }

  private createRingCanvasTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 512, 512);

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 14;
    ctx.strokeRect(40, 40, 432, 432);

    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'italic 900 48px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAIN', 256, 230);

    ctx.fillStyle = '#dc2626';
    ctx.font = 'italic 800 32px "Chakra Petch", sans-serif';
    ctx.fillText('HERE COMES THE SMACK', 256, 280);

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(80, 256);
    ctx.lineTo(432, 256);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }

  private buildStadiumCrowd() {
    const crowdGeo = new THREE.CylinderGeometry(25, 21, 16, 32, 1, true);
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#03050c';
    ctx.fillRect(0, 0, 1024, 256);

    const audienceColors = ['#1e293b', '#334155', '#475569', '#1e3a8a', '#991b1b', '#0f172a'];
    for (let y = 10; y < 250; y += 14) {
      for (let x = 4; x < 1024; x += 10) {
        ctx.fillStyle = audienceColors[Math.floor(Math.random() * audienceColors.length)];
        ctx.beginPath();
        ctx.arc(x + (Math.random() * 4), y + (Math.random() * 3), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const crowdTex = new THREE.CanvasTexture(canvas);
    crowdTex.wrapS = THREE.RepeatWrapping;
    crowdTex.repeat.set(4, 1);

    const crowdMat = new THREE.MeshBasicMaterial({ map: crowdTex, side: THREE.BackSide });
    const crowdMesh = new THREE.Mesh(crowdGeo, crowdMat);
    crowdMesh.position.set(0, 7, 0);
    this.scene.add(crowdMesh);
  }

  private spawnSteelChairs() {
    const chairPositions = [
      new THREE.Vector3(4.5, 0, 0),
      new THREE.Vector3(-4.5, 0, 0),
      new THREE.Vector3(0, 0, -4.5),
    ];

    chairPositions.forEach((pos) => {
      const chair = this.createSteelChairMesh();
      chair.position.copy(pos);
      this.scene.add(chair);
      this.steelChairs.push(chair);
    });
  }

  private createSteelChairMesh(): THREE.Group {
    const group = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2,
    });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.5), steelMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.04), steelMat);
    back.position.set(0, 0.75, -0.23);
    back.castShadow = true;
    group.add(back);

    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.48);
    [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, steelMat);
      leg.position.set(lx, 0.24, lz);
      group.add(leg);
    });

    return group;
  }

  /**
   * 3D Player Identification & Targeting Markers
   * Unmistakable floating arrow and billboard tag above Player 1 and Player 2/CPU
   * plus pulsing ground targeting rings beneath their boots!
   */
  private setupPlayerIndicators() {
    // 1. P1 Indicator ("▼ YOU (P1)")
    this.p1MarkerGroup = this.buildIndicatorMarker(1, '▼ YOU (P1)', 0x06b6d4);
    this.scene.add(this.p1MarkerGroup);

    const ringGeo = new THREE.RingGeometry(0.55, 0.72, 32);
    const p1RingMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    this.p1GroundRing = new THREE.Mesh(ringGeo, p1RingMat);
    this.p1GroundRing.rotation.x = -Math.PI / 2;
    this.p1GroundRing.position.y = 1.015;
    this.scene.add(this.p1GroundRing);

    // 2. P2 Indicator ("▼ OPPONENT")
    this.p2MarkerGroup = this.buildIndicatorMarker(2, '▼ OPPONENT', 0xef4444);
    this.scene.add(this.p2MarkerGroup);

    const p2RingMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    this.p2GroundRing = new THREE.Mesh(ringGeo.clone(), p2RingMat);
    this.p2GroundRing.rotation.x = -Math.PI / 2;
    this.p2GroundRing.position.y = 1.015;
    this.scene.add(this.p2GroundRing);
  }

  private buildIndicatorMarker(playerIndex: 1 | 2, labelText: string, colorHex: number): THREE.Group {
    const group = new THREE.Group();

    // Downward pointing floating 3D Cone Arrow
    const arrowGeo = new THREE.ConeGeometry(0.18, 0.38, 8);
    const arrowMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
    arrowMesh.rotation.x = Math.PI; // Point down towards wrestler head!
    arrowMesh.position.y = 0.22;
    group.add(arrowMesh);

    // Billboard Text Canvas Sprite
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 72;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = playerIndex === 1 ? 'rgba(6, 182, 212, 0.35)' : 'rgba(239, 68, 68, 0.35)';
    ctx.strokeStyle = playerIndex === 1 ? '#06b6d4' : '#ef4444';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 56, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, 128, 36);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.5, 0.45, 1.0);
    sprite.position.y = 0.65;
    group.add(sprite);

    return group;
  }

  /**
   * Spawns or updates a 3D articulated wrestler model with custom profile
   */
  public registerWrestler(fighter: WrestlerFighter, customProfile?: WrestlerProfile) {
    const profile = customProfile || ROSTER.find(r => r.id === fighter.id) || ROSTER[0];
    let rig = this.wrestlerRigs.get(fighter.playerIndex);

    if (!rig) {
      rig = new WrestlerRig(profile, fighter.playerIndex);
      this.scene.add(rig.rootGroup);
      this.wrestlerRigs.set(fighter.playerIndex, rig);
    } else {
      rig.updateProfile(profile);
    }
  }

  /**
   * Canvas Impact Dust Shockwave Particle
   */
  public spawnImpactDust(x: number, z: number, scaleMultiplier: number = 1.0) {
    const ringGeo = new THREE.RingGeometry(0.1, 0.35, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const dustMesh = new THREE.Mesh(ringGeo, ringMat);
    dustMesh.rotation.x = -Math.PI / 2;
    dustMesh.position.set(x, 1.01, z);
    this.scene.add(dustMesh);

    this.dustRings.push({
      mesh: dustMesh,
      life: 0.35,
      maxLife: 0.35,
      scale: scaleMultiplier,
    });
  }

  /**
   * Hit Sparks on Strike/Chair Impact
   */
  public spawnHitSparks(x: number, y: number, z: number, isChair: boolean = false) {
    const count = isChair ? 28 : 16;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 5.0,
        Math.random() * 4.0 + 1.0,
        (Math.random() - 0.5) * 5.0
      ));
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: isChair ? 0xfef08a : 0xf87171,
      size: 0.12,
      transparent: true,
      opacity: 0.9,
    });

    const sparkMesh = new THREE.Points(geom, mat);
    this.scene.add(sparkMesh);
    this.hitSparks.push({ mesh: sparkMesh, velocities, life: 0.28 });
  }

  /**
   * Spawns subtle 3D impact particle effects (oriented shockwave ring & directional micro-sparks)
   * at the exact 3D contact point between the striker's limb and the victim's body.
   */
  public spawnStrikeImpact(
    x: number,
    y: number,
    z: number,
    normX: number,
    normZ: number,
    isHeavy: boolean,
    isDeflected: boolean = false,
    isChair: boolean = false
  ) {
    // 1. Oriented 3D Impact Shockwave Ring at exact point of contact
    const ringGeo = new THREE.RingGeometry(0.04, 0.12, 24);
    const ringColor = isDeflected
      ? 0x22d3ee // Electric cyan for parry/block
      : isChair
      ? 0xfef08a // Steel yellow spark
      : isHeavy
      ? 0xf59e0b // Fiery amber for heavy hook
      : 0xe0f2fe; // Crisp white/ice-blue for light jab

    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: isDeflected ? 0.95 : 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(x, y, z);

    // Look along normal vector so the ring faces the direction of the blow
    const lookTarget = new THREE.Vector3(
      x + (isDeflected ? -normX : normX),
      y,
      z + (isDeflected ? -normZ : normZ)
    );
    ringMesh.lookAt(lookTarget);
    this.scene.add(ringMesh);

    const maxLife = isHeavy ? 0.24 : 0.16;
    this.strikeImpactRings.push({
      mesh: ringMesh,
      life: maxLife,
      maxLife: maxLife,
      startScale: 0.6,
      targetScale: isHeavy ? 3.8 : 2.2,
    });

    // 2. Visceral Directional Contact Sparks
    const count = isChair ? 28 : isHeavy ? 22 : 12;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Sparks fly in direction of impact (or deflect backwards towards attacker if blocked)
      const forwardMult = isDeflected ? -1.4 : 1.0;
      const speed = (isHeavy ? 4.5 : 2.8) * (0.8 + Math.random() * 0.5);
      const spread = isHeavy ? 2.2 : 1.4;

      velocities.push(
        new THREE.Vector3(
          normX * forwardMult * speed + (Math.random() - 0.5) * spread,
          (Math.random() * 2.4) + (isHeavy ? 0.8 : 0.4),
          normZ * forwardMult * speed + (Math.random() - 0.5) * spread
        )
      );
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const sparkColor = isDeflected
      ? 0x38bdf8
      : isChair
      ? 0xfef08a
      : isHeavy
      ? 0xfbbf24
      : 0xf8fafc;

    const sparkMat = new THREE.PointsMaterial({
      color: sparkColor,
      size: isHeavy ? 0.11 : 0.07,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const sparkMesh = new THREE.Points(geom, sparkMat);
    this.scene.add(sparkMesh);
    this.hitSparks.push({ mesh: sparkMesh, velocities, life: isHeavy ? 0.25 : 0.18 });

    // 3. Tactile Hit-Stop Micro-Freeze (gives crunchy fighting-game weight)
    this.hitStopTimer = isDeflected ? 0.08 : isHeavy ? 0.065 : 0.035;
  }

  public addBloodDecal(position: THREE.Vector3) {
    if (this.bloodDecals.length > 20) {
      const old = this.bloodDecals.shift();
      if (old) this.scene.remove(old);
    }

    const bloodGeo = new THREE.CircleGeometry(0.22 + Math.random() * 0.25, 8);
    const bloodMat = new THREE.MeshBasicMaterial({
      color: 0x880808,
      transparent: true,
      opacity: 0.85,
    });
    const bloodMesh = new THREE.Mesh(bloodGeo, bloodMat);
    bloodMesh.rotation.x = -Math.PI / 2;
    bloodMesh.position.set(position.x, 1.003, position.z);
    this.scene.add(bloodMesh);
    this.bloodDecals.push(bloodMesh);
  }

  public jiggleRopes(sideIndex: number = 0) {
    this.ropeWobble[sideIndex % 4] = 1.0;
    audioEngine.playRopeSnap();
    haptics.ropeBounce();
  }

  public triggerCameraShake(intensity: number = 0.35, duration: number = 0.3) {
    this.cameraShake.intensity = intensity;
    this.cameraShake.timer = duration;
    // Add brief 50ms hit-stop freeze for maximum visceral impact
    this.hitStopTimer = 0.05;
  }

  public triggerFinisherCinematic() {
    this.isFinisherCinematic = true;
    this.cinematicTimer = 2.4;
    this.triggerCameraShake(0.7, 0.9);
    this.hitStopTimer = 0.09; // 90ms dramatic freeze!
    audioEngine.playRedSmackFinisher();
    haptics.redSmackFinisher();
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const delta = 0.016;

    // Hit-stop impact freeze
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= delta;
      return; // Freeze rendering momentarily for bone-crunching weight!
    }

    // 1. Camera Paparazzi flashes
    this.cameraFlashLights.forEach((flash) => {
      if (Math.random() < 0.035) {
        flash.intensity = 9.0;
      } else {
        flash.intensity = THREE.MathUtils.lerp(flash.intensity, 0, 0.2);
      }
    });

    // 2. Spotlight rotation
    const time = performance.now() * 0.001;
    this.spotLights.forEach((spot, i) => {
      const angle = time * 0.8 + (i * Math.PI) / 2;
      spot.position.x = Math.sin(angle) * 11;
      spot.position.z = Math.cos(angle) * 11;
      spot.target.position.set(Math.sin(time) * 2, 1, Math.cos(time) * 2);
    });

    // 3. Update Dust Rings
    for (let i = this.dustRings.length - 1; i >= 0; i--) {
      const d = this.dustRings[i];
      d.life -= delta;
      const progress = 1 - d.life / d.maxLife;
      const curScale = (1 + progress * 3.5) * d.scale;
      d.mesh.scale.set(curScale, curScale, curScale);
      (d.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 * (1 - progress));
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        this.dustRings.splice(i, 1);
      }
    }

    // 4. Update Hit Sparks
    for (let i = this.hitSparks.length - 1; i >= 0; i--) {
      const s = this.hitSparks[i];
      s.life -= delta;
      const posAttr = s.mesh.geometry.attributes.position;
      const arr = posAttr.array as Float32Array;
      for (let p = 0; p < s.velocities.length; p++) {
        arr[p * 3] += s.velocities[p].x * delta;
        arr[p * 3 + 1] += s.velocities[p].y * delta;
        arr[p * 3 + 2] += s.velocities[p].z * delta;
        s.velocities[p].y -= 9.8 * delta; // gravity
      }
      posAttr.needsUpdate = true;
      (s.mesh.material as THREE.PointsMaterial).opacity = Math.max(0, s.life / 0.28);
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.hitSparks.splice(i, 1);
      }
    }

    // 4b. Update 3D Strike Impact Rings at exact contact point
    for (let i = this.strikeImpactRings.length - 1; i >= 0; i--) {
      const r = this.strikeImpactRings[i];
      r.life -= delta;
      const progress = 1 - Math.max(0, r.life) / r.maxLife;
      const curScale = r.startScale + progress * (r.targetScale - r.startScale);
      r.mesh.scale.set(curScale, curScale, curScale);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - progress) * 0.85);
      if (r.life <= 0) {
        this.scene.remove(r.mesh);
        this.strikeImpactRings.splice(i, 1);
      }
    }

    // 5. Rope wobble
    for (let s = 0; s < 4; s++) {
      if (this.ropeWobble[s] > 0.01) {
        this.ropeWobble[s] *= 0.92;
        const offset = Math.sin(time * 30) * this.ropeWobble[s] * 0.35;
        for (let level = 0; level < 3; level++) {
          const ropeIdx = level * 4 + s;
          const ropeLine = this.ringRopes[ropeIdx];
          if (ropeLine) {
            const basePts = this.ropeBasePoints[ropeIdx];
            const p1 = basePts[0];
            const p2 = basePts[1];
            const mid = p1.clone().lerp(p2, 0.5);
            const dx = p2.x - p1.x;
            const dz = p2.z - p1.z;
            const normX = -dz / Math.hypot(dx, dz);
            const normZ = dx / Math.hypot(dx, dz);
            mid.x += normX * offset;
            mid.z += normZ * offset;
            const posAttr = ropeLine.geometry.attributes.position;
            posAttr.setXYZ(1, mid.x, mid.y, mid.z);
            posAttr.needsUpdate = true;
          }
        }
      }
    }

    // 6. Update Wrestlers (with Tactile Hit-Stop Micro-freeze for crunchy impact feel!)
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= delta;
    } else {
      this.wrestlerRigs.forEach((rig) => rig.update(delta));
    }

    // 7. Screen Shake & Camera follow
    if (this.cameraShake.timer > 0) {
      this.cameraShake.timer -= delta;
      const mag = this.cameraShake.intensity * (this.cameraShake.timer / 0.35);
      this.cameraShake.x = (Math.random() - 0.5) * mag;
      this.cameraShake.y = (Math.random() - 0.5) * mag;
      this.cameraShake.z = (Math.random() - 0.5) * mag;
    } else {
      this.cameraShake.x = 0;
      this.cameraShake.y = 0;
      this.cameraShake.z = 0;
    }

    const rig1 = this.wrestlerRigs.get(1);
    const rig2 = this.wrestlerRigs.get(2);

    if (rig1 && rig2) {
      const p1 = rig1.rootGroup.position;
      const p2 = rig2.rootGroup.position;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2 + 1.2;
      const midZ = (p1.z + p2.z) / 2;
      const dist = Math.hypot(p1.x - p2.x, p1.z - p2.z);

      if (this.isFinisherCinematic && this.cinematicTimer > 0) {
        this.cinematicTimer -= delta;
        const cAngle = time * 2.2;
        const targetCamX = midX + Math.sin(cAngle) * 3.2;
        const targetCamY = midY + 0.5;
        const targetCamZ = midZ + Math.cos(cAngle) * 3.2;
        this.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.14);
        this.camera.lookAt(midX, midY + 0.35, midZ);
      } else {
        this.isFinisherCinematic = false;
        const targetCamX = midX * 0.4;
        const targetCamY = 5.2 + Math.min(2.5, dist * 0.3);
        const targetCamZ = Math.max(9.5, 7.5 + dist * 0.6);

        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX + this.cameraShake.x, 0.08);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY + this.cameraShake.y, 0.08);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ + this.cameraShake.z, 0.08);

        this.cameraTarget.lerp(new THREE.Vector3(midX, midY, midZ), 0.1);
        this.camera.lookAt(this.cameraTarget);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  public updateFighterState(fighter: WrestlerFighter) {
    const rig = this.wrestlerRigs.get(fighter.playerIndex);
    if (!rig) return;

    rig.rootGroup.position.set(fighter.position.x, fighter.position.y, fighter.position.z);
    rig.rootGroup.rotation.y = fighter.rotationY;
    rig.setState(fighter.state, fighter.stateTimer);
    rig.setActiveMoveName(fighter.activeMoveName);
    rig.setBleeding(fighter.isBleeding);
    rig.setHeldWeapon(fighter.hasChair);

    if (fighter.isBleeding && Math.random() < 0.02) {
      this.addBloodDecal(new THREE.Vector3(fighter.position.x, 1.0, fighter.position.z));
    }

    // Dynamic 3D Overhead Target Markers & Ground Ring Tracking
    if (fighter.playerIndex === 1) {
      const hover = Math.sin(performance.now() * 0.005) * 0.08;
      this.p1MarkerGroup.position.set(fighter.position.x, fighter.position.y + 2.5 + hover, fighter.position.z);
      if (this.p1GroundRing) {
        this.p1GroundRing.position.set(fighter.position.x, 1.015, fighter.position.z);
        this.p1GroundRing.rotation.z += 0.015;
      }
    } else {
      const hover = Math.sin(performance.now() * 0.005 + Math.PI) * 0.08;
      this.p2MarkerGroup.position.set(fighter.position.x, fighter.position.y + 2.5 + hover, fighter.position.z);
      if (this.p2GroundRing) {
        this.p2GroundRing.position.set(fighter.position.x, 1.015, fighter.position.z);
        this.p2GroundRing.rotation.z -= 0.015;
      }
    }
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

/**
 * Anatomical Sculpted 3D Wrestler Rig
 * Features chiseled chest pectorals, 6-pack abs, shoulder deltoids, bicep peaks,
 * custom gear (Austin's leather vest & knee braces, Rey's lucha mask, Undertaker's long hair, Rock's tattoos)
 */
class WrestlerRig {
  public rootGroup: THREE.Group;
  public profile: WrestlerProfile;
  public playerIndex: number;

  // Joint nodes
  private headNode!: THREE.Group;
  private torsoNode!: THREE.Group;
  private hipsNode!: THREE.Group;
  private leftArmNode!: THREE.Group;
  private rightArmNode!: THREE.Group;
  private leftForearmNode!: THREE.Group;
  private rightForearmNode!: THREE.Group;
  private leftLegNode!: THREE.Group;
  private rightLegNode!: THREE.Group;
  private leftShinNode!: THREE.Group;
  private rightShinNode!: THREE.Group;
  private bloodMesh: THREE.Mesh | null = null;
  private chairInHand: THREE.Group | null = null;
  private blockShieldMesh: THREE.Mesh | null = null;

  public activeMoveName: string = '';
  private currentState: string = 'idle';
  private stateTimer: number = 0;
  private animPhase: number = 0;

  constructor(profile: WrestlerProfile, playerIndex: number) {
    this.profile = profile;
    this.playerIndex = playerIndex;
    this.rootGroup = new THREE.Group();

    this.constructAnatomy();
  }

  private constructAnatomy() {
    // Clear previous children if updating
    while (this.rootGroup.children.length > 0) {
      this.rootGroup.remove(this.rootGroup.children[0]);
    }

    const p = this.profile;
    const isUndertaker = p.id === 'undertaker';
    const isAustin = p.id === 'austin';
    const isRock = p.id === 'rock';
    const isAngle = p.id === 'angle';
    const isRey = p.id === 'reymysterio';
    const isLesnar = p.id === 'lesnar';

    // Scale scaling for colossal or giant wrestlers
    const scaleFactor = isUndertaker ? 1.15 : isLesnar ? 1.12 : isRey ? 0.90 : 1.0;
    this.rootGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // Realistic Sports Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: p.skinTone,
      roughness: 0.5,
      metalness: 0.12, // Specular sweat sheen!
    });

    const trunkMat = new THREE.MeshStandardMaterial({
      color: p.trunkColor,
      roughness: 0.45,
      metalness: 0.15,
    });

    const bootMat = new THREE.MeshStandardMaterial({
      color: p.bootColor,
      roughness: 0.35,
      metalness: 0.2,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: p.hairColor,
      roughness: 0.75,
    });

    const gearAccentMat = new THREE.MeshStandardMaterial({
      color: isAngle ? 0xef4444 : isRock ? 0xeab308 : isRey ? 0xfacc15 : 0xffffff,
      roughness: 0.4,
    });

    // 1. Hips / Pelvis / Trunks
    this.hipsNode = new THREE.Group();
    this.hipsNode.position.y = 0.95;

    // Muscular pelvis with contoured trunks
    const trunksGeo = isRey ? new THREE.BoxGeometry(0.52, 0.45, 0.36) : new THREE.BoxGeometry(0.5, 0.32, 0.34);
    const trunksMesh = new THREE.Mesh(trunksGeo, trunkMat);
    trunksMesh.castShadow = true;
    this.hipsNode.add(trunksMesh);

    // Rock's Golden Brahma Bull emblem on trunks
    if (isRock) {
      const bullEmblem = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, 0.14),
        new THREE.MeshBasicMaterial({ color: 0xeab308, side: THREE.DoubleSide })
      );
      bullEmblem.position.set(0, 0, 0.175);
      this.hipsNode.add(bullEmblem);
    }

    this.rootGroup.add(this.hipsNode);

    // 2. Torso (Pecs, 6-Pack Abs, Lats, Traps)
    this.torsoNode = new THREE.Group();
    this.torsoNode.position.y = 0.2;

    // Abdominal core block
    const coreMesh = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.35, 0.34), isAngle || isUndertaker ? trunkMat : skinMat);
    coreMesh.position.y = 0.15;
    coreMesh.castShadow = true;
    this.torsoNode.add(coreMesh);

    // Sculpted 6-Pack Abs
    if (!isUndertaker && !isAngle) {
      const absGeo = new THREE.BoxGeometry(0.09, 0.08, 0.02);
      const absMat = new THREE.MeshStandardMaterial({ color: p.skinTone, roughness: 0.4 });
      for (let row = 0; row < 3; row++) {
        for (let col = -1; col <= 1; col += 2) {
          const ab = new THREE.Mesh(absGeo, absMat);
          ab.position.set(col * 0.065, 0.08 + row * 0.09, 0.175);
          this.torsoNode.add(ab);
        }
      }
    }

    // Broad Muscular Chest (Left & Right Pectorals)
    const pecGeo = new THREE.BoxGeometry(0.28, 0.26, 0.12);
    const lPec = new THREE.Mesh(pecGeo, isAngle || isUndertaker ? trunkMat : skinMat);
    lPec.position.set(-0.16, 0.42, 0.18);
    lPec.rotation.y = 0.1;
    lPec.castShadow = true;
    this.torsoNode.add(lPec);

    const rPec = new THREE.Mesh(pecGeo, isAngle || isUndertaker ? trunkMat : skinMat);
    rPec.position.set(0.16, 0.42, 0.18);
    rPec.rotation.y = -0.1;
    rPec.castShadow = true;
    this.torsoNode.add(rPec);

    // Upper Trapezius neck muscles
    const trapGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.22, 12);
    const traps = new THREE.Mesh(trapGeo, isAngle || isUndertaker ? trunkMat : skinMat);
    traps.position.y = 0.58;
    this.torsoNode.add(traps);

    // Stone Cold's Leather Vest with skull emblem
    if (isAustin) {
      const vestMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.35 });
      const vestBack = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.58, 0.08), vestMat);
      vestBack.position.set(0, 0.32, -0.16);
      this.torsoNode.add(vestBack);

      const vestLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.54, 0.36), vestMat);
      vestLeft.position.set(-0.31, 0.32, 0);
      this.torsoNode.add(vestLeft);

      const vestRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.54, 0.36), vestMat);
      vestRight.position.set(0.31, 0.32, 0);
      this.torsoNode.add(vestRight);
    }

    // Rock's Polynesian tribal chest tattoo
    if (isRock) {
      const chestTattoo = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 0.24),
        new THREE.MeshBasicMaterial({ color: 0x18181b, transparent: true, opacity: 0.85 })
      );
      chestTattoo.position.set(-0.16, 0.42, 0.25);
      this.torsoNode.add(chestTattoo);
    }

    this.hipsNode.add(this.torsoNode);

    // 3. Head & Distinct Hair / Lucha Mask
    this.headNode = new THREE.Group();
    this.headNode.position.y = 0.78;

    const headGeo = new THREE.SphereGeometry(0.19, 16, 16);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    this.headNode.add(headMesh);

    // Rey Mysterio's Sculpted Mexican Lucha Libre Mask
    if (isRey || p.hairStyle === 'mask') {
      const maskMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 });
      const maskCrest = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 8), gearAccentMat);
      maskCrest.rotation.x = -0.4;
      maskCrest.position.set(0, 0.22, 0.08);
      this.headNode.add(maskCrest);

      // Gold cross on mask forehead
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.01), gearAccentMat);
      crossH.position.set(0, 0.12, 0.19);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.01), gearAccentMat);
      crossV.position.set(0, 0.12, 0.19);
      this.headNode.add(crossH);
      this.headNode.add(crossV);
    } else if (isUndertaker || p.hairStyle === 'long') {
      // Undertaker's Long Layered Dark Hair
      const hairTop = new THREE.Mesh(
        new THREE.SphereGeometry(0.205, 14, 14, 0, Math.PI * 2, 0, Math.PI / 1.6),
        hairMat
      );
      this.headNode.add(hairTop);

      // Hanging hair locks draped over shoulders
      const lockGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.65, 8);
      const leftLock = new THREE.Mesh(lockGeo, hairMat);
      leftLock.position.set(-0.16, -0.18, 0.08);
      this.headNode.add(leftLock);

      const rightLock = new THREE.Mesh(lockGeo, hairMat);
      rightLock.position.set(0.16, -0.18, 0.08);
      this.headNode.add(rightLock);
    } else if (p.hairStyle !== 'bald') {
      const hairGeo = new THREE.SphereGeometry(0.20, 14, 14, 0, Math.PI * 2, 0, Math.PI / 1.7);
      const hairMesh = new THREE.Mesh(hairGeo, hairMat);
      hairMesh.rotation.x = -0.2;
      this.headNode.add(hairMesh);
    }

    // Sculpted Expressive Facial Anatomy (Eyes, Brow, Nose, Jaw)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
    const eyeGeo = new THREE.BoxGeometry(0.04, 0.02, 0.015);
    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(-0.065, 0.02, 0.185);
    this.headNode.add(lEye);

    const rEye = new THREE.Mesh(eyeGeo, eyeMat);
    rEye.position.set(0.065, 0.02, 0.185);
    this.headNode.add(rEye);

    // Brows (The Rock iconic raised eyebrow, stern brow for others)
    const browGeo = new THREE.BoxGeometry(0.06, 0.018, 0.015);
    const browMat = new THREE.MeshBasicMaterial({ color: isRey ? 0x10b981 : 0x18181b });
    const lBrow = new THREE.Mesh(browGeo, browMat);
    lBrow.position.set(-0.065, isRock ? 0.065 : 0.045, 0.187);
    lBrow.rotation.z = isRock ? 0.25 : -0.1;
    this.headNode.add(lBrow);

    const rBrow = new THREE.Mesh(browGeo, browMat);
    rBrow.position.set(0.065, 0.045, 0.187);
    rBrow.rotation.z = 0.1;
    this.headNode.add(rBrow);

    // Chiseled Nose Bridge
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 4), skinMat);
    nose.rotation.x = -0.2;
    nose.position.set(0, -0.02, 0.20);
    this.headNode.add(nose);

    // Mouth / Grimace
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.015, 0.015),
      new THREE.MeshBasicMaterial({ color: 0x4a1d24 })
    );
    mouth.position.set(0, -0.09, 0.185);
    this.headNode.add(mouth);

    // Goatee for Austin / Undertaker
    if (isAustin || isUndertaker) {
      const goatee = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.06, 0.03),
        new THREE.MeshBasicMaterial({ color: 0x18181b })
      );
      goatee.position.set(0, -0.15, 0.18);
      this.headNode.add(goatee);
    }

    // Forehead Blood Decal Layer
    const bloodGeo = new THREE.PlaneGeometry(0.14, 0.09);
    const bloodMat = new THREE.MeshBasicMaterial({ color: 0x990000, transparent: true, opacity: 0.9 });
    this.bloodMesh = new THREE.Mesh(bloodGeo, bloodMat);
    this.bloodMesh.position.set(0, 0.04, 0.19);
    this.bloodMesh.visible = false;
    this.headNode.add(this.bloodMesh);

    this.torsoNode.add(this.headNode);

    // Holographic Hexagonal Shield Mesh for Block / Guard Stance
    const shieldGeo = new THREE.RingGeometry(0.2, 0.65, 6);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    this.blockShieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.blockShieldMesh.position.set(0, 0.38, 0.38);
    this.blockShieldMesh.visible = false;
    this.torsoNode.add(this.blockShieldMesh);

    // 4. Arms (Deltoid Muscle Caps, Biceps, Elbow Pads, Taped Wrists)
    // Left Arm
    this.leftArmNode = new THREE.Group();
    this.leftArmNode.position.set(-0.46, 0.48, 0);

    // Rounded Deltoid Cap
    const deltoidGeo = new THREE.SphereGeometry(0.14, 12, 12);
    const lDeltoid = new THREE.Mesh(deltoidGeo, skinMat);
    lDeltoid.position.set(0, 0, 0);
    this.leftArmNode.add(lDeltoid);

    // Bicep / Tricep Upper Arm
    const bicepGeo = new THREE.CylinderGeometry(0.12, 0.10, 0.34);
    const lBicep = new THREE.Mesh(bicepGeo, skinMat);
    lBicep.position.y = -0.18;
    this.leftArmNode.add(lBicep);

    // Left Forearm
    this.leftForearmNode = new THREE.Group();
    this.leftForearmNode.position.y = -0.36;

    // Elbow Pad
    const padGeo = new THREE.CylinderGeometry(0.11, 0.10, 0.12);
    const lElbowPad = new THREE.Mesh(padGeo, bootMat);
    lElbowPad.position.y = 0.02;
    this.leftForearmNode.add(lElbowPad);

    const foreGeo = new THREE.CylinderGeometry(0.095, 0.08, 0.32);
    const lFore = new THREE.Mesh(foreGeo, skinMat);
    lFore.position.y = -0.16;
    this.leftForearmNode.add(lFore);

    // Taped Wrist & Fist
    const wristMat = new THREE.MeshStandardMaterial({ color: isAustin ? 0x18181b : 0xf8fafc, roughness: 0.7 });
    const lWrist = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.1), wristMat);
    lWrist.position.y = -0.3;
    const lFist = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), skinMat);
    lFist.position.y = -0.38;
    this.leftForearmNode.add(lWrist);
    this.leftForearmNode.add(lFist);
    this.leftArmNode.add(this.leftForearmNode);
    this.torsoNode.add(this.leftArmNode);

    // Right Arm
    this.rightArmNode = new THREE.Group();
    this.rightArmNode.position.set(0.46, 0.48, 0);

    const rDeltoid = new THREE.Mesh(deltoidGeo, skinMat);
    this.rightArmNode.add(rDeltoid);

    const rBicep = new THREE.Mesh(bicepGeo, skinMat);
    rBicep.position.y = -0.18;
    this.rightArmNode.add(rBicep);

    this.rightForearmNode = new THREE.Group();
    this.rightForearmNode.position.y = -0.36;

    const rElbowPad = new THREE.Mesh(padGeo, bootMat);
    rElbowPad.position.y = 0.02;
    this.rightForearmNode.add(rElbowPad);

    const rFore = new THREE.Mesh(foreGeo, skinMat);
    rFore.position.y = -0.16;
    this.rightForearmNode.add(rFore);

    const rWrist = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.1), wristMat);
    rWrist.position.y = -0.3;
    const rFist = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), skinMat);
    rFist.position.y = -0.38;
    this.rightForearmNode.add(rWrist);
    this.rightForearmNode.add(rFist);

    this.chairInHand = this.createHeldChair();
    this.chairInHand.visible = false;
    this.rightForearmNode.add(this.chairInHand);

    this.rightArmNode.add(this.rightForearmNode);
    this.torsoNode.add(this.rightArmNode);

    // 5. Legs (Muscular Quads, Heavy Knee Pads, Lace-Up Kickpad Boots)
    // Left Leg
    this.leftLegNode = new THREE.Group();
    this.leftLegNode.position.set(-0.20, -0.16, 0);

    const thighGeo = new THREE.CylinderGeometry(0.14, 0.11, 0.44);
    const lThigh = new THREE.Mesh(thighGeo, isRey ? trunkMat : skinMat);
    lThigh.position.y = -0.22;
    lThigh.castShadow = true;
    this.leftLegNode.add(lThigh);

    this.leftShinNode = new THREE.Group();
    this.leftShinNode.position.y = -0.44;

    // Heavy Knee Pad / Austin Knee Braces with metallic silver hinges
    const kneeGeo = new THREE.CylinderGeometry(0.125, 0.12, 0.18);
    const lKneePad = new THREE.Mesh(kneeGeo, bootMat);
    lKneePad.position.y = 0.02;
    this.leftShinNode.add(lKneePad);

    if (isAustin) {
      const hingeMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9 });
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.04), hingeMat);
      hinge.position.set(-0.13, 0.02, 0);
      this.leftShinNode.add(hinge);
    }

    const shinGeo = new THREE.CylinderGeometry(0.10, 0.09, 0.38);
    const lShin = new THREE.Mesh(shinGeo, bootMat);
    lShin.position.y = -0.19;
    this.leftShinNode.add(lShin);

    // Lace-up boot sole & kickpad
    const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.30), bootMat);
    lBoot.position.set(0, -0.36, 0.07);
    this.leftShinNode.add(lBoot);

    this.leftLegNode.add(this.leftShinNode);
    this.hipsNode.add(this.leftLegNode);

    // Right Leg
    this.rightLegNode = new THREE.Group();
    this.rightLegNode.position.set(0.20, -0.16, 0);

    const rThigh = new THREE.Mesh(thighGeo, isRey ? trunkMat : skinMat);
    rThigh.position.y = -0.22;
    rThigh.castShadow = true;
    this.rightLegNode.add(rThigh);

    this.rightShinNode = new THREE.Group();
    this.rightShinNode.position.y = -0.44;

    const rKneePad = new THREE.Mesh(kneeGeo, bootMat);
    rKneePad.position.y = 0.02;
    this.rightShinNode.add(rKneePad);

    if (isAustin) {
      const hingeMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9 });
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.04), hingeMat);
      hinge.position.set(0.13, 0.02, 0);
      this.rightShinNode.add(hinge);
    }

    const rShin = new THREE.Mesh(shinGeo, bootMat);
    rShin.position.y = -0.19;
    this.rightShinNode.add(rShin);

    const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.30), bootMat);
    rBoot.position.set(0, -0.36, 0.07);
    this.rightShinNode.add(rBoot);

    this.rightLegNode.add(this.rightShinNode);
    this.hipsNode.add(this.rightLegNode);
  }

  private createHeldChair(): THREE.Group {
    const chair = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.4), mat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.03), mat);
    back.position.set(0, 0.2, -0.18);
    chair.add(seat);
    chair.add(back);
    chair.position.set(0, -0.35, 0.15);
    chair.rotation.x = Math.PI / 2;
    return chair;
  }

  public updateProfile(newProfile: WrestlerProfile) {
    this.profile = newProfile;
    this.constructAnatomy();
  }

  public setState(state: string, timer: number) {
    this.currentState = state;
    this.stateTimer = timer;
  }

  public setActiveMoveName(moveName: string) {
    this.activeMoveName = moveName || '';
  }

  public setBleeding(bleeding: boolean) {
    if (this.bloodMesh) {
      this.bloodMesh.visible = bleeding;
    }
  }

  public setHeldWeapon(hasChair: boolean) {
    if (this.chairInHand) {
      this.chairInHand.visible = hasChair;
    }
  }

  public update(delta: number) {
    this.animPhase += delta * 6;
    const p = this.animPhase;

    this.resetJoints();

    switch (this.currentState) {
      case 'idle':
        this.hipsNode.position.y = 0.95 + Math.sin(p * 0.7) * 0.03;
        this.torsoNode.rotation.x = 0.08;
        this.leftArmNode.rotation.x = -0.5 + Math.sin(p * 0.7) * 0.05;
        this.rightArmNode.rotation.x = -0.6 - Math.sin(p * 0.7) * 0.05;
        this.leftForearmNode.rotation.x = -0.8;
        this.rightForearmNode.rotation.x = -0.9;
        this.leftLegNode.rotation.x = -0.1;
        this.rightLegNode.rotation.x = 0.1;
        break;

      case 'walk':
      case 'run':
        const walkSpeed = this.currentState === 'run' ? 14 : 8;
        const wp = this.animPhase * (walkSpeed / 6);
        this.hipsNode.position.y = 0.95 + Math.abs(Math.sin(wp)) * 0.06;
        this.leftLegNode.rotation.x = Math.sin(wp) * 0.65;
        this.rightLegNode.rotation.x = -Math.sin(wp) * 0.65;
        this.leftShinNode.rotation.x = Math.max(0, -Math.sin(wp) * 0.5);
        this.rightShinNode.rotation.x = Math.max(0, Math.sin(wp) * 0.5);

        this.leftArmNode.rotation.x = -Math.sin(wp) * 0.5;
        this.rightArmNode.rotation.x = Math.sin(wp) * 0.5;
        this.leftForearmNode.rotation.x = -0.4;
        this.rightForearmNode.rotation.x = -0.4;
        break;

      case 'limping_walk':
        const lp = this.animPhase * 1.1;
        this.hipsNode.position.y = 0.9 + Math.sin(lp) * 0.08;
        this.torsoNode.rotation.z = 0.15;
        this.leftLegNode.rotation.x = Math.sin(lp) * 0.4;
        this.rightLegNode.rotation.x = 0.2;
        break;

      case 'strike_light':
        this.torsoNode.rotation.y = 0.35;
        this.leftArmNode.rotation.x = -1.55;
        this.leftForearmNode.rotation.x = -0.1;
        this.rightArmNode.rotation.x = -0.8;
        this.rightForearmNode.rotation.x = -1.2;
        break;

      case 'strike_heavy':
        this.torsoNode.rotation.y = -0.6;
        this.rightArmNode.rotation.x = -1.4;
        this.rightArmNode.rotation.z = 0.4;
        this.rightForearmNode.rotation.x = -0.2;
        this.leftArmNode.rotation.x = -0.6;
        break;

      case 'running_attack':
        this.hipsNode.position.y = 1.15;
        this.rightArmNode.rotation.x = -1.55;
        this.rightArmNode.rotation.z = 0.8;
        this.torsoNode.rotation.x = 0.2;
        this.leftLegNode.rotation.x = -0.7;
        this.rightLegNode.rotation.x = 0.5;
        break;

      case 'grapple_tieup':
        this.torsoNode.rotation.x = 0.25;
        this.leftArmNode.rotation.x = -1.1;
        this.rightArmNode.rotation.x = -1.1;
        this.leftForearmNode.rotation.x = -0.6;
        this.rightForearmNode.rotation.x = -0.6;
        this.leftLegNode.rotation.x = -0.3;
        this.rightLegNode.rotation.x = 0.3;
        break;

      case 'grapple_performing':
      case 'special_finisher_executing': {
        const isFinisher = this.currentState === 'special_finisher_executing';
        const totalDuration = isFinisher ? 2.6 : 1.8;
        const gp = Math.min(1, Math.max(0, 1 - this.stateTimer / totalDuration));
        const moveLower = this.activeMoveName.toLowerCase();
        const isStunner = moveLower.includes('stunner');

        if (isStunner) {
          if (gp < 0.25) {
            // Kick to midsection
            this.leftLegNode.rotation.x = -1.2;
            this.leftShinNode.rotation.x = 0.4;
            this.torsoNode.rotation.x = -0.15;
          } else if (gp < 0.55) {
            // Facelock hook over shoulder
            this.torsoNode.rotation.x = 0.15;
            this.rightArmNode.rotation.x = -1.8;
            this.rightForearmNode.rotation.x = -1.2;
            this.leftArmNode.rotation.x = -1.5;
            this.hipsNode.position.y = 1.05;
          } else if (gp < 0.75) {
            // Explosive leap & drop to seated jawbreaker!
            const dropT = (gp - 0.55) / 0.20;
            this.hipsNode.position.y = 1.05 - dropT * 0.8;
            this.torsoNode.rotation.x = 0.2;
            this.leftLegNode.rotation.x = -1.4;
            this.rightLegNode.rotation.x = -1.4;
          } else {
            // Sitting seated stunner follow-through
            this.hipsNode.position.y = 0.25;
            this.leftLegNode.rotation.x = -1.4;
            this.rightLegNode.rotation.x = -1.4;
            this.torsoNode.rotation.x = 0.1;
          }
          break;
        }

        // Standard & Heavy Slams (Suplex, Powerbomb, Chokeslam, Rock Bottom, F-5)
        if (gp < 0.38) {
          // Phase 1: Deep Hook, Bend Knees & Lift High!
          const t = gp / 0.38;
          const tSmooth = t * t * (3 - 2 * t);
          this.hipsNode.position.y = 0.95 - Math.sin(t * Math.PI) * 0.16;
          this.torsoNode.rotation.x = -0.4 * tSmooth;
          this.leftArmNode.rotation.x = -1.1 - tSmooth * 1.5;
          this.rightArmNode.rotation.x = -1.1 - tSmooth * 1.5;
          this.leftLegNode.rotation.z = -0.2 * t;
          this.rightLegNode.rotation.z = 0.2 * t;
        } else if (gp < 0.55) {
          // Phase 2: Apex Stall & Hang-Time High Overhead!
          const t = (gp - 0.38) / 0.17;
          this.hipsNode.position.y = 1.05 + Math.sin(p * 15) * 0.02;
          this.torsoNode.rotation.x = -0.38 + Math.sin(t * Math.PI) * 0.04;
          this.leftArmNode.rotation.x = -2.7;
          this.rightArmNode.rotation.x = -2.7;
          this.headNode.rotation.x = -0.3; // Looking up at hoisted opponent
        } else if (gp < 0.72) {
          // Phase 3: Explosive Downward Spike / Drive!
          const t = (gp - 0.55) / 0.17;
          const tPow = t * t;
          this.hipsNode.position.y = 1.05 - tPow * 0.65;
          this.torsoNode.rotation.x = -0.38 + t * 1.35;
          this.leftArmNode.rotation.x = -2.7 + t * 2.1;
          this.rightArmNode.rotation.x = -2.7 + t * 2.1;
          this.leftLegNode.rotation.x = -0.8 * t;
          this.rightLegNode.rotation.x = 0.6 * t;
        } else if (gp < 0.88) {
          // Phase 4: Ground Impact Follow-through
          this.hipsNode.position.y = 0.40;
          this.torsoNode.rotation.x = 0.85;
          this.leftArmNode.rotation.x = -0.6;
          this.rightArmNode.rotation.x = -0.6;
          this.leftLegNode.rotation.x = -1.1;
          this.rightLegNode.rotation.x = 0.5;
        } else {
          // Phase 5: Standing Back Up
          const t = (gp - 0.88) / 0.12;
          this.hipsNode.position.y = 0.40 + t * 0.55;
          this.torsoNode.rotation.x = 0.85 - t * 0.75;
        }
        break;
      }

      case 'grapple_receiving':
      case 'special_finisher_victim': {
        const isFinisher = this.currentState === 'special_finisher_victim';
        const totalDuration = isFinisher ? 2.6 : 1.8;
        const vp = Math.min(1, Math.max(0, 1 - this.stateTimer / totalDuration));
        const moveLower = this.activeMoveName.toLowerCase();
        const isStunner = moveLower.includes('stunner');

        if (isStunner) {
          if (vp < 0.25) {
            // Hunched over clutching gut
            this.hipsNode.position.y = 0.75;
            this.torsoNode.rotation.x = 0.85;
            this.headNode.rotation.x = 0.4;
          } else if (vp < 0.55) {
            // Held in facelock
            this.hipsNode.position.y = 0.85;
            this.torsoNode.rotation.x = 0.55;
          } else if (vp < 0.75) {
            // Dropping onto shoulder
            const dropT = (vp - 0.55) / 0.20;
            this.hipsNode.position.y = 0.85 - dropT * 0.55;
            this.headNode.rotation.x = -0.6;
          } else if (vp < 0.90) {
            // Flip back and canvas bounce!
            const flipT = (vp - 0.75) / 0.15;
            this.rootGroup.rotation.x = -Math.PI * 0.5 * flipT;
            this.hipsNode.position.y = 0.20 + Math.sin(flipT * Math.PI) * 0.45;
          } else {
            this.rootGroup.rotation.x = Math.PI / 2;
            this.hipsNode.position.y = 0.20;
          }
          break;
        }

        // Standard & Heavy Slams (Vertical Suplex / Powerbomb / Chokeslam / Rock Bottom)
        if (vp < 0.38) {
          // Phase 1: Hoisted high into the air!
          const t = vp / 0.38;
          const tSmooth = t * t * (3 - 2 * t);
          this.hipsNode.position.y = 0.95 + tSmooth * 2.25; // Rises to 3.2m above canvas!
          this.rootGroup.rotation.x = tSmooth * Math.PI * 0.92; // Flips upside down
          this.leftArmNode.rotation.z = -0.6 - tSmooth * 0.8;
          this.rightArmNode.rotation.z = 0.6 + tSmooth * 0.8;
          // Legs kick in panic
          this.leftLegNode.rotation.x = Math.sin(p * 8) * 0.45;
          this.rightLegNode.rotation.x = -Math.sin(p * 8) * 0.45;
        } else if (vp < 0.55) {
          // Phase 2: Suspended Vertical in the Rafters!
          this.hipsNode.position.y = 3.20 + Math.sin(p * 5) * 0.06;
          this.rootGroup.rotation.x = Math.PI * 0.92;
          this.leftLegNode.rotation.x = Math.sin(p * 12) * 0.5;
          this.rightLegNode.rotation.x = -Math.sin(p * 12) * 0.5;
        } else if (vp < 0.72) {
          // Phase 3: Explosive Downward Plummet!
          const t = (vp - 0.55) / 0.17;
          const tPow = t * t;
          this.hipsNode.position.y = 3.20 - tPow * 3.0; // Spikes down to 0.20m!
          this.rootGroup.rotation.x = Math.PI * 0.92 - t * (Math.PI * 0.42); // Flattens onto spine
          this.leftArmNode.rotation.z = -1.2;
          this.rightArmNode.rotation.z = 1.2;
        } else if (vp < 0.88) {
          // Phase 4: CRUNCH! Spring-Loaded Canvas Rebound & Mat Bounce!
          const t = (vp - 0.72) / 0.16;
          this.rootGroup.rotation.x = Math.PI / 2;
          this.hipsNode.position.y = 0.20 + Math.sin(t * Math.PI) * 0.48; // Bounces 0.48m off the mat!
          this.headNode.rotation.x = 0.5 - Math.sin(t * Math.PI) * 0.5; // Head snaps back
          this.leftArmNode.rotation.z = -1.1;
          this.rightArmNode.rotation.z = 1.1;
          this.leftLegNode.rotation.z = -0.3;
          this.rightLegNode.rotation.z = 0.3;
        } else {
          // Phase 5: Flat Out on the Mat (Knocked Senseless)
          this.rootGroup.rotation.x = Math.PI / 2;
          this.hipsNode.position.y = 0.20;
          this.leftArmNode.rotation.z = -0.8;
          this.rightArmNode.rotation.z = 0.8;
          this.leftLegNode.rotation.z = -0.3;
          this.rightLegNode.rotation.z = 0.3;
        }
        break;
      }

      case 'ground_down':
      case 'pin_suffering':
        this.hipsNode.position.y = 0.2;
        this.rootGroup.rotation.x = Math.PI / 2;
        this.leftArmNode.rotation.z = -0.8;
        this.rightArmNode.rotation.z = 0.8;
        this.leftLegNode.rotation.z = -0.3;
        this.rightLegNode.rotation.z = 0.3;
        break;

      case 'pin_attempting':
        this.hipsNode.position.y = 0.4;
        this.torsoNode.rotation.x = 0.7;
        this.rightArmNode.rotation.x = -1.2;
        this.leftLegNode.rotation.x = -0.8;
        this.rightLegNode.rotation.x = 0.4;
        break;

      case 'top_rope_perched':
        this.hipsNode.position.y = 2.6;
        this.torsoNode.rotation.x = 0.45;
        this.leftLegNode.rotation.x = -1.2;
        this.rightLegNode.rotation.x = -1.2;
        this.leftShinNode.rotation.x = 1.3;
        this.rightShinNode.rotation.x = 1.3;
        break;

      case 'diving_attack':
        this.hipsNode.position.y = 2.2;
        this.rootGroup.rotation.x = Math.PI / 2;
        this.leftArmNode.rotation.z = -1.2;
        this.rightArmNode.rotation.z = 1.2;
        this.leftLegNode.rotation.z = -0.4;
        this.rightLegNode.rotation.z = 0.4;
        break;

      case 'chair_swing':
        const cp = Math.min(1, Math.max(0, 1 - this.stateTimer / 0.8));
        if (cp < 0.4) {
          this.rightArmNode.rotation.x = -2.6;
        } else {
          this.rightArmNode.rotation.x = -0.5;
          this.torsoNode.rotation.x = 0.4;
        }
        break;

      case 'hit_stagger':
        this.headNode.rotation.x = -0.5;
        this.torsoNode.rotation.x = -0.3;
        this.hipsNode.position.y = 0.9;
        this.leftArmNode.rotation.z = -0.5;
        this.rightArmNode.rotation.z = 0.5;
        break;

      case 'taunt':
        this.torsoNode.rotation.x = -0.15;
        this.leftArmNode.rotation.x = -1.6;
        this.rightArmNode.rotation.x = -1.6;
        this.headNode.rotation.y = Math.sin(p * 2) * 0.3;
        break;

      case 'block':
      case 'block_parry':
        // Boxing/wrestling tight high-guard defense stance
        this.hipsNode.position.y = 0.92;
        this.torsoNode.rotation.x = 0.12;
        this.leftArmNode.rotation.x = -1.35;
        this.leftArmNode.rotation.z = 0.35;
        this.leftForearmNode.rotation.x = -1.45;
        this.rightArmNode.rotation.x = -1.35;
        this.rightArmNode.rotation.z = -0.35;
        this.rightForearmNode.rotation.x = -1.45;
        this.leftLegNode.rotation.x = -0.22;
        this.rightLegNode.rotation.x = 0.22;
        break;

      default:
        break;
    }

    // Update block shield mesh visibility and rotation
    if (this.blockShieldMesh) {
      if (this.currentState === 'block' || this.currentState === 'block_parry') {
        this.blockShieldMesh.visible = true;
        this.blockShieldMesh.rotation.z += delta * 4;
        (this.blockShieldMesh.material as THREE.MeshBasicMaterial).opacity = 0.65 + Math.sin(p * 2) * 0.25;
      } else {
        this.blockShieldMesh.visible = false;
      }
    }
  }

  private resetJoints() {
    this.rootGroup.rotation.x = 0;
    this.rootGroup.rotation.z = 0;
    this.hipsNode.position.y = 0.95;
    this.headNode.rotation.set(0, 0, 0);
    this.torsoNode.rotation.set(0, 0, 0);
    this.leftArmNode.rotation.set(0, 0, 0);
    this.rightArmNode.rotation.set(0, 0, 0);
    this.leftForearmNode.rotation.set(0, 0, 0);
    this.rightForearmNode.rotation.set(0, 0, 0);
    this.leftLegNode.rotation.set(0, 0, 0);
    this.rightLegNode.rotation.set(0, 0, 0);
    this.leftShinNode.rotation.set(0, 0, 0);
    this.rightShinNode.rotation.set(0, 0, 0);
  }
}
