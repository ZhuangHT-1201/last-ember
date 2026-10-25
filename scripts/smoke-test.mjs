import { chromium } from "playwright";

const baseURL = process.env.GAME_URL || "http://localhost:4173";
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseURL}/?capture=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__LAST_EMBER__), null, { timeout: 20000 });
  await page.evaluate(() => {
    window.__LAST_EMBER__.pointerFallback = true;
  });
  await page.getByRole("button", { name: /进入隔离区/ }).click();
  await page.waitForTimeout(200);

  const result = await page.evaluate(() => {
    const game = window.__LAST_EMBER__;
    game.phase = "playing";
    const position = game.player.position.clone();
    position.z -= 1;
    const ammo = game.spawnPickup("ammo", position);
    const cloth = game.spawnPickup("cloth", position);
    cloth.root.position.copy(ammo.root.position);
    const before = game.pickups.length;
    const ammoBefore = game.player.weapons[0].reserve;
    const clothBefore = game.inventory.cloth;
    const start = performance.now();
    game.interact();
    const elapsedMs = performance.now() - start;
    return {
      before,
      after: game.pickups.length,
      removed: before - game.pickups.length,
      ammoGained: game.player.weapons[0].reserve - ammoBefore,
      clothGained: game.inventory.cloth - clothBefore,
      elapsedMs,
      promptHidden: document.querySelector("#interaction-prompt").classList.contains("hidden"),
    };
  });

  if (result.removed !== 2) throw new Error(`Expected 2 overlapping pickups removed, got ${result.removed}`);
  if (result.ammoGained < 30) throw new Error("Ammo pickup did not grant ammo.");
  if (result.clothGained < 2) throw new Error("Cloth pickup did not grant materials.");
  if (!result.promptHidden) throw new Error("Interaction prompt remained visible after pickup.");
  if (result.elapsedMs > 80) throw new Error(`Pickup interaction was too slow: ${result.elapsedMs.toFixed(2)} ms`);
  if (errors.length) throw new Error(errors.join("\n"));

  console.log(`Smoke test passed: ${result.removed} overlap pickups removed in ${result.elapsedMs.toFixed(2)} ms.`);
} finally {
  await browser.close();
}
