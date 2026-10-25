# LAST EMBER

### 余烬协议 · 灰港封锁线

> 感染爆发后的第 47 天，灰港已失去联络。你是最后一条仍在广播的求救信号。

**LAST EMBER** 是一款运行在浏览器中的第一人称丧尸生存射击游戏。探索被遗弃的隔离区，收集散落物资，在现场制作弹药与医疗用品，并在八轮尸潮中守住无线电台，等待救援直升机抵达。

[![Three.js](https://img.shields.io/badge/Three.js-r180-d9ff5f?style=flat-square&logo=three.js&logoColor=black)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![WebGL](https://img.shields.io/badge/WebGL-Playable-8EE8DA?style=flat-square)](https://www.khronos.org/webgl/)
[![No External Assets](https://img.shields.io/badge/assets-procedural-white?style=flat-square)](#技术实现)

<img src="./docs/screenshots/01-last-ember-title.png" alt="LAST EMBER 游戏主界面" width="100%" />

## 游戏特色

- **第一人称生存战斗**：移动、冲刺、跳跃、蹲伏、瞄准、换弹与头部命中判定。
- **两套战斗配置**：全自动突击步枪与近距离高伤害霰弹枪，支持滚轮和数字键切换。
- **八轮尸潮**：普通游荡者、高速疾行感染者和高生命值重装变异体逐轮混合出现。
- **高危首领战**：第 4 波与最终波会遭遇“裂口者”，拥有独立首领状态栏和高额近战伤害。
- **场景物资搜刮**：弹药箱、医疗包、压缩口粮、燃烧瓶、废料、布料和化学制剂散布在封锁区中。
- **现场制作系统**：利用搜刮材料制作步枪弹药、急救医疗包和简易燃烧瓶。
- **动态空投**：每轮结束后会刷新高风险空投箱，提供额外弹药和制作材料。
- **完整生存状态**：生命、体力、出血创伤、弹药储备、医疗资源、战术灯与负重。
- **沉浸式低多边形画面**：程序化地表、雾层、扬尘、遗迹建筑、集装箱、灯光与夜空。
- **程序化音频**：枪声、换弹、丧尸低吼、受伤、拾取和爆炸均由 Web Audio 实时合成。
- **桌面与触控支持**：桌面端使用鼠标锁定；移动设备提供双摇杆、射击、瞄准、换弹和快捷物品按钮。

## 实机截图

### 隔离区战斗

昏暗的灰港被应急灯与物资信标切开。感染者会从废弃建筑、集装箱和迷雾中接近无线电台。

<img src="./docs/screenshots/02-quarantine-combat.png" alt="LAST EMBER 丧尸战斗截图" width="100%" />

### 战术背包与现场制作

所有关键物品都有独立图标、数量、重量和用途。废料、布料与化学品可以随时组合成能救命的新物资。

<img src="./docs/screenshots/03-field-inventory.png" alt="LAST EMBER 战术背包与制作界面" width="100%" />

### 高危首领战

“裂口者”拥有远高于普通感染者的生命值。保持距离、命中头部并合理使用燃烧瓶，是活下来的关键。

<img src="./docs/screenshots/04-boss-encounter.png" alt="LAST EMBER 高危变异体首领战" width="100%" />

### 救援撤离

熬过最终波后，救援信标开始上传。行动结算会记录抵达波次、清除数量、存活时间和命中精度。

<img src="./docs/screenshots/05-extraction-success.png" alt="LAST EMBER 撤离成功结算界面" width="100%" />

### 移动端触控

响应式 HUD 会隐藏次要信息，并提供移动摇杆、拖拽视角、射击、瞄准、换弹和快捷物品按钮。

<p align="center">
  <img src="./docs/screenshots/06-mobile-combat.png" alt="LAST EMBER 移动端战斗界面" width="46%" />
</p>

## 立即游玩

### Windows

双击项目根目录中的 `启动游戏.bat`。脚本会在首次运行时安装依赖，然后启动本地服务器并打开浏览器。

### 手动启动

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

打开终端中显示的本地地址即可开始游戏。推荐使用最新版 Chrome 或 Edge，并佩戴耳机。

生产构建：

```bash
npm run build
npm run preview
```

## 操作方式

| 按键 | 动作 |
| --- | --- |
| `W` `A` `S` `D` | 移动 |
| 鼠标 | 观察 |
| 鼠标左键 | 射击 |
| 鼠标右键 | 瞄准 |
| `Shift` | 冲刺 |
| `Space` | 跳跃 |
| `C` / `Ctrl` | 蹲伏 |
| `R` | 换弹 |
| `1` / `2` / 滚轮 | 切换步枪与霰弹枪 |
| `E` | 拾取物资 / 开启空投 |
| `Tab` | 战术背包与现场制作 |
| `Q` | 战术灯 |
| `H` | 使用医疗包 |
| `F` | 食用口粮 |
| `G` | 投掷燃烧瓶 |
| `M` | 静音切换 |
| `Esc` / `P` | 暂停 |

如果浏览器无法锁定鼠标，游戏会自动切换到备用视角模式：按住鼠标右键拖动视角，左键射击。

## 生存建议

1. 战前倒计时会持续 15 秒左右，优先记住附近的物资信标位置。
2. 弹药和医疗包永远不嫌多，但化学品同样重要，它既能制作弹药也能制作燃烧瓶。
3. 听见快速脚步声时立即拉开距离。疾行感染者的生命值较低，但贴身后攻击频率很高。
4. 重装变异体与首领需要集中火力。霰弹枪近距离爆发高，远距离伤害衰减明显。
5. 橙色空投箱的视野很远，拾取前先清理周围感染者。
6. 出血状态会持续损失生命，医疗包可以同时恢复生命并停止出血。

## 技术实现

- **Three.js**：第一人称相机、低多边形世界、灯光、雾效、粒子和射线命中。
- **原生 JavaScript**：游戏状态机、碰撞、波次系统、敌人 AI、背包与制作逻辑。
- **Vite**：开发服务器和生产构建。
- **Web Audio API**：实时合成枪声、脚步、低吼、拾取、受伤和爆炸音效。
- **Canvas 2D**：战术雷达和程序化物资图标。
- **零外部游戏素材**：场景模型、地表纹理、角色、图标、粒子与音效均程序化生成。
- **拾取性能优化**：物资共享几何体与材质缓存，拾取时不再同步销毁 GPU 资源；重叠物资会一次清空，避免视觉残影。

## 项目结构

```text
last-ember/
├─ docs/screenshots/       # README 实机截图
├─ scripts/                # 截图自动化脚本
├─ src/
│  ├─ main.js              # 游戏核心与 Three.js 场景
│  └─ style.css            # HUD、菜单与响应式界面
├─ index.html              # 页面结构
├─ package.json
└─ 启动游戏.bat            # Windows 一键启动
```

重新生成 README 截图时，先启动 `npm run dev`，再在另一个终端运行：

```bash
npm run screenshots
```

验证重叠物资清理与拾取响应速度：

```bash
npm run test:smoke
```

---

**LAST EMBER / 余烬协议**  
*Survive the night. Carry the last signal home.*
