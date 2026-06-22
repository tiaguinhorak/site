# GLOBAL.md — Project conventions (read before UI/API/i18n changes)

This file defines **global rules** for the clutchclube Next.js site. AI agents and developers should follow it so dark/light mode, i18n, and user-facing behavior stay consistent.

## Internationalization (i18n)

- **Locales:** `pt-BR` (default), `en`, `es` — defined in `lib/i18n.ts`.
- **User-facing text:** Never hardcode Portuguese (or any language) in components. Use `useTranslations(namespace)` on the client and `getTranslations` on the server.
- **Message files:** `messages/pt-BR.json`, `messages/en.json`, `messages/es.json` — keep keys in sync across all three.
- **Validation errors:** Use `createValidationSchemas()` from `lib/security/schema-factory.ts` with messages from the `validation` namespace. Client: `useValidationSchemas()`. Server: `getValidationMessages(locale)` + `createValidationSchemas()`.
- **API errors:** Use `jsonErrorKey(request, status, key)` or `apiErrFromRequest(request, key)` from `lib/i18n/api-route.ts` with keys from `apiErrors`. Domain logic errors (ranked/lobby/play-state) use `RankedPartyError`, `LobbyRoomError`, `PlayStateError`, `RankedQueueError` with keys from `rankedErrors`, `lobbyErrors`, `playStateErrors`, `rankedQueueErrors` — resolved in API via `handleApiError(request, err)`.
- **Dynamic content (news, notifications):** Store Portuguese as primary fields; optional `translations` JSON for `en` / `es`. On read, `resolveArticleForLocale()` / `resolveNotificationContentForLocale()` in `lib/i18n/auto-resolve-content.ts` auto-translate missing locales and persist to DB. Categories use `formatNewsCategory()`.
- **Country names:** Use `getCountryDisplayName(code, locale)` — not hardcoded names in `countries.ts`.
- **Dates/numbers:** Use `Intl` or locale-aware formatting; avoid hardcoded `toLocaleDateString("pt-BR")` in user UI.

## Theme (dark / light)

- **Tokens only:** Colors, glass, borders, and shadows must use CSS variables from `app/globals.css` (`--background`, `--foreground`, `--primary`, `--glass-*`, `--glass-shadow`, etc.). Do not use raw `bg-gray-*`, `bg-black/60`, or ad-hoc hex in components.
- **Glass surfaces:** Use utility classes `.glass`, `.glass-strong`, `.glass-menu`, `.glass-modal`, `.glass-input`, `.glass-chip` — not custom opacity stacks.
- **Overlays:** Dropdown dismiss = `scrim-dismiss` (transparent, no blur). Modal backdrop = `scrim-dim` (subtle dim, no blur). Glass blur only on panels (`glass-menu`, `glass-modal`). Never `bg-black/60` for overlays.
- **Theme toggle:** Lives in account dropdowns (`AccountDropdown`, `UserMenuDropdown`), not duplicated in every navbar.
- **Light mode:** Shadows and inset highlights are tuned per theme via `--glass-shadow` / `--glass-inset` on `:root` vs `.dark`.

## User actions & confirmations

- **Destructive or profile-changing actions:** Use `useConfirm()` / `useConfirmPresets()` with `icon` keys (`delete`, `edit`, `logout`) — not label substring matching.
- **Profile edits:** All general-tab changes (photo, name, bio, etc.) are **draft until save**. Single save button with confirm; no immediate API calls on avatar pick/upload/preset.
- **Notification preferences:** Immediate toggle save is OK (explicit per-field action).

## API & security

- **Guards:** `applyApiGuards` + `requireSession` / `requireAdmin` as appropriate.
- **CSRF:** Mutations use `secureApi` client helper with site header.
- **Rate limits:** Respect `RATE_LIMITS` in `lib/security/constants.ts`.

## Admin content

- **News:** Title, excerpt, body in PT; optional EN/ES via translations object. Use “Traduzir automaticamente” before publish when needed.
- **Notifications:** Title/body in PT; optional EN/ES in `translations` JSON or `autoTranslate: true` on admin send (broadcast or single user).
- **Admin UI:** Portuguese labels are acceptable in admin-only screens; user-facing dashboard/marketing must be fully i18n.

## File map (quick reference)

| Concern | Location |
|--------|----------|
| Locales | `lib/i18n.ts`, `i18n/request.ts` |
| Message catalog | `lib/i18n/catalog.ts` |
| Server i18n helpers | `lib/i18n/server.ts` |
| Validation schemas | `lib/security/schema-factory.ts`, `lib/hooks/use-validation-schemas.ts` |
| Auto-translate | `lib/translation/auto-translate.ts`, `app/api/admin/translate/route.ts` |
| Theme provider | `lib/theme.tsx`, `app/globals.css` |
| Confirm dialogs | `components/providers/confirm-provider.tsx` |
| Profile draft save | `components/dashboard/profile-section.tsx` |
| Domain errors | `lib/errors/domain.ts`, `lib/i18n/domain-messages.ts`, `lib/i18n/api-route.ts` |

When adding a new user-visible string, add it to **all three** locale files in the same commit.
