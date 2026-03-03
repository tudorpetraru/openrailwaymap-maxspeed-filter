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
- A `Retry detail data` button appears only when a detail fetch fails.
- Caches detail query responses in the browser for 45 days.
- Prefetches nearby detail areas in the background to improve pan responsiveness.

## Notes

- Global mode is designed for fast world browsing (including China and other non-European regions).
- In global mode, no manual data load is needed.
- In detail mode, very large map windows may still be rejected to avoid heavy Overpass requests.
- Data quality depends on OSM tagging coverage.
