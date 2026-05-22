# Maps and Navigation

## Provider Choice

| Market | Provider | URL Scheme |
|--------|----------|------------|
| China | AMap (高德地图) | `iosamap://navi?...` |
| Outside China | Google Maps | `google.maps://?daddr=...` |
| Fallback | Web Maps | `https://maps.google.com/?q=...` |

## Integration Points

### Client
- Address creation: show map picker for coordinate selection
- Order detail: show service address on map, launch navigation

### Technician
- Schedule/trips: show today's trip locations on map
- Order detail: launch external navigation to service address

## Permission Flow

1. Request location permission when user taps a map-related action
2. If denied: show address text without map, do not block non-map flows
3. If granted: show map preview and navigation button

## Implementation Notes

- For MVP, use URL schemes to launch external map apps rather than embedding map SDKs
- This avoids adding large native SDK dependencies (AMap SDK ~10MB, Google Maps SDK ~5MB)
- Embedding map views can be added in a later phase when offline map caching is needed

## Future Enhancements

- Embed AMap/Google Maps SDK for in-app map views
- Real-time location tracking for technician trips
- Geocoding for address text → coordinate conversion
- Route optimization for multiple daily trips
