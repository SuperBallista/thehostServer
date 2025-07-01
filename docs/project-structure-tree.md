# The Host (숙주) - Complete Project Directory Tree

## Project Root Structure

```
thehostServer/
├── Backend (NestJS) Files
│   ├── src/                           # Backend source code
│   │   ├── app.controller.ts
│   │   ├── app.module.ts
│   │   ├── main.ts                    # Application entry point
│   │   ├── auth/                      # Authentication module
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.type.ts
│   │   │   └── providers/
│   │   │       └── google-auth.provider.ts
│   │   ├── common/                    # Common utilities
│   │   │   ├── types/
│   │   │   │   └── jwt.type.ts
│   │   │   └── utils/
│   │   │       ├── encryption.service.ts
│   │   │       └── json.services.ts
│   │   ├── database/                  # Database configuration
│   │   │   ├── database.module.ts
│   │   │   ├── database.provider.ts
│   │   │   └── schema/
│   │   │       └── users.sql
│   │   ├── jwt/                       # JWT authentication
│   │   │   ├── decorators/
│   │   │   │   └── current-user.decorator.ts
│   │   │   ├── guards/
│   │   │   │   └── jwt-auth.guard.ts
│   │   │   ├── jwt.module.ts
│   │   │   └── jwt.service.ts
│   │   ├── redis/                     # Redis services
│   │   │   ├── pubsub-usage-guide.ts
│   │   │   ├── pubsub.types.ts
│   │   │   ├── redis.module.ts
│   │   │   ├── redis.service.ts
│   │   │   ├── redisPubSub.service.ts
│   │   │   └── redisPubSubHelper.ts
│   │   ├── services/                  # Additional services
│   │   │   └── document-search.service.ts
│   │   ├── socket/                    # Socket.io real-time communication
│   │   │   ├── connection.service.ts
│   │   │   ├── data.types.ts
│   │   │   ├── game/                  # Game logic services
│   │   │   │   ├── chat.service.ts
│   │   │   │   ├── game-data.service.ts
│   │   │   │   ├── game-state.service.ts
│   │   │   │   ├── game.service.ts
│   │   │   │   ├── game.types.ts
│   │   │   │   ├── gameTurn.service.ts
│   │   │   │   ├── host-action.service.ts
│   │   │   │   ├── itemProbabilities.json
│   │   │   │   ├── player-manager.service.ts
│   │   │   │   └── zombie.service.ts
│   │   │   ├── lobby.service.ts
│   │   │   ├── payload.types.ts
│   │   │   ├── socket.gateway.ts
│   │   │   ├── socket.module.ts
│   │   │   ├── types/
│   │   │   │   └── pubsub-helper.ts
│   │   │   └── utils/
│   │   │       ├── randomManager.ts
│   │   │       └── socketRoomManager.ts
│   │   ├── user/                      # User management
│   │   │   ├── dto/
│   │   │   │   └── user.dto.ts
│   │   │   ├── tag/
│   │   │   │   └── tag.service.ts
│   │   │   ├── user-cache.service.ts
│   │   │   ├── user-init.service.ts
│   │   │   ├── user.module.ts
│   │   │   ├── user.repository.ts
│   │   │   └── user.service.ts
│   │   └── utils/                     # Utility functions
│   │       ├── base32.ts
│   │       └── vectorize-docs.ts
│   ├── dist/                          # Backend build output
│   ├── docs/                          # Project documentation
│   │   ├── RedisERD.txt
│   │   ├── caddy-setup.md
│   │   ├── planning.md
│   │   ├── project-structure.md
│   │   ├── project-structure-tree.md  # This file
│   │   ├── redis.erd
│   │   ├── updatePlan.md
│   │   ├── vector-search-commands.txt
│   │   ├── 상태동기화.txt
│   │   ├── 수정예정.txt
│   │   ├── 이미지.txt
│   │   └── 피드백.txt
│   ├── front/                         # Frontend build output (copy)
│   │   ├── assets/
│   │   │   ├── index-C484cAVX.js
│   │   │   └── index-DVOY5OLp.css
│   │   ├── game_bgm.mp3
│   │   ├── img/
│   │   │   ├── google-icon.svg
│   │   │   ├── items/
│   │   │   │   ├── eraser.jpg
│   │   │   │   ├── medicine.jpg
│   │   │   │   ├── microphone.jpg
│   │   │   │   ├── shotgun.jpg
│   │   │   │   ├── spray.jpg
│   │   │   │   ├── vaccine.jpg
│   │   │   │   ├── vaccineMaterialA.jpg
│   │   │   │   ├── vaccineMaterialB.jpg
│   │   │   │   ├── vaccineMaterialC.jpg
│   │   │   │   ├── vaccineMaterialD.jpg
│   │   │   │   ├── vaccineMaterialE.jpg
│   │   │   │   ├── virusChecker.jpg
│   │   │   │   └── wireless.jpg
│   │   │   ├── logo.png
│   │   │   ├── region/
│   │   │   │   ├── beach.jpg
│   │   │   │   ├── building.jpg
│   │   │   │   ├── cave.jpg
│   │   │   │   ├── hill.jpg
│   │   │   │   ├── jungle.jpg
│   │   │   │   └── river.jpg
│   │   │   └── scence/
│   │   │       ├── checkInfect.png
│   │   │       ├── hide.png
│   │   │       ├── host.png
│   │   │       ├── infect.png
│   │   │       ├── killed.png
│   │   │       ├── runaway.png
│   │   │       ├── survivor.png
│   │   │       ├── vaccine.png
│   │   │       └── zombie.png
│   │   └── index.html
│   ├── logs/                          # PM2 logs
│   │   ├── pm2-combined.log
│   │   ├── pm2-error.log
│   │   └── pm2-out.log
│   ├── scripts/                       # Utility scripts
│   │   ├── read-vector-data.ts
│   │   ├── search-docs.ts
│   │   ├── start-pm2.sh
│   │   └── vectorize-project-docs.ts
│   ├── Caddyfile                      # Caddy configuration
│   ├── Caddyfile.dev                  # Caddy dev configuration
│   ├── README.md                      # Project README
│   ├── docker-compose-caddy.yml       # Caddy Docker configuration
│   ├── docker-compose-mysql.yml       # MySQL Docker configuration
│   ├── docker-compose.yml             # Main Docker configuration
│   ├── ecosystem.config.js            # PM2 configuration
│   ├── eslint.config.mjs              # ESLint configuration
│   ├── nest-cli.json                  # NestJS CLI configuration
│   ├── node_modules/                  # Backend dependencies
│   ├── package-lock.json              # Backend dependency lock
│   ├── package.json                   # Backend dependencies
│   ├── tsconfig.build.json            # TypeScript build configuration
│   ├── tsconfig.build.tsbuildinfo     # TypeScript build info
│   └── tsconfig.json                  # TypeScript configuration
│
└── Frontend/                          # Svelte Frontend Application
    ├── src/                           # Frontend source code
    │   ├── App.svelte                 # Root component
    │   ├── app.css                    # Global styles
    │   ├── main.ts                    # Frontend entry point
    │   ├── vite-env.d.ts              # Vite type definitions
    │   ├── common/                    # Common components and utilities
    │   │   ├── component/
    │   │   │   ├── api/
    │   │   │   │   └── logout.ts
    │   │   │   ├── footer.svelte
    │   │   │   └── userInfoHeader.svelte
    │   │   ├── constant/
    │   │   │   └── theme.ts
    │   │   ├── handleCode/
    │   │   │   └── errorHandle.ts
    │   │   ├── messagebox/            # Message box system
    │   │   │   ├── BoxOverlay.svelte
    │   │   │   ├── ImageUpload.svelte
    │   │   │   ├── InputBox.svelte
    │   │   │   ├── LoadingSpinner.svelte
    │   │   │   ├── MessageBox.svelte
    │   │   │   ├── SlideToggle.svelte
    │   │   │   ├── config/
    │   │   │   │   └── messageBoxColor.json
    │   │   │   ├── customStore.d.ts
    │   │   │   ├── customStore.js.map
    │   │   │   └── customStore.ts
    │   │   ├── store/                 # State management (Svelte stores)
    │   │   │   ├── authStore.ts
    │   │   │   ├── gameStateStore.ts
    │   │   │   ├── gameStore.d.ts
    │   │   │   ├── lobbyStore.ts
    │   │   │   ├── musicStore.ts
    │   │   │   ├── pageStore.ts
    │   │   │   ├── playerStore.ts
    │   │   │   ├── selectOptionStore.ts
    │   │   │   ├── selectPlayerMessageBox.d.ts
    │   │   │   ├── selectPlayerMessageBox.ts
    │   │   │   ├── socketStore.ts
    │   │   │   ├── synchronize.type.d.ts
    │   │   │   ├── synchronize.type.ts
    │   │   │   └── waitRoomStore.ts
    │   │   └── utils/
    │   │       ├── awaitSocketReady.ts
    │   │       └── fetch.ts
    │   └── page/                      # Page components
    │       ├── game/                  # Game pages
    │       │   ├── chat/
    │       │   │   ├── chatInput.svelte
    │       │   │   ├── chatLog.svelte
    │       │   │   └── regionInfo.svelte
    │       │   ├── common/
    │       │   │   ├── GameStartMessageBox.svelte
    │       │   │   ├── itemObject.d.ts
    │       │   │   └── itemObject.ts
    │       │   ├── menu/
    │       │   │   ├── actionModal.svelte
    │       │   │   ├── inventoryModal.svelte
    │       │   │   ├── mobileNav.svelte
    │       │   │   ├── sidebarMenu.svelte
    │       │   │   └── survivorModal.svelte
    │       │   ├── selectModal/
    │       │   │   ├── playerSelector.svelte
    │       │   │   └── selectOptionBox.svelte
    │       │   ├── game.type.d.ts
    │       │   ├── game.type.ts
    │       │   ├── gameLayout.svelte
    │       │   └── gameMenu.svelte
    │       ├── lobby/                 # Lobby pages
    │       │   ├── LobbyMain.svelte
    │       │   ├── RoomList.svelte
    │       │   ├── lobby.svelte
    │       │   └── lobby.type.ts
    │       ├── login/                 # Login page
    │       │   └── login.svelte
    │       ├── newUser/               # New user setup
    │       │   └── newUser.svelte
    │       └── waitRoom/              # Waiting room
    │           ├── playerCard.svelte
    │           └── waitRoom.svelte
    ├── front/                         # Frontend build output
    │   ├── assets/
    │   │   ├── index-C484cAVX.js
    │   │   └── index-DVOY5OLp.css
    │   ├── game_bgm.mp3
    │   ├── img/
    │   │   ├── google-icon.svg
    │   │   ├── items/
    │   │   │   ├── eraser.jpg
    │   │   │   ├── medicine.jpg
    │   │   │   ├── microphone.jpg
    │   │   │   ├── shotgun.jpg
    │   │   │   ├── spray.jpg
    │   │   │   ├── vaccine.jpg
    │   │   │   ├── vaccineMaterialA.jpg
    │   │   │   ├── vaccineMaterialB.jpg
    │   │   │   ├── vaccineMaterialC.jpg
    │   │   │   ├── vaccineMaterialD.jpg
    │   │   │   ├── vaccineMaterialE.jpg
    │   │   │   ├── virusChecker.jpg
    │   │   │   └── wireless.jpg
    │   │   ├── logo.png
    │   │   ├── region/
    │   │   │   ├── beach.jpg
    │   │   │   ├── building.jpg
    │   │   │   ├── cave.jpg
    │   │   │   ├── hill.jpg
    │   │   │   ├── jungle.jpg
    │   │   │   └── river.jpg
    │   │   └── scence/
    │   │       ├── checkInfect.png
    │   │       ├── hide.png
    │   │       ├── host.png
    │   │       ├── infect.png
    │   │       ├── killed.png
    │   │       ├── runaway.png
    │   │       ├── survivor.png
    │   │       ├── vaccine.png
    │   │       └── zombie.png
    │   └── index.html
    ├── public/                        # Static assets
    │   ├── game_bgm.mp3
    │   └── img/
    │       ├── google-icon.svg
    │       ├── items/
    │       │   ├── eraser.jpg
    │       │   ├── medicine.jpg
    │       │   ├── microphone.jpg
    │       │   ├── shotgun.jpg
    │       │   ├── spray.jpg
    │       │   ├── vaccine.jpg
    │       │   ├── vaccineMaterialA.jpg
    │       │   ├── vaccineMaterialB.jpg
    │       │   ├── vaccineMaterialC.jpg
    │       │   ├── vaccineMaterialD.jpg
    │       │   ├── vaccineMaterialE.jpg
    │       │   ├── virusChecker.jpg
    │       │   └── wireless.jpg
    │       ├── logo.png
    │       ├── region/
    │       │   ├── beach.jpg
    │       │   ├── building.jpg
    │       │   ├── cave.jpg
    │       │   ├── hill.jpg
    │       │   ├── jungle.jpg
    │       │   └── river.jpg
    │       └── scence/
    │           ├── checkInfect.png
    │           ├── hide.png
    │           ├── host.png
    │           ├── infect.png
    │           ├── killed.png
    │           ├── runaway.png
    │           ├── survivor.png
    │           ├── vaccine.png
    │           └── zombie.png
    ├── README.md                      # Frontend README
    ├── index.html                     # HTML entry point
    ├── node_modules/                  # Frontend dependencies
    ├── package-lock.json              # Frontend dependency lock
    ├── package.json                   # Frontend dependencies
    ├── svelte.config.js               # Svelte configuration
    ├── tsconfig.app.json              # TypeScript app configuration
    ├── tsconfig.json                  # TypeScript configuration
    ├── tsconfig.node.json             # TypeScript node configuration
    └── vite.config.ts                 # Vite build configuration
```

## Key File Types and Their Purpose

### Backend (NestJS)
- **`.ts`** - TypeScript source files
- **`.json`** - Configuration and data files
- **`.sql`** - Database schema files
- **`.js`** - JavaScript configuration files (ecosystem.config.js)
- **`.mjs`** - ES modules (eslint.config.mjs)

### Frontend (Svelte)
- **`.svelte`** - Svelte component files
- **`.ts`** - TypeScript source files
- **`.d.ts`** - TypeScript declaration files
- **`.css`** - Stylesheet files
- **`.js`** - JavaScript configuration files
- **`.json`** - Configuration files
- **`.html`** - HTML entry point

### Static Assets
- **`.mp3`** - Audio files (background music)
- **`.jpg`** - JPEG images (items, regions)
- **`.png`** - PNG images (scenes)
- **`.svg`** - SVG vector graphics (icons)

### Documentation
- **`.md`** - Markdown documentation files
- **`.txt`** - Text notes and guides
- **`.erd`** - Entity Relationship Diagram files

### Build and Configuration
- **`.yml`** - Docker Compose configuration
- **`.log`** - Log files
- **`.map`** - Source map files
- **`.tsbuildinfo`** - TypeScript build cache