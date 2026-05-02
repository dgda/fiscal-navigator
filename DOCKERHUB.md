# Treasury OS

Personal financial roadmap and liquidity-forecasting engine. Track multi-cycle financial trajectories with cycle-based accounting, real-time burn-rate calculations, and a local-first, single-container deployment.

- **Dynamic Roadmap Engine** — bi-weekly, semi-monthly, or monthly payout archetypes
- **Liquidity Forecasting** — burn days and liquidity gaps in real time
- **Cycle-Based Accounting** — focused on payout windows, not generic months
- **Local-First Data** — your `db.json` lives on your machine, never in the image

## Supported architectures

| Tag      | Platforms                    |
| -------- | ---------------------------- |
| `latest` | `linux/amd64`, `linux/arm64` |

Native on Intel/AMD servers, TrueNAS SCALE, Apple Silicon, Raspberry Pi 4/5, AWS Graviton, Ampere. Docker selects the right architecture automatically — no `--platform` flag needed.

## What's in the image

- Built frontend bundle (minified)
- A single bundled server JS (~11 KB) — no source code shipped
- Production Node dependencies only

## Quick start

```bash
docker run -d \
  --name fnav \
  -p 3001:3001 \
  -v "$(pwd)/data:/app/data" \
  dgabrielablay/fiscal-navigator:latest
```

Then open <http://localhost:3001>.

The server reads and writes its database at `/app/data/db.json` inside the container. **Mount a directory, not a single file** — single-file bind mounts break LowDB's atomic writes (you'll see `EBUSY` on Docker Desktop for Mac, or silent corruption elsewhere).

If `db.json` doesn't exist on first run, the server seeds it from defaults. A rolling `db.json.bak` and daily snapshots under `backups/` (last 7 retained) are written next to it automatically.

## Run by host

### macOS / Linux (bash, zsh)

```bash
docker run -d --name fnav -p 3001:3001 -v "$(pwd)/data:/app/data" dgabrielablay/fiscal-navigator:latest
```

### Windows (PowerShell)

```powershell
docker run -d --name fnav -p 3001:3001 -v "${PWD}/data:/app/data" dgabrielablay/fiscal-navigator:latest
```

### Windows (cmd.exe)

```bat
docker run -d --name fnav -p 3001:3001 -v "%cd%/data:/app/data" dgabrielablay/fiscal-navigator:latest
```

### Linux server (systemd, absolute path)

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

```bash
docker volume create fnav-data
docker run -d --name fnav -p 3001:3001 -v fnav-data:/app/data dgabrielablay/fiscal-navigator:latest
```

### TrueNAS SCALE (Apps → Custom App)

- Image: `dgabrielablay/fiscal-navigator:latest`
- Port forward: `3001 → 3001`
- Storage: mount a host path or dataset to `/app/data` (do **not** mount a single file)

### docker-compose

```yaml
services:
  fnav:
    image: dgabrielablay/fiscal-navigator:latest
    container_name: fnav
    ports:
      - '3001:3001'
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

## Bringing your own `db.json`

Place it at `./data/db.json` (or whatever path is bound to `/app/data`) **before** starting the container:

```bash
mkdir -p data
cp /path/to/your/db.json data/db.json
docker run -d --name fnav -p 3001:3001 -v "$(pwd)/data:/app/data" dgabrielablay/fiscal-navigator:latest
```

## Updating

```bash
docker pull dgabrielablay/fiscal-navigator:latest
docker stop fnav && docker rm fnav
docker run -d --name fnav -p 3001:3001 -v "$(pwd)/data:/app/data" dgabrielablay/fiscal-navigator:latest
```

Your `db.json`, `db.json.bak`, and `backups/` are in the volume, so they survive the upgrade.

## Common operations

```bash
docker logs -f fnav     # tail logs
docker restart fnav     # restart
docker stop fnav        # stop
docker rm fnav          # remove container (data persists in the volume)
```

## Troubleshooting

- **`EBUSY: resource busy or locked, rename '/app/data/.db.json.tmp' -> '/app/data/db.json'`** — you bind-mounted a single file. Mount the parent directory instead (`-v "$(pwd)/data:/app/data"`).
- **`db.json` ends up as a directory on the host** — same root cause. Docker auto-creates a directory when the bind-mount source doesn't exist as a file. Mount a directory.
- **Theme or settings don't persist after refresh** — your write is failing. Check `docker logs fnav` for write errors; usually the volume mount is wrong or read-only.
- **Port 3001 already in use** — change the host side: `-p 3002:3001`, then open <http://localhost:3002>.

## License

This image is licensed for personal or internal organizational use under a proprietary license. **You may** pull, run, and operate the image as published, mount your own data into it, and update to newer versions.

**You may not** access, copy, redistribute, or republish the source code or the image; reverse engineer or unminify the image; create derivative works; or use the software, its source code, or any derivative as input to train, fine-tune, or evaluate any machine learning model, LLM, or code-suggestion system. You may not use its logic, formulas, or design as reference or learning material — by humans or by automated means — to build a competing or substantially similar work.

The full license follows below. By pulling or running the image you agree to it.

---

# Proprietary and Confidential

Copyright (c) 2026 DON GABRIEL DEOFERIO ABLAY. All Rights Reserved.

## 1. Confidentiality and Ownership

This software and all associated documentation (the "Software") are the
exclusive intellectual property of DON GABRIEL DEOFERIO ABLAY. The
source code, build artifacts, and design of the Software remain
strictly confidential and proprietary.

## 2. Limited License to Run the Distributed Image

A non-exclusive, non-transferable, royalty-free, revocable license is
granted to pull, run, and operate the official multi-arch Docker image
published at `dgabrielablay/fiscal-navigator` (the "Distributed Image")
on hardware you control, for personal or internal organizational use,
including mounting your own data into the container.

This grant applies only to the Distributed Image as published. It
extends no rights to the source code, no rights to redistribute the
Distributed Image, and no rights of any other kind.

## 3. No Other License Granted

Outside the limited grant in Section 2, no license, right, or
permission is granted to any person or entity to access, copy, modify,
merge, publish, distribute, sublicense, host as a service, or sell
copies of the Software for any purpose—whether commercial, personal,
educational, or otherwise.

In particular, you may not:

- access, copy, fork, mirror, or redistribute the source code;
- create derivative works of the Software in any form;
- reverse engineer, decompile, disassemble, deobfuscate, or unminify
  the Distributed Image, except to the minimum extent permitted by
  applicable law that cannot be lawfully waived;
- use the Software, its source code, or any artifact derived from
  them as input to train, fine-tune, evaluate, or otherwise inform
  any machine learning model, large language model, or
  code-suggestion system;
- use the logic, formulas, algorithms, or design of the Software as
  reference or learning material to produce a competing or
  substantially similar work, by humans or by automated means;
- republish or repackage the Distributed Image to other registries
  or distributions;
- remove or alter any copyright notice or license text contained in
  the Software.

## 4. Patent and Trade Secret Protection

The logic, algorithms, financial formulas, data shapes, and processes
contained within this Software are protected by copyright, trade
secret laws, and potential patent rights. The license in Section 2
does not transfer or sublicense any of these rights. Unauthorized use
is a violation of these rights.

## 5. Termination

The license in Section 2 terminates automatically upon any breach of
Section 3. Upon termination you must cease all use of the Distributed
Image and delete any copies in your possession. Termination does not
waive any right to seek damages for the breach.

---

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

For commercial licensing or permissions beyond Section 2, contact:
dgabrielablay@gmail.com
