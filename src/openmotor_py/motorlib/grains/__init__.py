from .endBurner import *
from .bates import *
from .star import *
from .finocyl import *
from .moonBurner import *
from .xCore import *
from .cGrain import *
from .dGrain import *
from .rodTube import *
from .conical import *

grainTypes = {}
grainClasses = [BatesGrain, Finocyl, MoonBurner, XCore, CGrain, DGrain, RodTubeGrain, ConicalGrain, StarGrain, EndBurningGrain]
for grainType in grainClasses:
    grainTypes[grainType.geomName] = grainType
