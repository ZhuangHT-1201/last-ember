import * as THREE from "three";
import "./style.css";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const rand = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (items) => items[Math.floor(Math.random() * items.length)];
const damp = (current, target, lambda, delta) =>
  THREE.MathUtils.damp(current, target, lambda, delta);
const formatTime = (seconds) => {
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
};

const dom = {
  canvas: $("#game-canvas"),
  hud: $("#hud"),
  startScreen: $("#start-screen"),
  pauseScreen: $("#pause-screen"),
  inventoryScreen: $("#inventory-screen"),
  howtoScreen: $("#howto-screen"),
  gameoverScreen: $("#gameover-screen"),
  fade: $("#screen-fade"),
  waveBanner: $("#wave-banner"),
  objectiveBanner: $("#objective-banner"),
  interwaveTimer: $("#interwave-timer"),
  bossPanel: $("#boss-panel"),
  prompt: $("#interaction-prompt"),
  crosshair: $("#crosshair"),
  hitmarker: $("#hitmarker"),
  damageIndicator: $("#damage-indicator"),
  damageVignette: $("#damage-vignette"),
  healFlash: $("#heal-flash"),
  interference: $("#interference"),
  notifications: $("#notifications"),
  killFeed: $("#kill-feed"),
  toast: $("#toast"),
  toastText: $("#toast-text"),
  minimap: $("#minimap"),
  inventoryGrid: $("#inventory-grid"),
  inventoryDetail: $("#inventory-detail"),
  recipeList: $("#recipe-list"),
  ammoReadout: $(".ammo-readout"),
  touchControls: $("#touch-controls"),
};

const isTouch =
  window.matchMedia("(pointer: coarse)").matches ||
  /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
if (isTouch) document.body.classList.add("mobile");

const WAVE_DATA = [
  { title: "第一波 · 苏醒", count: 5, runners: 0, brutes: 0 },
  { title: "第二波 · 游荡者", count: 7, runners: 1, brutes: 0 },
  { title: "第三波 · 感染潮", count: 8, runners: 2, brutes: 0 },
  { title: "第四波 · 裂口者", count: 10, runners: 3, brutes: 1, boss: true },
  { title: "第五波 · 黑雨", count: 12, runners: 4, brutes: 1 },
  { title: "第六波 · 包围", count: 14, runners: 5, brutes: 2 },
  { title: "第七波 · 失控", count: 16, runners: 7, brutes: 2 },
  { title: "最终波 · 灭绝令", count: 20, runners: 9, brutes: 3, boss: true, final: true },
];

const WEAPONS = [
  {
    id: "rifle",
    name: "M4A1 · 灰烬",
    className: "PRIMARY / AUTO",
    magSize: 30,
    reserve: 120,
    maxReserve: 300,
    damage: 34,
    headMultiplier: 2.3,
    interval: 0.092,
    reloadTime: 1.72,
    emptyReloadTime: 2.12,
    hipSpread: 0.018,
    aimSpread: 0.0028,
    pelletCount: 1,
    automatic: true,
    range: 115,
    recoil: 0.011,
  },
  {
    id: "shotgun",
    name: "SPAS-12 · 断潮",
    className: "SECONDARY / PUMP",
    magSize: 7,
    reserve: 28,
    maxReserve: 72,
    damage: 16,
    headMultiplier: 1.7,
    interval: 0.73,
    reloadTime: 2.28,
    emptyReloadTime: 2.65,
    hipSpread: 0.068,
    aimSpread: 0.042,
    pelletCount: 9,
    automatic: false,
    range: 48,
    recoil: 0.031,
  },
];

const ITEM_DEFS = {
  rifleAmmo: {
    name: "步枪弹药",
    glyph: "▰",
    color: "#e0ff65",
    weight: 0.012,
    description: "5.56 mm 标准弹药。用于 M4A1 突击步枪。",
  },
  shotgunAmmo: {
    name: "霰弹",
    glyph: "▥",
    color: "#ffb069",
    weight: 0.06,
    description: "12 号鹿弹。威力巨大，适合近距离清理成群感染者。",
  },
  med: {
    name: "医疗包",
    glyph: "+",
    color: "#ff7268",
    weight: 0.24,
    description: "现场急救用品，恢复 38 点生命并停止出血。",
    usable: true,
    action: "使用",
  },
  food: {
    name: "压缩口粮",
    glyph: "▥",
    color: "#d5e6bc",
    weight: 0.3,
    description: "高热量应急食品，恢复 18 点生命与 25 点体力。",
    usable: true,
    action: "食用",
  },
  grenade: {
    name: "燃烧瓶",
    glyph: "◈",
    color: "#ff8a45",
    weight: 0.7,
    description: "简易燃烧装置，投掷后产生范围火焰爆炸。按 G 投掷。",
  },
  scrap: {
    name: "机械废料",
    glyph: "⌗",
    color: "#9ea99f",
    weight: 0.36,
    description: "拆解后的金属零件，可用于制作弹药与简易装置。",
  },
  cloth: {
    name: "感染区布料",
    glyph: "◇",
    color: "#d0c6aa",
    weight: 0.18,
    description: "经过消毒的结实布料，是制作医疗包的基础材料。",
  },
  chemical: {
    name: "化学制剂",
    glyph: "◉",
    color: "#8ee8da",
    weight: 0.42,
    description: "密封的工业溶剂，可稳定火药并制作燃烧瓶。",
  },
};

const CRAFT_RECIPES = [
  {
    id: "fieldAmmo",
    name: "现场重装弹药",
    glyph: "▰",
    description: "装填 20 发步枪弹与 2 发霰弹",
    costs: { scrap: 2, chemical: 1 },
    result: () => {
      const rifle = game.player.weapons[0];
      const shotgun = game.player.weapons[1];
      rifle.reserve = Math.min(rifle.maxReserve, rifle.reserve + 20);
      shotgun.reserve = Math.min(shotgun.maxReserve, shotgun.reserve + 2);
    },
  },
  {
    id: "fieldMed",
    name: "急救医疗包",
    glyph: "+",
    description: "恢复生命并清除出血状态",
    costs: { cloth: 2, chemical: 1 },
    result: () => {
      game.inventory.med += 1;
    },
  },
  {
    id: "molotov",
    name: "简易燃烧瓶",
    glyph: "◈",
    description: "产生高温范围爆炸",
    costs: { chemical: 2, scrap: 1 },
    result: () => {
      game.inventory.grenade += 1;
    },
  },
];

class AudioSystem {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabled = true;
    this.lastGrowl = 0;
  }

  init() {
    if (this.context) {
      if (this.context.state === "suspended") this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.32;
    this.master.connect(this.context.destination);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.master) {
      this.master.gain.setTargetAtTime(enabled ? 0.32 : 0, this.context.currentTime, 0.03);
    }
  }

  noise(duration = 0.1, volume = 0.4, lowpass = 1800, highpass = 60) {
    if (!this.enabled || !this.context) return;
    const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const envelope = Math.pow(1 - i / length, 1.6);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    const high = this.context.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = highpass;
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(high).connect(gain).connect(this.master);
    source.start();
  }

  tone(frequency, duration = 0.12, volume = 0.08, type = "sine", endFrequency = null) {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }

  gunshot(weaponId) {
    if (!this.context) return;
    const shotgun = weaponId === "shotgun";
    this.noise(shotgun ? 0.24 : 0.12, shotgun ? 0.72 : 0.48, shotgun ? 2600 : 4200, 55);
    this.tone(shotgun ? 78 : 108, shotgun ? 0.2 : 0.1, shotgun ? 0.26 : 0.17, "sawtooth", 42);
  }

  hit(headshot = false) {
    this.tone(headshot ? 980 : 490, 0.055, headshot ? 0.075 : 0.045, "triangle", 260);
  }

  kill() {
    this.tone(180, 0.18, 0.055, "triangle", 76);
  }

  reload() {
    this.noise(0.035, 0.17, 3400, 500);
    window.setTimeout(() => this.noise(0.05, 0.2, 2100, 350), 220);
  }

  pickup() {
    this.tone(520, 0.09, 0.06, "sine", 840);
    window.setTimeout(() => this.tone(860, 0.08, 0.05, "triangle", 1120), 70);
  }

  craft() {
    this.noise(0.08, 0.12, 1100, 180);
    this.tone(330, 0.12, 0.05, "triangle", 620);
  }

  hurt() {
    this.noise(0.18, 0.28, 450, 45);
    this.tone(64, 0.18, 0.14, "sine", 42);
  }

  explosion() {
    this.noise(0.72, 0.75, 1000, 25);
    this.tone(45, 0.65, 0.35, "sawtooth", 24);
  }

  growl(distance = 10) {
    if (performance.now() - this.lastGrowl < 3200) return;
    this.lastGrowl = performance.now();
    const volume = clamp(0.06 - distance * 0.0015, 0.008, 0.05);
    this.tone(rand(54, 78), rand(0.35, 0.72), volume, "sawtooth", rand(38, 54));
  }
}

class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.raycastColliders = [];
    this.raycastMeshes = [];
    this.pickupPoints = [];
    this.spawnPoints = [
      new THREE.Vector3(-40, 0, -10),
      new THREE.Vector3(38, 0, -30),
      new THREE.Vector3(-35, 0, 30),
      new THREE.Vector3(34, 0, 29),
      new THREE.Vector3(2, 0, -43),
      new THREE.Vector3(42, 0, 2),
      new THREE.Vector3(-43, 0, 8),
      new THREE.Vector3(13, 0, 40),
    ];
    this.materials = this.createMaterials();
    this.dust = null;
    this.flickerLights = [];
    this.build();
  }

  createMaterials() {
    const standard = (color, roughness = 0.88, metalness = 0.08) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });
    return {
      asphalt: standard(0x1e2421, 0.98, 0.02),
      asphaltLight: standard(0x30362f, 0.96, 0.04),
      concrete: standard(0x4a4c43, 0.96, 0.03),
      concreteDark: standard(0x292e28, 0.94, 0.03),
      rust: standard(0x6b3525, 0.92, 0.22),
      orangeRust: standard(0x8a432b, 0.9, 0.16),
      metal: standard(0x343a36, 0.55, 0.66),
      metalDark: standard(0x161b18, 0.63, 0.54),
      paleMetal: standard(0x6c7169, 0.61, 0.48),
      wood: standard(0x49382a, 0.97, 0),
      woodDark: standard(0x281f18, 0.98, 0),
      deadLeaf: standard(0x283126, 1, 0),
      deadLeaf2: standard(0x353929, 1, 0),
      glowGreen: new THREE.MeshStandardMaterial({
        color: 0x95a960,
        emissive: 0x6f7e2b,
        emissiveIntensity: 1.1,
        roughness: 0.35,
      }),
      glowRed: new THREE.MeshStandardMaterial({
        color: 0xff5b3d,
        emissive: 0xff2a14,
        emissiveIntensity: 2.2,
        roughness: 0.4,
      }),
      glowOrange: new THREE.MeshStandardMaterial({
        color: 0xffb35b,
        emissive: 0xff6b1d,
        emissiveIntensity: 2.2,
        roughness: 0.4,
      }),
    };
  }

  makeGroundTexture() {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#3d4337";
    ctx.fillRect(0, 0, size, size);

    const image = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < image.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 25;
      image.data[i] = clamp(image.data[i] + noise, 0, 255);
      image.data[i + 1] = clamp(image.data[i + 1] + noise, 0, 255);
      image.data[i + 2] = clamp(image.data[i + 2] + noise * 0.4, 0, 255);
    }
    ctx.putImageData(image, 0, 0);

    for (let i = 0; i < 900; i += 1) {
      const green = randInt(42, 72);
      ctx.fillStyle = `rgba(${green}, ${green + 8}, ${green - 9}, ${rand(0.08, 0.3)})`;
      ctx.fillRect(rand(0, size), rand(0, size), rand(1, 6), rand(2, 14));
    }
    for (let i = 0; i < 60; i += 1) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(33, 29, 22, ${rand(0.1, 0.28)})`;
      ctx.lineWidth = rand(0.5, 2);
      const x = rand(0, size);
      const y = rand(0, size);
      ctx.moveTo(x, y);
      ctx.lineTo(x + rand(-22, 22), y + rand(-22, 22));
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(14, 14);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  makeConcreteTexture() {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#575a50";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 6000; i += 1) {
      const value = randInt(45, 95);
      ctx.fillStyle = `rgba(${value}, ${value + 2}, ${value - 3}, ${rand(0.04, 0.2)})`;
      ctx.fillRect(rand(0, size), rand(0, size), rand(0.5, 2), rand(0.5, 2));
    }
    ctx.strokeStyle = "rgba(28, 30, 27, .23)";
    ctx.lineWidth = 1;
    for (let x = 0; x < size; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + rand(-3, 3), size);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  addBox(
    width,
    height,
    depth,
    x,
    y,
    z,
    material,
    { collide = true, raycast = true, rotationY = 0, castShadow = true } = {},
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotationY;
    mesh.castShadow = castShadow && width * depth < 250;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    if (raycast) {
      this.raycastMeshes.push(mesh);
      const halfX = (Math.abs(Math.cos(rotationY)) * width +
        Math.abs(Math.sin(rotationY)) * depth) / 2;
      const halfZ = (Math.abs(Math.sin(rotationY)) * width +
        Math.abs(Math.cos(rotationY)) * depth) / 2;
      const collider = {
        minX: x - halfX,
        maxX: x + halfX,
        minY: y - height / 2,
        maxY: y + height / 2,
        minZ: z - halfZ,
        maxZ: z + halfZ,
        mesh,
      };
      this.raycastColliders.push(collider);
      if (collide) this.colliders.push(collider);
    }
    return mesh;
  }

  addCollider(width, height, depth, x, y, z) {
    const collider = {
      minX: x - width / 2,
      maxX: x + width / 2,
      minY: y - height / 2,
      maxY: y + height / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
      mesh: null,
    };
    this.colliders.push(collider);
    this.raycastColliders.push(collider);
  }

  build() {
    const hemi = new THREE.HemisphereLight(0x9bb0a0, 0x1d251c, 2.05);
    this.scene.add(hemi);

    const moonLight = new THREE.DirectionalLight(0xaecab9, 2.45);
    moonLight.position.set(-25, 36, 18);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(2048, 2048);
    moonLight.shadow.camera.left = -55;
    moonLight.shadow.camera.right = 55;
    moonLight.shadow.camera.top = 55;
    moonLight.shadow.camera.bottom = -55;
    moonLight.shadow.camera.near = 1;
    moonLight.shadow.camera.far = 100;
    moonLight.shadow.bias = -0.0003;
    this.scene.add(moonLight);

    const groundMaterial = new THREE.MeshStandardMaterial({
      map: this.makeGroundTexture(),
      color: 0x8c9985,
      roughness: 1,
      metalness: 0.01,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const asphaltMaterial = new THREE.MeshStandardMaterial({
      color: 0x222825,
      roughness: 0.92,
      metalness: 0.02,
    });
    const roadH = new THREE.Mesh(new THREE.PlaneGeometry(112, 12), asphaltMaterial);
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.y = 0.012;
    roadH.receiveShadow = true;
    this.scene.add(roadH);
    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(12, 112), asphaltMaterial);
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.y = 0.013;
    roadV.receiveShadow = true;
    this.scene.add(roadV);

    for (let i = -50; i < 50; i += 8) {
      this.addBox(3.4, 0.012, 0.1, i, 0.025, 0, this.materials.paleMetal, {
        collide: false,
        raycast: false,
        castShadow: false,
      });
      this.addBox(0.1, 0.012, 3.4, 0, 0.025, i, this.materials.paleMetal, {
        collide: false,
        raycast: false,
        castShadow: false,
      });
    }

    this.buildBoundary();
    this.buildCheckpoint();
    this.buildWarehouse(-25, -18);
    this.buildGarage(24, -18);
    this.buildSafehouse(22, 22);
    this.buildContainers();
    this.buildBarricades();
    this.buildTrees();
    this.buildStreetLights();
    this.buildAtmosphere();

    this.pickupPoints = [
      new THREE.Vector3(-12, 0, -6),
      new THREE.Vector3(7, 0, -8),
      new THREE.Vector3(-18, 0, -10),
      new THREE.Vector3(17, 0, -4),
      new THREE.Vector3(24, 0, 18),
      new THREE.Vector3(-33, 0, 24),
      new THREE.Vector3(35, 0, 15),
      new THREE.Vector3(-7, 0, 32),
      new THREE.Vector3(4, 0, 37),
      new THREE.Vector3(-37, 0, -32),
      new THREE.Vector3(17, 0, -31),
      new THREE.Vector3(35, 0, -36),
      new THREE.Vector3(-25, 0, 6),
      new THREE.Vector3(28, 0, 2),
    ];
  }

  buildBoundary() {
    const wallMat = this.materials.concreteDark;
    const fenceMat = this.materials.metalDark;
    this.addBox(112, 1.2, 0.7, 0, 0.6, -53.5, wallMat);
    this.addBox(112, 1.2, 0.7, 0, 0.6, 53.5, wallMat);
    this.addBox(0.7, 1.2, 112, -53.5, 0.6, 0, wallMat);
    this.addBox(0.7, 1.2, 112, 53.5, 0.6, 0, wallMat);

    for (let x = -52; x <= 52; x += 4) {
      this.addBox(0.1, 3.1, 0.1, x, 1.55, -53, fenceMat, { collide: false });
      this.addBox(0.1, 3.1, 0.1, x, 1.55, 53, fenceMat, { collide: false });
    }
    for (let z = -52; z <= 52; z += 4) {
      this.addBox(0.1, 3.1, 0.1, -53, 1.55, z, fenceMat, { collide: false });
      this.addBox(0.1, 3.1, 0.1, 53, 1.55, z, fenceMat, { collide: false });
    }
    for (const z of [-53, 53]) {
      for (let y = 0.6; y <= 2.45; y += 0.62) {
        this.addBox(108, 0.025, 0.025, 0, y, z, fenceMat, {
          collide: false,
          castShadow: false,
        });
      }
    }
    for (const x of [-53, 53]) {
      for (let y = 0.6; y <= 2.45; y += 0.62) {
        this.addBox(0.025, 0.025, 108, x, y, 0, fenceMat, {
          collide: false,
          castShadow: false,
        });
      }
    }

    const signPositions = [
      [0, 2.7, -53.1, 0],
      [0, 2.7, 53.1, Math.PI],
    ];
    for (const [x, y, z, rotation] of signPositions) {
      this.addBox(10, 1.1, 0.08, x, y, z, this.materials.orangeRust, {
        collide: false,
        rotationY: rotation,
      });
    }
  }

  buildCheckpoint() {
    const { concrete, concreteDark, metalDark, glowRed } = this.materials;
    this.addBox(16, 0.18, 9, 0, 0.09, 20, concreteDark, { collide: false });
    this.addBox(14, 0.15, 7, 18, 0.075, 20, concreteDark, { collide: false });

    this.addBox(0.5, 4.2, 4, 7, 2.1, 20, concrete);
    this.addBox(4.4, 0.55, 4.3, 7, 4.45, 20, concrete);
    this.addBox(0.15, 0.35, 3.4, 6.7, 3.5, 20, glowRed, {
      collide: false,
      castShadow: false,
    });

    this.addBox(3.9, 1.25, 0.7, 0, 0.63, 20.6, concreteDark);
    this.addBox(3.9, 1.25, 0.7, 0, 0.63, 23.3, concreteDark);
    this.addBox(4.4, 0.18, 0.9, 0, 1.3, 20.6, concrete);
    this.addBox(4.4, 0.18, 0.9, 0, 1.3, 23.3, concrete);

    for (let i = -1; i <= 1; i += 1) {
      this.addBox(0.16, 3.2, 0.16, i * 4.2, 1.6, 16.5, metalDark);
    }
    this.addBox(8.7, 0.18, 0.18, 0, 3.18, 16.5, metalDark);
    this.addBox(8.7, 1.8, 0.06, 0, 2.15, 16.5, this.materials.rust, {
      collide: false,
    });

    const radio = this.addBox(0.7, 0.65, 0.4, 2, 1.2, 21, metalDark);
    radiolabel: {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 6),
        this.materials.glowGreen,
      );
      light.position.set(2.34, 1.28, 20.78);
      radio.add(light);
    }

    this.addBox(0.08, 5.5, 0.08, 4.8, 2.75, 21.2, metalDark);
    this.addBox(0.08, 0.08, 2.7, 4.8, 5.15, 20, metalDark, { collide: false });
    const antennaLight = new THREE.PointLight(0xff4e35, 1.8, 8, 2);
    antennaLight.position.set(4.8, 5.48, 21.2);
    this.scene.add(antennaLight);
    this.flickerLights.push({ light: antennaLight, base: 1.8, rate: 6, phase: rand(0, 8) });
  }

  buildWarehouse(x, z) {
    const { concrete, concreteDark, metalDark, rust, glowOrange } = this.materials;
    const width = 21;
    const depth = 15;
    const height = 6;
    this.addBox(width, 0.2, depth, x, 0.1, z, concreteDark, { collide: false });
    this.addBox(width, height, 0.45, x, height / 2, z - depth / 2, concrete);
    this.addBox(0.45, height, depth, x - width / 2, height / 2, z, concreteDark);
    this.addBox(0.45, height, depth, x + width / 2, height / 2, z, concreteDark);
    this.addBox(9, height, 0.45, x - 6, height / 2, z + depth / 2, concrete);
    this.addBox(9, height, 0.45, x + 6, height / 2, z + depth / 2, concrete);
    this.addBox(3, 2.5, 0.5, x, 1.25, z + depth / 2, metalDark);
    this.addBox(3, 3.5, 0.45, x, 4.25, z + depth / 2, metalDark);
    this.addBox(width + 0.8, 0.35, depth + 0.8, x, height + 0.2, z, rust);

    for (let i = -8; i <= 8; i += 4) {
      this.addBox(0.12, 1.4, 0.18, x + i, 3.4, z + depth / 2 + 0.24, metalDark, {
        collide: false,
      });
    }
    const sign = this.addBox(5.3, 1.25, 0.12, x + 3.5, 4.65, z + depth / 2 + 0.31, glowOrange, {
      collide: false,
      castShadow: false,
    });
    sign.material = sign.material.clone();
    sign.material.opacity = 0.75;
    sign.material.transparent = true;

    for (let i = 0; i < 6; i += 1) {
      this.addBox(2.4, 1.4, 1.7, x - 8 + rand(-0.4, 0.4), 0.7, z - 4 + i * 1.5, this.materials.wood, {
        collide: false,
      });
    }
  }

  buildGarage(x, z) {
    const { concrete, concreteDark, metalDark, rust } = this.materials;
    this.addBox(18, 0.2, 13, x, 0.1, z, concreteDark, { collide: false });
    this.addBox(18, 5.4, 0.45, x, 2.7, z - 6.5, concrete);
    this.addBox(0.45, 5.4, 13, x - 9, 2.7, z, concreteDark);
    this.addBox(0.45, 5.4, 13, x + 9, 2.7, z, concreteDark);
    this.addBox(18, 0.4, 13, x, 5.55, z, rust);
    this.addBox(7.4, 4.4, 0.25, x - 4.6, 2.2, z + 6.45, metalDark);
    this.addBox(7.4, 0.12, 0.28, x - 4.6, 1.2, z + 6.32, rust, { collide: false });
    this.addBox(7.4, 0.12, 0.28, x - 4.6, 2.4, z + 6.32, rust, { collide: false });
    this.addBox(7.4, 0.12, 0.28, x - 4.6, 3.6, z + 6.32, rust, { collide: false });
    this.addBox(1.3, 2.0, 0.12, x + 5.5, 1.98, z + 6.5, this.materials.glowGreen, {
      collide: false,
      castShadow: false,
    });

    const abandonedCar = new THREE.Group();
    const carBody = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.65, 4.3), metalDark);
    carBody.position.y = 0.7;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.65, 2.1), this.materials.rust);
    cabin.position.set(0, 1.26, -0.2);
    cabin.rotation.x = -0.04;
    abandonedCar.add(carBody, cabin);
    for (const wheelX of [-1.02, 1.02]) {
      for (const wheelZ of [-1.4, 1.35]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.36, 0.36, 0.22, 12),
          this.materials.metalDark,
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wheelX, 0.38, wheelZ);
        abandonedCar.add(wheel);
      }
    }
    abandonedCar.position.set(x + 3.3, 0, z + 1.2);
    abandonedCar.rotation.y = -0.23;
    abandonedCar.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    this.scene.add(abandonedCar);
    this.addCollider(2.3, 1.6, 4.5, x + 3.3, 0.8, z + 1.2);
  }

  buildSafehouse(x, z) {
    const { concrete, concreteDark, wood, rust, glowGreen } = this.materials;
    this.addBox(12, 0.18, 9, x, 0.09, z, concreteDark, { collide: false });
    this.addBox(12, 4.3, 0.35, x, 2.15, z - 4.5, concrete);
    this.addBox(0.35, 4.3, 9, x - 6, 2.15, z, concreteDark);
    this.addBox(0.35, 4.3, 9, x + 6, 2.15, z, concreteDark);
    this.addBox(3.8, 4.3, 0.35, x - 4.1, 2.15, z + 4.5, concrete);
    this.addBox(3.8, 4.3, 0.35, x + 4.1, 2.15, z + 4.5, concrete);
    this.addBox(2.2, 3.1, 0.42, x, 1.55, z + 4.5, wood);
    this.addBox(12.5, 0.35, 9.5, x, 4.4, z, rust);
    this.addBox(4.5, 0.16, 1.2, x, 0.09, z + 5.2, concrete);

    this.addBox(0.1, 1.4, 2.2, x - 5.8, 2.3, z + 1, glowGreen, {
      collide: false,
      castShadow: false,
    });
    const emergencyLight = new THREE.PointLight(0x89a75b, 1.35, 10, 2);
    emergencyLight.position.set(x - 5.55, 2.5, z + 1);
    this.scene.add(emergencyLight);
    this.flickerLights.push({ light: emergencyLight, base: 1.35, rate: 3, phase: rand(0, 8) });
  }

  buildContainers() {
    const positions = [
      [-8, -32, 0.12, 0],
      [8, -31, -0.05, 3.1],
      [31, 8, Math.PI / 2, 0],
      [34, 10, Math.PI / 2, 3.1],
      [-36, -18, 0.03, 0],
      [-14, 35, Math.PI / 2, 0],
      [39, -7, 0.1, 0],
    ];
    for (let i = 0; i < positions.length; i += 1) {
      const [x, z, rotation, height] = positions[i];
      const material = i % 3 === 0 ? this.materials.rust : i % 3 === 1 ? this.materials.orangeRust : this.materials.metal;
      const container = this.addBox(6.8, 2.65, 2.75, x, 1.33 + height, z, material, {
        rotationY: rotation,
      });
      const horizontal = Math.abs(Math.sin(rotation)) > 0.5;
      for (let stripe = -2.9; stripe < 3; stripe += 0.56) {
        const stripeMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 2.25, 0.035),
          this.materials.metalDark,
        );
        stripeMesh.position.set(stripe, 0, horizontal ? -1.39 : 1.39);
        stripeMesh.rotation.y = horizontal ? Math.PI / 2 : 0;
        container.add(stripeMesh);
      }
      const marking = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 0.8, 0.02),
        this.materials.orangeRust,
      );
      marking.position.set(-1.2, 0.2, -1.405);
      container.add(marking);
    }

    this.addBox(0.15, 2.2, 0.15, 30, 1.1, 6.5, this.materials.metalDark);
    this.addBox(0.15, 2.2, 0.15, 35.5, 1.1, 11.2, this.materials.metalDark);
  }

  buildBarricades() {
    const positions = [
      [-5, 9, 0.2],
      [4, 7, -0.4],
      [-13, 17, 0.7],
      [14, 12, -0.1],
      [0, -5, 0.2],
      [16, -8, 1.1],
      [-16, -6, -0.5],
      [10, 31, 0.1],
      [-27, 34, 0.5],
      [34, -30, -0.2],
    ];
    for (let index = 0; index < positions.length; index += 1) {
      const [x, z, rotation] = positions[index];
      const group = new THREE.Group();
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 1.2, 0.75),
        this.materials.concrete,
      );
      bar.position.y = 0.6;
      bar.castShadow = true;
      bar.receiveShadow = true;
      group.add(bar);
      for (const side of [-1.55, 1.55]) {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 1.22, 0.78),
          index % 2 ? this.materials.orangeRust : this.materials.metalDark,
        );
        stripe.position.set(side, 0.6, 0);
        group.add(stripe);
      }
      group.position.set(x, 0, z);
      group.rotation.y = rotation;
      this.scene.add(group);
      this.addCollider(
        Math.abs(Math.cos(rotation)) * 4.2 + Math.abs(Math.sin(rotation)) * 0.75,
        1.25,
        Math.abs(Math.sin(rotation)) * 4.2 + Math.abs(Math.cos(rotation)) * 0.75,
        x,
        0.63,
        z,
      );
    }
  }

  buildTrees() {
    const treePositions = [
      [-45, -45], [-31, -44], [-17, -46], [22, -43], [42, -39],
      [-46, 44], [-30, 47], [-9, 46], [10, 45], [33, 44], [46, 31],
      [-46, -1], [46, 19], [-35, 12], [44, -18],
    ];
    for (let i = 0; i < treePositions.length; i += 1) {
      const [x, z] = treePositions[i];
      const scale = rand(0.8, 1.45);
      const trunk = this.addBox(0.34 * scale, 3.8 * scale, 0.34 * scale, x, 1.9 * scale, z, this.materials.woodDark, {
        castShadow: true,
      });
      trunk.rotation.z = rand(-0.08, 0.08);
      const crownMaterial = i % 2 ? this.materials.deadLeaf : this.materials.deadLeaf2;
      for (let j = 0; j < 3; j += 1) {
        const crown = new THREE.Mesh(
          new THREE.ConeGeometry(2.1 * scale - j * 0.32, 2.5 * scale, 6),
          crownMaterial,
        );
        crown.position.set(
          x + rand(-0.4, 0.4),
          3.5 * scale + j * 0.85,
          z + rand(-0.35, 0.35),
        );
        crown.rotation.y = rand(0, Math.PI);
        crown.castShadow = j === 0;
        this.scene.add(crown);
      }
    }
  }

  buildStreetLights() {
    const positions = [
      [-18, -5, 0],
      [16, 6, 0],
      [-13, 28, 0],
      [26, 25, 0],
      [-4, -34, 0],
    ];
    for (let i = 0; i < positions.length; i += 1) {
      const [x, z] = positions[i];
      this.addBox(0.13, 4.9, 0.13, x, 2.45, z, this.materials.metalDark);
      this.addBox(0.14, 0.14, 1.7, x, 4.82, z + 0.72, this.materials.metalDark, {
        collide: false,
      });
      const lampMaterial = i === 2 ? this.materials.glowRed : this.materials.glowOrange;
      this.addBox(0.35, 0.12, 0.6, x, 4.68, z + 1.5, lampMaterial, {
        collide: false,
        castShadow: false,
      });
      if (i < 4) {
        const light = new THREE.PointLight(i === 2 ? 0xff422d : 0xffb260, i === 2 ? 2.1 : 1.25, 14, 2);
        light.position.set(x, 4.45, z + 1.5);
        this.scene.add(light);
        if (i === 0 || i === 2) {
          this.flickerLights.push({
            light,
            base: light.intensity,
            rate: rand(2.5, 7),
            phase: rand(0, 8),
          });
        }
      }
    }
  }

  buildAtmosphere() {
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let i = 0; i < 120; i += 1) {
      const radius = rand(45, 90);
      const angle = rand(0, Math.PI * 2);
      starPositions.push(
        Math.cos(angle) * radius,
        rand(25, 65),
        Math.sin(angle) * radius,
      );
    }
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0xb9cdc0,
        size: 0.08,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      }),
    );
    this.scene.add(stars);

    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = [];
    const dustSeeds = [];
    for (let i = 0; i < 520; i += 1) {
      dustPositions.push(rand(-55, 55), rand(0.2, 16), rand(-55, 55));
      dustSeeds.push(rand(0.15, 0.8));
    }
    dustGeometry.setAttribute("position", new THREE.Float32BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
      color: 0xc0cab8,
      size: 0.028,
      transparent: true,
      opacity: 0.33,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.dust = new THREE.Points(dustGeometry, dustMaterial);
    this.dust.userData.seeds = dustSeeds;
    this.scene.add(this.dust);

    const fogSheets = [];
    for (let i = 0; i < 9; i += 1) {
      const fog = new THREE.Mesh(
        new THREE.PlaneGeometry(rand(23, 46), rand(5, 12)),
        new THREE.MeshBasicMaterial({
          color: 0x7e9283,
          transparent: true,
          opacity: rand(0.018, 0.045),
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        }),
      );
      fog.position.set(rand(-45, 45), rand(1.8, 4.8), rand(-45, 35));
      fog.rotation.y = rand(0, Math.PI);
      fog.userData.drift = rand(-0.18, 0.18);
      fogSheets.push(fog);
      this.scene.add(fog);
    }
    this.fogSheets = fogSheets;
  }

  update(delta, elapsed) {
    if (this.dust) {
      const positions = this.dust.geometry.attributes.position;
      const seeds = this.dust.userData.seeds;
      for (let i = 0; i < positions.count; i += 1) {
        let x = positions.getX(i);
        x += delta * (0.13 + seeds[i] * 0.12);
        if (x > 55) x = -55;
        positions.setX(i, x);
      }
      positions.needsUpdate = true;
    }
    for (const sheet of this.fogSheets) {
      sheet.position.x += sheet.userData.drift * delta;
      if (sheet.position.x > 55) sheet.position.x = -55;
      if (sheet.position.x < -55) sheet.position.x = 55;
    }
    for (const flicker of this.flickerLights) {
      const noise = Math.sin(elapsed * flicker.rate + flicker.phase) * 0.5 +
        Math.sin(elapsed * flicker.rate * 2.73 + flicker.phase) * 0.25;
      flicker.light.intensity = flicker.base * (0.83 + noise * 0.13) *
        (Math.random() < 0.006 ? 0.5 : 1);
    }
  }

  pointBlocked(x, z, radius = 0.45) {
    if (x < -52.4 || x > 52.4 || z < -52.4 || z > 52.4) return true;
    for (const collider of this.colliders) {
      const nearestX = clamp(x, collider.minX, collider.maxX);
      const nearestZ = clamp(z, collider.minZ, collider.maxZ);
      const dx = x - nearestX;
      const dz = z - nearestZ;
      if (dx * dx + dz * dz < radius * radius && collider.maxY > 0.15) return true;
    }
    return false;
  }

  moveCircle(position, moveX, moveZ, radius, height = 1.75) {
    let nextX = position.x + moveX;
    if (!this.pointBlockedForBody(nextX, position.z, radius, position.y, height)) {
      position.x = nextX;
    }
    let nextZ = position.z + moveZ;
    if (!this.pointBlockedForBody(position.x, nextZ, radius, position.y, height)) {
      position.z = nextZ;
    }
  }

  pointBlockedForBody(x, z, radius, feetY, height) {
    if (x < -52.4 || x > 52.4 || z < -52.4 || z > 52.4) return true;
    for (const collider of this.colliders) {
      if (collider.maxY < feetY + 0.15 || collider.minY > feetY + height) continue;
      const nearestX = clamp(x, collider.minX, collider.maxX);
      const nearestZ = clamp(z, collider.minZ, collider.maxZ);
      const dx = x - nearestX;
      const dz = z - nearestZ;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  rayAABBDistance(origin, direction, maxDistance = 120) {
    let nearest = maxDistance;
    if (direction.y < -0.0001) {
      const groundDistance = -origin.y / direction.y;
      if (groundDistance >= 0 && groundDistance < nearest) nearest = groundDistance;
    }
    for (const collider of this.raycastColliders) {
      let tMin = 0;
      let tMax = maxDistance;
      const origins = [origin.x, origin.y, origin.z];
      const dirs = [direction.x, direction.y, direction.z];
      const mins = [collider.minX, collider.minY, collider.minZ];
      const maxs = [collider.maxX, collider.maxY, collider.maxZ];
      for (let axis = 0; axis < 3; axis += 1) {
        if (Math.abs(dirs[axis]) < 0.000001) {
          if (origins[axis] < mins[axis] || origins[axis] > maxs[axis]) {
            tMin = tMax + 1;
            break;
          }
        } else {
          let t1 = (mins[axis] - origins[axis]) / dirs[axis];
          let t2 = (maxs[axis] - origins[axis]) / dirs[axis];
          if (t1 > t2) [t1, t2] = [t2, t1];
          tMin = Math.max(tMin, t1);
          tMax = Math.min(tMax, t2);
          if (tMin > tMax) break;
        }
      }
      if (tMin <= tMax && tMin > 0.04 && tMin < nearest) nearest = tMin;
    }
    return nearest;
  }
}

class EffectSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.tracers = [];
    this.flashes = [];
    this.rings = [];
    this.particleGeometry = new THREE.IcosahedronGeometry(0.035, 0);
    this.sparkMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc56f,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.bloodMaterial = new THREE.MeshBasicMaterial({
      color: 0x801710,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.burstMaterials = new Map();
  }

  burst(point, color, count = 7, force = 2.4, size = 1) {
    const material = color === "blood"
      ? this.bloodMaterial
      : this.getBurstMaterial(color);
    for (let i = 0; i < count; i += 1) {
      const particle = new THREE.Mesh(this.particleGeometry, material);
      particle.position.copy(point);
      const baseScale = rand(0.6, 1.8) * size;
      particle.scale.setScalar(baseScale);
      const direction = new THREE.Vector3(rand(-1, 1), rand(-0.2, 1), rand(-1, 1)).normalize();
      direction.multiplyScalar(rand(force * 0.35, force));
      particle.userData.velocity = direction;
      particle.userData.life = rand(0.22, 0.62);
      particle.userData.maxLife = particle.userData.life;
      particle.userData.baseScale = baseScale;
      this.scene.add(particle);
      this.particles.push(particle);
    }
  }

  getBurstMaterial(color) {
    if (!this.burstMaterials.has(color)) {
      this.burstMaterials.set(
        color,
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
    }
    return this.burstMaterials.get(color);
  }

  blood(point, direction, headshot = false) {
    this.burst(point, "blood", headshot ? 17 : 10, headshot ? 4.2 : 3.2, headshot ? 1.5 : 1);
    this.burst(
      point,
      headshot ? 0xc7ff72 : 0xd64a31,
      headshot ? 7 : 3,
      headshot ? 3.5 : 2.2,
      headshot ? 1.25 : 0.8,
    );
    if (Math.random() < 0.15) {
      const splatter = new THREE.Mesh(
        new THREE.CircleGeometry(rand(0.06, 0.15), 5),
        new THREE.MeshBasicMaterial({
          color: 0x4a0c09,
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      splatter.position.copy(point).addScaledVector(direction, 0.08);
      splatter.lookAt(point.clone().add(direction));
      splatter.rotation.z = rand(0, Math.PI);
      splatter.userData.life = 7;
      splatter.userData.maxLife = 7;
      splatter.userData.ownedMaterial = true;
      this.scene.add(splatter);
      this.particles.push(splatter);
    }
  }

  impact(point) {
    this.burst(point, 0xffc266, 7, 2.7, 0.8);
    this.burst(point, 0x777a6b, 4, 1.6, 1.2);
  }

  tracer(start, end, color = 0xffd27b, opacity = 0.72) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geometry, material);
    line.userData.life = rand(0.035, 0.075);
    line.userData.maxLife = line.userData.life;
    this.scene.add(line);
    this.tracers.push(line);
  }

  muzzleFlash(position) {
    const light = new THREE.PointLight(0xffb75e, 8, 8, 2);
    light.position.copy(position);
    light.userData.life = 0.055;
    light.userData.maxLife = 0.055;
    this.scene.add(light);
    this.flashes.push(light);
  }

  explosion(position, radius = 7) {
    this.burst(position.clone().add(new THREE.Vector3(0, 0.25, 0)), 0xffa53d, 46, 12, 2.4);
    this.burst(position.clone().add(new THREE.Vector3(0, 0.6, 0)), 0xff4d1f, 34, 9, 2);
    this.burst(position.clone().add(new THREE.Vector3(0, 0.15, 0)), 0x545349, 24, 5, 2.8);

    const light = new THREE.PointLight(0xff6b24, 26, radius * 2.8, 2);
    light.position.copy(position).add(new THREE.Vector3(0, 1.3, 0));
    light.userData.life = 0.36;
    light.userData.maxLife = 0.36;
    this.scene.add(light);
    this.flashes.push(light);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8c41,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 32), ringMaterial);
    ring.position.copy(position).add(new THREE.Vector3(0, 0.12, 0));
    ring.rotation.x = -Math.PI / 2;
    ring.userData.life = 0.55;
    ring.userData.maxLife = 0.55;
    ring.userData.endRadius = radius;
    ring.userData.material = ringMaterial;
    this.scene.add(ring);
    this.rings.push(ring);

    const fireballMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6a25,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const fireball = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), fireballMaterial);
    fireball.position.copy(position).add(new THREE.Vector3(0, 1, 0));
    fireball.userData.life = 0.38;
    fireball.userData.maxLife = 0.38;
    fireball.userData.fireball = true;
    fireball.userData.material = fireballMaterial;
    this.scene.add(fireball);
    this.rings.push(fireball);
  }

  update(delta) {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.userData.life -= delta;
      if (particle.userData.life <= 0) {
        this.scene.remove(particle);
        if (particle.userData.ownedMaterial) particle.material.dispose();
        this.particles.splice(index, 1);
        continue;
      }
      if (particle.userData.velocity) {
        particle.userData.velocity.y -= 7.5 * delta;
        particle.position.addScaledVector(particle.userData.velocity, delta);
        if (particle.position.y < 0.03) {
          particle.position.y = 0.03;
          particle.userData.velocity.multiplyScalar(0.4);
          particle.userData.velocity.y = 0;
        }
      }
      if (particle.userData.baseScale) {
        particle.scale.setScalar(
          particle.userData.baseScale *
          clamp(particle.userData.life / particle.userData.maxLife, 0, 1),
        );
      }
    }

    for (let index = this.tracers.length - 1; index >= 0; index -= 1) {
      const line = this.tracers[index];
      line.userData.life -= delta;
      line.material.opacity = clamp(line.userData.life / line.userData.maxLife, 0, 1) * 0.72;
      if (line.userData.life <= 0) {
        this.scene.remove(line);
        line.geometry.dispose();
        line.material.dispose();
        this.tracers.splice(index, 1);
      }
    }

    for (let index = this.flashes.length - 1; index >= 0; index -= 1) {
      const light = this.flashes[index];
      light.userData.life -= delta;
      light.intensity *= 0.78;
      if (light.userData.life <= 0) {
        this.scene.remove(light);
        this.flashes.splice(index, 1);
      }
    }

    for (let index = this.rings.length - 1; index >= 0; index -= 1) {
      const object = this.rings[index];
      object.userData.life -= delta;
      const progress = 1 - object.userData.life / object.userData.maxLife;
      if (object.userData.fireball) {
        object.scale.setScalar(0.6 + progress * 4.7);
        object.userData.material.opacity = (1 - progress) * 0.68;
      } else {
        const radius = object.userData.endRadius;
        object.scale.setScalar(1 + progress * radius);
        object.userData.material.opacity = (1 - progress) * 0.7;
      }
      if (object.userData.life <= 0) {
        this.scene.remove(object);
        object.geometry.dispose();
        object.userData.material.dispose();
        this.rings.splice(index, 1);
      }
    }
  }
}

class Zombie {
  constructor(game, type, position, wave) {
    this.game = game;
    this.type = type;
    this.wave = wave;
    this.root = new THREE.Group();
    this.root.position.copy(position);
    this.root.userData.zombie = this;
    this.active = true;
    this.state = "spawning";
    this.dead = false;
    this.spawnTimer = 0;
    this.attackTimer = 0;
    this.attackCooldown = rand(0.4, 1.2);
    this.stagger = 0;
    this.walkPhase = rand(0, Math.PI * 2);
    this.lastHit = 0;
    this.sideStep = Math.random() > 0.5 ? 1 : -1;
    this.maxHealth = 90 + wave * 7;
    this.speed = rand(1.62, 1.96) + wave * 0.025;
    this.damage = 8 + wave * 0.55;
    this.scale = 1;
    this.attackRange = 1.3;
    this.attackWindup = 0.38;
    this.name = "游荡者";
    this.isBoss = false;
    this._materials = [];
    this._flashTimer = 0;

    if (type === "runner") {
      this.maxHealth = 58 + wave * 5;
      this.speed = 2.72 + wave * 0.035;
      this.damage = 6 + wave * 0.4;
      this.scale = 0.91;
      this.attackRange = 1.18;
      this.name = "疾行感染者";
    } else if (type === "brute") {
      this.maxHealth = 330 + wave * 22;
      this.speed = 0.9 + wave * 0.012;
      this.damage = 20 + wave * 0.8;
      this.scale = 1.34;
      this.attackRange = 1.6;
      this.attackWindup = 0.58;
      this.name = "重装变异体";
    } else if (type === "boss") {
      this.maxHealth = 760 + wave * 34;
      this.speed = 1.05 + wave * 0.008;
      this.damage = 25 + wave * 0.65;
      this.scale = 1.58;
      this.attackRange = 1.75;
      this.attackWindup = 0.48;
      this.name = "裂口者";
      this.isBoss = true;
    }

    this.health = this.maxHealth;
    this.targetScale = this.scale;
    this.root.scale.setScalar(0.01);
    this.buildModel();
    this.game.scene.add(this.root);
  }

  makeMesh(geometry, material, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = !this.isBoss || true;
    mesh.receiveShadow = true;
    return mesh;
  }

  buildModel() {
    const runner = this.type === "runner";
    const brute = this.type === "brute" || this.type === "boss";
    const skinColor = brute ? 0x5d4840 : runner ? 0x7d8273 : 0x66705d;
    const clothColor = brute ? 0x392d28 : runner ? 0x3c4039 : 0x374139;
    const accentColor = this.isBoss ? 0xa12d21 : brute ? 0x46221b : 0x242824;
    const makeMaterial = (color, emissive = 0x000000, roughness = 0.88, metalness = 0.02) => {
      const material = new THREE.MeshStandardMaterial({ color, emissive, roughness, metalness });
      this._materials.push({
        material,
        color,
        emissive,
        emissiveIntensity: material.emissiveIntensity,
      });
      return material;
    };
    const skin = makeMaterial(skinColor);
    const cloth = makeMaterial(clothColor);
    const dark = makeMaterial(accentColor, this.isBoss ? 0x2b0301 : 0x000000);
    const bone = makeMaterial(0xaaa387, 0x000000, 0.94);

    const torso = this.makeMesh(
      new THREE.BoxGeometry(brute ? 0.72 : 0.56, brute ? 0.9 : 0.79, brute ? 0.38 : 0.31),
      cloth,
      0,
      1.27,
      0,
    );
    torso.rotation.x = brute ? 0.12 : 0.08;
    this.root.add(torso);
    this.torso = torso;

    const shoulderL = this.makeMesh(new THREE.BoxGeometry(0.22, 0.18, 0.3), dark, -0.39, 1.48, 0);
    const shoulderR = shoulderL.clone();
    shoulderR.position.x *= -1;
    this.root.add(shoulderL, shoulderR);

    const neck = this.makeMesh(new THREE.CylinderGeometry(0.1, 0.13, 0.21, 7), skin, 0, 1.7, 0.01);
    this.root.add(neck);
    const head = this.makeMesh(new THREE.DodecahedronGeometry(brute ? 0.29 : 0.235, 1), skin, 0, 1.91, 0.04);
    head.scale.set(0.9, 1.12, 0.92);
    head.rotation.z = rand(-0.14, 0.14);
    this.root.add(head);
    this.head = head;

    const eyeMaterial = makeMaterial(0x381a12, this.isBoss ? 0xff2e19 : 0xb53422, 0.35);
    for (const side of [-1, 1]) {
      const eye = this.makeMesh(new THREE.SphereGeometry(0.026, 7, 5), eyeMaterial, side * 0.073, 1.95, 0.245);
      eye.scale.set(1, 0.7, 0.65);
      this.root.add(eye);
    }
    const jaw = this.makeMesh(new THREE.BoxGeometry(brute ? 0.26 : 0.19, 0.1, 0.22), dark, 0, 1.82, 0.12);
    jaw.rotation.x = 0.33;
    this.root.add(jaw);

    const legGeometry = new THREE.BoxGeometry(brute ? 0.27 : 0.19, brute ? 0.7 : 0.68, brute ? 0.27 : 0.2);
    this.leftLeg = new THREE.Group();
    this.rightLeg = new THREE.Group();
    this.leftLeg.position.set(-0.17, 0.83, 0);
    this.rightLeg.position.set(0.17, 0.83, 0);
    const leftLegMesh = this.makeMesh(legGeometry, cloth, 0, -0.31, 0);
    const rightLegMesh = this.makeMesh(legGeometry, cloth, 0, -0.31, 0);
    this.leftLeg.add(leftLegMesh);
    this.rightLeg.add(rightLegMesh);
    const leftBoot = this.makeMesh(new THREE.BoxGeometry(brute ? 0.3 : 0.22, 0.16, brute ? 0.4 : 0.3), dark, 0, -0.69, 0.06);
    const rightBoot = leftBoot.clone();
    this.leftLeg.add(leftBoot);
    this.rightLeg.add(rightBoot);
    this.root.add(this.leftLeg, this.rightLeg);

    const armGeometry = new THREE.BoxGeometry(brute ? 0.24 : 0.16, brute ? 0.68 : 0.63, brute ? 0.24 : 0.18);
    this.leftArm = new THREE.Group();
    this.rightArm = new THREE.Group();
    this.leftArm.position.set(-0.4, 1.47, 0);
    this.rightArm.position.set(0.4, 1.47, 0);
    this.leftArm.rotation.x = -1.03;
    this.rightArm.rotation.x = -1.11;
    this.leftArm.rotation.z = -0.07;
    this.rightArm.rotation.z = 0.05;
    const leftArmMesh = this.makeMesh(armGeometry, skin, 0, -0.3, 0);
    const rightArmMesh = this.makeMesh(armGeometry, skin, 0, -0.3, 0);
    this.leftArm.add(leftArmMesh);
    this.rightArm.add(rightArmMesh);
    this.leftHand = this.makeMesh(new THREE.DodecahedronGeometry(brute ? 0.15 : 0.105, 0), skin, 0, -0.66, 0.01);
    this.rightHand = this.leftHand.clone();
    this.leftArm.add(this.leftHand);
    this.rightArm.add(this.rightHand);
    this.root.add(this.leftArm, this.rightArm);

    if (brute) {
      const rib1 = this.makeMesh(new THREE.BoxGeometry(0.53, 0.045, 0.06), bone, 0, 1.35, 0.17);
      const rib2 = rib1.clone();
      rib2.position.y = 1.22;
      this.root.add(rib1, rib2);
    }
    if (this.isBoss) {
      const growth = this.makeMesh(
        new THREE.DodecahedronGeometry(0.32, 0),
        dark,
        -0.27,
        1.42,
        0.19,
      );
      growth.scale.set(1.3, 0.8, 0.7);
      growth.rotation.z = 0.7;
      this.root.add(growth);
    }

    this.root.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  get center() {
    return this.root.position.clone().add(new THREE.Vector3(0, 1.2 * this.scale, 0));
  }

  get hitProfile() {
    return {
      body: {
        center: this.root.position.clone().add(new THREE.Vector3(0, 1.15 * this.scale, 0)),
        radius: 0.42 * this.scale,
      },
      head: {
        center: this.root.position.clone().add(new THREE.Vector3(0, 1.9 * this.scale, 0)),
        radius: 0.27 * this.scale,
      },
    };
  }

  takeDamage(amount, headshot = false) {
    if (this.dead) return false;
    this.health -= amount;
    this.stagger = Math.max(this.stagger, headshot ? 0.19 : 0.075);
    this.flash();
    if (this.health <= 0) {
      this.die(headshot);
      return true;
    }
    if (headshot && Math.random() < 0.14) {
      this.state = "stagger";
      this.stagger = 0.55;
    }
    return false;
  }

  flash() {
    this._flashTimer = 0.075;
    for (const record of this._materials) {
      if (record.emissive !== 0xc6271e) {
        record.material.emissive.setHex(0xc6271e);
        record.material.emissiveIntensity = 1.05;
      }
    }
  }

  updateFlash(delta) {
    if (this._flashTimer <= 0) return;
    this._flashTimer -= delta;
    if (this._flashTimer <= 0) {
      for (const record of this._materials) {
        record.material.emissive.setHex(record.emissive);
        record.material.emissiveIntensity = record.emissiveIntensity;
      }
    }
  }

  die(headshot) {
    if (this.dead) return;
    this.dead = true;
    this.state = "dead";
    this.health = 0;
    this.deathTimer = 0;
    this.game.onZombieKilled(this, headshot);
  }

  update(delta, elapsed) {
    this.updateFlash(delta);
    if (!this.active) return;
    if (this.state === "spawning") {
      this.spawnTimer += delta;
      const progress = clamp(this.spawnTimer / 0.78, 0, 1);
      this.root.scale.setScalar(0.01 + this.targetScale * (1 - Math.pow(1 - progress, 3)));
      this.root.rotation.z = Math.sin(progress * Math.PI) * 0.12;
      this.root.position.y = (1 - progress) * -0.7;
      if (progress >= 1) {
        this.state = "chase";
        this.root.rotation.z = 0;
        this.root.position.y = 0;
      }
      return;
    }

    if (this.state === "dead") {
      this.deathTimer += delta;
      const fall = clamp(this.deathTimer / 0.72, 0, 1);
      this.root.rotation.z = damp(this.root.rotation.z, this.sideStep * 1.38, 10, delta);
      this.root.position.y = damp(this.root.position.y, 0.08, 9, delta);
      if (this.deathTimer > 2.2) {
        this.active = false;
        this.root.visible = false;
      }
      return;
    }

    this.stagger = Math.max(0, this.stagger - delta);
    this.attackTimer = Math.max(0, this.attackTimer - delta);
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    const toPlayer = new THREE.Vector3(
      this.game.player.position.x - this.root.position.x,
      0,
      this.game.player.position.z - this.root.position.z,
    );
    const distance = toPlayer.length();
    const direction = distance > 0.01 ? toPlayer.clone().normalize() : new THREE.Vector3();
    const desiredRotation = Math.atan2(direction.x, direction.z);
    this.root.rotation.y = dampAngle(this.root.rotation.y, desiredRotation, 7.5, delta);

    if (this.stagger > 0) {
      this.torso.rotation.z = Math.sin(this.stagger * 22) * 0.13;
      this.root.position.x += Math.sin(elapsed * 30) * delta * 0.08;
      return;
    }

    this.walkPhase += delta * this.speed * (this.type === "runner" ? 6.2 : 4.2);
    const stride = Math.sin(this.walkPhase);
    const strideScale = this.type === "runner" ? 1.25 : this.type === "brute" || this.isBoss ? 0.68 : 1;
    this.leftLeg.rotation.x = stride * 0.58 * strideScale;
    this.rightLeg.rotation.x = -stride * 0.58 * strideScale;
    this.leftArm.rotation.x = -1.05 + Math.sin(this.walkPhase + 0.4) * 0.14;
    this.rightArm.rotation.x = -1.12 - Math.sin(this.walkPhase + 0.4) * 0.14;
    this.torso.position.y = 1.27 + Math.abs(Math.sin(this.walkPhase)) * 0.025;
    this.head.rotation.z = Math.sin(elapsed * 2.2 + this.walkPhase) * 0.055;

    if (distance < this.attackRange && this.attackCooldown <= 0) {
      this.attackCooldown = this.type === "runner" ? rand(0.72, 1.08) : rand(1.05, 1.58);
      this.attackTimer = this.attackWindup;
      this.state = "attacking";
      this.game.audio.tone(this.isBoss ? 48 : 78, 0.18, 0.05, "sawtooth", 34);
      window.setTimeout(() => {
        if (
          this.active &&
          !this.dead &&
          this.game.phase === "playing" &&
          this.root.position.distanceTo(this.game.player.position) < this.attackRange + 0.52
        ) {
          this.game.damagePlayer(this.damage, this);
        }
      }, this.attackWindup * 1000);
      return;
    }

    if (this.state === "attacking") {
      const windup = this.attackTimer / this.attackWindup;
      this.rightArm.rotation.x = lerp(-1.1, -2.2, 1 - windup);
      if (this.attackTimer <= 0) this.state = "chase";
      return;
    }

    if (distance < 1.7) return;

    let moveDirection = direction.clone();
    if (this.type === "runner" && distance > 4 && this.attackCooldown < 0.1) {
      moveDirection.addScaledVector(direction, 0.08);
    }

    for (const other of this.game.zombies) {
      if (other === this || !other.active || other.dead) continue;
      const dx = this.root.position.x - other.root.position.x;
      const dz = this.root.position.z - other.root.position.z;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq > 0.001 && distanceSq < 1.1) {
        const factor = (1.1 - distanceSq) / 1.1;
        moveDirection.x += (dx / Math.sqrt(distanceSq)) * factor * 0.75;
        moveDirection.z += (dz / Math.sqrt(distanceSq)) * factor * 0.75;
      }
    }
    moveDirection.normalize();

    const beforeX = this.root.position.x;
    const beforeZ = this.root.position.z;
    const lightDraw = this.game.player.flashlight && distance < 19 ? 1.055 : 1;
    const speed = this.speed * (this.type === "runner" ? 1.03 : 1) * lightDraw;
    this.game.world.moveCircle(
      this.root.position,
      moveDirection.x * speed * delta,
      moveDirection.z * speed * delta,
      0.31 * this.scale,
      1.85 * this.scale,
    );
    const movedSq =
      (this.root.position.x - beforeX) ** 2 + (this.root.position.z - beforeZ) ** 2;
    if (movedSq < (speed * delta * 0.17) ** 2) {
      const side = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(this.sideStep);
      this.game.world.moveCircle(
        this.root.position,
        side.x * speed * delta,
        side.z * speed * delta,
        0.31 * this.scale,
        1.85 * this.scale,
      );
      if (Math.random() < 0.008) this.sideStep *= -1;
    }

    if (this.game.audio.context && Math.random() < delta * 0.13) {
      this.game.audio.growl(distance);
    }
  }

  dispose() {
    this.root.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose();
      }
    });
    for (const record of this._materials) record.material.dispose();
    this.game.scene.remove(this.root);
  }
}

function dampAngle(current, target, lambda, delta) {
  let difference = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (difference < -Math.PI) difference += Math.PI * 2;
  return current + difference * (1 - Math.exp(-lambda * delta));
}

function raySphere(origin, direction, sphere) {
  const oc = new THREE.Vector3().subVectors(origin, sphere.center);
  const b = oc.dot(direction);
  const c = oc.dot(oc) - sphere.radius * sphere.radius;
  const discriminant = b * b - c;
  if (discriminant < 0) return null;
  const sqrt = Math.sqrt(discriminant);
  const near = -b - sqrt;
  const far = -b + sqrt;
  if (near > 0) return near;
  if (far > 0) return far;
  return null;
}

class Game {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: dom.canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x070b08);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b130f);
    this.scene.fog = new THREE.FogExp2(0x0d1711, 0.0175);

    this.camera = new THREE.PerspectiveCamera(
      72,
      window.innerWidth / window.innerHeight,
      0.045,
      160,
    );
    this.camera.rotation.order = "YXZ";
    this.scene.add(this.camera);

    this.clock = new THREE.Clock();
    this.audio = new AudioSystem();
    this.world = new World(this.scene);
    this.effects = new EffectSystem(this.scene);
    this.pickupGeometries = this.createPickupGeometries();
    this.pickupMaterialCache = new Map();
    this.pickupIconCache = new Map();
    this.zombies = [];
    this.pickups = [];
    this.projectiles = [];
    this.keys = new Set();
    this.touchMove = new THREE.Vector2();
    this.phase = "menu";
    this.gameStarted = false;
    this.pointerLocked = false;
    this.pointerFallback = false;
    this.fallbackLookActive = false;
    this.pointerFallbackNoticeShown = false;
    this.mouseDown = false;
    this.lastShot = -10;
    this.elapsed = 0;
    this.hudTimer = 0;
    this.minimapTimer = 0;
    this.damageFlashTimer = 0;
    this.hitmarkerTimer = 0;
    this.toastTimer = 0;
    this.bannerTimer = 0;
    this.objectiveTimer = 0;
    this.raycaster = new THREE.Raycaster();
    this.tempVector = new THREE.Vector3();
    this.tempVector2 = new THREE.Vector3();
    this.globalLock = 0;
    this.stats = null;
    this.inventory = {};
    this.player = this.createPlayer();
    this.createFlashlight();
    this.createWeaponModels();
    this.cacheUI();
    this.bindEvents();
    this.bindUI();
    this.resetSession();
    this.updateHUD(true);
    this.animate();
  }

  createPlayer() {
    return {
      position: new THREE.Vector3(0, 0, 31),
      velocityY: 0,
      onGround: true,
      radius: 0.43,
      height: 1.74,
      eyeHeight: 1.68,
      currentEyeHeight: 1.68,
      yaw: 0,
      pitch: -0.03,
      health: 100,
      stamina: 100,
      aiming: false,
      sprinting: false,
      crouching: false,
      bobTime: 0,
      bobStrength: 0,
      landingKick: 0,
      recoilPitch: 0,
      recoilYaw: 0,
      shakeX: 0,
      shakeY: 0,
      shakeRoll: 0,
      weaponKick: 0,
      weaponSwayX: 0,
      weaponSwayY: 0,
      currentWeapon: 0,
      fireCooldown: 0,
      reloading: false,
      reloadRemaining: 0,
      reloadDuration: 0,
      flashlight: true,
      bleed: 0,
      bleedTick: 0,
      staminaDelay: 0,
      stepTimer: 0,
      hurtFlash: 0,
      weapons: WEAPONS.map((weapon) => ({
        ...weapon,
        mag: weapon.magSize,
      })),
    };
  }

  createFlashlight() {
    this.flashlight = new THREE.SpotLight(0xffe2ae, 4.8, 38, 0.38, 0.46, 1.35);
    this.flashlight.position.set(0.19, -0.13, -0.05);
    this.flashlight.target.position.set(0, -0.15, -8);
    this.flashlight.castShadow = false;
    this.camera.add(this.flashlight, this.flashlight.target);
  }

  createWeaponModels() {
    this.weaponRoot = new THREE.Group();
    this.weaponRoot.position.set(0.29, -0.28, -0.9);
    this.weaponRoot.scale.setScalar(0.7);
    this.camera.add(this.weaponRoot);
    this.weaponRigs = [];

    const mat = (color, metalness = 0.35, roughness = 0.55, emissive = 0x000000) =>
      new THREE.MeshStandardMaterial({
        color,
        metalness,
        roughness,
        emissive,
        emissiveIntensity: emissive ? 1.4 : 0,
      });
    const weaponMaterials = {
      dark: mat(0x171b18, 0.75, 0.37),
      body: mat(0x333a34, 0.62, 0.45),
      worn: mat(0x575c51, 0.55, 0.58),
      wood: mat(0x493121, 0.15, 0.78),
      accent: mat(0xb8d44c, 0.7, 0.36, 0x5a6c14),
      red: mat(0xb73c2e, 0.5, 0.42, 0x521007),
      glove: mat(0x242723, 0.05, 0.9),
    };
    const part = (group, width, height, depth, x, y, z, material, rotation = null) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      mesh.position.set(x, y, z);
      if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);
      return mesh;
    };
    const cylinder = (group, radiusTop, radiusBottom, height, x, y, z, material, rotateX = Math.PI / 2) => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 10),
        material,
      );
      mesh.position.set(x, y, z);
      mesh.rotation.x = rotateX;
      group.add(mesh);
      return mesh;
    };

    const rifle = new THREE.Group();
    part(rifle, 0.17, 0.15, 0.52, 0, 0, -0.05, weaponMaterials.body);
    part(rifle, 0.11, 0.08, 0.48, 0, 0.1, -0.24, weaponMaterials.worn);
    part(rifle, 0.13, 0.07, 0.36, 0, -0.03, -0.46, weaponMaterials.dark);
    cylinder(rifle, 0.022, 0.026, 0.48, 0, 0.02, -0.84, weaponMaterials.dark);
    cylinder(rifle, 0.035, 0.035, 0.16, 0, 0.02, -1.08, weaponMaterials.worn);
    part(rifle, 0.12, 0.23, 0.22, 0, -0.15, -0.08, weaponMaterials.dark, [0.24, 0, 0]);
    part(rifle, 0.15, 0.13, 0.26, 0, -0.04, 0.27, weaponMaterials.worn);
    part(rifle, 0.12, 0.17, 0.3, 0, 0.01, 0.49, weaponMaterials.dark);
    part(rifle, 0.05, 0.045, 0.26, 0, 0.16, -0.15, weaponMaterials.dark);
    part(rifle, 0.06, 0.04, 0.06, 0, 0.19, -0.05, weaponMaterials.accent);
    part(rifle, 0.08, 0.03, 0.3, 0, -0.12, -0.55, weaponMaterials.accent);
    part(rifle, 0.22, 0.28, 0.32, -0.095, -0.25, 0.28, weaponMaterials.glove, [0.25, -0.1, 0]);
    part(rifle, 0.2, 0.2, 0.34, 0.02, -0.23, -0.5, weaponMaterials.glove, [0.28, 0, -0.05]);
    const rifleMuzzle = new THREE.Object3D();
    rifleMuzzle.position.set(0, 0.02, -1.17);
    rifle.add(rifleMuzzle);
    rifle.userData.muzzle = rifleMuzzle;

    const shotgun = new THREE.Group();
    part(shotgun, 0.18, 0.16, 0.5, 0, 0, -0.08, weaponMaterials.body);
    part(shotgun, 0.13, 0.1, 0.44, 0, 0.08, -0.55, weaponMaterials.worn);
    cylinder(shotgun, 0.035, 0.039, 0.9, -0.04, 0.06, -0.91, weaponMaterials.dark);
    cylinder(shotgun, 0.029, 0.033, 0.82, 0.045, -0.015, -0.88, weaponMaterials.worn);
    part(shotgun, 0.19, 0.18, 0.34, 0, 0.01, 0.35, weaponMaterials.wood, [-0.08, 0, 0]);
    part(shotgun, 0.16, 0.26, 0.38, 0.08, -0.12, 0.62, weaponMaterials.wood, [-0.15, 0.1, 0]);
    part(shotgun, 0.16, 0.15, 0.32, -0.12, -0.18, -0.5, weaponMaterials.glove, [0.15, 0, 0.2]);
    part(shotgun, 0.14, 0.18, 0.26, 0.08, -0.16, 0.37, weaponMaterials.glove, [-0.2, 0.1, 0]);
    part(shotgun, 0.035, 0.025, 0.3, 0, 0.14, -0.52, weaponMaterials.red);
    const shotgunMuzzle = new THREE.Object3D();
    shotgunMuzzle.position.set(0, 0.06, -1.38);
    shotgun.add(shotgunMuzzle);
    shotgun.userData.muzzle = shotgunMuzzle;

    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc36a,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (const [group, scale] of [[rifle, 1], [shotgun, 1.28]]) {
      const flash = new THREE.Mesh(new THREE.ConeGeometry(0.065 * scale, 0.23 * scale, 7), flashMaterial.clone());
      flash.rotation.x = -Math.PI / 2;
      flash.position.copy(group.userData.muzzle.position);
      flash.position.z -= 0.1;
      flash.visible = false;
      group.add(flash);
      group.userData.flash = flash;
      group.visible = false;
      this.weaponRoot.add(group);
      this.weaponRigs.push(group);
    }
    this.weaponRigs[0].visible = true;
  }

  cacheUI() {
    this.ui = {
      healthValue: $("#health-value"),
      healthFill: $("#health-fill"),
      staminaValue: $("#stamina-value"),
      staminaFill: $("#stamina-fill"),
      weaponClass: $("#weapon-class"),
      weaponName: $("#weapon-name"),
      ammoMag: $("#ammo-mag"),
      ammoReserve: $("#ammo-reserve"),
      ammoTicks: $("#ammo-ticks"),
      ammoReadout: $(".ammo-readout"),
      weaponSlots: $$(".weapon-slot"),
      medCount: $("#med-count"),
      grenadeCount: $("#grenade-count"),
      foodCount: $("#food-count"),
      waveLabel: $("#wave-label"),
      waveTitle: $("#wave-title"),
      waveHint: $("#wave-hint"),
      enemyCounter: $("#enemy-counter"),
      waveProgress: $("#wave-progress-fill"),
      missionText: $("#mission-text"),
      missionSubtext: $("#mission-subtext"),
      missionSub: $("#mission-subtext"),
      compassHeading: $("#compass-heading"),
      compassCoords: $("#compass-coords"),
      interwaveValue: $("#interwave-value"),
      bossName: $("#boss-name"),
      bossHealthFill: $("#boss-health-fill"),
      flashlightStatus: $("#flashlight-status"),
      bleedStatus: $("#bleed-status"),
      objectiveKicker: $("#objective-kicker"),
      objectiveTitle: $("#objective-title"),
      objectiveDesc: $("#objective-desc"),
      waveBannerKicker: $("#wave-banner-kicker"),
      waveBannerTitle: $("#wave-banner-title"),
      waveBannerSubtitle: $("#wave-banner-subtitle"),
      carryWeight: $("#carry-weight"),
      carryFill: $("#carry-fill"),
      inventoryUsed: $("#inventory-used"),
      endKicker: $("#end-kicker"),
      endTitle: $("#end-title"),
      endDescription: $("#end-description"),
      endWave: $("#end-wave"),
      endKills: $("#end-kills"),
      endTime: $("#end-time"),
      endAccuracy: $("#end-accuracy"),
      endCard: $(".end-card"),
      audioButton: $("#audio-button"),
      retryButton: $("#retry-button"),
    };
  }

  resetSession() {
    for (const zombie of this.zombies) zombie.dispose();
    this.zombies.length = 0;
    const pickupsToRemove = [...this.pickups];
    this.pickups.length = 0;
    for (const pickup of pickupsToRemove) this.removePickup(pickup);
    for (const projectile of this.projectiles) this.scene.remove(projectile.mesh);
    this.projectiles.length = 0;
    this.audio.lastGrowl = 0;
    this.audio.setEnabled(this.audio.enabled);

    const player = this.player;
    player.position.set(0, 0, 31);
    player.velocityY = 0;
    player.onGround = true;
    player.yaw = 0;
    player.pitch = -0.03;
    player.health = 100;
    player.stamina = 100;
    player.aiming = false;
    player.sprinting = false;
    player.crouching = false;
    player.bleed = 0;
    player.bleedTick = 0;
    player.currentWeapon = 0;
    player.reloading = false;
    player.reloadRemaining = 0;
    player.fireCooldown = 0;
    player.flashlight = true;
    player.lastLowWarning = -20;
    player.weapons = WEAPONS.map((weapon) => ({
      ...weapon,
      mag: weapon.magSize,
    }));
    this.weaponRigs.forEach((rig, index) => {
      rig.visible = index === 0;
    });

    this.inventory = {
      med: 2,
      food: 1,
      grenade: 1,
      scrap: 3,
      cloth: 2,
      chemical: 1,
    };
    this.stats = {
      kills: 0,
      headshots: 0,
      shots: 0,
      hits: 0,
      wave: 0,
      startTime: 0,
      elapsed: 0,
      pickups: 0,
    };
    this.wave = 0;
    this.waveState = "idle";
    this.waveTotal = 0;
    this.waveKilled = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.prepRemaining = 0;
    this.clearDelay = 0;
    this.victoryTimer = 0;
    this.finalWaveCleared = false;
    this.waveCompletionQueued = false;
    this.globalLock = 0;
    this.mouseDown = false;
    this.fallbackLookActive = false;
    this.damageFlashTimer = 0;
    this.damageIndicatorTimer = 0;
    this.hitmarkerTimer = 0;
    this.bannerTimer = 0;
    this.objectiveTimer = 0;
    dom.damageVignette.style.opacity = "0";
    dom.hitmarker.classList.remove("visible", "kill");
    this.setupWaveOneLoot();
    this.hideBoss();
    this.updateQuickCounts();
    this.updateWeaponUI();
  }

  setupWaveOneLoot() {
    const initial = [
      { type: "ammo", position: new THREE.Vector3(3.8, 0, 22.6) },
      { type: "med", position: new THREE.Vector3(-5.2, 0, 19.2) },
      { type: "cloth", position: new THREE.Vector3(7.5, 0, 12.4) },
      { type: "chemical", position: new THREE.Vector3(-10, 0, 4) },
      { type: "scrap", position: new THREE.Vector3(15.2, 0, 2.2) },
      { type: "food", position: new THREE.Vector3(-17.5, 0, 8.4) },
      { type: "rifleAmmo", position: new THREE.Vector3(25.7, 0, 27.2) },
      { type: "grenade", position: new THREE.Vector3(-31, 0, 25.8) },
    ];
    for (const entry of initial) this.spawnPickup(entry.type, entry.position);
    this.spawnLoot(6);
  }

  bindEvents() {
    window.addEventListener("resize", () => this.resize());
    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === dom.canvas;
      if (this.pointerLocked) {
        if (this.gameStarted && this.phase === "paused") {
          this.phase = "playing";
          dom.pauseScreen.classList.add("hidden");
        }
      } else if (
        this.gameStarted &&
        this.phase === "playing" &&
        !isTouch
      ) {
        this.pauseGame();
      }
    });
    document.addEventListener("pointerlockerror", () => {
      if (this.gameStarted && !["gameover", "victory"].includes(this.phase)) {
        this.enablePointerFallback();
      }
    });
    document.addEventListener("mousemove", (event) => {
      if (
        (!this.pointerLocked && !(this.pointerFallback && this.fallbackLookActive)) ||
        this.phase !== "playing"
      ) {
        return;
      }
      const sensitivity = this.player.aiming ? 0.00115 : 0.00175;
      this.player.yaw -= event.movementX * sensitivity;
      this.player.pitch -= event.movementY * sensitivity;
      this.player.pitch = clamp(this.player.pitch, -1.42, 1.42);
      this.player.weaponSwayX = clamp(
        this.player.weaponSwayX + event.movementX * 0.00035,
        -0.045,
        0.045,
      );
      this.player.weaponSwayY = clamp(
        this.player.weaponSwayY + event.movementY * 0.00025,
        -0.035,
        0.035,
      );
    });
    document.addEventListener("mousedown", (event) => {
      if (
        (!this.pointerLocked && !this.pointerFallback) ||
        this.phase !== "playing" ||
        (this.pointerFallback && event.target !== dom.canvas)
      ) {
        return;
      }
      if (event.button === 0) {
        this.mouseDown = true;
        this.attemptFire();
      } else if (event.button === 2) {
        this.player.aiming = true;
        if (this.pointerFallback) this.fallbackLookActive = true;
      }
    });
    document.addEventListener("mouseup", (event) => {
      if (event.button === 0) this.mouseDown = false;
      if (event.button === 2) {
        this.player.aiming = false;
        this.fallbackLookActive = false;
      }
    });
    document.addEventListener("contextmenu", (event) => event.preventDefault());
    document.addEventListener("wheel", (event) => {
      if (this.phase !== "playing") return;
      this.switchWeapon(this.player.currentWeapon === 0 ? 1 : 0);
    }, { passive: true });

    document.addEventListener("keydown", (event) => this.onKeyDown(event));
    document.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener("blur", () => {
      if (this.phase === "playing" && !isTouch) this.pauseGame();
      this.keys.clear();
      this.mouseDown = false;
      this.player.aiming = false;
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.phase === "playing" && !isTouch) this.pauseGame();
    });
    this.bindTouchControls();
  }

  bindUI() {
    $("#start-button").addEventListener("click", () => this.startGame());
    $("#resume-button").addEventListener("click", () => this.resumeGame());
    $("#restart-button").addEventListener("click", () => this.restartGame());
    this.ui.retryButton.addEventListener("click", () => this.restartGame());
    $("#inventory-close").addEventListener("click", () => this.closeInventory());
    $("#backpack-shortcut").addEventListener("click", () => this.openInventory());
    $("#quick-med").addEventListener("click", () => this.useMedkit());
    $("#quick-grenade").addEventListener("click", () => this.throwGrenade());
    $("#quick-food").addEventListener("click", () => this.useFood());

    $("#howto-button").addEventListener("click", () => this.showHowto("start"));
    $("#pause-howto-button").addEventListener("click", () => this.showHowto("pause"));
    $("#howto-close").addEventListener("click", () => this.closeHowto());

    this.ui.audioButton.addEventListener("click", () => {
      this.audio.init();
      this.audio.setEnabled(!this.audio.enabled);
      this.ui.audioButton.textContent = `声音：${this.audio.enabled ? "开启" : "关闭"}`;
    });
  }

  onKeyDown(event) {
    if (event.code === "Tab") {
      event.preventDefault();
      if (this.phase === "playing") this.openInventory();
      else if (this.phase === "inventory") this.closeInventory();
      return;
    }
    if (event.code === "Escape") {
      if (this.phase === "inventory") {
        event.preventDefault();
        this.closeInventory();
      } else if (this.phase === "playing" && isTouch) {
        this.pauseGame();
      }
      return;
    }
    if (event.code === "KeyM") {
      this.audio.init();
      this.audio.setEnabled(!this.audio.enabled);
      return;
    }
    if (this.phase !== "playing") return;
    if (["Space", "KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft"].includes(event.code)) {
      event.preventDefault();
    }
    this.keys.add(event.code);
    if (event.repeat) return;
    if (event.code === "Space") this.player.jumpQueued = true;
    switch (event.code) {
      case "KeyR":
        this.startReload();
        break;
      case "KeyE":
        this.interact();
        break;
      case "KeyQ":
        this.toggleFlashlight();
        break;
      case "Digit1":
        this.switchWeapon(0);
        break;
      case "Digit2":
        this.switchWeapon(1);
        break;
      case "KeyH":
        this.useMedkit();
        break;
      case "KeyF":
        this.useFood();
        break;
      case "KeyG":
        this.throwGrenade();
        break;
      case "KeyP":
        if (!isTouch) document.exitPointerLock();
        else this.pauseGame();
        break;
      default:
        break;
    }
  }

  bindTouchControls() {
    const stick = $("#touch-stick");
    const knob = stick.querySelector("i");
    const lookZone = $("#touch-look");
    let stickPointer = null;
    let lookPointer = null;
    let lastLook = { x: 0, y: 0 };
    const updateStick = (event) => {
      const rect = stick.getBoundingClientRect();
      let dx = event.clientX - (rect.left + rect.width / 2);
      let dy = event.clientY - (rect.top + rect.height / 2);
      const length = Math.hypot(dx, dy);
      const max = rect.width * 0.33;
      if (length > max) {
        dx = (dx / length) * max;
        dy = (dy / length) * max;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.touchMove.set(dx / max, dy / max);
    };
    stick.addEventListener("pointerdown", (event) => {
      stickPointer = event.pointerId;
      stick.setPointerCapture(event.pointerId);
      updateStick(event);
    });
    stick.addEventListener("pointermove", (event) => {
      if (event.pointerId === stickPointer) updateStick(event);
    });
    const endStick = (event) => {
      if (event.pointerId !== stickPointer) return;
      stickPointer = null;
      this.touchMove.set(0, 0);
      knob.style.transform = "translate(0px, 0px)";
    };
    stick.addEventListener("pointerup", endStick);
    stick.addEventListener("pointercancel", endStick);

    lookZone.addEventListener("pointerdown", (event) => {
      lookPointer = event.pointerId;
      lastLook = { x: event.clientX, y: event.clientY };
      lookZone.setPointerCapture(event.pointerId);
    });
    lookZone.addEventListener("pointermove", (event) => {
      if (event.pointerId !== lookPointer || this.phase !== "playing") return;
      const dx = event.clientX - lastLook.x;
      const dy = event.clientY - lastLook.y;
      this.player.yaw -= dx * 0.0042;
      this.player.pitch = clamp(this.player.pitch - dy * 0.0037, -1.42, 1.42);
      lastLook = { x: event.clientX, y: event.clientY };
    });
    const endLook = (event) => {
      if (event.pointerId === lookPointer) lookPointer = null;
    };
    lookZone.addEventListener("pointerup", endLook);
    lookZone.addEventListener("pointercancel", endLook);

    const fire = $("#touch-fire");
    fire.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      this.mouseDown = true;
      this.attemptFire();
    });
    fire.addEventListener("pointerup", () => {
      this.mouseDown = false;
    });
    fire.addEventListener("pointercancel", () => {
      this.mouseDown = false;
    });
    $("#touch-aim").addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      this.player.aiming = !this.player.aiming;
    });
    $("#touch-reload").addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      this.startReload();
    });
    $("#touch-use").addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      this.interact();
    });
    $("#touch-backpack").addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      this.openInventory();
    });
    $("#touch-med").addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      this.useMedkit();
    });
    $("#touch-grenade").addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      this.throwGrenade();
    });
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    if (this.weaponRoot) {
      this.weaponRoot.scale.setScalar(this.camera.aspect < 0.9 ? 0.55 : 0.7);
    }
  }

  requestPointerLock() {
    if (isTouch || this.pointerFallback) {
      this.phase = "playing";
      return;
    }
    if (!dom.canvas.requestPointerLock) {
      this.enablePointerFallback();
      return;
    }
    const request = dom.canvas.requestPointerLock?.({ unadjustedMovement: true });
    if (request?.catch) {
      request.catch(() => {
        try {
          const fallback = dom.canvas.requestPointerLock();
          fallback?.catch?.(() => this.enablePointerFallback());
        } catch {
          this.enablePointerFallback();
        }
      });
    }
  }

  enablePointerFallback() {
    if (isTouch || ["gameover", "victory"].includes(this.phase)) return;
    this.pointerFallback = true;
    this.phase = "playing";
    dom.pauseScreen.classList.add("hidden");
    dom.howtoScreen.classList.add("hidden");
    if (!this.pointerFallbackNoticeShown) {
      this.pointerFallbackNoticeShown = true;
      this.showNotification("当前环境无法锁定鼠标：按住右键拖动视角，左键射击", "warning");
    }
  }

  startGame() {
    this.audio.init();
    if (!this.gameStarted) {
      this.resetSession();
      this.beginPrep(16, true);
    }
    this.gameStarted = true;
    this.phase = "playing";
    dom.startScreen.classList.add("hidden");
    dom.gameoverScreen.classList.add("hidden");
    dom.pauseScreen.classList.add("hidden");
    dom.inventoryScreen.classList.add("hidden");
    dom.hud.classList.remove("hidden");
    document.body.classList.add("in-game");
    if (isTouch) dom.touchControls.classList.remove("hidden");
    this.setFade(false);
    this.setPlayerCameraInstant();
    this.requestPointerLock();
    this.showNotification("目标：搜寻区域补给，守住无线电台", "warning");
    if (this.waveState === "prep") {
      this.showObjective("战前准备", "搜集物资并熟悉封锁区", "金属废料与化学品可组合成弹药，医疗包能清除出血");
    }
  }

  pauseGame() {
    if (!this.gameStarted || ["gameover", "victory", "end"].includes(this.phase)) return;
    this.phase = "paused";
    this.mouseDown = false;
    this.player.aiming = false;
    this.keys.clear();
    dom.pauseScreen.classList.remove("hidden");
    dom.inventoryScreen.classList.add("hidden");
  }

  resumeGame() {
    if (!this.gameStarted) return;
    this.audio.init();
    dom.pauseScreen.classList.add("hidden");
    dom.howtoScreen.classList.add("hidden");
    if (isTouch) {
      this.phase = "playing";
    } else if (this.pointerFallback) {
      this.phase = "playing";
    } else {
      this.phase = "paused";
      this.requestPointerLock();
    }
  }

  restartGame() {
    this.audio.init();
    this.setFade(false);
    dom.gameoverScreen.classList.add("hidden");
    dom.howtoScreen.classList.add("hidden");
    dom.pauseScreen.classList.add("hidden");
    this.gameStarted = false;
    this.resetSession();
    this.startGame();
  }

  setFade(visible) {
    dom.fade.style.opacity = visible ? "1" : "0";
    dom.fade.style.pointerEvents = visible ? "auto" : "none";
  }

  showHowto(source) {
    this.howtoSource = source;
    dom.howtoScreen.classList.remove("hidden");
  }

  closeHowto() {
    dom.howtoScreen.classList.add("hidden");
    if (this.howtoSource === "start" && !this.gameStarted) {
      dom.startScreen.classList.remove("hidden");
    } else if (this.howtoSource === "pause") {
      dom.pauseScreen.classList.remove("hidden");
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += delta;

    if (this.phase === "menu") {
      this.updateIntroCamera(delta);
      this.world.update(delta, this.elapsed);
      this.effects.update(delta);
    } else if (this.phase === "playing") {
      this.updateGame(delta);
      this.world.update(delta, this.elapsed);
      this.effects.update(delta);
    } else if (this.phase === "paused" || this.phase === "inventory") {
      this.world.update(delta * 0.15, this.elapsed);
    }
    this.renderer.render(this.scene, this.camera);
  }

  updateIntroCamera(delta) {
    const time = this.elapsed;
    const x = 16 + Math.sin(time * 0.035) * 4.5;
    const y = 5.2 + Math.sin(time * 0.11) * 0.25;
    const z = 34 + Math.cos(time * 0.028) * 3;
    this.camera.position.lerp(new THREE.Vector3(x, y, z), Math.min(1, delta * 1.8));
    const target = new THREE.Vector3(-5 + Math.sin(time * 0.05) * 2, 1.3, -5);
    this.camera.lookAt(target);
    this.weaponRoot.visible = false;
    dom.crosshair.style.opacity = "0";
  }

  updateGame(delta) {
    this.stats.elapsed += delta;
    this.player.fireCooldown = Math.max(0, this.player.fireCooldown - delta);
    this.updatePlayer(delta);
    if (this.phase !== "playing") return;
    this.updateWeaponVisual(delta);
    this.updateWaves(delta);
    if (this.phase !== "playing") return;

    for (const zombie of this.zombies) zombie.update(delta, this.elapsed);
    for (let index = this.zombies.length - 1; index >= 0; index -= 1) {
      const zombie = this.zombies[index];
      if (!zombie.active && zombie.dead) {
        zombie.dispose();
        this.zombies.splice(index, 1);
      }
    }
    this.updateProjectiles(delta);
    this.updatePickups(delta);
    this.updateInteractionPrompt();
    this.updateTimers(delta);

    if (this.mouseDown && !isTouch) {
      const weapon = this.player.weapons[this.player.currentWeapon];
      if (weapon.automatic) this.attemptFire();
    }

    this.hudTimer -= delta;
    if (this.hudTimer <= 0) {
      this.updateHUD();
      this.hudTimer = 0.055;
    }
    this.minimapTimer -= delta;
    if (this.minimapTimer <= 0) {
      this.drawMinimap();
      this.minimapTimer = 0.075;
    }
    this.updateDamageIndicator(delta);
  }

  updatePlayer(delta) {
    const player = this.player;
    let forwardInput = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);
    let strafeInput = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    forwardInput += -this.touchMove.y;
    strafeInput += this.touchMove.x;
    const inputLength = Math.hypot(forwardInput, strafeInput);
    if (inputLength > 1) {
      forwardInput /= inputLength;
      strafeInput /= inputLength;
    }
    const moving = Math.abs(forwardInput) + Math.abs(strafeInput) > 0.06;
    player.crouching = this.keys.has("KeyC") || this.keys.has("ControlLeft");
    const wantsSprint =
      (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight")) &&
      !player.crouching &&
      !player.aiming &&
      moving &&
      player.stamina > 0.5;
    player.sprinting = wantsSprint;
    if (wantsSprint) {
      player.stamina = Math.max(0, player.stamina - delta * 18.5);
      player.staminaDelay = 0.8;
    } else {
      player.staminaDelay = Math.max(0, player.staminaDelay - delta);
      if (player.staminaDelay <= 0) {
        player.stamina = Math.min(100, player.stamina + delta * 13.5);
      }
    }

    if (player.jumpQueued && player.onGround && !player.crouching) {
      player.velocityY = 5.25;
      player.onGround = false;
      player.jumpQueued = false;
      this.audio.noise(0.04, 0.045, 520, 90);
    } else {
      player.jumpQueued = false;
    }

    if (!player.onGround) {
      player.velocityY -= 13.2 * delta;
      player.position.y += player.velocityY * delta;
      if (player.position.y <= 0) {
        if (player.velocityY < -3) {
          player.landingKick = clamp(-player.velocityY * 0.009, 0.015, 0.055);
          this.audio.noise(0.055, 0.06, 380, 60);
        }
        player.position.y = 0;
        player.velocityY = 0;
        player.onGround = true;
      }
    }

    let speed = 5.05;
    if (player.sprinting) speed = 8.15;
    if (player.aiming) speed = 3.35;
    if (player.crouching) speed = 2.55;
    if (!player.onGround) speed *= 0.88;

    const directionX = -Math.sin(player.yaw) * forwardInput + Math.cos(player.yaw) * strafeInput;
    const directionZ = -Math.cos(player.yaw) * forwardInput - Math.sin(player.yaw) * strafeInput;
    this.world.moveCircle(
      player.position,
      directionX * speed * delta,
      directionZ * speed * delta,
      player.radius,
      player.crouching ? 1.2 : player.height,
    );

    const movementStrength = moving ? 1 : 0;
    const bobTarget = movementStrength * (player.sprinting ? 1.25 : player.aiming ? 0.2 : 0.72);
    player.bobStrength = damp(player.bobStrength, bobTarget, 7, delta);
    if (moving && player.onGround) {
      const previousBob = Math.sin(player.bobTime);
      player.bobTime += delta * (player.sprinting ? 12.5 : player.crouching ? 5.5 : 8.4);
      const currentBob = Math.sin(player.bobTime);
      if (previousBob > 0 && currentBob <= 0 && this.audio.context) {
        const volume = player.sprinting ? 0.052 : player.crouching ? 0.016 : 0.032;
        this.audio.noise(0.035, volume, player.sprinting ? 740 : 520, 80);
      }
    }

    player.landingKick = damp(player.landingKick, 0, 9, delta);
    player.recoilPitch = damp(player.recoilPitch, 0, 12, delta);
    player.recoilYaw = damp(player.recoilYaw, 0, 12, delta);
    player.shakeX = damp(player.shakeX, 0, 8, delta);
    player.shakeY = damp(player.shakeY, 0, 8, delta);
    player.shakeRoll = damp(player.shakeRoll, 0, 7, delta);
    player.weaponKick = damp(player.weaponKick, 0, 15, delta);
    player.weaponSwayX = damp(player.weaponSwayX, 0, 9, delta);
    player.weaponSwayY = damp(player.weaponSwayY, 0, 9, delta);

    const targetEye = player.crouching ? 1.16 : 1.68;
    player.currentEyeHeight = damp(player.currentEyeHeight, targetEye, 10, delta);
    const bobY = Math.abs(Math.sin(player.bobTime)) * 0.032 * player.bobStrength;
    const bobX = Math.cos(player.bobTime * 0.5) * 0.024 * player.bobStrength;
    const breathing = Math.sin(this.elapsed * 1.8) * 0.004 * (1 - player.bobStrength);
    this.camera.position.set(
      player.position.x + bobX + player.shakeX,
      player.position.y + player.currentEyeHeight + bobY - player.landingKick + breathing,
      player.position.z + player.shakeY,
    );
    this.camera.rotation.set(
      player.pitch + player.recoilPitch,
      player.yaw + player.recoilYaw,
      Math.sin(player.bobTime * 0.5) * 0.005 * player.bobStrength + player.shakeRoll,
    );

    const targetFov = player.aiming ? 56 : player.sprinting ? 76 : 72;
    const nextFov = damp(this.camera.fov, targetFov, 11, delta);
    if (Math.abs(nextFov - this.camera.fov) > 0.001) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
    dom.crosshair.classList.toggle("aiming", player.aiming);
    this.weaponRoot.visible = true;
    dom.crosshair.style.opacity = player.reloading ? "0.25" : "1";

    if (player.reloading) {
      player.reloadRemaining -= delta;
      if (player.reloadRemaining <= 0) this.finishReload();
    }

    if (player.bleed > 0) {
      player.bleed -= delta;
      player.bleedTick += delta;
      if (player.bleedTick >= 2.15) {
        player.bleedTick = 0;
        player.health = Math.max(0, player.health - 1.5);
        this.audio.hurt();
        this.showDamageVignette(0.32);
        if (player.health <= 0) this.killPlayer();
      }
    }

    this.flashlight.visible = player.flashlight;
    this.flashlight.intensity = player.flashlight
      ? 4.6 + Math.sin(this.elapsed * 19) * 0.11 + (Math.random() < 0.02 ? -1.25 : 0)
      : 0;
  }

  updateWeaponVisual(delta) {
    const player = this.player;
    const weapon = player.weapons[player.currentWeapon];
    const aim = player.aiming ? 1 : 0;
    const bob = player.bobStrength;
    const targetX = lerp(0.29, -0.02, aim) + Math.sin(player.bobTime * 0.5) * 0.008 * bob - player.weaponSwayX;
    const targetY = lerp(-0.28, -0.19, aim) - Math.abs(Math.sin(player.bobTime)) * 0.011 * bob - player.weaponSwayY;
    const targetZ = lerp(-0.9, -0.78, aim) + player.weaponKick * (weapon.id === "shotgun" ? 0.4 : 0.22);
    this.weaponRoot.position.x = damp(this.weaponRoot.position.x, targetX, 13, delta);
    this.weaponRoot.position.y = damp(this.weaponRoot.position.y, targetY, 13, delta);
    this.weaponRoot.position.z = damp(this.weaponRoot.position.z, targetZ, 18, delta);
    const reloadProgress = player.reloading
      ? 1 - player.reloadRemaining / player.reloadDuration
      : 0;
    const reloadArc = player.reloading ? Math.sin(reloadProgress * Math.PI) : 0;
    this.weaponRoot.rotation.x = damp(
      this.weaponRoot.rotation.x,
      -player.weaponKick * 3.7 - reloadArc * 0.42,
      13,
      delta,
    );
    this.weaponRoot.rotation.y = damp(
      this.weaponRoot.rotation.y,
      player.weaponSwayX * 1.8 + reloadArc * 0.14,
      11,
      delta,
    );
    this.weaponRoot.rotation.z = damp(
      this.weaponRoot.rotation.z + (aim - this.weaponRoot.rotation.z) * delta * 8,
      aim * 0.015 + reloadArc * 0.13,
      9,
      delta,
    );
    this.weaponRoot.position.y -= reloadArc * 0.13;
    const currentRig = this.weaponRigs[player.currentWeapon];
    if (currentRig.userData.flash) {
      currentRig.userData.flashTimer = Math.max(0, (currentRig.userData.flashTimer || 0) - delta);
      currentRig.userData.flash.visible = currentRig.userData.flashTimer > 0;
      if (currentRig.userData.flash.visible) {
        currentRig.userData.flash.scale.setScalar(rand(0.75, 1.3));
      }
    }
  }

  setPlayerCameraInstant() {
    this.camera.position.set(
      this.player.position.x,
      this.player.position.y + this.player.eyeHeight,
      this.player.position.z,
    );
    this.camera.rotation.set(this.player.pitch, this.player.yaw, 0);
    this.camera.fov = 72;
    this.camera.updateProjectionMatrix();
    this.weaponRoot.visible = true;
    dom.crosshair.style.opacity = "1";
  }

  currentWeapon() {
    return this.player.weapons[this.player.currentWeapon];
  }

  attemptFire() {
    if (this.phase !== "playing") return;
    const player = this.player;
    const weapon = this.currentWeapon();
    if (player.reloading) return;
    if (player.fireCooldown > 0) return;
    if (player.mag <= 0) {
      this.startReload();
      return;
    }
    this.camera.updateMatrixWorld(true);
    const weaponRig = this.weaponRigs[player.currentWeapon];
    const muzzle = new THREE.Vector3();
    weaponRig.userData.muzzle.getWorldPosition(muzzle);
    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    const baseDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const spread = player.aiming ? weapon.aimSpread : weapon.hipSpread;
    let anyHit = false;
    let anyHeadshot = false;
    this.stats.shots += 1;

    weapon.mag -= 1;
    player.lastShot = this.elapsed;
    player.fireCooldown = weapon.interval;
    player.weaponKick = weapon.recoil * (player.aiming ? 0.65 : 1);
    player.recoilPitch += weapon.recoil * (player.aiming ? 0.72 : 1);
    player.recoilYaw += rand(-weapon.recoil * 0.55, weapon.recoil * 0.55);
    player.shakeX += rand(-0.006, 0.006);
    player.shakeY += rand(-0.004, 0.004);
    player.shakeRoll += rand(-0.004, 0.004);
    weaponRig.userData.flashTimer = 0.048;
    weaponRig.userData.flash.visible = true;
    this.effects.muzzleFlash(muzzle);
    this.audio.gunshot(weapon.id);
    const pelletCount = weapon.pelletCount;
    for (let pellet = 0; pellet < pelletCount; pellet += 1) {
      const direction = baseDirection.clone()
        .addScaledVector(right, rand(-spread, spread))
        .addScaledVector(up, rand(-spread, spread))
        .normalize();
      let wallDistance = this.world.rayAABBDistance(origin, direction, weapon.range);
      let hitZombie = null;
      let hitDistance = wallDistance;
      let headshot = false;
      for (const zombie of this.zombies) {
        if (!zombie.active || zombie.dead || zombie.state === "spawning") continue;
        const profile = zombie.hitProfile;
        const headDistance = raySphere(origin, direction, profile.head);
        const bodyDistance = raySphere(origin, direction, profile.body);
        if (headDistance !== null && headDistance < hitDistance) {
          hitDistance = headDistance;
          hitZombie = zombie;
          headshot = true;
        } else if (bodyDistance !== null && bodyDistance < hitDistance && !headDistance) {
          hitDistance = bodyDistance;
          hitZombie = zombie;
          headshot = false;
        } else if (
          bodyDistance !== null &&
          bodyDistance < hitDistance &&
          headDistance !== null &&
          bodyDistance < headDistance
        ) {
          hitDistance = bodyDistance;
          hitZombie = zombie;
          headshot = false;
        }
      }
      const end = origin.clone().addScaledVector(direction, hitDistance);
      if (hitZombie) {
        anyHit = true;
        anyHeadshot ||= headshot;
        const distanceFalloff = weapon.id === "shotgun"
          ? 1 - clamp(hitDistance / weapon.range, 0, 1) * 0.62
          : 1;
        const damage = weapon.damage * (headshot ? weapon.headMultiplier : 1) * distanceFalloff;
        hitZombie.takeDamage(damage, headshot);
        this.effects.blood(end, direction, headshot);
      } else if (wallDistance < weapon.range - 0.1) {
        this.effects.impact(end);
      }
      if (pellet < 5 || weapon.id !== "shotgun") {
        this.effects.tracer(muzzle, end, weapon.id === "shotgun" ? 0xffb35d : 0xffdf8b, 0.75);
      }
    }

    if (anyHit) {
      this.stats.hits += 1;
      this.audio.hit(anyHeadshot);
      this.showHitmarker(false, anyHeadshot);
    }
    if (weapon.mag === 0) this.pendingAutoReload = 0.22;
    player.fireCooldown = weapon.interval;
    this.updateWeaponUI();
  }

  startReload() {
    const player = this.player;
    const weapon = this.currentWeapon();
    if (
      this.phase !== "playing" ||
      player.reloading ||
      weapon.mag >= weapon.magSize ||
      weapon.reserve <= 0
    ) {
      return;
    }
    const duration = weapon.mag === 0 ? weapon.emptyReloadTime : weapon.reloadTime;
    player.reloading = true;
    player.reloadDuration = duration;
    player.reloadRemaining = duration;
    dom.crosshair.classList.add("reloading");
    this.audio.reload();
    this.showToast("正在更换弹匣");
  }

  finishReload() {
    const player = this.player;
    const weapon = this.currentWeapon();
    const needed = weapon.magSize - weapon.mag;
    const loaded = Math.min(needed, weapon.reserve);
    weapon.mag += loaded;
    weapon.reserve -= loaded;
    player.reloading = false;
    player.reloadRemaining = 0;
    dom.crosshair.classList.remove("reloading");
    this.audio.noise(0.04, 0.12, 2600, 500);
    this.updateWeaponUI();
  }

  switchWeapon(index) {
    if (
      this.phase !== "playing" ||
      index === this.player.currentWeapon ||
      index < 0 ||
      index >= this.player.weapons.length
    ) {
      return;
    }
    this.player.currentWeapon = index;
    this.player.reloading = false;
    dom.crosshair.classList.remove("reloading");
    this.weaponRigs.forEach((rig, rigIndex) => {
      rig.visible = rigIndex === index;
    });
    this.player.weaponKick = 0.04;
    this.audio.noise(0.08, 0.08, 1200, 120);
    this.updateWeaponUI();
  }

  showHitmarker(kill = false, headshot = false) {
    dom.hitmarker.classList.add("visible");
    dom.hitmarker.classList.toggle("kill", kill);
    this.hitmarkerTimer = kill ? 0.22 : headshot ? 0.14 : 0.09;
  }

  updateTimers(delta) {
    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= delta;
      if (this.hitmarkerTimer <= 0) dom.hitmarker.classList.remove("visible", "kill");
    }
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= delta;
      dom.damageVignette.style.opacity = String(clamp(this.damageFlashTimer * 1.75, 0, 0.68));
      if (this.damageFlashTimer <= 0) dom.damageVignette.style.opacity = "0";
    }
    if (this.pendingAutoReload > 0) {
      this.pendingAutoReload -= delta;
      if (this.pendingAutoReload <= 0 && this.currentWeapon().mag === 0) {
        this.startReload();
      }
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= delta;
      if (this.toastTimer <= 0) dom.toast.classList.add("hidden");
    }
    if (this.bannerTimer > 0) {
      this.bannerTimer -= delta;
      if (this.bannerTimer <= 0) dom.waveBanner.classList.add("hidden");
    }
    if (this.objectiveTimer > 0) {
      this.objectiveTimer -= delta;
      if (this.objectiveTimer <= 0) dom.objectiveBanner.classList.add("hidden");
    }
  }

  updateDamageIndicator(delta) {
    if (this.damageIndicatorTimer > 0) {
      this.damageIndicatorTimer -= delta;
      if (this.damageIndicatorTimer < 0.2) {
        dom.damageIndicator.style.opacity = String(clamp(this.damageIndicatorTimer * 5, 0, 1));
      }
    }
  }

  toggleFlashlight() {
    this.player.flashlight = !this.player.flashlight;
    this.ui.flashlightStatus.classList.toggle("active", this.player.flashlight);
    this.showToast(this.player.flashlight ? "战术灯已开启" : "战术灯已关闭");
    this.audio.noise(0.03, 0.05, 1600, 400);
  }

  showDamageVignette(strength = 1) {
    this.damageFlashTimer = clamp(strength, 0.2, 0.72);
    dom.damageVignette.style.opacity = String(this.damageFlashTimer);
  }

  removeLastNotificationIfEmpty() {
    if (!this.showNotification.lastText) return;
    const nodes = [...dom.notifications.children];
    const last = nodes[nodes.length - 1];
    if (last && last.dataset.empty === "true") {
      last.remove();
    }
  }

  beginPrep(seconds, initial = false) {
    this.waveState = "prep";
    this.prepRemaining = seconds;
    this.clearDelay = 0;
    dom.interwaveTimer.classList.remove("hidden");
    if (initial) {
      this.ui.waveLabel.textContent = "WAVE 01";
      this.ui.waveTitle.textContent = "战前准备 · 灰港";
      this.ui.waveHint.textContent = "搜寻补给，熟悉封锁区";
    } else {
      this.ui.waveLabel.textContent = `WAVE ${String(this.wave + 1).padStart(2, "0")}`;
      this.ui.waveTitle.textContent = "尸潮间歇 · 现场补给";
      this.ui.waveHint.textContent = "制作弹药，补充医疗物资";
    }
    this.ui.waveProgress.style.width = "0%";
    this.hideBoss();
  }

  startWave() {
    this.wave += 1;
    this.stats.wave = this.wave;
    const data = WAVE_DATA[this.wave - 1];
    if (!data) return;
    this.waveState = "active";
    this.waveKilled = 0;
    this.waveCompletionQueued = false;
    this.clearDelay = 0;
    this.spawnTimer = 0.15;
    this.finalWaveCleared = false;
    dom.interwaveTimer.classList.add("hidden");

    const bossCount = data.boss ? 1 : 0;
    const runnerCount = Math.min(data.runners, data.count - bossCount - data.brutes);
    const bruteCount = Math.min(data.brutes, data.count - bossCount - runnerCount);
    const walkerCount = Math.max(0, data.count - runnerCount - bruteCount - bossCount);
    this.spawnQueue = [
      ...Array.from({ length: walkerCount }, () => "walker"),
      ...Array.from({ length: runnerCount }, () => "runner"),
      ...Array.from({ length: bruteCount }, () => "brute"),
    ];
    for (let i = this.spawnQueue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }
    if (data.boss) this.spawnQueue.push("boss");
    this.waveTotal = this.spawnQueue.length;
    this.ui.waveLabel.textContent = `WAVE ${String(this.wave).padStart(2, "0")}`;
    this.ui.waveTitle.textContent = data.title;
    this.ui.waveHint.textContent = data.final
      ? "清除所有威胁，等待救援抵达"
      : "感染体正在向无线电台聚集";
    this.showWaveBanner(
      data.final ? "FINAL ASSAULT" : "INCOMING HOSTILES",
      data.title,
      data.boss ? "检测到高危变异体信号" : "保持射击线畅通",
    );
    dom.objectiveBanner.classList.add("hidden");
    this.objectiveTimer = 0;
    this.audio.tone(this.wave === 1 ? 92 : 66, 0.85, 0.09, "sawtooth", 42);
  }

  updateWaves(delta) {
    if (this.waveState === "prep") {
      this.prepRemaining -= delta;
      dom.interwaveTimer.classList.remove("hidden");
      if (this.prepRemaining <= 0) {
        this.startWave();
      }
      return;
    }

    if (this.waveState === "active") {
      if (this.spawnQueue.length > 0) {
        this.spawnTimer -= delta;
        if (this.spawnTimer <= 0) {
          const type = this.spawnQueue.shift();
          this.spawnZombie(type);
          this.spawnTimer = rand(0.52, 0.9);
        }
      }

      const living = this.zombies.filter((zombie) => zombie.active && !zombie.dead).length;
      const progress = this.waveTotal
        ? clamp(this.waveKilled / this.waveTotal, 0, 1)
        : 0;
      this.ui.waveProgress.style.width = `${progress * 100}%`;
      if (this.spawnQueue.length === 0 && living === 0 && !this.waveCompletionQueued) {
        this.waveCompletionQueued = true;
        this.clearDelay = 1.1;
      }
      if (this.waveCompletionQueued) {
        this.clearDelay -= delta;
        if (this.clearDelay <= 0) this.completeWave();
      }
      return;
    }

    if (this.waveState === "clear") {
      if (this.finalWaveCleared) {
        this.victoryTimer -= delta;
        if (this.victoryTimer <= 0) this.endGame(true);
      } else {
        this.clearDelay -= delta;
        if (this.clearDelay <= 0) this.beginPrep(14, false);
      }
    }
  }

  completeWave() {
    this.waveState = "clear";
    this.waveCompletionQueued = false;
    this.ui.waveProgress.style.width = "100%";
    this.hideBoss();
    const data = WAVE_DATA[this.wave - 1];
    if (data.final) {
      this.finalWaveCleared = true;
      this.victoryTimer = 8.5;
      dom.interwaveTimer.classList.add("hidden");
      this.showWaveBanner(
        "EXTRACTION SIGNAL ESTABLISHED",
        "撤离信标已建立",
        "救援直升机预计 8 秒后抵达",
      );
      this.showObjective("最终目标已完成", "守住无线电台", "救援信号正在上传，准备撤离");
      this.audio.tone(240, 1.8, 0.08, "triangle", 860);
      return;
    }

    const rifle = this.player.weapons[0];
    const shotgun = this.player.weapons[1];
    rifle.reserve = Math.min(rifle.maxReserve, rifle.reserve + 16);
    shotgun.reserve = Math.min(shotgun.maxReserve, shotgun.reserve + 2);
    const dropPosition = new THREE.Vector3(rand(-4, 4), 0, rand(-14, -8));
    this.spawnPickup("airdrop", dropPosition, true);
    this.spawnLoot(5);
    this.clearDelay = 3.6;
    this.showWaveBanner(
      "SECTOR SECURED",
      `${data.title.split("·")[0].trim()}清除`,
      "补给空投已抵达 · 14 秒后下一波攻势",
    );
    this.showObjective("区域暂时安全", "补给空投已进入区域", "橙色信标包含弹药、医疗与制作材料");
    this.showNotification("波次奖励：步枪弹药 +16 / 霰弹 +2", "warning");
  }

  spawnZombie(type) {
    const minRadius = 18 + this.wave * 0.65;
    const maxRadius = Math.min(42, 27 + this.wave * 1.15);
    let spawnPoint = null;
    const ringCandidates = [];
    for (let attempt = 0; attempt < 28; attempt += 1) {
      const angle = rand(0, Math.PI * 2);
      const radius = rand(minRadius, maxRadius);
      const x = this.player.position.x + Math.cos(angle) * radius;
      const z = this.player.position.z + Math.sin(angle) * radius;
      if (
        x > -49 && x < 49 && z > -49 && z < 49 &&
        !this.world.pointBlocked(x, z, 0.7)
      ) {
        ringCandidates.push(new THREE.Vector3(x, 0, z));
      }
    }
    if (ringCandidates.length) {
      spawnPoint = pick(ringCandidates);
    }
    if (!spawnPoint) {
      const candidates = this.world.spawnPoints
        .filter((point) => point.distanceTo(this.player.position) > 18)
        .filter((point) => !this.world.pointBlocked(point.x, point.z, 0.65));
      spawnPoint = candidates.length ? pick(candidates) : null;
    }
    if (!spawnPoint) spawnPoint = new THREE.Vector3(0, 0, -44);
    const position = spawnPoint.clone().add(new THREE.Vector3(rand(-0.8, 0.8), 0, rand(-0.8, 0.8)));
    const zombie = new Zombie(this, type, position, this.wave);
    this.zombies.push(zombie);
    this.effects.burst(position.clone().add(new THREE.Vector3(0, 0.4, 0)), 0x52664c, 8, 1.6, 1.5);
    if (type === "boss") {
      this.showBoss(zombie);
      this.showNotification("警告：裂口者已进入封锁区", "danger");
      this.audio.tone(42, 1.2, 0.14, "sawtooth", 30);
    }
    return zombie;
  }

  showBoss(zombie) {
    this.activeBoss = zombie;
    this.ui.bossName.textContent = zombie.name;
    this.ui.bossHealthFill.style.width = "100%";
    dom.bossPanel.classList.remove("hidden");
  }

  hideBoss() {
    this.activeBoss = null;
    dom.bossPanel.classList.add("hidden");
  }

  spawnLoot(count = 4) {
    const weightedTypes = [
      "ammo", "ammo", "rifleAmmo", "med", "scrap", "scrap",
      "cloth", "cloth", "chemical", "food", "grenade",
    ];
    for (let i = 0; i < count; i += 1) {
      if (this.pickups.length > 30) return;
      const candidates = this.world.pickupPoints.filter((point) =>
        !this.pickups.some((pickup) => pickup.root.position.distanceTo(point) < 3),
      );
      const base = candidates.length
        ? pick(candidates)
        : new THREE.Vector3(rand(-38, 38), 0, rand(-38, 38));
      const position = base.clone().add(new THREE.Vector3(rand(-1.2, 1.2), 0, rand(-1.2, 1.2)));
      if (this.world.pointBlocked(position.x, position.z, 0.6)) {
        position.x += 2.3;
        position.z += 1.5;
      }
      this.spawnPickup(pick(weightedTypes), position);
    }
  }

  createPickupGeometries() {
    return {
      base: new THREE.BoxGeometry(0.58, 0.25, 0.4),
      trim: new THREE.BoxGeometry(0.6, 0.035, 0.42),
      ring: new THREE.TorusGeometry(0.47, 0.018, 6, 42),
      beam: new THREE.CylinderGeometry(0.17, 0.31, 1.8, 16, 1, true),
      airBase: new THREE.BoxGeometry(1.14, 0.44, 0.78),
      airTrim: new THREE.BoxGeometry(1.16, 0.08, 0.8),
      airRing: new THREE.TorusGeometry(0.95, 0.018, 6, 42),
      airBeam: new THREE.CylinderGeometry(0.45, 0.7, 7.5, 16, 1, true),
    };
  }

  getPickupMaterials(color, airdrop) {
    const key = `${color}-${airdrop ? "air" : "field"}`;
    if (!this.pickupMaterialCache.has(key)) {
      const base = new THREE.MeshStandardMaterial({
        color: airdrop ? 0x66432b : 0x343c34,
        roughness: 0.73,
        metalness: 0.34,
        emissive: color,
        emissiveIntensity: 0.11,
      });
      const trim = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: airdrop ? 1.9 : 1.05,
        roughness: 0.38,
        metalness: 0.4,
      });
      const glow = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: airdrop ? 0.27 : 0.13,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      this.pickupMaterialCache.set(key, { base, trim, glow });
    }
    return this.pickupMaterialCache.get(key);
  }

  spawnPickup(type, position, airdrop = false) {
    const group = new THREE.Group();
    let safePosition = position.clone();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const overlapsExisting = this.pickups.some(
        (pickup) => pickup.root.position.distanceTo(safePosition) < 1.25,
      );
      if (!overlapsExisting) break;
      safePosition.add(new THREE.Vector3(rand(-1.5, 1.5), 0, rand(-1.5, 1.5)));
    }
    group.position.copy(safePosition);
    const def = ITEM_DEFS[type] || ITEM_DEFS.rifleAmmo;
    const color = airdrop ? 0xff9b49 : new THREE.Color(def.color).getHex();
    const { base: baseMaterial, trim: trimMaterial, glow: glowMaterial } =
      this.getPickupMaterials(color, airdrop);
    const base = new THREE.Mesh(
      airdrop ? this.pickupGeometries.airBase : this.pickupGeometries.base,
      baseMaterial,
    );
    base.position.y = airdrop ? 0.28 : 0.16;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);
    const trim = new THREE.Mesh(
      airdrop ? this.pickupGeometries.airTrim : this.pickupGeometries.trim,
      trimMaterial,
    );
    trim.position.y = airdrop ? 0.5 : 0.295;
    group.add(trim);

    const ring = new THREE.Mesh(
      airdrop ? this.pickupGeometries.airRing : this.pickupGeometries.ring,
      glowMaterial,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.035;
    group.add(ring);

    const beam = new THREE.Mesh(
      airdrop ? this.pickupGeometries.airBeam : this.pickupGeometries.beam,
      glowMaterial,
    );
    beam.position.y = airdrop ? 3.8 : 1.0;
    group.add(beam);

    const iconMaterial = this.makePickupIcon(airdrop ? "⬡" : def.glyph, color);
    const icon = new THREE.Sprite(iconMaterial);
    icon.scale.set(airdrop ? 0.68 : 0.38, airdrop ? 0.68 : 0.38, 1);
    icon.position.y = airdrop ? 1.55 : 0.83;
    group.add(icon);

    const light = new THREE.PointLight(color, airdrop ? 3.3 : 1.2, airdrop ? 7 : 3.9, 2);
    light.position.y = airdrop ? 0.8 : 0.45;
    group.add(light);
    this.scene.add(group);

    const pickupRecord = {
      root: group,
      type,
      airdrop,
      baseY: safePosition.y,
      ring,
      beam,
      icon,
      bobPhase: rand(0, Math.PI * 2),
    };
    this.pickups.push(pickupRecord);
    if (airdrop) {
      this.effects.burst(safePosition.clone().add(new THREE.Vector3(0, 0.2, 0)), 0xff9b49, 18, 3.2, 1.3);
    }
    return pickupRecord;
  }

  makePickupIcon(glyph, color) {
    const cacheKey = `${glyph}-${color}`;
    if (this.pickupIconCache.has(cacheKey)) return this.pickupIconCache.get(cacheKey);
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, 128, 128);
    context.beginPath();
    context.arc(64, 64, 48, 0, Math.PI * 2);
    context.fillStyle = "rgba(5,9,7,.73)";
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = `#${new THREE.Color(color).getHexString()}`;
    context.stroke();
    context.fillStyle = `#${new THREE.Color(color).getHexString()}`;
    context.font = "58px 'Barlow Condensed', 'Microsoft YaHei', sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(glyph, 64, 67);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.95,
    });
    this.pickupIconCache.set(cacheKey, material);
    return material;
  }

  updatePickups(delta) {
    for (const pickup of this.pickups) {
      pickup.bobPhase += delta;
      pickup.ring.rotation.z += delta * (pickup.airdrop ? 0.6 : 1.5);
      pickup.icon.position.y = (pickup.airdrop ? 1.55 : 0.83) + Math.sin(pickup.bobPhase * 2.1) * 0.055;
      pickup.beam.scale.x = pickup.beam.scale.z =
        1 + Math.sin(pickup.bobPhase * 2.7) * (pickup.airdrop ? 0.08 : 0.04);
      if (pickup.airdrop && Math.random() < delta * 3) {
        this.effects.burst(
          pickup.root.position.clone().add(new THREE.Vector3(rand(-1, 1), rand(0.2, 2.4), rand(-0.5, 0.5))),
          0xff9b49,
          1,
          0.45,
          0.8,
        );
      }
    }
  }

  findNearestPickup(maxDistance = 2.6) {
    let nearest = null;
    let nearestDistance = maxDistance;
    for (const pickup of this.pickups) {
      const dx = pickup.root.position.x - this.player.position.x;
      const dz = pickup.root.position.z - this.player.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < nearestDistance) {
        nearest = pickup;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  updateInteractionPrompt() {
    const nearest = this.findNearestPickup();
    if (!nearest) {
      this.nearestPickup = null;
      dom.prompt.classList.add("hidden");
      return;
    }
    this.nearestPickup = nearest;
    const name = nearest.airdrop
      ? "紧急空投补给箱"
      : nearest.type === "ammo"
        ? "通用弹药箱"
        : nearest.type === "rifleAmmo"
          ? "步枪弹药"
          : ITEM_DEFS[nearest.type]?.name || "未知物资";
    $("#interaction-action").textContent = nearest.airdrop ? "开启空投" : "拾取物资";
    $("#interaction-name").textContent = name;
    dom.prompt.classList.remove("hidden");
  }

  interact() {
    if (this.phase !== "playing") return;
    const nearest = this.findNearestPickup();
    if (!nearest) return;
    const pickedUp = this.pickups.filter((pickup) => {
      const distanceToNearest = pickup.root.position.distanceTo(nearest.root.position);
      return distanceToNearest < 1.15;
    });
    if (!pickedUp.includes(nearest)) pickedUp.push(nearest);
    const isAirDrop = pickedUp.some((pickup) => pickup.airdrop);
    this.effects.burst(
      nearest.root.position.clone().add(new THREE.Vector3(0, 0.4, 0)),
      isAirDrop ? 0xff9b49 : new THREE.Color(ITEM_DEFS[nearest.type]?.color || "#e0ff65").getHex(),
      isAirDrop ? 18 : 8,
      2.2,
      1.1,
    );
    for (const pickup of pickedUp) this.removePickup(pickup);
    this.nearestPickup = null;
    dom.prompt.classList.add("hidden");
    this.stats.pickups += pickedUp.length;

    if (isAirDrop) {
      this.inventory.scrap += 4;
      this.inventory.cloth += 3;
      this.inventory.chemical += 2;
      this.inventory.med += 1;
      this.inventory.grenade += 1;
      const rifle = this.player.weapons[0];
      const shotgun = this.player.weapons[1];
      rifle.reserve = Math.min(rifle.maxReserve, rifle.reserve + 60);
      shotgun.reserve = Math.min(shotgun.maxReserve, shotgun.reserve + 6);
      this.showNotification("空投回收：废料 +4 / 布料 +3 / 化学品 +2", "warning");
      this.showToast("弹药与医疗物资已补充");
    } else {
      for (const pickup of pickedUp) this.collectItem(pickup.type);
    }
    this.audio.pickup();
    this.updateQuickCounts();
    this.updateWeaponUI();
  }

  collectItem(type) {
    const player = this.player;
    switch (type) {
      case "ammo": {
        const rifle = player.weapons[0];
        const shotgun = player.weapons[1];
        rifle.reserve = Math.min(rifle.maxReserve, rifle.reserve + 30);
        shotgun.reserve = Math.min(shotgun.maxReserve, shotgun.reserve + 3);
        this.showNotification("弹药补给：步枪 +30 / 霰弹 +3");
        break;
      }
      case "rifleAmmo": {
        const rifle = player.weapons[0];
        rifle.reserve = Math.min(rifle.maxReserve, rifle.reserve + 30);
        this.showNotification("步枪弹药 +30");
        break;
      }
      case "med":
        this.inventory.med += 1;
        this.showNotification("医疗包 +1");
        break;
      case "food":
        this.inventory.food += 1;
        this.showNotification("压缩口粮 +1");
        break;
      case "grenade":
        this.inventory.grenade += 1;
        this.showNotification("燃烧瓶 +1");
        break;
      case "scrap":
        this.inventory.scrap += 2;
        this.showNotification("机械废料 +2");
        break;
      case "cloth":
        this.inventory.cloth += 2;
        this.showNotification("感染区布料 +2");
        break;
      case "chemical":
        this.inventory.chemical += 1;
        this.showNotification("化学制剂 +1");
        break;
      default:
        break;
    }
  }

  removePickup(pickup) {
    const index = this.pickups.indexOf(pickup);
    if (index >= 0) this.pickups.splice(index, 1);
    pickup.root.visible = false;
    this.scene.remove(pickup.root);
  }

  useMedkit() {
    if (!this.gameStarted || !["playing", "inventory"].includes(this.phase)) return;
    if (this.inventory.med <= 0) {
      this.showNotification("医疗包已耗尽", "danger");
      return;
    }
    if (this.player.health >= 100 && this.player.bleed <= 0) {
      this.showNotification("生命体征已稳定");
      return;
    }
    this.inventory.med -= 1;
    this.player.health = Math.min(100, this.player.health + 38);
    this.player.bleed = 0;
    this.player.bleedTick = 0;
    dom.healFlash.style.opacity = "0.42";
    window.setTimeout(() => {
      dom.healFlash.style.opacity = "0";
    }, 260);
    this.audio.tone(320, 0.34, 0.06, "sine", 760);
    this.showNotification("医疗包已使用 · 生命 +38");
    this.updateQuickCounts();
    if (this.phase === "inventory") this.renderInventory();
  }

  useFood() {
    if (!this.gameStarted || !["playing", "inventory"].includes(this.phase)) return;
    if (this.inventory.food <= 0) {
      this.showNotification("口粮已耗尽", "danger");
      return;
    }
    if (this.player.health >= 100 && this.player.stamina >= 95) {
      this.showNotification("当前不需要进食");
      return;
    }
    this.inventory.food -= 1;
    this.player.health = Math.min(100, this.player.health + 18);
    this.player.stamina = Math.min(100, this.player.stamina + 25);
    dom.healFlash.style.opacity = "0.26";
    window.setTimeout(() => {
      dom.healFlash.style.opacity = "0";
    }, 260);
    this.showNotification("口粮已使用 · 生命 +18 / 体力 +25");
    this.updateQuickCounts();
    if (this.phase === "inventory") this.renderInventory();
  }

  throwGrenade() {
    if (this.phase !== "playing") return;
    if (this.inventory.grenade <= 0) {
      this.showNotification("没有可用的燃烧瓶", "danger");
      return;
    }
    this.inventory.grenade -= 1;
    this.audio.noise(0.09, 0.08, 1600, 140);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const position = this.camera.position.clone().addScaledVector(direction, 0.72);
    position.y -= 0.12;
    const group = new THREE.Group();
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x9b7048,
      emissive: 0xff6a2b,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.84,
      roughness: 0.3,
      metalness: 0.08,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.35, 10), glassMaterial);
    body.rotation.z = 0.22;
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.047, 0.06, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: 0x3b2d20, roughness: 0.9 }),
    );
    cap.position.y = 0.23;
    group.add(body, cap);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.19, 7),
      new THREE.MeshBasicMaterial({
        color: 0xff9c3e,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    flame.position.y = 0.37;
    group.add(flame);
    group.position.copy(position);
    this.scene.add(group);
    this.projectiles.push({
      type: "grenade",
      mesh: group,
      velocity: direction.multiplyScalar(12.5).add(new THREE.Vector3(0, 3.0, 0)),
      fuse: 1.85,
      materials: [group.children[0].material, group.children[1].material, flame.material],
    });
    this.updateQuickCounts();
    this.showToast("燃烧瓶已投出");
  }

  updateProjectiles(delta) {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      projectile.fuse -= delta;
      projectile.velocity.y -= 12 * delta;
      projectile.mesh.position.addScaledVector(projectile.velocity, delta);
      projectile.mesh.rotation.x += delta * 8.5;
      projectile.mesh.rotation.z += delta * 6.3;
      if (projectile.mesh.position.y < 0.11) {
        projectile.mesh.position.y = 0.11;
        projectile.velocity.y = Math.abs(projectile.velocity.y) * 0.22;
        projectile.velocity.x *= 0.75;
        projectile.velocity.z *= 0.75;
      }
      if (projectile.fuse <= 0) {
        this.explodeGrenade(projectile);
        this.projectiles.splice(index, 1);
      }
    }
  }

  explodeGrenade(projectile) {
    const position = projectile.mesh.position.clone();
    this.scene.remove(projectile.mesh);
    for (const material of projectile.materials) material.dispose();
    this.effects.explosion(position, 7);
    this.audio.explosion();
    this.player.shakeX += rand(-0.08, 0.08);
    this.player.shakeY += rand(-0.06, 0.06);
    this.player.shakeRoll += rand(-0.04, 0.04);
    this.showDamageVignette(0.2);
    for (const zombie of this.zombies) {
      if (!zombie.active || zombie.dead) continue;
      const distance = zombie.root.position.distanceTo(position);
      if (distance < 7.2) {
        const damage = 230 * (1 - distance / 8.6);
        zombie.takeDamage(damage, false);
        if (zombie.dead) continue;
        zombie.stagger = Math.max(zombie.stagger, 0.65);
      }
    }
    const playerDistance = this.player.position.distanceTo(position);
    if (playerDistance < 4.3) {
      const damage = 28 * (1 - playerDistance / 4.8);
      this.damagePlayer(Math.max(5, damage), null, true);
    }
    this.showNotification("燃烧瓶爆炸", "warning");
  }

  damagePlayer(amount, attacker, explosion = false) {
    if (this.phase !== "playing" || this.player.health <= 0) return;
    this.player.health = Math.max(0, this.player.health - amount);
    this.showDamageVignette(clamp(0.42 + amount * 0.009, 0.42, 0.72));
    this.audio.hurt();
    this.player.shakeX += rand(-0.05, 0.05);
    this.player.shakeY += rand(-0.04, 0.04);
    this.player.shakeRoll += rand(-0.035, 0.035);

    if (attacker && !explosion) {
      const toAttacker = new THREE.Vector3(
        attacker.root.position.x - this.player.position.x,
        0,
        attacker.root.position.z - this.player.position.z,
      ).normalize();
      const right = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw));
      const forward = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
      const angle = Math.atan2(toAttacker.dot(right), toAttacker.dot(forward));
      dom.damageIndicator.style.setProperty("--angle", `${angle}rad`);
      dom.damageIndicator.style.opacity = "1";
      this.damageIndicatorTimer = 1.2;
      if (
        (attacker.type === "brute" || attacker.isBoss) &&
        Math.random() < 0.28 &&
        this.player.bleed <= 0
      ) {
        this.player.bleed = 11;
        this.player.bleedTick = 0;
        this.showNotification("警告：严重创伤，正在出血", "danger");
      }
    }

    if (this.player.health <= 0) {
      this.killPlayer();
    } else if (
      this.player.health < 30 &&
      this.elapsed - (this.player.lastLowWarning || -20) > 14
    ) {
      this.player.lastLowWarning = this.elapsed;
      this.showNotification("生命体征危险，寻找医疗包", "danger");
    }
  }

  killPlayer() {
    if (this.phase === "gameover") return;
    this.player.health = 0;
    this.phase = "gameover";
    this.mouseDown = false;
    this.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    this.audio.tone(70, 1.6, 0.13, "sawtooth", 30);
    this.setFade(true);
    window.setTimeout(() => this.showEndScreen(false), 820);
  }

  endGame(won) {
    if (["gameover", "victory"].includes(this.phase)) return;
    if (won) {
      this.phase = "victory";
      this.mouseDown = false;
      this.keys.clear();
      if (document.pointerLockElement) document.exitPointerLock();
      this.audio.tone(240, 1.8, 0.08, "triangle", 820);
      this.setFade(true);
      window.setTimeout(() => this.showEndScreen(true), 900);
    }
  }

  showEndScreen(won) {
    this.phase = won ? "victory" : "gameover";
    this.ui.endCard.classList.toggle("win", won);
    this.ui.endKicker.textContent = won
      ? `EXTRACTION COMPLETE // ${formatTime(this.stats.elapsed)}`
      : `SIGNAL LOST // WAVE ${String(this.wave).padStart(2, "0")}`;
    this.ui.endTitle.textContent = won ? "撤离成功" : "行动失败";
    this.ui.endDescription.textContent = won
      ? "无线电中传来了直升机旋翼声。你带回了灰港最后一份感染样本，也带回了自己。"
      : "你的信号从灰港雷达上消失了。隔离区仍在扩散，但下一次行动仍有机会改变结局。";
    this.ui.endWave.textContent = String(this.wave).padStart(2, "0");
    this.ui.endKills.textContent = String(this.stats.kills);
    this.ui.endTime.textContent = formatTime(this.stats.elapsed);
    const accuracy = this.stats.shots ? Math.round((this.stats.hits / this.stats.shots) * 100) : 0;
    this.ui.endAccuracy.textContent = `${accuracy}%`;
    this.ui.retryButton.querySelector("b").textContent = won ? "再次部署" : "重新部署";
    dom.gameoverScreen.classList.remove("hidden");
    window.setTimeout(() => this.setFade(false), 100);
  }

  onZombieKilled(zombie, headshot) {
    this.stats.kills += 1;
    if (headshot) this.stats.headshots += 1;
    if (this.waveState === "active") this.waveKilled += 1;
    this.audio.kill();
    this.showHitmarker(true, headshot);
    this.addKillFeed(zombie, headshot);
    this.effects.blood(
      zombie.root.position.clone().add(new THREE.Vector3(0, 1.1 * zombie.scale, 0)),
      new THREE.Vector3(0, 0, 1),
      headshot,
    );
    if (zombie.isBoss) {
      this.hideBoss();
      this.showNotification("高危变异体已清除", "warning");
    }
    const dropChance = zombie.isBoss ? 1 : zombie.type === "brute" ? 0.7 : 0.32;
    if (Math.random() < dropChance && this.pickups.length < 20) {
      const dropType = pick([
        "ammo", "ammo", "med", "scrap", "cloth", "chemical", "food", "grenade",
      ]);
      this.spawnPickup(dropType, zombie.root.position.clone());
    }
    this.ui.waveProgress.style.width = `${clamp(
      this.waveKilled / Math.max(1, this.waveTotal),
      0,
      1,
    ) * 100}%`;
  }

  addKillFeed(zombie, headshot) {
    const entry = document.createElement("div");
    entry.className = `kill-entry${headshot ? " headshot" : ""}`;
    const label = zombie.isBoss
      ? "高危变异体"
      : zombie.type === "brute"
        ? "重装变异体"
        : zombie.type === "runner"
          ? "疾行感染者"
          : "游荡者";
    entry.innerHTML = `<span>${headshot ? "精准击杀" : "清除"}</span><i></i><b>${label}</b>`;
    this.ui.waveProgress = this.ui.waveProgress || $("#wave-progress-fill");
    dom.killFeed.prepend(entry);
    while (dom.killFeed.children.length > 5) {
      dom.killFeed.lastElementChild.remove();
    }
    window.setTimeout(() => {
      entry.classList.add("fade");
      window.setTimeout(() => entry.remove(), 420);
    }, 2500);
  }

  openInventory() {
    if (this.phase !== "playing") return;
    this.phase = "inventory";
    this.mouseDown = false;
    this.player.aiming = false;
    this.keys.clear();
    dom.prompt.classList.add("hidden");
    dom.inventoryScreen.classList.remove("hidden");
    this.renderInventory();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  closeInventory() {
    if (this.phase !== "inventory") return;
    dom.inventoryScreen.classList.add("hidden");
    if (isTouch) {
      this.phase = "playing";
    } else {
      this.phase = "paused";
      this.requestPointerLock();
    }
  }

  itemCount(type) {
    if (type === "rifleAmmo") return this.player.weapons[0].reserve + this.player.weapons[0].mag;
    if (type === "shotgunAmmo") return this.player.weapons[1].reserve + this.player.weapons[1].mag;
    return this.inventory[type] || 0;
  }

  renderInventory() {
    const order = ["rifleAmmo", "shotgunAmmo", "med", "food", "grenade", "scrap", "cloth", "chemical"];
    if (!this.selectedInventoryItem) this.selectedInventoryItem = "med";
    const slots = [];
    for (const type of order) {
      const def = ITEM_DEFS[type];
      const count = this.itemCount(type);
      slots.push(`
        <button class="inv-slot ${count > 0 ? "filled" : ""} ${this.selectedInventoryItem === type ? "selected" : ""}"
          data-item="${type}" ${count <= 0 ? "disabled" : ""} aria-label="${def.name} ${count}">
          ${count > 0 ? `<span class="slot-glyph" style="--slot-color:${def.color}">${def.glyph}</span><span class="slot-count">${count}</span><span class="slot-name">${def.name}</span>` : ""}
        </button>
      `);
    }
    for (let i = order.length; i < 12; i += 1) {
      slots.push('<div class="inv-slot empty" aria-hidden="true"></div>');
    }
    dom.inventoryGrid.innerHTML = slots.join("");
    dom.inventoryGrid.querySelectorAll("[data-item]").forEach((slot) => {
      slot.addEventListener("click", () => {
        this.selectedInventoryItem = slot.dataset.item;
        this.renderInventory();
      });
    });
    this.renderInventoryDetail();
    this.renderRecipeList();
    const filled = order.filter((type) => this.itemCount(type) > 0).length;
    this.ui.inventoryUsed.textContent = `${filled} / 12`;
    const weight = order.reduce(
      (total, type) => total + this.itemCount(type) * ITEM_DEFS[type].weight,
      0,
    );
    this.ui.carryWeight.textContent = `${weight.toFixed(1)} / 30.0 kg`;
    this.ui.carryFill.style.width = `${clamp(weight / 30, 0, 1) * 100}%`;
  }

  renderInventoryDetail() {
    const type = this.selectedInventoryItem;
    const def = ITEM_DEFS[type];
    if (!def) return;
    const count = this.itemCount(type);
    const canUse = def.usable && count > 0;
    dom.inventoryDetail.innerHTML = `
      <span class="detail-icon" style="color:${def.color}">${def.glyph}</span>
      <div>
        <h3>${def.name} <span style="color:var(--muted);font-weight:400">× ${count}</span></h3>
        <p>${def.description}</p>
      </div>
      ${canUse ? `<button class="use-item-button" data-use-item="${type}">${def.action}</button>` : ""}
    `;
    const useButton = dom.inventoryDetail.querySelector("[data-use-item]");
    if (useButton) {
      useButton.addEventListener("click", () => {
        if (type === "med") this.useMedkit();
        if (type === "food") this.useFood();
      });
    }
  }

  renderRecipeList() {
    const labels = {
      scrap: "废料",
      chemical: "化学品",
      cloth: "布料",
    };
    dom.recipeList.innerHTML = CRAFT_RECIPES.map((recipe) => {
      const canCraft = Object.entries(recipe.costs).every(
        ([type, amount]) => (this.inventory[type] || 0) >= amount,
      );
      const costs = Object.entries(recipe.costs).map(
        ([type, amount]) =>
          `<span class="${(this.inventory[type] || 0) < amount ? "insufficient" : ""}">${labels[type]} ${this.inventory[type] || 0}/${amount}</span>`,
      ).join("");
      return `
        <div class="recipe">
          <span class="recipe-icon">${recipe.glyph}</span>
          <div>
            <h3>${recipe.name}</h3>
            <p>${recipe.description}</p>
            <div class="recipe-cost">${costs}</div>
          </div>
          <button class="craft-button" data-craft="${recipe.id}" ${canCraft ? "" : "disabled"}>制作</button>
        </div>
      `;
    }).join("");
    dom.recipeList.querySelectorAll("[data-craft]").forEach((button) => {
      button.addEventListener("click", () => this.craftItem(button.dataset.craft));
    });
  }

  craftItem(id) {
    if (this.phase !== "inventory") return;
    const recipe = CRAFT_RECIPES.find((entry) => entry.id === id);
    if (!recipe) return;
    const canCraft = Object.entries(recipe.costs).every(
      ([type, amount]) => (this.inventory[type] || 0) >= amount,
    );
    if (!canCraft) return;
    for (const [type, amount] of Object.entries(recipe.costs)) {
      this.inventory[type] -= amount;
    }
    recipe.result();
    this.audio.craft();
    this.showToast(`${recipe.name}制作完成`);
    this.renderInventory();
    this.updateQuickCounts();
    this.updateWeaponUI();
  }

  updateQuickCounts() {
    if (!this.inventory || !this.ui) return;
    this.ui.medCount.textContent = this.inventory.med || 0;
    this.ui.grenadeCount.textContent = this.inventory.grenade || 0;
    this.ui.foodCount.textContent = this.inventory.food || 0;
    if (this.phase === "inventory") {
      const weight = Object.keys(ITEM_DEFS).reduce(
        (total, type) => total + this.itemCount(type) * ITEM_DEFS[type].weight,
        0,
      );
      if (this.ui.carryWeight) {
        this.ui.carryWeight.textContent = `${weight.toFixed(1)} / 30.0 kg`;
        this.ui.carryFill.style.width = `${clamp(weight / 30, 0, 1) * 100}%`;
      }
    }
  }

  updateWeaponUI() {
    if (!this.player || !this.ui) return;
    const weapon = this.currentWeapon();
    this.ui.weaponClass.textContent = weapon.className;
    this.ui.weaponName.textContent = weapon.name;
    this.ui.ammoMag.textContent = String(weapon.mag).padStart(2, "0");
    this.ui.ammoReserve.textContent = String(weapon.reserve).padStart(3, "0");
    this.ui.ammoReadout.classList.toggle("low", weapon.mag <= Math.ceil(weapon.magSize * 0.2));
    if (!this.ui.ammoTicks.children.length || this.lastAmmoWeapon !== this.player.currentWeapon) {
      this.ui.ammoTicks.innerHTML = Array.from(
        { length: weapon.magSize },
        () => "<i></i>",
      ).join("");
      this.lastAmmoWeapon = this.player.currentWeapon;
    }
    [...this.ui.ammoTicks.children].forEach((tick, index) => {
      tick.classList.toggle("empty", index >= weapon.mag);
    });
    this.ui.weaponSlots.forEach((slot, index) => {
      slot.classList.toggle("active", index === this.player.currentWeapon);
    });
    this.updateQuickCounts();
  }

  updateHUD(force = false) {
    if (!this.stats || !this.player) return;
    const player = this.player;
    const weapon = this.currentWeapon();
    this.ui.healthValue.textContent = String(Math.ceil(player.health));
    this.ui.healthFill.style.width = `${clamp(player.health, 0, 100)}%`;
    this.ui.staminaValue.textContent = String(Math.floor(player.stamina));
    this.ui.staminaFill.style.width = `${clamp(player.stamina, 0, 100)}%`;
    this.ui.ammoMag.textContent = String(weapon.mag).padStart(2, "0");
    this.ui.ammoReserve.textContent = String(weapon.reserve).padStart(3, "0");
    this.ui.ammoReadout.classList.toggle("low", weapon.mag <= Math.ceil(weapon.magSize * 0.2));
    [...this.ui.ammoTicks.children].forEach((tick, index) => {
      tick.classList.toggle("empty", index >= weapon.mag);
    });
    this.ui.flashlightStatus.classList.toggle("active", player.flashlight);
    this.ui.bleedStatus.classList.toggle("active", player.bleed > 0);

    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const degrees = ((player.yaw * -180 / Math.PI) % 360 + 360) % 360;
    this.ui.compassHeading.textContent = directions[Math.round(degrees / 45) % 8];
    this.ui.compassCoords.textContent =
      `${String(Math.abs(Math.round(player.position.x))).padStart(2, "0")} / ${String(Math.abs(Math.round(player.position.z))).padStart(2, "0")}`;

    let living = 0;
    if (this.waveState === "active") {
      living = this.zombies.filter((zombie) => zombie.active && !zombie.dead).length;
    }
    const remaining = living + this.spawnQueue.length;
    this.ui.enemyCounter.textContent = this.waveState === "active"
      ? `${remaining} 威胁`
      : this.waveState === "prep"
        ? "准备阶段"
        : "区域安全";
    if (this.waveState === "prep") {
      this.ui.interwaveValue.textContent = formatTime(this.prepRemaining);
      this.ui.missionText.textContent = this.wave === 0
        ? "准备迎战第一波感染体"
        : "搜寻补给，准备下一波";
      this.ui.missionSub.textContent = `${formatTime(this.prepRemaining)} 后接触敌人`;
    } else if (this.waveState === "active") {
      this.ui.missionText.textContent = `清除剩余 ${remaining} 个威胁`;
      this.ui.missionSub.textContent = this.wave === 8 ? "最终波 · 坚持到救援抵达" : "保护无线电台与撤离通道";
    } else if (this.finalWaveCleared) {
      this.ui.missionText.textContent = "等待救援直升机";
      this.ui.missionSub.textContent = `预计抵达 ${formatTime(this.victoryTimer)}`;
    } else {
      this.ui.missionText.textContent = "区域暂时安全";
      this.ui.missionSub.textContent = "补给已刷新，搜索橙色信标";
    }

    if (this.activeBoss && !this.activeBoss.dead) {
      this.ui.bossName.textContent = this.activeBoss.name;
      this.ui.bossHealthFill.style.width = `${clamp(
        this.activeBoss.health / this.activeBoss.maxHealth,
        0,
        1,
      ) * 100}%`;
      dom.bossPanel.classList.remove("hidden");
    } else if (!this.activeBoss) {
      dom.bossPanel.classList.add("hidden");
    }
    if (this.phase === "playing" || force) this.updateWeaponUI();
  }

  drawMinimap() {
    const canvas = dom.minimap;
    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 2.25;
    context.clearRect(0, 0, width, height);
    context.save();
    context.beginPath();
    context.arc(centerX, centerY, width * 0.47, 0, Math.PI * 2);
    context.clip();
    const gradient = context.createRadialGradient(centerX, centerY, 8, centerX, centerY, width / 2);
    gradient.addColorStop(0, "rgba(30,45,33,.34)");
    gradient.addColorStop(1, "rgba(4,9,6,.7)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const mapX = (worldX) => centerX + (worldX - this.player.position.x) * scale;
    const mapY = (worldZ) => centerY + (worldZ - this.player.position.z) * scale;
    context.fillStyle = "rgba(143,157,143,.11)";
    context.fillRect(mapX(-53), mapY(-6), 106 * scale, 12 * scale);
    context.fillRect(mapX(-6), mapY(-53), 12 * scale, 106 * scale);
    context.strokeStyle = "rgba(213,228,213,.07)";
    context.lineWidth = 1;
    context.setLineDash([3, 5]);
    for (let radius = 15; radius <= 45; radius += 15) {
      context.beginPath();
      context.arc(centerX, centerY, radius * scale, 0, Math.PI * 2);
      context.stroke();
    }

    context.fillStyle = "rgba(122,137,124,.22)";
    context.strokeStyle = "rgba(151,166,151,.18)";
    for (const collider of this.world.colliders) {
      if (collider.maxX - collider.minX > 45 || collider.maxZ - collider.minZ > 45) continue;
      const x = mapX(collider.minX);
      const y = mapY(collider.minZ);
      const w = (collider.maxX - collider.minX) * scale;
      const h = (collider.maxZ - collider.minZ) * scale;
      context.fillRect(x, y, w, h);
      context.strokeRect(x, y, w, h);
    }

    for (const pickup of this.pickups) {
      const x = mapX(pickup.root.position.x);
      const y = mapY(pickup.root.position.z);
      if (Math.hypot(x - centerX, y - centerY) > width * 0.46) continue;
      context.fillStyle = pickup.airdrop ? "#ff9b49" : "rgba(224,255,101,.72)";
      context.beginPath();
      context.arc(x, y, pickup.airdrop ? 4.2 : 2.2, 0, Math.PI * 2);
      context.fill();
      if (pickup.airdrop) {
        context.strokeStyle = "rgba(255,155,73,.35)";
        context.beginPath();
        context.arc(x, y, 8, 0, Math.PI * 2);
        context.stroke();
      }
    }

    for (const zombie of this.zombies) {
      if (!zombie.active || zombie.dead) continue;
      const x = mapX(zombie.root.position.x);
      const y = mapY(zombie.root.position.z);
      if (Math.hypot(x - centerX, y - centerY) > width * 0.45) continue;
      context.fillStyle = zombie.isBoss ? "#ffb045" : "#ff5849";
      context.beginPath();
      context.arc(x, y, zombie.isBoss ? 4.2 : zombie.type === "brute" ? 3 : 1.8, 0, Math.PI * 2);
      context.fill();
    }

    context.save();
    context.translate(centerX, centerY);
    context.rotate(-this.player.yaw);
    context.fillStyle = "#e0ff65";
    context.beginPath();
    context.moveTo(0, -8);
    context.lineTo(5, 6);
    context.lineTo(0, 3);
    context.lineTo(-5, 6);
    context.closePath();
    context.fill();
    context.restore();
    context.strokeStyle = "rgba(224,255,101,.18)";
    context.beginPath();
    context.arc(centerX, centerY, width * 0.46, 0, Math.PI * 2);
    context.stroke();
    context.restore();

    context.fillStyle = "rgba(224,255,101,.7)";
    context.font = "600 11px 'Barlow Condensed', sans-serif";
    context.textAlign = "center";
    context.fillText("N", centerX, 13);
  }

  showNotification(text, variant = "") {
    if (!text) return;
    while (dom.notifications.children.length >= 4) {
      dom.notifications.firstElementChild.remove();
    }
    const node = document.createElement("div");
    node.className = `notification ${variant}`;
    node.textContent = text;
    dom.notifications.appendChild(node);
    window.setTimeout(() => {
      node.classList.add("fade");
      window.setTimeout(() => node.remove(), 380);
    }, variant === "danger" ? 3400 : 2600);
  }

  showToast(text) {
    this.ui.toastText = this.ui.toastText || dom.toastText;
    this.ui.toastText.textContent = text;
    dom.toast.classList.remove("hidden");
    this.toastTimer = 1.8;
  }

  showObjective(kicker, title, description) {
    this.ui.objectiveKicker.textContent = kicker;
    this.ui.objectiveTitle.textContent = title;
    this.ui.objectiveDesc.textContent = description;
    dom.objectiveBanner.classList.remove("hidden");
    this.objectiveTimer = 3.7;
  }

  showWaveBanner(kicker, title, subtitle) {
    this.ui.waveBannerKicker.textContent = kicker;
    this.ui.waveBannerTitle.textContent = title;
    this.ui.waveBannerSubtitle.textContent = subtitle;
    dom.waveBanner.classList.remove("hidden");
    this.bannerTimer = 2.9;
  }
}

const game = new Game();

if (new URLSearchParams(window.location.search).has("capture")) {
  window.__LAST_EMBER__ = game;
}
