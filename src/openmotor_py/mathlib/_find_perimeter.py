import numpy as np
from collections import deque


def _prepare_image(image):
    if isinstance(image, np.ma.MaskedArray):
        data = np.asarray(image.filled(np.nan), dtype=float)
    else:
        data = np.asarray(image, dtype=float)
    return data


def _marching_squares_segments(image, level, fully_connected_low=True):
    data = _prepare_image(image)
    rows, cols = data.shape
    segments = []

    for r in range(rows - 1):
        for c in range(cols - 1):
            tl = data[r, c]
            tr = data[r, c + 1]
            br = data[r + 1, c + 1]
            bl = data[r + 1, c]

            if np.isnan(tl) or np.isnan(tr) or np.isnan(br) or np.isnan(bl):
                continue

            pts = []

            def interp(v1, v2, p1, p2):
                if v1 == v2:
                    t = 0.5
                else:
                    t = (level - v1) / (v2 - v1)
                return (p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1]))

            if (tl > level) != (tr > level):
                pts.append(interp(tl, tr, (r, c), (r, c + 1)))
            if (tr > level) != (br > level):
                pts.append(interp(tr, br, (r, c + 1), (r + 1, c + 1)))
            if (br > level) != (bl > level):
                pts.append(interp(br, bl, (r + 1, c + 1), (r + 1, c)))
            if (bl > level) != (tl > level):
                pts.append(interp(bl, tl, (r + 1, c), (r, c)))

            if len(pts) == 2:
                segments.append((pts[0], pts[1]))
            elif len(pts) == 4:
                center = (tl + tr + br + bl) / 4.0
                if (center > level) == fully_connected_low:
                    segments.append((pts[0], pts[1]))
                    segments.append((pts[2], pts[3]))
                else:
                    segments.append((pts[0], pts[3]))
                    segments.append((pts[1], pts[2]))

    return segments


def _segment_length(a, b):
    return float(((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5)


def find_perimeter(image, level, *, including_contours=False, fully_connected='low'):
    if image.shape[0] < 2 or image.shape[1] < 2:
        raise ValueError('Input array must be at least 2x2.')
    if image.ndim != 2:
        raise ValueError('Only 2D arrays are supported.')

    segments = _marching_squares_segments(image, float(level), fully_connected == 'low')
    perimeter = sum(_segment_length(a, b) for a, b in segments)
    contours = _assemble_contours(segments) if including_contours else []
    return perimeter, contours


def _assemble_contours(segments):
    current_index = 0
    contours = {}
    starts = {}
    ends = {}

    def norm(p):
        return (round(p[0], 8), round(p[1], 8))

    for from_point, to_point in segments:
        if norm(from_point) == norm(to_point):
            continue

        tail, tail_num = starts.pop(norm(to_point), (None, None))
        head, head_num = ends.pop(norm(from_point), (None, None))

        if tail is not None and head is not None:
            if tail is head:
                head.append(to_point)
            else:
                if tail_num > head_num:
                    head.extend(tail)
                    contours.pop(tail_num, None)
                    starts[norm(head[0])] = (head, head_num)
                    ends[norm(head[-1])] = (head, head_num)
                else:
                    tail.extendleft(reversed(head))
                    starts.pop(norm(head[0]), None)
                    contours.pop(head_num, None)
                    starts[norm(tail[0])] = (tail, tail_num)
                    ends[norm(tail[-1])] = (tail, tail_num)
        elif tail is None and head is None:
            new_contour = deque((from_point, to_point))
            contours[current_index] = new_contour
            starts[norm(from_point)] = (new_contour, current_index)
            ends[norm(to_point)] = (new_contour, current_index)
            current_index += 1
        elif head is None:
            tail.appendleft(from_point)
            starts[norm(from_point)] = (tail, tail_num)
        else:
            head.append(to_point)
            ends[norm(to_point)] = (head, head_num)

    return [np.array(contour) for _, contour in sorted(contours.items())]
