from .endBurner import *
from .bates import *

# Limited import surface for Pyodide spike; FMM grains gated on scikit-fmm availability
grainTypes = {}
grainClasses = [BatesGrain, EndBurningGrain]
for grainType in grainClasses:
    grainTypes[grainType.geomName] = grainType
