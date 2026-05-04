High-impact (data integrity / security)

1. No auth on the API. /api/_ is still wide-open on port 3001. Anyone with network access can read or wipe your treasury. A bearer token check (or basic auth) in front of /api/_ is an evening of work. We mentioned this two sessions back; nothing's changed.
2. No optimistic concurrency. Two tabs editing simultaneously silently overwrite each other — second writer wins. Adding an updated_at or version field on the doc and 409-ing stale writes would prevent silent loss.
3. Sync failures are silent. apiCall in TreasuryContext just console.errors. The user sees the optimistic UI succeed; they don't know the write didn't reach disk. A toast on failed PATCH/PUT/DELETE would catch this.
4. No restore UI. Backups work (db.json.bak, daily snapshots in data/backups/), but recovery is cp from a terminal. A "restore from snapshot" affordance in Settings would close the loop.
5. Currency only changes the symbol. Switching PHP → USD just swaps ₱ → $ on the same numbers. No conversion, no per-locale number formatting (e.g., EUR users would expect 1.234,56 € not €1,234.56). If the feature is "display preference" only, that's fine; if users will actually switch, it needs Intl.NumberFormat and a one-time conversion prompt.

Medium-impact (UX gaps)

6. Mobile is unusable. Heavy use of fixed-pixel widths (w-[432px] on cycle columns, w-[460px] on the edit modal, etc.) with no mobile breakpoints. The roadmap horizontal scroll is also rough on touch.
7. /api/data returns everything. Fine at 1.2 MB today; at 100+ MB you'll feel it. Pagination on transactions, or at least a ?since= cursor, would help.
8. No data export / import UI. Power users want a "download db.json" / "upload db.json" button rather than mounting a volume to seed. Also useful for moving between hosts.
9. No edit-this-and-future for recurring series. You have "this instance" and "all future" — but what people often want is "this and all subsequent" (without retroactively editing already-paid items).
10. No history browser. Each transaction's history array is rich but only viewable by editing that one tx. A timeline view across the whole DB would be valuable for debugging "wait, what changed last week?"

Low-impact polish

11. PWA / offline. Personal finance is a perfect PWA case — install as standalone app, works on flaky connection.
12. Notifications. Buffer days dropping below a threshold could fire a browser notification.
13. Drag-reorder test. Currently .skip'd due to dnd-kit testing complexity. Worth circling back if reorder regresses.
14. No "delete this and all future" for occurrences. Only "delete this one" or "delete entire series" — middle ground missing.
15. Number input UX. Numeric inputs accept arbitrary garbage like negative amounts, 1e10, etc. Light bounds checking would help.
