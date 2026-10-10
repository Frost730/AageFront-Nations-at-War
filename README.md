# Agefront: Nations at War

An original, real-time strategy (RTS) game inspired by the nation-building and strategic combat of classic historical RTS titles like *Rise of Nations*. Features a complete offline **Single-Player Skirmish mode** and genuine **Local Area Network (LAN) Co-op Multiplayer**.

---

## 1. Game Concept & Key Features

- **Four Playable Civilizations:**
  - **Veyran Confederacy:** Commercial and logistic masters (+15% resource gathering rate, cheaper drop-off camps).
  - **Solari Dominion:** Sun scholars (+25% tech research speed, generates passive knowledge over time).
  - **Ironvale Kingdom:** Mountain stronghold builders (+30% building and fortification HP, durable infantry).
  - **Nambara Alliance:** Nomadic steppe raiders (+20% mounted and scout movement speed, +3 vision range).
- **Five Core Strategic Resources:**
  - 🌾 **Food:** Citizen workers, frontline infantry, economic expansion.
  - 🪵 **Wood:** Settlement buildings, farms, bows, and siege chassis.
  - 🪨 **Stone:** Watchtowers, castles, fortresses, and stone ramparts.
  - 🪙 **Metal:** Armored knights, cavalry, forged weapons, and heavy artillery.
  - 📜 **Knowledge:** Academic research, technology upgrades, and age advancement.
- **Four Technological Ages:**
  - **Age I — Founding Age:** Basic gathering economy, workers, scouts, frontline spearmen, and barracks.
  - **Age II — Kingdom Age:** Agricultural crop rotation, archery ranges, horse stables, and watchtowers.
  - **Age III — Imperial Age:** Grand fortresses, siege workshops, catapults, and armored cavalry.
  - **Age IV — Industrial Age:** Elite vanguard champions, destructive bombards, and advanced technologies.
- **Combat Counter System:**
  - **Spearmen > Cavalry:** Long pikes deal 2.8x damage to mounted shock units.
  - **Cavalry > Ranged & Workers:** High mobility rapidly flanks and decimates standoff archers.
  - **Ranged Infantry > Spearmen:** Arrow volleys pick off unshielded foot soldiers from afar.
  - **Siege Units > Fortifications:** Catapults and bombards deal 4.5x demolition damage to structures.
- **Authoritative LAN Co-op Multiplayer:**
  - Host computer acts as the authoritative real-time simulation server (20 ticks/sec).
  - Other computers on the same Wi-Fi network or wired Ethernet connect directly using the host's LAN IP address.
  - Allied players share team vision and coordinate defenses and attack waves against AI opponents.
  - 100% offline — requires no external internet connection, cloud databases, or third-party accounts.
- **Intelligent Tactical AI:**
  - Real multi-tier AI opponents (Easy, Medium, Hard) that harvest resources, expand bases, advance ages, train balanced army compositions, and launch coordinated assaults.
- **Fog of War & Tactical Minimap:**
  - Unexplored (black), explored (shrouded), and visible states.
  - Interactive minimap with real-time troop dots and click-to-jump camera navigation.

---

## 2. Project Architecture

```
agefront/
├── apps/
│   ├── client/               # Three.js 3D WebGL frontend & HUD
│   │   ├── src/
│   │   │   ├── audio/        # Web Audio procedural sound synthesizer
│   │   │   ├── camera/       # Isometric RTS camera controller
│   │   │   ├── controls/     # Marquee box select, right-click orders, hotkeys
│   │   │   ├── networking/   # Socket.IO client & offline SP controller
│   │   │   ├── rendering/    # Procedural 3D terrain, buildings, units, fog
│   │   │   ├── ui/           # HUD, Main Menu, LAN Lobby, Victory screens
│   │   │   └── main.ts       # Client bootstrap and 60 FPS render loop
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── server/               # Node.js + Express + Socket.IO server
│       ├── src/
│       │   ├── lobby/        # Lobby room management & player roster
│       │   ├── network/      # Authoritative 20 TPS simulation loop & socket events
│       │   ├── utils/        # LAN IP auto-detection (os.networkInterfaces)
│       │   └── index.ts      # Server entry point & static file hosting
│       └── package.json
├── packages/
│   └── shared/               # Shared TypeScript simulation engine & rules
│       ├── src/
│       │   ├── constants/    # Civs, units, buildings, and technology tree
│       │   ├── simulation/   # Deterministic SimulationEngine, A* pathfinder, map generator
│       │   └── types/        # Shared game states, commands, and network payloads
│       └── package.json
├── tests/
│   ├── simulation.test.ts    # Unit tests for map generation, commands, combat, tech
│   └── lan_multiplayer.test.ts # Multi-client Socket.IO synchronization & permission test
├── package.json              # Root npm workspace configuration
├── tsconfig.json
├── render.yaml               # Optional Render web service deployment configuration
└── README.md
```

---

## 3. Quick Start & Local Development

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm (v9.0.0 or higher)

### Installation
Clone or navigate to the project directory and run:
```bash
npm install
```

### Development Mode
To run the server in watch mode:
```bash
npm run dev
```

To run the client frontend independently with Vite HMR:
```bash
npm run dev:client
```

---

## 4. How to Host & Play LAN Multiplayer

The host computer serves both the web client and the authoritative multiplayer server.

### Step 1: Start the LAN Host
On the host computer, run:
```bash
npm run lan
```
The terminal will display the host's direct LAN address, for example:
```
==================================================================
           AGEFRONT: NATIONS AT WAR — LAN MULTIPLAYER
==================================================================
  Server Status: ONLINE
  Local Access:  http://localhost:3000
  LAN Access:    http://192.168.1.37:3000
==================================================================
```

### Step 2: Open Game on Host Computer
Open a web browser (Chrome or Edge) on the host machine and visit:
```
http://localhost:3000
```
Click **"Host LAN Game"**, enter your name, pick your civilization, and click **"Open War Room Lobby"**.

### Step 3: Connect Other Computers on the Same LAN
On any laptop or PC connected to the same Wi-Fi or wired network:
1. Open a browser and navigate to the host's LAN Access URL (e.g. `http://192.168.1.37:3000`).
2. Click **"Join LAN Game"**.
3. Select your civilization, team (e.g. Team 1 for Co-op alongside the host), and click **"Connect to Host"**.
4. Click **"Ready Up"**.

### Step 4: Start the Match
Once players are ready, the host can:
- Add additional AI opponents on Team 2.
- Configure map type, AI difficulty, and victory condition.
- Click **"START MATCH"**.

---

## 5. Finding Your Windows LAN IP Address & Troubleshooting

If automatic detection does not display your LAN IP:
1. Press `Win + R`, type `cmd`, and press Enter.
2. Type `ipconfig` and press Enter.
3. Locate your active network adapter (**Wireless LAN adapter Wi-Fi** or **Ethernet adapter**).
4. Find the line:
   ```
   IPv4 Address. . . . . . . . . . . : 192.168.1.X
   ```
5. Share `http://192.168.1.X:3000` with other players.

### Windows Defender Firewall
If other computers cannot open the page:
1. When starting Node.js for the first time, Windows Defender may display a prompt asking for network permissions. Ensure **"Private networks (home or work)"** is checked.
2. Alternatively, open **Windows Defender Firewall with Advanced Security**, click **Inbound Rules**, and add an allow rule for port `3000` (TCP).

---

## 6. How to Play Single-Player Skirmish (Offline)

1. Open `http://localhost:3000` (or run `npm run lan`).
2. Click **"Single Player Skirmish"**.
3. Choose your Civilization, AI Opponent Civilization, AI Difficulty (Easy, Medium, Hard), Map Type, and Starting Resources.
4. Click **"Launch Skirmish"**.
5. The game runs 100% locally in your browser with zero external dependencies.

---

## 7. Running Automated Tests

Run the complete test suite with Vitest:
```bash
npm run test
```
This tests:
- Deterministic seeded procedural map generation across all 3 map types.
- A* grid pathfinding and collision avoidance.
- Citizen worker gathering, returning resources, and constructing foundations.
- Unit training, population caps, and resource deductions.
- Combat counter bonus calculations (e.g. Spearmen vs Cavalry).
- Age advancement and tech tree upgrades.
- Multi-client real-time LAN socket synchronization.
- Authoritative unit command validation and permission enforcement.

---

## 8. Building for Production

Compile all packages and apps:
```bash
npm run build
```
To run the production build:
```bash
npm run start
```

---

## 9. Optional Public Render Deployment

The repository includes a `render.yaml` specification for deploying an online single-player demo or test service on Render:

- **Service Type:** Node.js Web Service
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start`
- **Environment:** `NODE_ENV=production`, `PORT=10000`

> **Note on LAN vs Public Hosting:** A public cloud deployment on Render serves as an online demo. Genuine LAN multiplayer requires players to be on the same local network and connect directly to the locally hosted server (`http://<LAN_IP>:3000`) for low latency and offline resilience.

---

## 10. Controls Reference

| Control | Action |
| :--- | :--- |
| **Left Click** | Select single unit or building |
| **Left Drag** | Marquee box select multiple units |
| **Right Click Ground** | Move selected units to location |
| **Right Click Resource** | Order worker(s) to gather food, wood, stone, or metal |
| **Right Click Enemy** | Order unit(s) to attack target |
| **Right Click Damaged Building** | Order worker(s) to repair building |
| **WASD / Arrow Keys** | Pan tactical camera |
| **Mouse Wheel** | Zoom camera in and out |
| **Ctrl + [1–9]** | Assign selected units to control group |
| **[1–9]** | Recall assigned control group |
| **Escape** | Deselect or cancel current building placement |

---

## 11. Asset Attribution & License

- **Graphics:** Procedural low-poly 3D models and terrain built dynamically with Three.js geometries and vertex-shaded materials.
- **Audio:** 100% procedural sound effects and ambient orchestral melodies synthesized in real-time via the browser's native Web Audio API (`AudioContext`). No proprietary or commercial assets copied.
- **License:** MIT License. Original work for Agefront: Nations at War.
