# Treasury OS

Treasury OS is a financial roadmap and liquidity forecasting engine designed to track multi-cycle financial trajectories with precision.

## Core Features

- **Dynamic Roadmap Engine**: Visualizes financial cycles based on configurable payout archetypes (bi-weekly, semi-monthly, or monthly).
- **Liquidity Forecasting**: Real-time calculation of "Burn Days" and liquidity gaps to determine tactical runway.
- **Modern Interface**: A responsive dashboard featuring glassmorphism, theme-aware transitions, and optimized data views.
- **Cycle-Based Accounting**: Focuses on specific financial cycles and payout windows rather than generic monthly buckets.
- **Local-First Data**: Built on an Express and LowDB backend for efficient, local data persistence.

## Technical Stack

### Frontend

- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Interactions**: @dnd-kit (Drag and Drop)

### Backend

- **Server**: Express
- **Database**: LowDB (Local JSON-based persistence)
- **Execution**: tsx

## Getting Started

### Prerequisites

- Node.js (Latest LTS)
- npm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/dgda/fiscal-navigator
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the application (Client & Server):
   ```bash
   npm run dev
   ```

## Running with Docker

Pre-built image: [`dgabrielablay/fiscal-navigator:latest`](https://hub.docker.com/r/dgabrielablay/fiscal-navigator)

The server reads and writes its database at `/app/data/db.json` inside the container. Mount a host directory to `/app/data` to persist data across restarts. **Always mount a directory, not a single file** — single-file bind mounts break LowDB's atomic-rename writes (you'll see `EBUSY` on Docker Desktop for Mac, or silent corruption elsewhere).

If `db.json` doesn't exist on first run, the server seeds it from defaults (3 sample accounts, default payout config). Edits made through the UI are persisted, plus a `db.json.bak` and a `backups/db.YYYY-MM-DD.json` daily snapshot (last 7 retained) appear next to it.

### Quick start

```bash
docker pull dgabrielablay/fiscal-navigator:latest
mkdir -p data
docker run -d --name fnav -p 3001:3001 -v "$(pwd)/data:/app/data" dgabrielablay/fiscal-navigator:latest
```

Then open <http://localhost:3001>.

### macOS / Linux (bash, zsh)

```bash
docker run -d \
  --name fnav \
  -p 3001:3001 \
  -v "$(pwd)/data:/app/data" \
  dgabrielablay/fiscal-navigator:latest
```

### Apple Silicon (M1/M2/M3)

The published image is multi-arch (`linux/amd64` + `linux/arm64`). Docker picks the right one for your CPU automatically — no `--platform` flag needed. The same `docker run` command from the section above works.

If you ever need to force a specific architecture (e.g. testing the amd64 build on Apple Silicon):

```bash
docker run -d \
  --name fnav \
  --platform linux/amd64 \
  -p 3001:3001 \
  -v "$(pwd)/data:/app/data" \
  dgabrielablay/fiscal-navigator:latest
```

### Windows (PowerShell)

```powershell
docker run -d `
  --name fnav `
  -p 3001:3001 `
  -v "${PWD}/data:/app/data" `
  dgabrielablay/fiscal-navigator:latest
```

### Windows (cmd.exe)

```bat
docker run -d ^
  --name fnav ^
  -p 3001:3001 ^
  -v "%cd%/data:/app/data" ^
  dgabrielablay/fiscal-navigator:latest
```

### Linux server (systemd, absolute path)

When running headless, prefer absolute paths so the container survives a working-directory change:

```bash
sudo mkdir -p /var/lib/fnav
sudo chown 1000:1000 /var/lib/fnav
docker run -d \
  --name fnav \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /var/lib/fnav:/app/data \
  dgabrielablay/fiscal-navigator:latest
```

### Named volume (no host directory)

If you don't want a host folder at all, use a Docker-managed volume:

```bash
docker volume create fnav-data
docker run -d --name fnav -p 3001:3001 -v fnav-data:/app/data dgabrielablay/fiscal-navigator:latest
```

Inspect contents with `docker run --rm -v fnav-data:/data alpine ls -la /data`.

### TrueNAS SCALE (Apps → Custom App)

- Image: `dgabrielablay/fiscal-navigator:latest`
- Port forward: `3001 → 3001`
- Storage: mount a host path or a TrueNAS dataset to `/app/data` (do **not** mount a single file)

### docker-compose

```yaml
services:
  fnav:
    image: dgabrielablay/fiscal-navigator:latest
    container_name: fnav
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    # Apple Silicon hosts only:
    # platform: linux/amd64
```

Start with `docker compose up -d`.

### Bringing your own `db.json`

To seed the container with an existing `db.json`, place it at `./data/db.json` (or whatever path you bind to `/app/data`) **before** starting the container:

```bash
mkdir -p data
cp /path/to/your/db.json data/db.json
docker run -d --name fnav -p 3001:3001 -v "$(pwd)/data:/app/data" dgabrielablay/fiscal-navigator:latest
```

### Common operations

```bash
docker logs -f fnav          # tail logs
docker restart fnav          # restart
docker stop fnav             # stop
docker rm fnav               # remove container (data persists in the volume)
docker pull dgabrielablay/fiscal-navigator:latest && docker stop fnav && docker rm fnav   # then re-run
```

### Local Docker testing (npm shortcuts)

For developers iterating on the image, the repo ships convenience scripts that build and run the image as a local container named `fnav` against `./data`:

```bash
npm run docker:build    # build the image (tag: fiscal-navigator:latest)
npm run docker:run      # start fnav, mounting ./data → /app/data, prints the URL
npm run docker:start    # build + run in one shot
npm run docker:logs     # tail logs
npm run docker:stop     # stop and remove the fnav container
```

Typical loop after a code change: `npm run docker:start`, verify at <http://localhost:3001>, `npm run docker:stop` when done. The scripts use `$PWD` for the volume path, so they work on macOS, Linux, WSL, and Git Bash; on native Windows `cmd.exe` use the per-OS one-liners above instead.

### Troubleshooting

- **`EBUSY: resource busy or locked, rename '/app/data/.db.json.tmp' -> '/app/data/db.json'`** — you bind-mounted a single file. Mount the parent directory instead (`-v "$(pwd)/data:/app/data"`).
- **`db.json` ends up as a directory on the host** — same root cause. Docker auto-creates a directory when the bind-mount source doesn't exist as a file. Mount a directory.
- **Theme or settings don't persist after refresh** — your write is failing. Check `docker logs fnav` for write errors; usually the volume mount is wrong or read-only.
- **Apple Silicon: warning about platform mismatch** — add `--platform linux/amd64` (or `platform: linux/amd64` in compose).
- **Port 3001 already in use** — change the host side: `-p 3002:3001`, then open <http://localhost:3002>.

## Development Scripts

### Local dev

- `npm run dev` — Vite dev server + Express backend (with `tsx watch`) concurrently
- `npm run dev:client` — Vite only
- `npm run dev:server` — Express only, with TS hot-reload

### Build

- `npm run build` — runs both client and server builds
- `npm run build:client` — type-check + Vite build → `dist/`
- `npm run build:server` — esbuild bundle of the server → `dist-server/server.js`

### Test & lint

- `npm test` — Vitest run, single-shot
- `npm run test:watch` — Vitest watch mode
- `npm run lint` — ESLint

### Docker (local)

- `npm run docker:build` — build local image
- `npm run docker:run` — start `fnav` against `./data`, print URL
- `npm run docker:start` — build + run
- `npm run docker:logs` — tail logs
- `npm run docker:stop` — remove the container

### Publish

- `npm run deploy` — build a multi-arch image (`linux/amd64` + `linux/arm64`) via `docker buildx` and push to Docker Hub
- `npm run deploy:single` — single-arch fallback if buildx isn't available

## Architecture

- `/src/components/`: UI components and roadmap features.
- `/src/context/`: Global state for financial data and preferences.
- `/src/hooks/`: API handling transaction persistence.

## License

This project is proprietary. For the full legal text regarding usage restrictions, commercial limitations, and intellectual property rights, please refer to the LICENSE.md file in the root directory.
