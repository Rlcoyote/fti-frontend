# Governance Docs Are Not Here

This folder used to contain a local copy of the Constitution of the Ancient Mariner (CAM) and a local copy of the FTI Progress Log.

**Both were stale.** They were frozen on 2026-04-03 and never updated. Every amendment, every session, and every code-review lesson since has been written to the real files elsewhere. Reading the local copies produced a 3-week-out-of-date picture of the project and violated CAM Article II (Never Assume. Verify First.).

They have been removed. This pointer file replaces them so no future session ever reads a stale governance doc again.

## Canonical Locations

| Document | Path |
|---|---|
| **CAM** (current) | `/Users/reggi/Documents/AI - Claude ChatGPT/Constitution_of_the_Ancient_Mariner_<latest>.md` |
| **Mariner's Companion** (non-code sister CAM) | `/Users/reggi/Documents/AI - Claude ChatGPT/Mariners_Companion_v<latest>.md` |
| **FTI Progress Log** | `/Users/reggi/Documents/BUSINESS - Flo-Test/FT - AI Claude GPT Files/docs/references/FTI Progress Log v2.md` |
| **FTI Session state files** | `/Users/reggi/Documents/BUSINESS - Flo-Test/FT - AI Claude GPT Files/docs/sessions/` |
| **Archived CAM/Companion versions** | `/Users/reggi/Documents/AI - Claude ChatGPT/archive/` |

## Rules

1. **Do not create a new local copy of the CAM, Companion, or Progress Log inside this folder.** Ever.
2. To read the CAM, list `/Users/reggi/Documents/AI - Claude ChatGPT/` and read the highest-numbered `Constitution_of_the_Ancient_Mariner_1798.XX.md`.
3. To update the CAM, edit the canonical file in place (per CAM amendment protocol), or bump the version by creating the next `1798.XX.md` file in the same folder.
4. If the CAM and Companion version numbers drift, Companion's header cites the parent CAM version it was last synced against.

## Versioning Note

CAM versioning (`1798.XX`) tracks amendment count across *all* projects (universal governance).
FTI Progress Log versioning (`v2`) tracks structural format revisions of the *FTI* log specifically.
**They are decoupled by design.** Do not force them to match.

---

*Pointer created 2026-04-22 after a cleanup session surfaced that an AI assistant had been reading the stale local CAM for the entire session.*
