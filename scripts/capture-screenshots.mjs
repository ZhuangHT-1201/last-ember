import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.GAME_URL || "http://localhost:4173";
const outputDir = path.resolve("docs", "screenshots");

await mkdir(outputDir, { recursive: true });
console.log("Launching Chromium...");

const browser = await chromium.launch({
  headless: true,
  args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
console.log("Chromium ready.");

async function waitForReady(page) {
  page.on("pageerror", (error) => console.error("Page error:", error.message));
  await page.goto(`${baseURL}/?capture=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__LAST_EMBER__), null, { timeout: 20000 });
  await page.evaluate(async () => {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  });
  await page.waitForTimeout(700);
}

async function captureDesktop(page, filename) {
  await page.screenshot({
    path: path.join(outputDir, filename),
  });
}

const desktopContext = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1,
});
const page = await desktopContext.newPage();
await waitForReady(page);
console.log("Capturing title...");
await captureDesktop(page, "01-last-ember-title.png");

await page.evaluate(() => {
  window.__LAST_EMBER__.pointerFallback = true;
});
await page.getByRole("button", { name: /进入隔离区/ }).click();
await page.waitForTimeout(500);

await page.evaluate(() => {
  const g = window.__LAST_EMBER__;
  const q = (selector) => document.querySelector(selector);
  g.resetSession();
  g.gameStarted = true;
  g.phase = "paused";
  g.wave = 2;
  g.startWave();
  g.spawnQueue = [];
  g.waveTotal = 11;
  g.waveKilled = 5;
  g.zombies.length = 0;
  g.player.position.set(0, 0, 7.5);
  g.player.yaw = 0;
  g.player.pitch = -0.055;
  g.player.health = 72;
  g.player.stamina = 64;
  g.player.currentWeapon = 0;
  g.player.weapons[0].mag = 21;
  g.player.weapons[0].reserve = 93;
  g.weaponRigs.forEach((rig, index) => {
    rig.visible = index === 0;
  });
  const spawn = (type, x, z) => {
    const zombie = g.spawnZombie(type);
    zombie.state = "chase";
    zombie.spawnTimer = 1;
    zombie.root.position.set(x, 0, z);
    zombie.root.scale.setScalar(zombie.targetScale);
    zombie.root.rotation.y = 0;
    return zombie;
  };
  spawn("walker", -2.2, 0.2);
  spawn("walker", 2.15, 1.3);
  spawn("runner", 5.2, -1.2);
  const cratePoint = g.player.position.clone();
  cratePoint.set(-3.7, 0, 4.2);
  g.spawnPickup("chemical", cratePoint);
  q("#start-screen").classList.add("hidden");
  q("#pause-screen").classList.add("hidden");
  q("#inventory-screen").classList.add("hidden");
  q("#gameover-screen").classList.add("hidden");
  q("#hud").classList.remove("hidden");
  q("#objective-banner").classList.add("hidden");
  q("#wave-banner").classList.add("hidden");
  q("#notifications").replaceChildren();
  q("#interwave-timer").classList.add("hidden");
  document.body.classList.add("in-game");
  g.setPlayerCameraInstant();
  g.updateWeaponVisual(0.016);
  g.updateHUD(true);
});
await page.waitForTimeout(250);
console.log("Capturing combat...");
await captureDesktop(page, "02-quarantine-combat.png");

await page.evaluate(() => {
  const g = window.__LAST_EMBER__;
  g.inventory = {
    med: 3,
    food: 2,
    grenade: 2,
    scrap: 7,
    cloth: 5,
    chemical: 4,
  };
  g.player.weapons[0].reserve = 148;
  g.player.weapons[1].reserve = 31;
  g.phase = "playing";
  g.openInventory();
});
await page.waitForTimeout(250);
console.log("Capturing inventory...");
await captureDesktop(page, "03-field-inventory.png");

await page.evaluate(() => {
  const g = window.__LAST_EMBER__;
  const q = (selector) => document.querySelector(selector);
  q("#inventory-screen").classList.add("hidden");
  g.resetSession();
  g.gameStarted = true;
  g.phase = "paused";
  g.wave = 7;
  g.startWave();
  g.spawnQueue = [];
  g.waveTotal = 20;
  g.waveKilled = 16;
  g.zombies.length = 0;
  g.player.position.set(0, 0, 8);
  g.player.yaw = 0;
  g.player.pitch = -0.02;
  g.player.health = 54;
  g.player.stamina = 40;
  g.player.weapons[0].mag = 9;
  g.player.weapons[0].reserve = 76;
  g.weaponRigs.forEach((rig, index) => {
    rig.visible = index === 0;
  });
  const boss = g.spawnZombie("boss");
  boss.state = "chase";
  boss.spawnTimer = 1;
  boss.root.position.set(0, 0, 0.5);
  boss.root.scale.setScalar(boss.targetScale);
  boss.root.rotation.y = 0;
  g.showBoss(boss);
  const runner = g.spawnZombie("runner");
  runner.state = "chase";
  runner.spawnTimer = 1;
  runner.root.position.set(-4, 0, -1);
  runner.root.scale.setScalar(runner.targetScale);
  q("#start-screen").classList.add("hidden");
  q("#pause-screen").classList.add("hidden");
  q("#hud").classList.remove("hidden");
  q("#objective-banner").classList.add("hidden");
  q("#wave-banner").classList.add("hidden");
  q("#notifications").replaceChildren();
  document.body.classList.add("in-game");
  g.setPlayerCameraInstant();
  g.updateWeaponVisual(0.016);
  g.updateHUD(true);
});
await page.waitForTimeout(250);
console.log("Capturing boss...");
await captureDesktop(page, "04-boss-encounter.png");

await page.evaluate(() => {
  const g = window.__LAST_EMBER__;
  g.stats.wave = 8;
  g.stats.kills = 76;
  g.stats.shots = 286;
  g.stats.hits = 212;
  g.stats.elapsed = 946;
  g.wave = 8;
  g.showEndScreen(true);
  g.setFade(false);
});
await page.waitForTimeout(1200);
console.log("Capturing victory...");
await captureDesktop(page, "05-extraction-success.png");
await desktopContext.close();

const mobileContext = await browser.newContext({
  viewport: { width: 430, height: 932 },
  screen: { width: 430, height: 932 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
const mobilePage = await mobileContext.newPage();
await waitForReady(mobilePage);
await mobilePage.getByRole("button", { name: /进入隔离区/ }).click();
await mobilePage.waitForTimeout(450);
await mobilePage.evaluate(() => {
  const g = window.__LAST_EMBER__;
  const q = (selector) => document.querySelector(selector);
  g.phase = "paused";
  g.wave = 1;
  g.startWave();
  g.spawnQueue = [];
  g.waveTotal = 8;
  g.waveKilled = 3;
  g.zombies.length = 0;
  g.player.position.set(0, 0, 7.5);
  g.player.yaw = 0;
  g.player.pitch = -0.055;
  g.player.health = 81;
  g.player.stamina = 58;
  const spawn = (type, x, z) => {
    const zombie = g.spawnZombie(type);
    zombie.state = "chase";
    zombie.spawnTimer = 1;
    zombie.root.position.set(x, 0, z);
    zombie.root.scale.setScalar(zombie.targetScale);
    zombie.root.rotation.y = 0;
  };
  spawn("walker", -1.7, 0.5);
  spawn("walker", 2.1, 1.3);
  spawn("runner", 4.4, -1);
  q("#pause-screen").classList.add("hidden");
  q("#objective-banner").classList.add("hidden");
  q("#wave-banner").classList.add("hidden");
  q("#notifications").replaceChildren();
  q("#interwave-timer").classList.add("hidden");
  q("#touch-controls").classList.remove("hidden");
  document.body.classList.add("in-game", "mobile");
  g.setPlayerCameraInstant();
  g.updateWeaponVisual(0.016);
  g.updateHUD(true);
});
await mobilePage.waitForTimeout(250);
console.log("Capturing mobile...");
await mobilePage.screenshot({
  path: path.join(outputDir, "06-mobile-combat.png"),
});
await mobileContext.close();

await browser.close();
console.log(`Screenshots written to ${outputDir}`);
