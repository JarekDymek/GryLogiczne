# Gardner's T Geometry Spec

## Status

This is the first playable vector prototype. It intentionally separates the
implemented data model from the final mathematical audit. Before importing many
levels, the four Gardner's T pieces should be rechecked against `T-puzle.jpg`
and updated with exact symbolic relations where needed.

## Base Unit

The prototype uses logical world unit `a = 1`.

## Piece Summary

### `blue-bar`

- Working color: blue
- Shape: vertical rectangle
- Vertices, clockwise:
  - `(1.5, 1)`
  - `(2.5, 1)`
  - `(2.5, 4)`
  - `(1.5, 4)`
- Area: `3`
- Flip axis: `(2, 1)` to `(2, 4)`

### `green-wing`

- Working color: green
- Shape: top-left trapezoid
- Vertices, clockwise:
  - `(0, 0)`
  - `(2.2, 0)`
  - `(1.5, 1)`
  - `(0, 1)`
- Area: `1.85`
- Flip axis: `(0.2, 0.5)` to `(1.9, 0.5)`

### `pink-keystone`

- Working color: pink
- Shape: middle trapezoid
- Vertices, clockwise:
  - `(2.2, 0)`
  - `(3.15, 0)`
  - `(2.5, 1)`
  - `(1.5, 1)`
- Area: `0.975`
- Flip axis: `(2.3, 0.12)` to `(2.35, 0.95)`

### `yellow-cap`

- Working color: yellow
- Shape: right trapezoid
- Vertices, clockwise:
  - `(3.15, 0)`
  - `(4, 0)`
  - `(4, 1)`
  - `(2.5, 1)`
- Area: `1.175`
- Flip axis: `(3.35, 0.5)` to `(4, 0.5)`

## Total Area

The solved figure area is `7`. The prototype T silhouette is the union of the
top bar and the vertical stem.

## Edges And Centroids

Runtime edges and centroids are calculated in `src/games/t-puzzle/geometry.ts`
from the vertex lists, which avoids duplicate hand-maintained data.
