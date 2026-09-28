# PFlood

A beta version of PFloodMarkers: an open-source (MIT) community map of historical flood
markers and geodetic survey marks.

## Embedding the map

Other websites can show the map in an `<iframe>`. The **Embed** page (`/share`) builds the code, with a live preview:

```html
<iframe src="https://your-site.example/embed" title="Flood marker map" width="100%" height="500"
        style="border:0;border-radius:12px" loading="lazy"></iframe>
```

The embed (`/embed`) has no site header. Clicking a pin opens the marker's details in a side panel, or in a
bottom sheet when the embed is narrow. The panel starts with the key figures (flood date and water height, or elevation and PID),
then groups the rest into sections and links to the full site and to directions. The mouse wheel zooms the map only after the map is clicked,
so it doesn't take over scrolling on the host page.

Options (query string): `type=flood|geodetic`, `lat`, `lng`, `zoom`, `marker=<id>` (opens that marker's details), `search=0` (hides search).

Only `/embed` can be framed by other sites; every other page still refuses. To allow only certain sites, set
`EMBED_ALLOWED_ORIGINS` (see `.env.example`). With `IP_ALLOWLIST=on`, the embed is also limited to those networks.
