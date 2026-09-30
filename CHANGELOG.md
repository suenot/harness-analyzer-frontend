# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.5] - 2026-09-30

### Fixed

- Make the open-source repository discoverable with accessible GitHub icon links in the landing hero and footer.

## [0.4.4] - 2026-09-27

### Fixed

- Give GPT-6 Astra, Sol, and Luna distinct green chart colors and use green for other GPT models.

## [0.4.3] - 2026-09-27

### Fixed

- Use a generic GLM chart color without treating every GLM model as GLM 5.2.

## [0.4.2] - 2026-09-26

### Fixed

- Made the installation command visibly selectable by mouse while keeping its copy button.
- Filled the landing hero's right column with compact facts and sync setup steps.
- Corrected the hosted sync summary to describe private session statistics.

## [0.4.1] - 2026-09-26

### Fixed

- Clarified in the landing hero that standard sync uploads per-session usage data but no conversation text, and that the optional history flag can upload private text.
- Corrected the method section's description of uploaded data.

## [0.4.0] - 2026-09-26

### Added

- Show token creation, CLI login, initial sync, and macOS background sync steps in the landing hero.

### Fixed

- Make the installation and setup commands selectable and copyable.

## [0.3.3] - 2026-09-26

### Changed

- Renamed the source repository and workspace package to Harness Analyzer.

## [0.3.2] - 2026-08-16

### Fixed

- Increased project title line height so descenders remain visible inside the two-line clamp.

## [0.3.1] - 2026-08-16

### Fixed

- Replaced wasteful full-width project rows with responsive square cards and a matching loading layout.
- Kept expanded project breakdowns readable with a full-width panel and side-by-side desktop charts.

## [0.3.0] - 2026-08-16

### Added

- Added independent profile controls for sharing sanitized Sessions and Projects pages.
- Added public Sessions and Projects routes with profile-scoped navigation and explicit not-shared states.

### Changed

- Introduced separate public data types so session prompts, titles, files, project links and internal IDs cannot enter shared page components.
- Limited shared project presentation to short labels and aggregate model and harness breakdowns.

## [0.2.0] - 2026-08-16

### Added

- Added a private, range-aware device usage chart with USD, token and session metrics.

### Changed

- Replaced the duplicate hero logo panel with a full-height telemetry fact grid.
- Clarified that sync uploads a private device label in addition to aggregates, and that device labels are never published.
- Limited the fleet chart to hosted private analytics, leaving the local collector dashboard on its existing local data routes.

### Fixed

- Gave the hero installation command enough line height and vertical clearance to prevent clipped glyphs.

## [0.1.2] - 2026-08-16

### Fixed

- Promoted the CLI installation command to a large, full-width hero strip.

## [0.1.1] - 2026-08-16

### Fixed

- Added the CLI installation command to the public landing page.
- Clarified that hosted sync uploads aggregate statistics while raw telemetry stays local.
