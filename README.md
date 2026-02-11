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

- Uses Overpass API to fetch OSM railway ways in the current viewport.
- Reads `maxspeed`, `maxspeed:forward`, `maxspeed:backward`.
- Converts `mph` to `km/h`.
- Draws only lines with computed speed `>=` selected threshold.
- Auto-updates data after map move/zoom (can be toggled in UI).
- Caches query responses in the browser for 45 days.
- Prefetches nearby areas in the background to improve pan responsiveness.

## Notes

- Very large map windows may be rejected to avoid heavy Overpass requests.
- Data quality depends on OSM tagging coverage.
