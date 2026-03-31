# Discover V2 — Extension Design Spec

Port the Discover tab refactoring from freighter-mobile (PR #780) to the
freighter browser extension. The mobile version has a bottom navigation bar,
in-app WebView browser, and tab management — none of which apply to the
extension. The extension version is simpler: a Sheet overlay with scrollable
sections, protocol details modal, and new-tab navigation.

## Figma References

- **Extension Discover tab**: Figma file `C3G0a4Gd6RQyplRBppGDsL`, nodes
  `7839-5623`, `7839-5921`
- **Extension Recent expanded**: node `7840-31089`
- **Extension dApps expanded**: node `7839-5513`
- **Extension Protocol details**: node `7376-5216`
- **Extension Home with Discover button**: node `7301-18521`
- **Mobile Discover (reference)**: Figma file `KwkHXQxbNmDllwermJtnRu`, nodes
  `11115-14760`, `9892-93605`, `10233-25250`, `10052-14241`, `10852-35337`

## Decisions

| Decision                          | Choice                                      | Rationale                                                                             |
| --------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| Main Discover entry               | Sheet overlay (like AssetDetail)            | Keeps Home mounted underneath for smooth slide-down reveal. Matches existing pattern. |
| Sub-views (Recent/dApps expanded) | Local state inside Sheet                    | Sheet stays open, content swaps. Instant transition. Same approach as mobile.         |
| Protocol details                  | SlideupModal (like TransactionDetail)       | Dark theme. Existing component, well-tested.                                          |
| Recent protocols storage          | Standalone helper + `browser.storage.local` | Self-contained, no Redux overhead. Custom hook for React integration.                 |
| Welcome modal storage             | `browser.storage.local` flag                | Consistent with recent protocols. Async read on mount is trivial.                     |
| Opening a protocol                | `openTab(url)` — new browser tab            | Extension is web-based, no need for in-app WebView.                                   |
| Trending card size                | 264x148px (near full-width)                 | ~85% of content width. One card visible + peek of next. Matches mobile proportions.   |
| Route changes                     | Remove `/discover` route                    | Everything lives inside the Sheet overlay now.                                        |
| Analytics/metrics                 | Deferred                                    | Implement after initial feature is stable.                                            |
| E2E tests                         | Deferred                                    | Implement after initial feature is stable.                                            |

## Data Layer

### DiscoverData type update

`@shared/api/types/types.ts` — add two fields to the existing `DiscoverData`
type:

```typescript
export type DiscoverData = {
  description: string;
  iconUrl: string;
  name: string;
  websiteUrl: string;
  tags: string[];
  isBlacklisted: boolean;
  backgroundUrl?: string; // NEW — trending card background image
  isTrending: boolean; // NEW — whether protocol appears in Trending
}[];
```

### getDiscoverData() update

`@shared/api/internal.ts` — map `background_url` and `is_trending` from the
backend response (already returned by the API, just not mapped):

```typescript
return parsedResponse.data.protocols.map((entry) => ({
  // ...existing fields...
  backgroundUrl: entry.background_url,
  isTrending: entry.is_trending,
}));
```

### Recent protocols helper

`popup/helpers/recentProtocols.ts` — standalone module using
`browser.storage.local`:

- `getRecentProtocols(): Promise<RecentProtocolEntry[]>` — reads stored entries
- `addRecentProtocol(url: string): Promise<void>` — adds or moves URL to front,
  caps at 5 entries
- `clearRecentProtocols(): Promise<void>` — removes all entries

Storage shape:

```typescript
interface RecentProtocolEntry {
  websiteUrl: string;
  lastAccessed: number; // timestamp
}
// Stored under key "recentProtocols" in browser.storage.local
```

### useDiscoverData hook

`popup/views/Discover/hooks/useDiscoverData.ts` — replaces the existing
`useGetDiscoverData`:

- Fetches protocols via `getDiscoverData()`
- Reads recent protocols via `getRecentProtocols()`
- Returns computed lists:
  - `trendingItems` — protocols where `isTrending === true`
  - `recentItems` — recent URLs matched against fetched protocols (max 5)
  - `dappsItems` — all non-blacklisted protocols
  - `allProtocols` — full list for lookups
  - `isLoading`, `error` — request state
- Exposes `refreshRecent()` to re-read recent protocols after a visit

### useDiscoverWelcome hook

`popup/views/Discover/hooks/useDiscoverWelcome.ts`:

- Reads `hasSeenDiscoverWelcome` from `browser.storage.local` on mount
- Returns `{ showWelcome: boolean, dismissWelcome: () => void }`
- `dismissWelcome()` writes flag to storage and sets local state to false

## Navigation & Transitions

### Main Discover screen — Sheet overlay

The `Account` view (`popup/views/Account/index.tsx`) is the common parent of
`AccountHeader` and `AccountAssets`. It owns the `isDiscoverOpen` state and
passes it down:

- `Account` holds `const [isDiscoverOpen, setIsDiscoverOpen] = useState(false)`
- `AccountHeader` receives `onDiscoverClick` prop — the Discover button calls
  `onDiscoverClick()` instead of `navigateTo`
- The `Sheet` + `SheetContent side="bottom"` is rendered in the `Account` view
  itself (same level as the existing layout), controlled by `isDiscoverOpen`
- Home screen stays mounted underneath — smooth slide-down reveal on close
- The Discover content renders inside the Sheet
- Header uses `SubviewHeader` with `customBackIcon` (X icon) and
  `customBackAction` calling `setIsDiscoverOpen(false)`

### Sub-views inside the Sheet

Local state variable controls which content is rendered:

```typescript
type DiscoverView = "main" | "recent" | "dapps";
const [activeView, setActiveView] = useState<DiscoverView>("main");
```

- `'main'` — DiscoverHome (trending + sections + footer)
- `'recent'` — ExpandedRecent (full list with clear menu)
- `'dapps'` — ExpandedDapps (full list)

Instant content swap between sub-views (no transition animation). Back buttons
in expanded views call `setActiveView('main')`.

### Protocol details — SlideupModal

- Rendered within the Sheet, layered on top of the current sub-view
- Managed by `selectedProtocol` local state (null = hidden, protocol object =
  shown)
- Uses the existing `SlideupModal` component with dark theme
  (`--sds-clr-gray-01` background)
- Dismissed by clicking the `LoadingBackground` overlay

### Opening a protocol

- Calls `openTab(protocol.websiteUrl)` to open a new browser tab
- Calls `addRecentProtocol(protocol.websiteUrl)` to record the visit
- Calls `refreshRecent()` to update the Recent section

### Welcome modal

- Rendered within the Sheet on first visit (when `showWelcome` is true)
- Overlay modal on top of the Discover content
- "Let's go" button calls `dismissWelcome()`

### Route cleanup

- Remove the `/discover` route from `routes.ts` and `Router.tsx`
- Remove the old `Discover` view import from `Router.tsx`
- Update `AccountHeader` to toggle Sheet state instead of calling `navigateTo`

## Components

### Discover (index.tsx) — orchestrator

Main component rendered inside the Sheet. Manages:

- `activeView` state (`'main' | 'recent' | 'dapps'`)
- `selectedProtocol` state (for SlideupModal)
- Welcome modal visibility (via `useDiscoverWelcome`)
- Data fetching (via `useDiscoverData`)
- Renders the active sub-view + ProtocolDetailsPanel in SlideupModal +
  DiscoverWelcomeModal

### DiscoverHome — main scrollable view

Content of the `'main'` sub-view:

- `SubviewHeader` with "Discover" title, X close icon via `customBackIcon` /
  `customBackAction`
- `TrendingCarousel` section with "Trending" label
- `DiscoverSection` for Recent (hidden if no recent items) — chevron navigates
  to `'recent'` view
- `DiscoverSection` for dApps — chevron navigates to `'dapps'` view
- Legal disclaimer footer (same text as current implementation)

### TrendingCarousel

Horizontal scrollable container:

- Cards: 264px wide x 148px tall, 12px border-radius
- Background image with gradient overlay (bottom-to-top, from
  `--sds-clr-gray-03` to transparent)
- Protocol name (bottom-left, semi-bold 14px) + primary tag (bottom-right,
  medium 14px, secondary color)
- 16px gap between cards
- Container has horizontal overflow scroll, no scrollbar
- Tapping a card sets `selectedProtocol` (opens details modal)

### DiscoverSection

Reusable section wrapper (used for both Recent and dApps on the main view):

- Header row: section title (Text, sm, semi-bold) + `Icon.ChevronRight` —
  clickable, triggers expand callback
- Vertical list of up to 5 `ProtocolRow` items
- 24px gap between rows

### ProtocolRow

Reusable row component (used in sections and expanded views):

- 32px x 32px rounded (10px radius) protocol icon
- 12px gap to text column
- Protocol name (Text, sm, medium)
- Primary tag as subtitle (Text, xs, medium, `--sds-clr-gray-11`)
- "Open" pill button on far right: border `--sds-clr-gray-06`, text +
  `Icon.LinkExternal01` (14px)
- Tapping the row (not the button) opens protocol details modal
- Tapping "Open" button calls `openTab(url)` + `addRecentProtocol(url)`

### ExpandedRecent

Full-page sub-view for recent protocols:

- `SubviewHeader` with back arrow (default), "Recent" title, `rightButton` with
  three-dot menu icon
- Three-dot menu: dropdown with "Clear recents" option (red text
  `--sds-clr-red-09`, trash icon)
- Full scrollable list of recent `ProtocolRow` items
- "Clear recents" calls `clearRecentProtocols()` + `refreshRecent()` + returns
  to main view

### ExpandedDapps

Full-page sub-view for all dApps:

- `SubviewHeader` with back arrow, "dApps" title, no right button
- Full scrollable list of all `ProtocolRow` items

### ProtocolDetailsPanel

Content rendered inside `SlideupModal` (dark theme):

- Header row: 40px icon (10px radius) + protocol name (Text, lg, medium) +
  filled "Open" button (dark bg, white text, pill shape)
- Domain section: "Domain" label (Text, xs, medium, `--sds-clr-gray-11`) + globe
  icon + hostname (Text, sm, medium)
- Tags section: "Tags" label + pill badges (success variant, lime colors)
- Overview section: "Overview" label + description text (Text, sm, regular)
- 24px vertical spacing between sections
- "Open" button calls `openTab(url)` + `addRecentProtocol(url)`

### DiscoverWelcomeModal

First-time onboarding modal:

- Rendered as an overlay on top of Discover content (using `LoadingBackground` +
  positioned card)
- Compass icon in a rounded container
- "Welcome to Discover!" title
- Two paragraphs: ecosystem intro + third-party disclaimer
- "Let's go" CTA button — dismisses the modal and writes flag to
  `browser.storage.local`

## File Structure

```
@shared/api/
  types/types.ts                        # UPDATE: add backgroundUrl, isTrending to DiscoverData
  internal.ts                           # UPDATE: map background_url, is_trending

extension/src/popup/
  views/Discover/
    index.tsx                           # REWRITE: orchestrator (sub-views, modals, data)
    styles.scss                         # REWRITE: top-level styles
    hooks/
      useDiscoverData.ts                # NEW: replaces useGetDiscoverData
      useDiscoverWelcome.ts             # NEW: browser.storage.local welcome flag
    components/
      DiscoverHome/
        index.tsx                       # NEW: main scrollable view
        styles.scss
      TrendingCarousel/
        index.tsx                       # NEW: horizontal card carousel
        styles.scss
      DiscoverSection/
        index.tsx                       # NEW: section wrapper (title + chevron + rows)
        styles.scss
      ProtocolRow/
        index.tsx                       # NEW: reusable protocol row
        styles.scss
      ExpandedRecent/
        index.tsx                       # NEW: full recent list with clear menu
        styles.scss
      ExpandedDapps/
        index.tsx                       # NEW: full dApps list
        styles.scss
      ProtocolDetailsPanel/
        index.tsx                       # NEW: SlideupModal content
        styles.scss
      DiscoverWelcomeModal/
        index.tsx                       # NEW: first-time modal
        styles.scss
  helpers/
    recentProtocols.ts                  # NEW: browser.storage.local CRUD
  views/Account/
    index.tsx                           # UPDATE: add isDiscoverOpen state + Discover Sheet
  components/account/
    AccountHeader/index.tsx             # UPDATE: Discover button calls onDiscoverClick prop

MODIFY:
  popup/constants/routes.ts                           # remove discover route
  popup/Router.tsx                                    # remove Discover route + import

REMOVE:
  popup/views/Discover/hooks/useGetDiscoverData.ts   # replaced by useDiscoverData

REWRITE:
  popup/views/__tests__/Discover.test.tsx             # rewrite for new Sheet-based structure
```

## Out of Scope

- Analytics/metrics events — deferred to follow-up
- E2E tests — deferred to follow-up
- Bottom navigation bar (mobile-only concept)
- In-app WebView / tab management (mobile-only concept)
- Search/URL bar (mobile-only concept)
- Tab overview grid (mobile-only concept)
