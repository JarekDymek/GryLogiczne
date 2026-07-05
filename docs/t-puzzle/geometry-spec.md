# Gardner's T Geometry Spec

## Status

This is the corrected playable vector prototype for figure 1. It is based on
the color relationships visible in the numbered figure reference: pink and
yellow form the short slanted ends of the top bar, green forms the central
piece with the downward diagonal leg, and blue forms the stem with a slanted
top edge.

Before importing many levels, the four Gardner's T pieces should still be
rechecked against `T-puzle.jpg` and updated with exact symbolic relations where
needed.

## Base Unit

The prototype uses logical world unit `a = 1`.

## Piece Summary

### `blue-bar`

- Working color: blue
- Shape: vertical stem with a slanted top edge
- Vertices, clockwise:
  - `(2.25, 1)`
  - `(2.25, 4.25)`
  - `(1.25, 4.25)`
  - `(1.25, 2)`
- Area: `2.75`
- Flip axis: `(1.75, 1.6)` to `(1.75, 4.15)`

### `green-wing`

- Working color: green
- Shape: central six-sided piece with a downward diagonal leg
- Vertices, clockwise:
  - `(1.75, 0)`
  - `(3.25, 0)`
  - `(2.25, 1)`
  - `(1.25, 2)`
  - `(1.25, 1)`
  - `(0.75, 1)`
- Area: `2`
- Flip axis: `(1.25, 1)` to `(3.25, 0)`

### `pink-keystone`

- Working color: pink
- Shape: left slanted cap of the top bar
- Vertices, clockwise:
  - `(0, 0)`
  - `(1.75, 0)`
  - `(0.75, 1)`
  - `(0, 1)`
- Area: `1.25`
- Flip axis: `(0, 0.5)` to `(1.25, 0.5)`

### `yellow-cap`

- Working color: yellow
- Shape: right slanted cap of the top bar
- Vertices, clockwise:
  - `(3.25, 0)`
  - `(3.75, 0)`
  - `(3.75, 1)`
  - `(2.25, 1)`
- Area: `1`
- Flip axis: `(2.8, 0.5)` to `(3.75, 0.5)`

## Total Area

The solved figure area is `7`. The prototype T silhouette is the union of the
four color-coded piece polygons from figure 1.

## Edges And Centroids

Runtime edges and centroids are calculated in `src/games/t-puzzle/geometry.ts`
from the vertex lists, which avoids duplicate hand-maintained data.
