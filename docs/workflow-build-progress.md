# OKR Workflow Build Progress

## Current build slice

Goal: make the app reflect the team operating rhythm: quarterly objectives, measurable key results, initiatives that drive the KRs, and weekly check-ins on KR movement plus initiative status.

Current focus: Plan Quarter first, so the team can enter Objectives, Key Results, and Initiatives before review/check-in surfaces try to summarize them.

## Progress

- [x] Add lightweight Initiative data model linked to key results.
- [x] Add migration for initiatives.
- [x] Add seeded initiatives for the demo workspace.
- [x] Add local demo hierarchy with objectives, KRs, updates, and initiatives.
- [x] Add workflow helper types and summary calculations.
- [x] Redesign dashboard around the OKR hierarchy.
- [x] Add visible needs-attention workflow.
- [x] Add helper tests for summary/filter/needs-attention logic.
- [x] Verify locally.
- [x] Push to `main`.
- [x] Add Plan Quarter page for entering Objectives, Key Results, and Initiatives.
- [x] Add browser-local Plan Quarter persistence for local preview.
- [x] Make app entry point start at Plan Quarter.

## Next slices

- [ ] Add a weekly check-in form for KR movement and initiative status.
- [ ] Add database-backed save for the Plan Quarter form.
- [ ] Add production database setup/runbook updates for the new Initiative model.
