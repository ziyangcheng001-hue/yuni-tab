# Search Engine Switch Design

## Goal

Add a persistent Bing/Google search engine selector to YuNi-tab. Search submission,
autocomplete requests, autocomplete result navigation, and the input placeholder
must all follow the selected engine.

## User Experience

- Add a `Bing / Google` segmented selector to the settings panel.
- Keep Bing as the default for existing and new users.
- Persist the selected engine in `localStorage` under `searchEngine`.
- Update the search placeholder immediately when the engine changes.
- Apply the new engine immediately without reloading the new-tab page.

## Search Provider Configuration

Define the supported providers in one JavaScript configuration object. Each
provider exposes:

- A stable identifier: `bing` or `google`.
- A display name.
- A search result URL builder.
- The placeholder text shown in the search input.

Unknown or invalid stored values fall back to Bing.

## Autocomplete Flow

The new-tab page sends the active engine and query to the service worker. The
worker selects the matching endpoint:

- Bing: `https://api.bing.com/osjson.aspx?query=...`
- Google: `https://suggestqueries.google.com/complete/search?client=chrome&q=...`

Both responses expose the suggestion list at array index `1`, so the worker
normalizes them into the existing `{ ok, data }` response contract.

Google's autocomplete endpoint currently responds successfully but is not a
documented public API with a stability guarantee. The implementation therefore
must treat autocomplete as optional. If a request fails or its response format
changes, the suggestion list is hidden and normal Google search remains usable.

## Extension Permissions

Add `*://suggestqueries.google.com/*` to `host_permissions`. Navigating to a
Google search result does not require an additional permission.

The service worker remains the primary autocomplete transport. The direct-fetch
fallback used outside the extension may fail because the Google endpoint does
not return a permissive CORS header; that failure must remain non-fatal.

## State And Data Flow

1. On startup, read and validate `localStorage.searchEngine`.
2. Initialize the selector and input placeholder from the active provider.
3. When the selector changes, persist the provider and update the placeholder.
4. On input, request suggestions for the active provider.
5. Ignore stale suggestion responses if the query or provider changed while a
   request was in flight.
6. On submit or suggestion click, navigate using the active provider's search
   URL builder.

## Error Handling

- Invalid saved engine: fall back to Bing.
- Worker request failure: hide suggestions.
- Empty or malformed response: hide suggestions.
- Engine changed during an in-flight request: discard the stale response.
- Empty search submission: retain the existing validation hint behavior.

## Verification

- Selecting Google updates the placeholder and persists after reload.
- Typed search and clicked suggestions both open Google when Google is active.
- Selecting Bing restores existing Bing behavior and persists after reload.
- A failed autocomplete request does not block search submission.
- Existing settings, wallpaper management, idle behavior, and bookmark Dock
  continue working.

## Out Of Scope

- Additional search engines.
- User-defined search URL templates.
- Syncing the selected engine between devices.
- Replacing the current service worker architecture.
