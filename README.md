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
- Basemap uses Wikimedia `osm-intl` labels (Latin/transliterated where available).
- Global mode (zoom `<10`) uses OpenRailwayMap `maxspeed` raster tiles and filters them client-side by threshold.
- Detail mode (zoom `>=10`) uses Overpass API to fetch OSM railway ways in the current viewport.
- Detail mode reads `maxspeed`, `maxspeed:forward`, `maxspeed:backward` and converts `mph` to `km/h`.
- Detail-mode popups prefer Latin-friendly names when available (`name:en`, `int_name`, `name:latin`, then `name`).
- Both modes apply the same threshold filter (`>=` selected value).
- Lines are rendered slightly thicker for better readability.
- Auto-updates data after map move/zoom (can be toggled in UI).
- Caches detail query responses in the browser for 45 days.
- Prefetches nearby detail areas in the background to improve pan responsiveness.

## Notes

- Global mode is designed for fast world browsing (including China and other non-European regions).
- In global mode, the manual `Load In View` button is disabled because no Overpass request is needed.
- In detail mode, very large map windows may still be rejected to avoid heavy Overpass requests.
- Data quality depends on OSM tagging coverage.
