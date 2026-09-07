# Personal Rail Maxspeed Filter Map

A simple Leaflet webpage that shows only railway lines with `maxspeed` above your selected threshold (160/200/250/300/350 km/h).

## Run

From this folder:

```bash
python3 -m http.server 8080
```

Then open:

- <http://localhost:8080/index.html>

If you get `OSError: [Errno 48] Address already in use`, either free the port:

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
kill <PID>
```

or use another port:

```bash
python3 -m http.server 8081
```

## How it works

- Default startup view is Europe.
- Basemap is selectable in the UI:
  - `Subdued (rail focus)` (default)
  - `Geographic Intl`
  - `Street (Latin labels)`
  - `Dark muted`
  - `Blank`
- `Subdued`, `Dark muted`, and `Blank` include city labels using Esri reference layers.
- Basemap city labels are configured to be Latin/transliterated where available.
- `Geographic Intl` uses Wikimedia `osm-intl`.
- Global mode (zoom `<10`) uses OpenRailwayMap `maxspeed` raster tiles and filters them client-side by threshold.
- Detail mode (zoom `>=10`) uses Overpass API to fetch OSM railway ways in the current viewport.
- Detail mode reads `maxspeed`, `maxspeed:forward`, `maxspeed:backward` and converts `mph` to `km/h`.
- Detail-mode popups prefer Latin-friendly names when available (`name:en`, `int_name`, `name:latin`, then `name`).
- Both modes apply the same threshold filter (`>=` selected value).
- Lines are rendered slightly thicker for better readability.
- Detail mode auto-updates data after map move/zoom.
- Detail data uses fixed 0.5-degree geographic cells, so overlapping views reuse downloads.
- Fresh cached cells display first; missing cells load with at most two simultaneous requests.
- Navigation cancels obsolete requests and prevents delayed responses from replacing the current view.
- Existing lines remain visible while loading. The global overlay stays visible until all detail cells are fresh and ready.
- A `Retry detail data` button appears for failed requests or outdated fallback data.
- Caches detail cells in the browser for 45 days. If storage fails or stalls, live loading continues with a bounded in-memory cache.
- Expired records are retained for up to 90 days as a network-failure fallback, clearly marked as outdated.
- Prefetches up to two adjacent cells after visible data finishes, at most once every 45 seconds. Navigation cancels prefetching.
- The control panel keeps its 0.4-alpha background, aligned controls, and mobile layout. Collapse it to reveal more map; expand `About the map and data` for cache details.

## Notes

- Global mode is designed for fast world browsing (including China and other non-European regions).
- In global mode, no manual data load is needed.
- In detail mode, very large map windows may still be rejected to avoid heavy Overpass requests.
- Data quality depends on OSM tagging coverage.
- Global speed filtering estimates values from raster colours; it is not an exact numeric filter, particularly near band boundaries. Detail mode filters numeric OSM tags.
- Existing viewport-based cache records are not reused by the new cell cache and age out automatically.

## Verification

No build step or package installation is required. Run the regression suite with Node.js 18 or newer:

```bash
node --test tests/rail-data.test.cjs
```

The suite covers cell reuse and dateline wrapping, cache freshness, request concurrency and cancellation, delayed responses, duplicate ways, threshold changes, storage errors, network failures, and stale fallback. Browser checks should also cover panel collapse, keyboard access, mobile fit, dragging, and basemap selection.
