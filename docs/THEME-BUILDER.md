# OneArtistHub Simple Theme Builder

The Theme Builder is a lightweight, data-driven homepage composer. It stores the layout in the existing `settings.site` JSON object, so no new database table or migration is required.

## Admin

Open **Admin → Theme Builder**.

The builder supports:

- Drag-and-drop top-level section ordering.
- Multiple independent Hero sections.
- Two-column rows.
- Components inside either column.
- Moving nested components between columns with drag-and-drop.
- Section editing without code.
- Existing OneArtistHub release, video, merch, tour and media data.
- Existing release playback and cart behavior.
- Responsive mobile layouts.
- Reset to a starter layout.
- Save & Activate to make the builder layout the public homepage.

## Layout data

The layout is stored under:

```text
settings.site.builder
```

Example:

```json
[
  {
    "id": "hero-1",
    "type": "hero",
    "title": "YOUR ARTIST",
    "subtitle": "NEW MUSIC. NEW STORIES.",
    "image": "/media/hero.webp"
  },
  {
    "id": "releases-1",
    "type": "releases",
    "title": "Latest Releases",
    "limit": 4
  },
  {
    "id": "columns-1",
    "type": "columns",
    "columns": [
      [{"id":"videos-1","type":"videos","title":"Videos","limit":3}],
      [{"id":"merch-1","type":"products","title":"Merchandise","limit":4}]
    ]
  }
]
```

## Supported component types

- `hero`
- `releases`
- `videos`
- `products`
- `tour`
- `about`
- `newsletter`
- `text`
- `columns`

`columns` is a layout container with two child arrays. Child components use the same component types except nested heroes/columns are intentionally excluded from the simple UI to keep the builder predictable.

## Design principle

The builder changes presentation order and section configuration without replacing the application's existing content models, player, commerce, authentication, media library, or APIs.
