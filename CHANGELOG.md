# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-15

### Added
- **Sentinel Reverse Proxy Gateway (:3000):** Integrated process supervision, health-check monitoring, automatic backend restart, and TCP socket tunneling.
- **Multidimensional BI & Menu Decomposition:** Granular item decomposition for morning snacks (`LM`), lunches (`A`), and afternoon snacks (`LT`), with strict nutritional separation.
- **Defense-in-Depth Security (AppSec):**
  - Session versioning (`token_version`) with instantaneous revocation capability.
  - Mandatory TOTP 2FA (RFC 6238) for administrative and privileged mutations.
  - Ephemeral HMAC-signed `device_trust` hardware tokens.
  - Fail-fast environment boot check enforcing high-entropy 32+ character secrets.
  - Per-machine adaptive rate limiter isolating classroom network spikes.
- **Asynchronous Silent Audit Trail:** Global non-blocking audit logging via `res.on('finish')` with automatic token and password masking.
- **High-Concurrency SQLite WAL Engine:** Multi-reader/single-writer configuration with `busy_timeout=5000`, `synchronous=NORMAL`, and dedicated B-Tree indexes.
- **Real-Time WebSocket Infrastructure:** Heartbeat ping/pong (15s) with live broadcast across kitchen production, teacher desks, and TV totems.
- **Intelligent Maintenance Mode:** Centralized 503 response page with automatic client reconnection and authorized IP whitelist bypass.
- **Automated Backup Lifecycle:** Scheduled monthly backup retention policies with automated pruning of snapshots older than 30 days.
- **Automated Test Matrix:** Complete unit, integration, stress, and security tests covering backend APIs and frontend reactivity.
- **Bilingual Documentation:** Full enterprise documentation in English (`README.md`) and Portuguese (`README.pt-BR.md`).
- **CI/CD Automation:** GitHub Actions workflows for continuous integration testing across Node.js 20.x & 22.x, and automated GitHub Releases.

### Changed
- Refactored frontend state management with `useAntiFlicker`, `useLiveClock`, and `useRealtime` hooks.
- Standardized UI with Lucide icons, removing legacy emojis.
- Enhanced teacher review aggregates and bidirectional synchronization.
- Anonymized all seed scripts and development datasets to strictly comply with Brazilian Data Protection Law (LGPD).

### Fixed
- Addressed CVE-2026-90711 with updated `proxy-addr` dependency to prevent IPv4-mapped IPv6 authentication bypass.
- Fixed NaN calculations in BI analytics when parsing empty or legacy datasets.
- Eliminated white-screen-of-death (WSoD) states across all table views via optional chaining and defensive array defaults.
- Prevented full table scans during attendance lookups by indexing composite date and foreign keys.

### Security
- Purged all hardcoded fallbacks for cryptographic secrets.
- Masked sensitive payload parameters in log queues.
- Hardened `.gitignore` to prevent database and secret leaks.
