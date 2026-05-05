from pathlib import Path
p = Path('src/openmotor_py/motorlib/grain.py')
text = p.read_text()
old = '''import numpy as np
try:
    import skfmm
except ImportError:
    skfmm = None
from scipy import interpolate
from scipy.signal import savgol_filter
'''
new = '''import numpy as np
try:
    import skfmm
except ImportError:
    skfmm = None
from scipy import interpolate
from scipy.signal import savgol_filter


def _distance_map_from_core(core_map, mask, map_dim):
    if skfmm is not None:
        masked = np.ma.MaskedArray(core_map, mask)
        cell_size = 1 / map_dim
        return skfmm.distance(masked, dx=cell_size) * 2

    from scipy import ndimage

    propellant = np.logical_and(core_map > 0, np.logical_not(mask))
    if not np.any(propellant):
        raise ValueError("No propellant cells found")

    # Euclidean distance from propellant pixels to the nearest non-propellant/core pixel.
    # This is not identical to fast marching, but is a reasonable browser fallback prototype.
    dist_px = ndimage.distance_transform_edt(propellant)
    cell_size = 1 / map_dim
    return dist_px * cell_size * 2
'''
text = text.replace(old, new)
old2 = '''        if skfmm is None:
            raise ImportError("scikit-fmm is required for FMM grain regression")
        masked = np.ma.MaskedArray(self.coreMap, self.mask)
        cellSize = 1 / self.mapDim
        self.regressionMap = skfmm.distance(masked, dx=cellSize) * 2
'''
new2 = '''        self.regressionMap = _distance_map_from_core(self.coreMap, self.mask, self.mapDim)
'''
text = text.replace(old2, new2)
p.write_text(text)

p = Path('src/openmotor_py/motorlib/grains/bates.py')
text = p.read_text()
text = text.replace('from ..grain import PerforatedGrain\n', 'from ..grain import PerforatedGrain, _distance_map_from_core\n')
old3 = '''            if skfmm is None:
                raise ImportError("scikit-fmm is required for regression contours")
            cellSize = 1 / mapDim
            regressionMap = skfmm.distance(masked, dx=cellSize) * 2
'''
new3 = '''            regressionMap = _distance_map_from_core(masked, np.zeros_like(masked, dtype=bool), mapDim)
'''
text = text.replace(old3, new3)
p.write_text(text)

p = Path('src/openmotor_py/motorlib/grains/rodTube.py')
text = p.read_text()
if 'from ..grain import PerforatedGrain' in text:
    text = text.replace('from ..grain import PerforatedGrain\n', 'from ..grain import PerforatedGrain, _distance_map_from_core\n')
text = text.replace('            regressionMap = skfmm.distance(masked, dx=cellSize) * 2\n', '            regressionMap = _distance_map_from_core(masked, np.zeros_like(masked, dtype=bool), mapDim)\n')
p.write_text(text)
