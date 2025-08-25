# Digitale_schoonmaak_game
Game die wordt gespeeld tijdens de workshop van Rick op de Digitale Duurzaamheidsconferentie waar men hun OneDrive schoonmaken op een speelse manier

# Folderstructuur
dashboardgame/
├── package.json
├── tsconfig.json              # als je TypeScript gebruikt
├── .env                       # secrets: MS appId, appSecret, redirectUri, etc.
│
├── src/
│   ├── server.ts              # entrypoint (Express + Socket.IO setup)
│   │
│   ├── config/                # Config & constants
│   │   └── env.ts             # laad .env variabelen
│   │
│   ├── routes/                # Express REST endpoints
│   │   ├── sessionRoutes.ts   # /api/session/*
│   │   ├── fileRoutes.ts      # /api/files, /api/delete
│   │   └── authRoutes.ts      # eventueel token refresh/logout
│   │
│   ├── services/              # logica richting externe APIs
│   │   ├── graphClient.ts     # wrapper om MS Graph (listFiles, deleteFile, ...)
│   │   └── statsEngine.ts     # berekent scores, CO₂, combo’s etc.
│   │
│   ├── core/                  # eigen domeinlogica (OOP)
│   │   ├── sessionManager.ts  # beheer van sessies, users, tokens
│   │   └── models.ts          # types/classes: User, Session, Stats
│   │
│   ├── sockets/               # Socket.IO event handlers
│   │   ├── hostSocket.ts      # logica voor host events
│   │   └── clientSocket.ts    # logica voor speler events
│   │
│   └── utils/                 # kleine helpers
│       └── logger.ts          # console + kleur, evt. Winston/Pino
│
├── public/                    # front-end (static files)
│   ├── index.html             # join-scherm
│   ├── host.html              # scoreboard view
│   ├── game.html              # speler UI (bestanden + monster)
│   │
│   ├── css/
│   │   └── style.css
│   │
│   └── js/                    # vanilla front-end scripts
│       ├── msal-init.js       # login flow clientside
│       ├── socket.js          # connect naar server
│       ├── ui.js              # drag & drop + animaties
│       └── api.js             # fetch calls naar Express API
│
└── dist/                      # build output (door tsc/esbuild)
