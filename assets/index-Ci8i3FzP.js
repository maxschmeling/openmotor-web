import{loadPyodide as f}from"https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.mjs";(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))o(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const i of t.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&o(i)}).observe(document,{childList:!0,subtree:!0});function s(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function o(e){if(e.ep)return;e.ep=!0;const t=s(e);fetch(e.href,t)}})();const u="from ._find_perimeter import find_perimeter",d=`import numpy as np
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
`,g="",c=`"""Contains constants needed for motor calculations."""

# R, in units of J/(kmol*K)
gasConstant = 8314.462618

# Standard gravitation acceleration (g), in units of m/s**2
standardGravity = 9.80665

# Atmospheric pressure (1 atm), in units of Pa
atmosphericPressure = 101325

# Maximum reference length for capping user inputs, in units of meters
maximumRefLength = 24.6

# Maximum reference diameter for capping user inputs, in units of meters
maximumRefDiameter = 6.6`,h=`"""This module includes the geometry methods that openMotor uses in its calculations"""

import math
from typing import Union

import numpy as np
from numpy.typing import NDArray


def circleArea(dia: float) -> float:
    """Returns the area of a circle with diameter dia"""
    return ((dia / 2) ** 2) * math.pi


def circlePerimeter(dia: float) -> float:
    """Returns the perimeter (circumference) of a circle with diameter dia"""
    return dia * math.pi


def circleDiameterFromArea(area: float) -> float:
    """Returns the diameter of a circle with area 'area'"""
    return 2 * ((area / math.pi) ** 0.5)


def tubeArea(dia: float, height: int) -> float:
    """Returns the surface area of a tube (cylinder without endcaps) with diameter 'dia' and height 'height'"""
    return dia * math.pi * height


def cylinderArea(dia: float, height: int) -> float:
    """Returns the surface area of a cylinder with diameter 'dia' and height 'height'"""
    return (2 * circleArea(dia)) + (tubeArea(dia, height))


def cylinderVolume(dia: float, height: int) -> float:
    """Returns the volume of a cylinder with diameter 'dia' and height 'height'"""
    return height * circleArea(dia)


def frustumLateralSurfaceArea(diameterA: int, diameterB: int, length: int) -> float:
    """Returns the surface area of a frustum (truncated cone) with end diameters A and B and length 'length'"""
    radiusA = diameterA / 2
    radiusB = diameterB / 2
    return (
        math.pi * (radiusA + radiusB) * (abs(radiusA - radiusB) ** 2 + length**2) ** 0.5
    )


def frustumVolume(diameterA: int, diameterB: int, length: int) -> float:
    """Returns the volume of a frustum (truncated cone) with end diameters A and B and length 'length'"""
    radiusA = diameterA / 2
    radiusB = diameterB / 2
    return math.pi * (length / 3) * (radiusA**2 + radiusA * radiusB + radiusB**2)


def splitFrustum(
    diameterA: int, diameterB: int, length: int, splitPosition: int
) -> tuple[tuple[int, float, int], tuple[float, int, int]]:
    """Takes in info about a frustum (truncated cone) and a position measured from the "diameterA" and returns
    a tuple of frustums representing the two halves of the original frustum if it were split on the plane at
    distance "position" from the face with diameter "diameterA"
    """
    splitDiameter: float = diameterA + (diameterB - diameterA) * (
        splitPosition / length
    )
    return (diameterA, splitDiameter, splitPosition), (
        splitDiameter,
        diameterB,
        length - splitPosition,
    )


def length(
    contour: NDArray[Union[np.int_, np.float64]],
    mapSize: Union[int, float],
    tolerance: int = 3,
) -> Union[int, float]:
    """Returns the total length of all segments in a contour that aren't within 'tolerance' of the edge of a
    circle with diameter 'mapSize'"""
    offset = np.roll(contour.T, 1, axis=1)
    lengths = np.linalg.norm(contour.T - offset, axis=0)

    centerOffset = np.array([[mapSize / 2, mapSize / 2]])
    radius = np.linalg.norm(contour - centerOffset, axis=1)

    valid = radius < (mapSize / 2) - tolerance

    return np.sum(lengths[valid])


def clean(
    contour: NDArray[Union[np.int_, np.float64]],
    mapSize: Union[int, float],
    tolerance: int,
) -> NDArray[Union[np.int_, np.float64]]:
    """Returns a contour with the same points as the input, omitting any within 'tolerace' of a circle of
    diameter 'mapSize'"""
    offset = np.array([[mapSize / 2, mapSize / 2]])
    lengths = np.linalg.norm(contour - offset, axis=1)
    return contour[lengths < (mapSize / 2) - tolerance]


def dist(point1: tuple[int, int], point2: tuple[int, int]) -> int:
    """Returns the distance between two points [x1, y1], [x2, y2]"""
    return ((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2) ** 0.5
`,b=`"""
This module includes the base classes from which all grain classes should inherit. None of these objects
should be instantiated directly.
"""

from abc import abstractmethod
from typing import Tuple, List, Union

import numpy as np
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

import mathlib

from . import geometry
from .properties import EnumProperty, FloatProperty, PropertyCollection
from .simResult import SimAlert, SimAlertLevel, SimAlertType
from .constants import maximumRefDiameter, maximumRefLength


class Grain(PropertyCollection):
    """
    A basic propellant grain.

    This is the class that all grains inherit from. It provides a few properties and
    composed methods but otherwise it is up to the subclass to make a functional grain.
    """

    geomName: Union[str, None] = None

    def __init__(self) -> None:
        super().__init__()
        self.props["diameter"] = FloatProperty(
            dispName="Diameter",
            unit="m",
            minValue=0,
            maxValue=maximumRefDiameter,
        )
        self.props["length"] = FloatProperty(
            dispName="Length",
            unit="m",
            minValue=0,
            maxValue=maximumRefLength,
        )

    def getVolumeSlice(self, regDist: float, dRegDist: float) -> float:
        """
        Returns the amount of propellant volume consumed as the grain regresses from a distance of 'regDist' to
        regDist + dRegDist.
        """
        return self.getVolumeAtRegression(regDist) - self.getVolumeAtRegression(
            regDist + dRegDist
        )

    @abstractmethod
    def getSurfaceAreaAtRegression(self, regDist: float) -> float:
        """Returns the surface area of the grain after it has regressed a linear distance of 'regDist'."""

    @abstractmethod
    def getVolumeAtRegression(self, regDist: float) -> float:
        """Returns the volume of propellant in the grain after it has regressed a linear distance 'regDist'."""

    @abstractmethod
    def getWebLeft(self, regDist: float) -> float:
        """Returns the shortest distance the grain has to regress to burn out."""

    def isWebLeft(self, regDist: float, burnoutThres: float = 0.00001) -> bool:
        """Returns True if the grain has propellant left to burn after it has regressed a distance of 'regDist'."""
        return self.getWebLeft(regDist) > burnoutThres

    @abstractmethod
    def getMassFlux(
        self,
        massIn: float,
        dTime: float,
        regDist: float,
        dRegDist: float,
        position: float,
        density: float,
    ) -> float:
        """
        Returns the mass flux at a point along the grain.

        Takes in the mass flow into the grain, a timestep, the distance the grain has regressed so far,
        the additional distance it will regress during the timestep, a position along the grain measured
        from the head end, and the density of the propellant.
        """

    def getPeakMassFlux(
        self,
        massIn: float,
        dTime: float,
        regDist: float,
        dRegDist: float,
        density: float,
    ) -> float:
        """
        Uses the grain's mass flux method to return the max.
        Assumes that it will be at the port of the grain!
        """
        return self.getMassFlux(
            massIn=massIn,
            dTime=dTime,
            regDist=regDist,
            dRegDist=dRegDist,
            position=self.getEndPositions(regDist)[1],
            density=density,
        )

    @abstractmethod
    def getEndPositions(self, regDist: float) -> Tuple[float, float]:
        """Returns the positions of the grain ends relative to the original (unburned) grain top."""

    @abstractmethod
    def getPortArea(self, regDist: float) -> float:
        """Returns the area of the grain's port when it has regressed a distance of 'regDist'."""

    def getRegressedLength(self, regDist: float) -> float:
        """
        Returns the length of the grain when it has regressed a distance of 'regDist',
        taking any possible inhibition into account.
        """
        endPos = self.getEndPositions(regDist)
        return endPos[1] - endPos[0]

    def getDetailsString(self, lengthUnit: str = "m") -> str:
        """Returns a short string describing the grain, formatted using the units that is passed in."""
        return "Length: {}".format(self.props["length"].dispFormat(lengthUnit))

    @abstractmethod
    def simulationSetup(self, config):
        """Do anything needed to prepare this grain for simulation."""

    def getGeometryErrors(self) -> List[SimAlert]:
        """
        Returns a list of simAlerts that detail any issues with the geometry of the grain.

        Errors should be used for any condition that prevents simulation of the grain,
        while warnings can be used to notify the user of possible non-fatal mistakes in their entered numbers.
        Subclasses should still call the superclass method, as it performs checks that still apply to its subclasses.
        """
        errors = []
        if self.props["diameter"].getValue() == 0:
            errors.append(
                SimAlert(
                    SimAlertLevel.ERROR, SimAlertType.GEOMETRY, "Diameter must not be 0"
                )
            )
        if self.props["length"].getValue() == 0:
            errors.append(
                SimAlert(
                    SimAlertLevel.ERROR, SimAlertType.GEOMETRY, "Length must not be 0"
                )
            )
        return errors

    def getGrainBoundingVolume(self) -> float:
        """Returns the volume of the bounding cylinder around the grain."""
        return geometry.cylinderVolume(
            dia=self.props["diameter"].getValue(),
            height=self.props["length"].getValue(),
        )

    def getFreeVolume(self, regDist: float) -> float:
        """
        Returns the amount of empty (non-propellant) volume in bounding cylinder of the grain for a given regression
        depth.
        """
        return self.getGrainBoundingVolume() - self.getVolumeAtRegression(regDist)


class PerforatedGrain(Grain):
    """
    A grain with a hole of some shape through the center.

    Adds abstract methods related to the core to the basic grain class
    """

    geomName = "perfGrain"

    def __init__(self) -> None:
        super().__init__()
        self.props["inhibitedEnds"] = EnumProperty(
            "Inhibited ends", ["Neither", "Top", "Bottom", "Both"]
        )
        self.wallWeb: float = 0  # Max distance from the core to the wall

    def getEndPositions(self, regDist: float) -> Tuple[float, float]:
        if self.props["inhibitedEnds"].getValue() == "Neither":  # Neither
            return (regDist, self.props["length"].getValue() - regDist)
        if self.props["inhibitedEnds"].getValue() == "Top":  # Top
            return (0, self.props["length"].getValue() - regDist)
        if self.props["inhibitedEnds"].getValue() == "Bottom":  # Bottom
            return (regDist, self.props["length"].getValue())
        if self.props["inhibitedEnds"].getValue() == "Both":
            return (0, self.props["length"].getValue())
        # The enum should prevent this from even being raised, but to cover the case where it somehow gets set wrong
        raise ValueError("Invalid number of faces inhibited")

    @abstractmethod
    def getCorePerimeter(self, regDist: float) -> float:
        """Returns the perimeter of the core after the grain has regressed a distance of 'regDist'."""

    @abstractmethod
    def getFaceArea(self, regDist: float) -> float:
        """
        Returns the area of the grain face after it has regressed a distance of 'regDist'.
        This is the same as the area of an equal-diameter endburning grain minus the grain's port area.
        """

    def getCoreSurfaceArea(self, regDist: float) -> float:
        """Returns the surface area of the grain's core after it has regressed a distance of 'regDist'."""
        corePerimeter = self.getCorePerimeter(regDist)
        coreArea = corePerimeter * self.getRegressedLength(regDist)
        return coreArea

    def getWebLeft(self, regDist: float) -> float:
        wallLeft = self.wallWeb - regDist
        if self.props["inhibitedEnds"].getValue() == "Both":
            return wallLeft
        lengthLeft = self.getRegressedLength(regDist)
        return min(lengthLeft, wallLeft)

    def getSurfaceAreaAtRegression(self, regDist: float) -> float:
        faceArea = self.getFaceArea(regDist)
        coreArea = self.getCoreSurfaceArea(regDist)

        exposedFaces: int = 2
        if (
            self.props["inhibitedEnds"].getValue() == "Top"
            or self.props["inhibitedEnds"].getValue() == "Bottom"
        ):
            exposedFaces = 1
        if self.props["inhibitedEnds"].getValue() == "Both":
            exposedFaces = 0

        return coreArea + (exposedFaces * faceArea)

    def getVolumeAtRegression(self, regDist: float) -> float:
        faceArea = self.getFaceArea(regDist)
        return faceArea * self.getRegressedLength(regDist)

    def getPortArea(self, regDist: float) -> float:
        faceArea = self.getFaceArea(regDist)
        uncored = geometry.circleArea(self.props["diameter"].getValue())
        return uncored - faceArea

    def getMassFlux(
        self,
        massIn: float,
        dTime: float,
        regDist: float,
        dRegDist: float,
        position: float,
        density: float,
    ) -> float:
        diameter = self.props["diameter"].getValue()

        endPos = self.getEndPositions(regDist)
        # If a position above the top face is queried, the mass flow is just the input mass and the
        # diameter is the casting tube
        if position < endPos[0]:
            return massIn / geometry.circleArea(diameter)
        # If a position in the grain is queried, the mass flow is the input mass, from the top face,
        # and from the tube up to the point. The diameter is the core.
        if position <= endPos[1]:
            if self.props["inhibitedEnds"].getValue() in ("Top", "Both"):
                top = 0
                countedCoreLength = position
            else:
                top = self.getFaceArea(regDist + dRegDist) * dRegDist * density
                countedCoreLength = position - (endPos[0] + dRegDist)
            # This block gets the mass of propellant the core burns in the step.
            core = (self.getPortArea(regDist + dRegDist) * countedCoreLength) - (
                self.getPortArea(regDist) * countedCoreLength
            )
            core *= density

            massFlow = massIn + ((top + core) / dTime)
            return massFlow / self.getPortArea(regDist + dRegDist)
        # A position past the grain end was specified, so the mass flow includes the input mass flow
        # and all mass produced by the grain. Diameter is the casting tube.
        massFlow = massIn + (self.getVolumeSlice(regDist, dRegDist) * density / dTime)
        return massFlow / geometry.circleArea(diameter)

    @abstractmethod
    def getFaceImage(self, mapDim: int):
        """Returns an image of the grain's cross section, with resolution (mapDim, mapDim)."""

    @abstractmethod
    def getRegressionData(
        self, mapDim: int, numContours: int = 15, coreBlack: bool = True
    ) -> Tuple:
        """
        Returns a tuple that includes a grain face image as described in 'getFaceImage', a regression map
        where color maps to regression depth, a list of contours (lists of (x,y) points in image space) of
        equal regression depth, and a list of corresponding contour lengths. The contours are equally spaced
        between 0 regression and burnout.
        """


class FmmGrain(PerforatedGrain):
    """
    A grain that uses the fast marching method to calculate its regression. All a subclass has to do is
    provide an implementation of generateCoreMap that makes an image of a cross section of the grain.
    """

    geomName = "fmmGrain"

    def __init__(self) -> None:
        super().__init__()
        self.mapDim: int = 1001
        self.mapX, self.mapY = None, None
        self.mask = None
        self.coreMap = None
        self.regressionMap = None
        self.faceArea = None
        self.faceAreaFunc = None

    def normalize(self, value: float) -> float:
        """
        Transforms real unit quantities into self.mapX, self.mapY coordinates.

        For use in indexing into the coremap.
        """
        return value / (0.5 * self.props["diameter"].getValue())

    def unNormalize(self, value: float) -> float:
        """
        Transforms self.mapX, self.mapY coordinates to real unit quantities.

        Used to determine real lengths in coremap.
        """
        return (value / 2) * self.props["diameter"].getValue()

    def lengthToMap(self, value: float) -> float:
        """
        Converts meters to pixels.

        Used to compare real distances to pixel distances in the regression map.
        """
        return self.mapDim * (value / self.props["diameter"].getValue())

    def mapToLength(self, value: float) -> float:
        """
        Converts pixels to meters.

        Used to extract real distances from pixel distances such as contour lengths.
        """
        return self.props["diameter"].getValue() * (value / self.mapDim)

    def areaToMap(self, value: float) -> float:
        """Used to convert sqm to sq pixels, like on the regression map."""
        return (self.mapDim**2) * (value / (self.props["diameter"].getValue() ** 2))

    def mapToArea(self, value: float) -> float:
        """
        Used to convert sq pixels to sqm.

        For extracting real areas from the regression map.
        """
        return (self.props["diameter"].getValue() ** 2) * (value / (self.mapDim**2))

    def initGeometry(self, mapDim: int) -> None:
        """
        Set up an empty core map and reset the regression map.

        Takes in the dimension of both maps.
        """
        if mapDim < 64:  # TODO convert int value into meaningful constant
            raise ValueError("Map dimension must be 64 or larger to get good results")
        self.mapDim = mapDim
        self.mapX, self.mapY = np.meshgrid(
            np.linspace(-1, 1, self.mapDim), np.linspace(-1, 1, self.mapDim)
        )
        self.mask = self.mapX**2 + self.mapY**2 > 1
        self.coreMap = np.ones_like(self.mapX)
        self.regressionMap = None

    @abstractmethod
    def generateCoreMap(self) -> None:
        """
        Use self.mapX and self.mapY to generate an image of the grain cross section in self.coreMap.
        A 0 in the image means propellant, and a 1 means no propellant.
        """

    def simulationSetup(self, config) -> None:
        mapSize = config.getProperty("mapDim")

        self.initGeometry(mapSize)
        self.generateCoreMap()
        self.generateRegressionMap()

    def generateRegressionMap(self) -> None:
        """
        Uses the fast marching method to generate an image of how the grain regresses from the core map.

        The map is stored under self.regressionMap.
        """
        self.regressionMap = _distance_map_from_core(self.coreMap, self.mask, self.mapDim)
        maxDist = np.amax(self.regressionMap)
        self.wallWeb = self.unNormalize(maxDist)
        faceArea = []
        polled = []
        valid = np.logical_not(self.mask)
        for i in range(int(maxDist * self.mapDim) + 2):
            polled.append(i / self.mapDim)
            faceArea.append(
                self.mapToArea(
                    np.count_nonzero(
                        np.logical_and(self.regressionMap > (i / self.mapDim), valid)
                    )
                )
            )
        self.faceArea = savgol_filter(faceArea, 31, 5)
        self.faceAreaFunc = interpolate.interp1d(polled, self.faceArea)

    def getCorePerimeter(self, regDist: float) -> float:
        mapDist = self.normalize(regDist)
        return self.mapToLength(mathlib.find_perimeter(self.regressionMap, mapDist)[0])

    def getFaceArea(self, regDist: float):
        mapDist = self.normalize(regDist)
        index = int(mapDist * self.mapDim)
        if index >= len(self.faceArea) - 1:
            return 0  # Past burnout
        if not self.faceAreaFunc:
            raise ValueError("faceAreaFunc is missing")
        return self.faceAreaFunc(mapDist)

    def getFaceImage(self, mapDim: int) -> np.ma.MaskedArray:
        self.initGeometry(mapDim)
        self.generateCoreMap()
        return np.ma.MaskedArray(self.coreMap, self.mask)

    def getRegressionData(
        self, mapDim: int, numContours: int = 15, coreBlack: bool = True
    ) -> Tuple:
        self.initGeometry(mapDim)
        self.generateCoreMap()

        masked = np.ma.MaskedArray(self.coreMap, self.mask)
        regressionMap = None
        contours = []
        contourLengths = {}

        try:
            self.generateRegressionMap()

            regmax = np.amax(self.regressionMap)

            regressionMap = self.regressionMap[:, :].copy()
            if coreBlack:
                regressionMap[np.where(self.coreMap == 0)] = (
                    regmax  # Make the core black
                )
            regressionMap = np.ma.MaskedArray(regressionMap, self.mask)

            for dist in np.linspace(0, regmax, numContours):
                contours.append([])
                contourLengths[dist] = 0
                layerContours = mathlib.find_perimeter(
                    self.regressionMap,
                    dist,
                    fully_connected="low",
                    including_contours=True,
                )[1]
                for contour in layerContours:
                    contours[-1].append(geometry.clean(contour, self.mapDim, 3))
                    contourLengths[dist] += geometry.length(contour, self.mapDim)

        except ValueError as exc:  # If there aren't any contours, do nothing
            print(exc)

        return (masked, regressionMap, contours, contourLengths)
`,y=`from .endBurner import *
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
`,_=`"""BATES submodule"""

import numpy as np
try:
    import skfmm
except ImportError:
    skfmm = None
import mathlib

from ..grain import PerforatedGrain, _distance_map_from_core
from .. import geometry
from ..simResult import SimAlert, SimAlertLevel, SimAlertType
from ..properties import FloatProperty

class BatesGrain(PerforatedGrain):
    """The BATES grain has a simple cylindrical core. This type is not an FMM grain for performance reasons, as the
    calculations are easy enough to do manually."""
    geomName = "BATES"
    def __init__(self):
        super().__init__()
        self.props['coreDiameter'] = FloatProperty('Core Diameter', 'm', 0, 5)

    def simulationSetup(self, config):
        self.wallWeb = (self.props['diameter'].getValue() - self.props['coreDiameter'].getValue()) / 2

    def getCorePerimeter(self, regDist):
        return geometry.circlePerimeter(self.props['coreDiameter'].getValue() + (2 * regDist))

    def getFaceArea(self, regDist):
        outer = geometry.circleArea(self.props['diameter'].getValue())
        inner = geometry.circleArea(self.props['coreDiameter'].getValue() + (2 * regDist))
        return outer - inner

    def getDetailsString(self, lengthUnit='m'):
        return 'Length: {}, Core: {}'.format(self.props['length'].dispFormat(lengthUnit),
                                             self.props['coreDiameter'].dispFormat(lengthUnit))

    def getGeometryErrors(self):
        errors = super().getGeometryErrors()
        if self.props['coreDiameter'].getValue() == 0:
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, 'Core diameter must not be 0'))
        if self.props['coreDiameter'].getValue() >= self.props['diameter'].getValue():
            aText = 'Core diameter must be less than grain diameter'
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, aText))
        return errors

    # These two functions have a lot of code reuse, but it is worth it because making BATES an fmmGrain would make it
    # signficantly way slower
    def getFaceImage(self, mapDim):
        mapX, mapY = np.meshgrid(np.linspace(-1, 1, mapDim), np.linspace(-1, 1, mapDim))
        mask = mapX**2 + mapY**2 > 1
        coreMap = np.ones_like(mapX)

        # Normalize core diameter
        coreRadius = (self.props['coreDiameter'].getValue() / (0.5 * self.props['diameter'].getValue())) / 2

        # Open up core
        coreMap[mapX**2 + mapY**2 < coreRadius**2] = 0
        maskedMap = np.ma.MaskedArray(coreMap, mask)

        return maskedMap

    def getRegressionData(self, mapDim, numContours=15, coreBlack=True):
        masked = self.getFaceImage(mapDim)
        regressionMap = None
        contours = []
        contourLengths = {}

        try:
            regressionMap = _distance_map_from_core(masked, np.zeros_like(masked, dtype=bool), mapDim)
            regmax = np.amax(regressionMap)
            regressionMap = regressionMap[:, :].copy()
            if coreBlack:
                regressionMap[np.where(masked == 0)] = regmax # Make the core black

            for dist in np.linspace(0, regmax, numContours):
                contours.append([])
                contourLengths[dist] = 0
                layerContours = mathlib.find_perimeter(regressionMap, dist, fully_connected='high', including_contours=True)[1]
                for contour in layerContours:
                    contours[-1].append(contour)
                    contourLengths[dist] += geometry.length(contour, mapDim)

        except ValueError as exc: # If there aren't any contours, do nothing
            print(exc)

        return (masked, regressionMap, contours, contourLengths)
`,R=`"""C Grain submodule"""

import numpy as np

from ..grain import FmmGrain
from ..properties import FloatProperty
from ..simResult import SimAlert, SimAlertLevel, SimAlertType
from ..constants import maximumRefDiameter

class CGrain(FmmGrain):
    """Defines a C grain, which is a cylindrical grain with a single slot taken out. The slot is a rectangular section
    with a certain width that starts at the casting tube and protrudes towards the center of the grain, stopping a
    specified offset away."""
    geomName = 'C Grain'
    def __init__(self):
        super().__init__()
        self.props['slotWidth'] = FloatProperty('Slot width', 'm', 0, maximumRefDiameter)
        self.props['slotOffset'] = FloatProperty('Slot offset', 'm', -maximumRefDiameter, maximumRefDiameter)

        self.props['slotOffset'].setValue(0)

    def generateCoreMap(self):
        slotWidth = self.normalize(self.props['slotWidth'].getValue())
        slotOffset = self.normalize(self.props['slotOffset'].getValue())

        self.coreMap[np.logical_and(np.abs(self.mapY) < slotWidth / 2, self.mapX > slotOffset)] = 0

    def getDetailsString(self, lengthUnit='m'):
        return 'Length: {}'.format(self.props['length'].dispFormat(lengthUnit))

    def getGeometryErrors(self):
        errors = super().getGeometryErrors()

        if self.props['slotOffset'].getValue() > self.props['diameter'].getValue() / 2:
            aText = 'Slot offset should be less than grain radius'
            errors.append(SimAlert(SimAlertLevel.WARNING, SimAlertType.GEOMETRY, aText))
        if self.props['slotOffset'].getValue() < -self.props['diameter'].getValue() / 2:
            aText = 'Slot offset should be greater than negative grain radius'
            errors.append(SimAlert(SimAlertLevel.WARNING, SimAlertType.GEOMETRY, aText))

        if self.props['slotWidth'].getValue() == 0:
            errors.append(SimAlert(SimAlertLevel.WARNING, SimAlertType.GEOMETRY, 'Slot width must not be 0'))
        if self.props['slotWidth'].getValue() > self.props['diameter'].getValue():
            aText = 'Slot width should not be greater than grain diameter'
            errors.append(SimAlert(SimAlertLevel.WARNING, SimAlertType.GEOMETRY, aText))

        return errors
`,A=`"""BATES submodule"""

from math import atan, cos, tan

from ..grain import Grain
from .. import geometry
from ..simResult import SimAlert, SimAlertLevel, SimAlertType
from ..properties import FloatProperty, EnumProperty
from ..constants import maximumRefDiameter

class ConicalGrain(Grain):
    """A conical grain is similar to a BATES grain except it has different core diameters at each end."""
    geomName = "Conical"
    def __init__(self):
        super().__init__()
        self.props['forwardCoreDiameter'] = FloatProperty('Forward Core Diameter', 'm', 0, maximumRefDiameter)
        self.props['aftCoreDiameter'] = FloatProperty('Aft Core Diameter', 'm', 0, maximumRefDiameter)
        self.props['inhibitedEnds'] = EnumProperty('Inhibited ends', ['Neither', 'Top', 'Bottom', 'Both'])

    def isCoreInverted(self):
        """A simple helper that returns 'true' if the core's foward diameter is larger than its aft diameter"""
        return self.props['forwardCoreDiameter'].getValue() > self.props['aftCoreDiameter'].getValue()

    def getFrustumInfo(self, regDist):
        """Returns the dimensions of the grain's core at a given regression depth. The core is always a frustum and is
        returned as the forward diameter, aft diameter, and length"""
        grainDiameter = self.props['diameter'].getValue()
        aftDiameter = self.props['aftCoreDiameter'].getValue()
        forwardDiameter = self.props['forwardCoreDiameter'].getValue()
        grainLength = self.props['length'].getValue()

        inhibitedEnds = self.props['inhibitedEnds'].getValue()
        forward_exposed = (inhibitedEnds in ('Neither', 'Bottom'))
        aft_exposed     = (inhibitedEnds in ('Neither', 'Top'))

        # These calculations are easiest if we work in terms of the core's "large end" and "small end"
        if self.isCoreInverted():
            coreMajorDiameter, coreMinorDiameter = forwardDiameter, aftDiameter
            major_exposed, minor_exposed = forward_exposed, aft_exposed
        else:
            coreMajorDiameter, coreMinorDiameter = aftDiameter, forwardDiameter
            major_exposed, minor_exposed = aft_exposed, forward_exposed

        # Calculate the half angle of the core. This is done with without accounting for regression because it doesn't
        # change with regression
        angle = atan((coreMajorDiameter - coreMinorDiameter) / (2 * grainLength))

        # Expand both core diameters by the radial component of the core's regression vector. This is allowed to expand
        # beyond the casting tube as that condition is checked in a later step
        regCoreMajorDiameter = coreMajorDiameter + (regDist * 2 * cos(angle)) - major_exposed * (regDist * 2 * tan(angle))
        regCoreMinorDiameter = coreMinorDiameter + (regDist * 2 * cos(angle)) + minor_exposed * (regDist * 2 * tan(angle))
 
        # This is case where the larger core diameter has grown beyond the casting tube diameter. Once this happens,
        # the diameter of the large end of the core is clamped at the grain diameter and the length is changed to keep
        # the angle constant, which accounts for the regression of the grain at the major end.
        if regCoreMajorDiameter >= grainDiameter:
            majorFrustumDiameter = grainDiameter

        # If the large end of the core hasn't reached the casting tube, we know that the small end hasn't either. In
        # this case we just return the current core diameters, and a length calculated from the inhibitor configuration
        else:
            majorFrustumDiameter = regCoreMajorDiameter

        # Minor frustum diameter is never clamped (the point when it would clamp is burnout), so we can use it to determine
        # the length of the grain at any regression depth
        minorFrustumDiameter = regCoreMinorDiameter
        grainLength = (majorFrustumDiameter - minorFrustumDiameter) / (2 * tan(angle))
        
        if self.isCoreInverted():
            return majorFrustumDiameter, minorFrustumDiameter, grainLength

        return minorFrustumDiameter, majorFrustumDiameter, grainLength

    def getSurfaceAreaAtRegression(self, regDist):
        """Returns the surface area of the grain after it has regressed a linear distance of 'regDist'"""
        forwardDiameter, aftDiameter, length = self.getFrustumInfo(regDist)
        surfaceArea = geometry.frustumLateralSurfaceArea(forwardDiameter, aftDiameter, length)

        fullFaceArea = geometry.circleArea(self.props['diameter'].getValue())
        if self.props['inhibitedEnds'].getValue() in ('Neither', 'Bottom'):
            surfaceArea += fullFaceArea - geometry.circleArea(forwardDiameter)
        if self.props['inhibitedEnds'].getValue() in ('Neither', 'Top'):
            surfaceArea += fullFaceArea - geometry.circleArea(aftDiameter)

        return surfaceArea

    def getVolumeAtRegression(self, regDist):
        """Returns the volume of propellant in the grain after it has regressed a linear distance 'regDist'"""
        forwardDiameter, aftDiameter, length = self.getFrustumInfo(regDist)
        frustumVolume = geometry.frustumVolume(forwardDiameter, aftDiameter, length)
        outerVolume = geometry.cylinderVolume(self.props['diameter'].getValue(), length)

        return outerVolume - frustumVolume

    def getWebLeft(self, regDist):
        """Returns the shortest distance the grain has to regress to burn out"""
        forwardDiameter, aftDiameter, length = self.getFrustumInfo(regDist)
        wallLeft = (self.props['diameter'].getValue() - min(aftDiameter, forwardDiameter)) / 2

        if self.props['inhibitedEnds'].getValue() == 'Both':
            return wallLeft

        return min(wallLeft, length)

    def getMassFlow(self, massIn, dTime, regDist, dRegDist, position, density):
        """Returns the mass flow at a point along the grain. Takes in the mass flow into the grain, a timestep, the
        distance the grain has regressed so far, the additional distance it will regress during the timestep, a
        position along the grain measured from the head end, and the density of the propellant."""
        unsteppedFrustum = self.getFrustumInfo(regDist)
        steppedFrustum = self.getFrustumInfo(regDist + dRegDist)
        grainDiameter = self.props['diameter'].getValue()
        aftUninhibited = (self.props['inhibitedEnds'].getValue() in ('Neither', 'Top'))
        foreUninhibited = (self.props['inhibitedEnds'].getValue() in ('Neither', 'Bottom'))

        if position > dRegDist:
            unsteppedPartialFrustum, _ = geometry.splitFrustum(*unsteppedFrustum, position - dRegDist * aftUninhibited)
            steppedPartialFrustum, _ = geometry.splitFrustum(*steppedFrustum, steppedFrustum[2])
        else:
            unsteppedPartialFrustum, _ = geometry.splitFrustum(*unsteppedFrustum, position + dRegDist * foreUninhibited)
            steppedPartialFrustum, _ = geometry.splitFrustum(*steppedFrustum, position)
        
        unsteppedFrustumVolume = geometry.frustumVolume(*unsteppedPartialFrustum)
        steppedFrustumVolume = geometry.frustumVolume(*steppedPartialFrustum)

        unsteppedPropVolume = geometry.cylinderVolume(grainDiameter, unsteppedPartialFrustum[2]) - unsteppedFrustumVolume
        steppedPropVolume = geometry.cylinderVolume(grainDiameter, steppedPartialFrustum[2]) - steppedFrustumVolume

        massFlow = (unsteppedPropVolume - steppedPropVolume) * density / dTime
        massFlow += massIn

        return massFlow, steppedPartialFrustum[1]

    def getMassFlux(self, massIn, dTime, regDist, dRegDist, position, density):
        """Returns the mass flux at a point along the grain. Takes in the mass flow into the grain, a timestep, the
        distance the grain has regressed so far, the additional distance it will regress during the timestep, a
        position along the grain measured from the head end, and the density of the propellant."""
        massFlow, portDiameter = self.getMassFlow(massIn, dTime, regDist, dRegDist, position, density)

        return massFlow / geometry.circleArea(portDiameter)

    def getPeakMassFlux(self, massIn, dTime, regDist, dRegDist, density):
        """Uses the grain's mass flux method to return the max. Need to define this here because I'm not sure what
        it will look like"""
        _, _, length = self.getFrustumInfo(regDist)
        
        forwardMassFlux = self.getMassFlux(massIn, dTime, regDist, dRegDist, 0, density)
        aftMassFlux = self.getMassFlux(massIn, dTime, regDist, dRegDist, length, density)

        return max(forwardMassFlux, aftMassFlux)

    def getEndPositions(self, regDist):
        """Returns the positions of the grain ends relative to the original (unburned) grain top. Returns a tuple like
        (forward, aft)"""
        originalLength = self.props['length'].getValue()
        grainDiameter = self.props['diameter'].getValue()
        forwardCoreDiameter, aftCoreDiameter, currentLength = self.getFrustumInfo(regDist)

        inhibitedEnds = self.props['inhibitedEnds'].getValue()
        forward_exposed = (inhibitedEnds in ('Neither', 'Bottom'))
        aft_exposed     = (inhibitedEnds in ('Neither', 'Top'))

        # These calculations are easiest if we work in terms of the core's "large end" and "small end"
        if self.isCoreInverted():
            coreMajorDiameter, coreMinorDiameter = forwardCoreDiameter, aftCoreDiameter
            major_exposed, minor_exposed = forward_exposed, aft_exposed
        else:
            coreMajorDiameter, coreMinorDiameter = aftCoreDiameter, forwardCoreDiameter
            major_exposed, minor_exposed = aft_exposed, forward_exposed

        # Un-clamped major diameter        
        if coreMajorDiameter < grainDiameter:
            forward_regression, aft_regression = forward_exposed * regDist, aft_exposed * regDist
            return forward_regression, originalLength - aft_regression
        else:
            minor_regression = minor_exposed * regDist
            major_regression = (originalLength - currentLength) - minor_regression
            forward_regression, aft_regression = (major_regression, minor_regression) if self.isCoreInverted() else (minor_regression, major_regression)
            return forward_regression, originalLength - aft_regression

    def getPortArea(self, regDist):
        """Returns the area of the grain's port when it has regressed a distance of 'regDist'"""
        _, aftCoreDiameter, _ = self.getFrustumInfo(regDist)

        return geometry.circleArea(aftCoreDiameter)

    def getDetailsString(self, lengthUnit='m'):
        """Returns a short string describing the grain, formatted using the units that is passed in"""
        return 'Length: {}'.format(self.props['length'].dispFormat(lengthUnit))

    def simulationSetup(self, config):
        """Do anything needed to prepare this grain for simulation"""
        return None

    def getGeometryErrors(self):
        errors = super().getGeometryErrors()
        if self.props['aftCoreDiameter'].getValue() == self.props['forwardCoreDiameter'].getValue():
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, 'Core diameters cannot be the same, use a BATES for this case.'))
        if self.props['aftCoreDiameter'].getValue() > self.props['diameter'].getValue():
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, 'Aft core diameter cannot be larger than grain diameter.'))
        if self.props['forwardCoreDiameter'].getValue() > self.props['diameter'].getValue():
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, 'Forward core diameter cannot be larger than grain diameter.'))
        return errors
`,P=`"""Custom Grain submodule"""

import skimage.draw as draw

from ..grain import FmmGrain
from ..properties import PolygonProperty, EnumProperty
from ..simResult import SimAlert, SimAlertLevel, SimAlertType
from ..units import getAllConversions, convert

class CustomGrain(FmmGrain):
    """Custom grains can have any core shape. They define their geometry using a polygon property, which tracks a list
    of polygons that each consist of a number of points. The polygons are scaled according to user specified units and
    drawn onto the core map."""
    geomName = 'Custom Grain'
    def __init__(self):
        super().__init__()
        self.props['points'] = PolygonProperty('Core geometry')
        self.props['dxfUnit'] = EnumProperty('DXF Unit', getAllConversions('m'))

    def generateCoreMap(self):
        inUnit = self.props['dxfUnit'].getValue()
        for polygon in self.props['points'].getValue():
            row = [(self.mapDim/2) + (-self.normalize(convert(p[1], inUnit, 'm')) * (self.mapDim/2)) for p in polygon]
            col = [(self.mapDim/2) + (self.normalize(convert(p[0], inUnit, 'm')) * (self.mapDim/2)) for p in polygon]
            imageRow, imageCol = draw.polygon(row, col, self.coreMap.shape)
            self.coreMap[imageRow, imageCol] = 0

    def getGeometryErrors(self):
        errors = super().getGeometryErrors()

        if len(self.props['points'].getValue()) > 1:
            aText = 'Support for custom grains with multiple cores is experimental'
            errors.append(SimAlert(SimAlertLevel.WARNING, SimAlertType.GEOMETRY, aText))

        return errors
`,v=`"""D Grain submodule"""

from ..grain import FmmGrain
from ..properties import FloatProperty
from ..simResult import SimAlert, SimAlertLevel, SimAlertType
from ..constants import maximumRefDiameter

class DGrain(FmmGrain):
    """Defines a D grain, which is a grain that has no propellant past a chord that is a user-specified distance from
    the diameter."""
    geomName = 'D Grain'
    def __init__(self):
        super().__init__()
        self.props['slotOffset'] = FloatProperty('Slot offset', 'm', -maximumRefDiameter, maximumRefDiameter)

        self.props['slotOffset'].setValue(0)

    def generateCoreMap(self):
        slotOffset = self.normalize(self.props['slotOffset'].getValue())

        self.coreMap[self.mapX > slotOffset] = 0

    def getDetailsString(self, lengthUnit='m'):
        return 'Length: {}, Slot offset: {}'.format(self.props['length'].dispFormat(lengthUnit),
                                                    self.props['slotOffset'].dispFormat(lengthUnit))

    def getGeometryErrors(self):
        errors = super().getGeometryErrors()

        if self.props['slotOffset'].getValue() > self.props['diameter'].getValue() / 2:
            aText = 'Core offset must not be greater than grain radius'
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, aText))
        if self.props['slotOffset'].getValue() < -self.props['diameter'].getValue() / 2:
            aText = 'Core offset must be greater than negative grain radius'
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, aText))

        return errors
`,T=`"""End Burner submodule"""

from ..grain import Grain
from ..import geometry

class EndBurningGrain(Grain):
    """Defines an end-burning grain, which is a simple cylinder that burns on one end."""
    geomName = 'End Burner'

    def getSurfaceAreaAtRegression(self, regDist):
        diameter = self.props['diameter'].getValue()
        return geometry.circleArea(diameter)

    def getVolumeAtRegression(self, regDist):
        bLength = self.getRegressedLength(regDist)
        diameter = self.props['diameter'].getValue()
        return geometry.cylinderVolume(diameter, bLength)

    def simulationSetup(self, config):
        pass

    def getWebLeft(self, regDist):
        return self.getRegressedLength(regDist)

    def getMassFlux(self, massIn, dTime, regDist, dRegDist, position, density):
        return 0

    def getPortArea(self, regDist):
        return None

    def getEndPositions(self, regDist):
        return (0, self.props['length'].getValue() - regDist)
`,D=`"""Finocyl grain submodule"""

import numpy as np

from ..grain import FmmGrain
from ..properties import FloatProperty, IntProperty, BooleanProperty
from ..simResult import SimAlert, SimAlertLevel, SimAlertType
from ..constants import maximumRefDiameter

class Finocyl(FmmGrain):
    """A finocyl (fins on cylinder) grain has a circular core with a number of rectangular extensions that start at the
    circle's edge and protude along its normals."""
    geomName = 'Finocyl'
    def __init__(self):
        super().__init__()
        self.props['numFins'] = IntProperty('Number of fins', '', 0, 64)
        self.props['finWidth'] = FloatProperty('Fin width', 'm', 0, maximumRefDiameter)
        self.props['finLength'] = FloatProperty('Fin length', 'm', 0, maximumRefDiameter)
        self.props['coreDiameter'] = FloatProperty('Core diameter', 'm', 0, maximumRefDiameter)
        self.props['invertedFins'] = BooleanProperty('Inverted fins')

    def generateCoreMap(self):
        coreRadius = self.normalize(self.props['coreDiameter'].getValue()) / 2
        numFins = self.props['numFins'].getValue()
        finWidth = self.normalize(self.props['finWidth'].getValue())
        finLength = self.normalize(self.props['finLength'].getValue())
        invertedFins = self.props['invertedFins'].getValue()

        finStart = coreRadius - finLength if invertedFins else 0
        finEnd = coreRadius if invertedFins else finLength + coreRadius

        # Open up core
        self.coreMap[self.mapX**2 + self.mapY**2 < coreRadius**2] = 0

        # Add fins
        for i in range(0, numFins):
            theta = 2 * np.pi / numFins * i
            # Initialize a vector pointing along the fin
            vect0 = np.cos(theta)
            vect1 = np.sin(theta)
            # Select all points within half the width of the vector
            vect = abs(vect0*self.mapX + vect1*self.mapY) < finWidth / 2
            # Set up two perpendicular vectors to cap off the ends
            near = (vect1 * self.mapX) - (vect0 * self.mapY) > finStart
            far = (vect1 * self.mapX) - (vect0 * self.mapY) < finEnd
            ends = np.logical_and(far, near)
            # For inverted fins, we are filling propellant back in. For regular fins, we are removing it.
            self.coreMap[np.logical_and(vect, ends)] = invertedFins

    def getDetailsString(self, lengthUnit='m'):
        return 'Length: {}, Core: {}, Fins: {}'.format(self.props['length'].dispFormat(lengthUnit),
                                                       self.props['coreDiameter'].dispFormat(lengthUnit),
                                                       self.props['numFins'].getValue())

    def getGeometryErrors(self):
        errors = super().getGeometryErrors()
        if self.props['coreDiameter'].getValue() == 0:
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, 'Core diameter must not be 0'))
        if self.props['coreDiameter'].getValue() >= self.props['diameter'].getValue():
            aText = 'Core diameter must be less than or equal to grain diameter'
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, aText))

        if self.props['finLength'].getValue() == 0:
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, 'Fin length must not be 0'))
        if self.props['finLength'].getValue() * 2 > self.props['diameter'].getValue():
            aText = 'Fin length should be less than or equal to grain radius'
            errors.append(SimAlert(SimAlertLevel.WARNING, SimAlertType.GEOMETRY, aText))

        if self.props['invertedFins'].getValue():
            coreRadius = self.props['coreDiameter'].getValue() / 2
            # In the weird case of one fin that extends beyond the core, we need to make sure it doesn't
            # intersect the core again on the other side as that would divide the port
            if self.props['finLength'].getValue() > coreRadius:
                lengthPastCenter = self.props['finLength'].getValue() - coreRadius
                halfWidth = self.props['finWidth'].getValue() / 2
                tipRadius = (lengthPastCenter ** 2 + halfWidth ** 2) ** 0.5
                if tipRadius > coreRadius and self.props['numFins'].getValue() > 0:
                    aText = 'Fin tips outside of core'
                    errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, aText))
        else:
            coreWidth = self.props['coreDiameter'].getValue() + (2 * self.props['finLength'].getValue())
            if coreWidth > self.props['diameter'].getValue():
                aText = 'Core radius plus fin length should be less than or equal to grain radius'
                errors.append(SimAlert(SimAlertLevel.WARNING, SimAlertType.GEOMETRY, aText))

        if self.props['finWidth'].getValue() == 0:
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, 'Fin width must not be 0'))
        if self.props['numFins'].getValue() > 1:
            radius = self.props['coreDiameter'].getValue() / 2
            finLength = self.props['finLength'].getValue()
            invertedFins = self.props['invertedFins'].getValue()
            level = SimAlertLevel.ERROR if invertedFins else SimAlertLevel.WARNING
            apothem = radius - finLength if invertedFins else radius + finLength
            sideLength = 2 * apothem * np.tan(np.pi / self.props['numFins'].getValue())
            if sideLength < self.props['finWidth'].getValue():
                errors.append(SimAlert(level, SimAlertType.GEOMETRY, 'Fin tips intersect'))

        return errors
`,x=`"""Moon burning grain submodule"""

from ..grain import FmmGrain
from ..properties import FloatProperty
from ..simResult import SimAlert, SimAlertLevel, SimAlertType
from ..constants import maximumRefDiameter

class MoonBurner(FmmGrain):
    """A moonburner is very similar to a BATES grain except the core is off center by a specified distance."""
    geomName = 'Moon Burner'
    def __init__(self):
        super().__init__()
        self.props['coreOffset'] = FloatProperty('Core offset', 'm', 0, maximumRefDiameter)
        self.props['coreDiameter'] = FloatProperty('Core diameter', 'm', 0, maximumRefDiameter)

    def generateCoreMap(self):
        coreRadius = self.normalize(self.props['coreDiameter'].getValue()) / 2
        coreOffset = self.normalize(self.props['coreOffset'].getValue())

        # Open up core
        self.coreMap[(self.mapX - coreOffset)**2 + self.mapY**2 < coreRadius**2] = 0

    def getDetailsString(self, lengthUnit='m'):
        return 'Length: {}, Core: {}'.format(self.props['length'].dispFormat(lengthUnit),
                                             self.props['coreDiameter'].dispFormat(lengthUnit))

    def getGeometryErrors(self):
        errors = super().getGeometryErrors()
        if self.props['coreDiameter'].getValue() == 0:
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, 'Core diameter must not be 0'))
        if self.props['coreDiameter'].getValue() >= self.props['diameter'].getValue():
            aText = 'Core diameter must be less than or equal to grain diameter'
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, aText))

        if self.props['coreOffset'].getValue() * 2 > self.props['diameter'].getValue():
            aText = 'Core offset should be less than or equal to grain radius'
            errors.append(SimAlert(SimAlertLevel.WARNING, SimAlertType.GEOMETRY, aText))

        return errors
`,S=`"""Rod and Tube submodule"""

import numpy as np
try:
    import skfmm
except ImportError:
    skfmm = None
import mathlib

from ..grain import PerforatedGrain, _distance_map_from_core
from .. import geometry
from ..simResult import SimAlert, SimAlertLevel, SimAlertType
from ..properties import FloatProperty
from ..constants import maximumRefDiameter

class RodTubeGrain(PerforatedGrain):
    """Tbe rod and tube grain resembles a BATES grain except that it features a fully-uninhibited rod of propellant in
    the center of the core."""
    geomName = "Rod and Tube"
    def __init__(self):
        super().__init__()
        self.props['coreDiameter'] = FloatProperty('Core Diameter', 'm', 0, maximumRefDiameter)
        self.props['rodDiameter'] = FloatProperty('Rod Diameter', 'm', 0, maximumRefDiameter)
        self.props['supportDiameter'] = FloatProperty('Support Diameter', 'm', 0, maximumRefDiameter)
        self.tubeWeb = None
        self.rodWeb = None

    def simulationSetup(self, config):
        self.tubeWeb = (self.props['diameter'].getValue() - self.props['coreDiameter'].getValue()) / 2
        self.rodWeb = (self.props['rodDiameter'].getValue() - self.props['supportDiameter'].getValue()) / 2
        self.wallWeb = max(self.tubeWeb, self.rodWeb)

    def getCorePerimeter(self, regDist):
        if regDist < self.tubeWeb:
            tubePerimeter = geometry.circlePerimeter(self.props['coreDiameter'].getValue() + (2 * regDist))
        else:
            tubePerimeter = 0
        if regDist < self.rodWeb:
            rodPerimeter = geometry.circlePerimeter(self.props['rodDiameter'].getValue() - (2 * regDist))
        else:
            rodPerimeter = 0
        return tubePerimeter + rodPerimeter

    def getFaceArea(self, regDist):
        if regDist < self.tubeWeb:
            outer = geometry.circleArea(self.props['diameter'].getValue())
            inner = geometry.circleArea(self.props['coreDiameter'].getValue() + (2 * regDist))
            tubeArea = outer - inner
        else:
            tubeArea = 0
        if regDist < self.rodWeb:
            outer = geometry.circleArea(self.props['rodDiameter'].getValue() - (2 * regDist))
            inner = geometry.circleArea(self.props['supportDiameter'].getValue())
            rodArea = outer - inner
        else:
            rodArea = 0
        return tubeArea + rodArea

    def getDetailsString(self, lengthUnit='m'):
        return 'Length: {}, Core: {}, Rod: {}'.format(self.props['length'].dispFormat(lengthUnit),
                                                      self.props['coreDiameter'].dispFormat(lengthUnit),
                                                      self.props['rodDiameter'].dispFormat(lengthUnit))

    def getGeometryErrors(self):
        errors = super().getGeometryErrors()
        if self.props['coreDiameter'].getValue() == 0:
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, 'Core diameter must not be 0'))
        if self.props['coreDiameter'].getValue() >= self.props['diameter'].getValue():
            aText = 'Core diameter must be less than grain diameter'
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, aText))
        if self.props['rodDiameter'].getValue() >= self.props['coreDiameter'].getValue():
            aText = 'Rod diameter must be less than core diameter'
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, aText))
        return errors

    # These two functions have a lot of code reuse, but it is worth it because making this an fmmGrain would make it
    # signficantly way slower
    def getFaceImage(self, mapDim):
        # Normalize core and rod diameters
        coreRadius = (self.props['coreDiameter'].getValue() / (0.5 * self.props['diameter'].getValue())) / 2
        rodRadius = (self.props['rodDiameter'].getValue() / (0.5 * self.props['diameter'].getValue())) / 2
        supportRadius = (self.props['supportDiameter'].getValue() / (0.5 * self.props['diameter'].getValue())) / 2

        mapX, mapY = np.meshgrid(np.linspace(-1, 1, mapDim), np.linspace(-1, 1, mapDim))
        mask = np.logical_or(mapX**2 + mapY**2 > 1, mapX**2 + mapY**2 < supportRadius ** 2)
        coreMap = np.ones_like(mapX)

        # Open up core
        coreMap[mapX ** 2 + mapY ** 2 < coreRadius ** 2] = 0
        coreMap[mapX ** 2 + mapY ** 2 < rodRadius ** 2] = 1
        coreMap[mapX ** 2 + mapY ** 2 < supportRadius ** 2] = 0

        maskedMap = np.ma.MaskedArray(coreMap, mask)

        return maskedMap

    def getRegressionData(self, mapDim, numContours=15, coreBlack=True):
        masked = self.getFaceImage(mapDim)
        regressionMap = None
        contours = []
        contourLengths = {}

        try:
            cellSize = 1 / mapDim
            if skfmm is None:
                raise ImportError("scikit-fmm is required for regression contours")
            regressionMap = _distance_map_from_core(masked, np.zeros_like(masked, dtype=bool), mapDim)
            regmax = np.amax(regressionMap)
            regressionMap = regressionMap[:, :].copy()
            if coreBlack:
                regressionMap[np.where(masked == 0)] = regmax # Make the core black

            for dist in np.linspace(0, regmax, numContours):
                contours.append([])
                contourLengths[dist] = 0
                layerContours = mathlib.find_perimeter(regressionMap, dist, fully_connected='high', including_contours=True)[1]
                for contour in layerContours:
                    contours[-1].append(contour)
                    contourLengths[dist] += geometry.length(contour, mapDim)

        except ValueError as exc: # If there aren't any contours, do nothing
            print(exc)

        return (masked, regressionMap, contours, contourLengths)
`,w=`"""Star grain submodule"""

import numpy as np

from ..grain import FmmGrain
from ..properties import IntProperty, FloatProperty
from ..simResult import SimAlert, SimAlertLevel, SimAlertType
from ..constants import maximumRefDiameter

class StarGrain(FmmGrain):
    """A star grain has a core shaped like a star."""
    geomName = 'Star Grain'
    def __init__(self):
        super().__init__()
        self.props['numPoints'] = IntProperty('Number of points', '', 0, 64)
        self.props['pointLength'] = FloatProperty('Point length', 'm', 0, maximumRefDiameter)
        self.props['pointWidth'] = FloatProperty('Point base width', 'm', 0, maximumRefDiameter)

    def generateCoreMap(self):
        numPoints = self.props['numPoints'].getValue()
        pointWidth = self.normalize(self.props['pointWidth'].getValue())
        pointLength = self.normalize(self.props['pointLength'].getValue())

        for i in range(0, numPoints):
            theta = 2 * np.pi / numPoints * i
            comp0 = np.cos(theta)
            comp1 = np.sin(theta)

            rect = abs(comp0 * self.mapX + comp1 * self.mapY)
            width = pointWidth / 2 * (1 - (((self.mapX ** 2 + self.mapY ** 2) ** 0.5) / pointLength))
            vect = rect < width
            near = comp1*self.mapX - comp0*self.mapY > -0.025
            self.coreMap[np.logical_and(vect, near)] = 0

    def getDetailsString(self, lengthUnit='m'):
        return 'Length: {}, Points: {}'.format(self.props['length'].dispFormat(lengthUnit),
                                               self.props['numPoints'].getValue())

    def getGeometryErrors(self):
        errors = super().getGeometryErrors()
        if self.props['numPoints'].getValue() == 0:
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, 'Star grain has 0 points'))

        if self.props['pointLength'].getValue() == 0:
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, 'Point length must not be 0'))
        if self.props['pointLength'].getValue() * 2 > self.props['diameter'].getValue():
            aText = 'Point length should be less than or equal to grain radius'
            errors.append(SimAlert(SimAlertLevel.WARNING, SimAlertType.GEOMETRY, aText))

        if self.props['pointWidth'].getValue() == 0:
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, 'Point width must not be 0'))

        return errors
`,F=`"""X Core grain submodule"""

import numpy as np

from ..grain import FmmGrain
from ..properties import FloatProperty
from ..simResult import SimAlert, SimAlertLevel, SimAlertType
from ..constants import maximumRefDiameter

class XCore(FmmGrain):
    """An X Core grain has a core shaped like a plus sign or an X."""
    geomName = 'X Core'
    def __init__(self):
        super().__init__()
        self.props['slotWidth'] = FloatProperty('Slot width', 'm', 0, maximumRefDiameter)
        self.props['slotLength'] = FloatProperty('Slot length', 'm', 0, maximumRefDiameter)

    def generateCoreMap(self):
        slotWidth = self.normalize(self.props['slotWidth'].getValue())
        slotLength = self.normalize(self.props['slotLength'].getValue())

        self.coreMap[np.logical_and(np.abs(self.mapY) < slotWidth/2, np.abs(self.mapX) < slotLength)] = 0
        self.coreMap[np.logical_and(np.abs(self.mapX) < slotWidth/2, np.abs(self.mapY) < slotLength)] = 0

    def getDetailsString(self, lengthUnit='m'):
        return 'Length: {}, Slots: {} by {}'.format(self.props['length'].dispFormat(lengthUnit),
                                                    self.props['slotWidth'].dispFormat(lengthUnit),
                                                    self.props['slotLength'].dispFormat(lengthUnit))

    def getGeometryErrors(self):
        errors = super().getGeometryErrors()
        if self.props['slotWidth'].getValue() == 0:
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, 'Slot width must not be 0'))
        if self.props['slotWidth'].getValue() > self.props['diameter'].getValue():
            aText = 'Slot width should be less than or equal to grain diameter'
            errors.append(SimAlert(SimAlertLevel.WARNING, SimAlertType.GEOMETRY, aText))

        if self.props['slotLength'].getValue() == 0:
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, 'Slot length must not be 0'))
        if self.props['slotLength'].getValue() * 2 > self.props['diameter'].getValue():
            aText = 'Slot length should be less than or equal to grain radius'
            errors.append(SimAlert(SimAlertLevel.WARNING, SimAlertType.GEOMETRY, aText))

        return errors
`,M=`"""Contains the motor class and a supporting configuration property collection."""

from typing import Dict, Union, List
import numpy as np
from scipy.optimize import newton

from . import geometry
from .constants import atmosphericPressure, gasConstant
from .grains import EndBurningGrain, grainTypes
from .nozzle import Nozzle
from .propellant import Propellant
from .properties import FloatProperty, IntProperty, PropertyCollection
from .simResult import SimAlert, SimAlertLevel, SimAlertType, SimulationResult
from .grain import Grain


class MotorConfig(PropertyCollection):
    """Contains the settings required for simulation, including environmental conditions and details about
    how to run the simulation."""

    def __init__(self) -> None:
        super().__init__()
        # Limits
        self.props["maxPressure"] = FloatProperty(
            "Maximum Allowed Pressure", "Pa", 0, 7e7
        )
        self.props["maxMassFlux"] = FloatProperty(
            "Maximum Allowed Mass Flux", "kg/(m^2*s)", 0, 1e4
        )
        self.props["maxMachNumber"] = FloatProperty(
            "Maximum Allowed Core Mach Number", "", 0.00, 1e2
        )
        self.props["minPortThroat"] = FloatProperty(
            "Minimum Allowed Port/Throat Ratio", "", 1, 4
        )
        self.props["flowSeparationWarnPercent"] = FloatProperty(
            "Flow Separation Warning Threshold", "", 0.00, 1
        )
        # Simulation
        self.props["burnoutWebThres"] = FloatProperty(
            "Web Burnout Threshold", "m", 2.54e-5, 3.175e-3
        )
        self.props["burnoutThrustThres"] = FloatProperty(
            "Thrust Burnout Threshold", "%", 0.01, 10
        )
        self.props["timestep"] = FloatProperty("Simulation Timestep", "s", 0.0001, 0.1)
        self.props["ambPressure"] = FloatProperty(
            "Ambient Pressure", "Pa", 0.0001, 102000
        )
        self.props["mapDim"] = IntProperty("Grain Map Dimension", "", 250, 2000)
        self.props["sepPressureRatio"] = FloatProperty(
            "Separation Pressure Ratio", "", 0.001, 1
        )


class Motor:
    """The motor class stores a number of grains, a nozzle instance, a propellant, and a configuration that it uses
    to run simulations. Simulations return a simRes object that includes any warnings or errors associated with the
    simulation and the data. The propellant field may be None if the motor has no propellant set, and the grains list
    is allowed to be empty. The nozzle field and config must be filled, even if they are empty property collections."""

    def __init__(self, propDict: Union[Dict, None] = None) -> None:
        self.grains: List[Grain] = []
        self.propellant = None
        self.nozzle = Nozzle()
        self.config = MotorConfig()

        if propDict is not None:
            self.applyDict(propDict)

    def getDict(self) -> Dict:
        """Returns a serializable representation of the motor. The dictionary has keys 'nozzle', 'propellant',
        'grains', and 'config', which hold to the properties of their corresponding fields. Grains is a list
        of dicts, each containing a type and properties. Propellant may be None if the motor has no propellant
        set."""
        motorData = {}
        motorData["nozzle"] = self.nozzle.getProperties()
        if self.propellant is not None:
            motorData["propellant"] = self.propellant.getProperties()
        else:
            motorData["propellant"] = None
        motorData["grains"] = [
            {"type": grain.geomName, "properties": grain.getProperties()}
            for grain in self.grains
        ]
        motorData["config"] = self.config.getProperties()
        return motorData

    def applyDict(self, dictionary):
        """Makes the motor copy properties from the dictionary that is passed in, which must be formatted like
        the result passed out by 'getDict'"""
        self.nozzle.setProperties(dictionary["nozzle"])
        if dictionary["propellant"] is not None:
            self.propellant = Propellant(dictionary["propellant"])
        else:
            self.propellant = None
        self.grains = []
        for entry in dictionary["grains"]:
            self.grains.append(grainTypes[entry["type"]]())
            self.grains[-1].setProperties(entry["properties"])
        self.config.setProperties(dictionary["config"])

    def calcBurningSurfaceArea(self, regDepth):
        burnoutThres = self.config.getProperty("burnoutWebThres")
        gWithReg = zip(self.grains, regDepth)
        perGrain = [
            gr.getSurfaceAreaAtRegression(reg) * int(gr.isWebLeft(reg, burnoutThres))
            for gr, reg in gWithReg
        ]
        return sum(perGrain)

    def calcKN(self, regDepth, dThroat):
        """Returns the motor's Kn when it has each grain has regressed by its value in regDepth, which should be a list
        with the same number of elements as there are grains in the motor."""
        burningSurfaceArea = self.calcBurningSurfaceArea(regDepth)
        nozzleArea = self.nozzle.getThroatArea(dThroat)
        return burningSurfaceArea / nozzleArea

    def calcIdealPressure(self, regDepth, dThroat, kn=None):
        """Returns the steady-state pressure of the motor at a given reg. Kn is calculated automatically, but it can
        optionally be passed in to save time on motors where calculating surface area is expensive."""
        if kn is None:
            kn = self.calcKN(regDepth, dThroat)
        return self.propellant.getPressureFromKn(kn)

    def calcForce(self, chamberPres, dThroat, exitPres=None):
        """Calculates the force of the motor at a given regression depth per grain. Calculates exit pressure by
        default, but can also use a value passed in."""
        _, _, gamma, _, _ = self.propellant.getCombustionProperties(chamberPres)
        ambPressure = self.config.getProperty("ambPressure")
        thrustCoeff = self.nozzle.getAdjustedThrustCoeff(
            chamberPres, ambPressure, gamma, dThroat, exitPres
        )
        thrust = thrustCoeff * self.nozzle.getThroatArea(dThroat) * chamberPres
        return max(thrust, 0)

    def calcFreeVolume(self, regDepth):
        """Calculates the volume inside of the motor not occupied by proppellant for a set of regression depths."""
        return sum(
            [grain.getFreeVolume(reg) for grain, reg in zip(self.grains, regDepth)]
        )

    def calcTotalVolume(self):
        """Calculates the bounding-cylinder volume of the combustion chamber."""
        return sum([grain.getGrainBoundingVolume() for grain in self.grains])

    def calcMachNumber(self, chamberPres, massFlux):
        """Calculates the mach number in the core of a grain for a given chamber pressure and mass flux."""
        _, _, gamma, T, molarMass = self.propellant.getCombustionProperties(chamberPres)

        if (
            chamberPres <= atmosphericPressure
        ):  # Mach calculation gets weird at low chamber pressures
            return 0

        def machFunc(M, chamberPres, massFlux, gamma, T, molarMass, gasConstant):
            A = chamberPres * (gamma * molarMass / (gasConstant * T)) ** 0.5
            B = 1.0 + ((gamma - 1.0) / 2.0) * M**2
            C = -(gamma + 1.0) / (2.0 * (gamma - 1.0))
            return A * M * (B**C) - massFlux

        def machFuncDerivative(
            M, chamberPres, massFlux, gamma, T, molarMass, gasConstant
        ):
            A = chamberPres * (gamma * molarMass / gasConstant / T) ** 0.5
            B = 1.0 + ((gamma - 1.0) / 2.0) * M**2
            C = -(gamma + 1.0) / (2.0 * (gamma - 1.0))
            dB_dM = (gamma - 1.0) * M
            return A * (B**C + M * C * (B ** (C - 1.0)) * dB_dM)

        maxMassFlux = (
            machFunc(1.0, chamberPres, massFlux, gamma, T, molarMass, gasConstant)
            + massFlux
        )

        if massFlux >= maxMassFlux:  # Boom
            return 1.0

        x0 = np.arcsin(massFlux / maxMassFlux) * 2 / np.pi
        try:
            M = newton(
                machFunc,
                fprime=machFuncDerivative,
                x0=x0,
                args=(chamberPres, massFlux, gamma, T, molarMass, gasConstant),
                maxiter=50,
            )
        except Exception:
            return 1.0

        return max(M, 0)

    def runSimulation(self, callback=None) -> SimulationResult:
        """Runs a simulation of the motor and returns a simRes instance with the results. Constraints are checked,
        including the number of grains, if the motor has a propellant set, and if the grains have geometry errors. If
        all of these tests are passed, the motor's operation is simulated by calculating Kn, using this value to get
        pressure, and using pressure to determine thrust and other statistics. The next timestep is then prepared by
        using the pressure to determine how the motor will regress in the given timestep at the current pressure.
        This process is repeated and regression tracked until all grains have burned out, when the results and any
        warnings are returned."""
        burnoutWebThres = self.config.getProperty("burnoutWebThres")
        burnoutThrustThres = self.config.getProperty("burnoutThrustThres")
        dTime = self.config.getProperty("timestep")

        simRes = SimulationResult(self)

        # Check for geometry errors
        if len(self.grains) == 0:
            aText = "Motor must have at least one propellant grain"
            simRes.addAlert(
                SimAlert(SimAlertLevel.ERROR, SimAlertType.CONSTRAINT, aText, "Motor")
            )
        for gid, grain in enumerate(self.grains):
            if (
                isinstance(grain, EndBurningGrain) and gid != 0
            ):  # Endburners have to be at the foward end
                aText = "End burning grains must be the forward-most grain in the motor"
                simRes.addAlert(
                    SimAlert(
                        SimAlertLevel.ERROR,
                        SimAlertType.CONSTRAINT,
                        aText,
                        "Grain {}".format(gid + 1),
                    )
                )
            for alert in grain.getGeometryErrors():
                alert.location = "Grain {}".format(gid + 1)
                simRes.addAlert(alert)
        for alert in self.nozzle.getGeometryErrors():
            simRes.addAlert(alert)

        # Make sure the motor has a propellant set
        if self.propellant is None:
            alert = SimAlert(
                SimAlertLevel.ERROR,
                SimAlertType.CONSTRAINT,
                "Motor must have a propellant set",
                "Motor",
            )
            simRes.addAlert(alert)
        else:
            for alert in self.propellant.getErrors():
                simRes.addAlert(alert)

        # If any errors occurred, stop simulation and return an empty sim with errors
        if len(simRes.getAlertsByLevel(SimAlertLevel.ERROR)) > 0:
            return simRes

        # Pull the required numbers from the propellant
        density = self.propellant.getProperty("density")

        # Precalculate these are they don't change
        motorVolume = self.calcTotalVolume()

        # Generate coremaps for perforated grains
        for grain in self.grains:
            grain.simulationSetup(self.config)

        # Setup initial values
        perGrainReg = [0 for grain in self.grains]

        # At t = 0, the motor has ignited
        simRes.channels["time"].addData(0)
        simRes.channels["kn"].addData(self.calcKN(perGrainReg, 0))
        simRes.channels["pressure"].addData(
            self.calcIdealPressure(perGrainReg, 0, None)
        )
        simRes.channels["force"].addData(0)
        simRes.channels["mass"].addData(
            [grain.getVolumeAtRegression(0) * density for grain in self.grains]
        )
        simRes.channels["volumeLoading"].addData(
            100 * (1 - (self.calcFreeVolume(perGrainReg) / motorVolume))
        )
        simRes.channels["massFlow"].addData([0 for grain in self.grains])
        simRes.channels["massFlux"].addData([0 for grain in self.grains])
        simRes.channels["regression"].addData([0 for grains in self.grains])
        simRes.channels["web"].addData([grain.getWebLeft(0) for grain in self.grains])
        simRes.channels["exitPressure"].addData(0)
        simRes.channels["dThroat"].addData(0)
        simRes.channels["machNumber"].addData([0 for grain in self.grains])

        # Check port/throat ratio and add a warning if it is not large enough
        aftPort = self.grains[-1].getPortArea(0)
        if aftPort is not None:
            minAllowed = self.config.getProperty("minPortThroat")
            ratio = aftPort / geometry.circleArea(
                self.nozzle.props["throat"].getValue()
            )
            if ratio < minAllowed:
                description = (
                    "Initial port/throat ratio of {:.3f} was less than {:.3f}".format(
                        ratio, minAllowed
                    )
                )
                simRes.addAlert(
                    SimAlert(
                        SimAlertLevel.WARNING,
                        SimAlertType.CONSTRAINT,
                        description,
                        "N/A",
                    )
                )

        # Perform timesteps
        while simRes.shouldContinueSim(burnoutThrustThres):
            # Calculate regression
            massFlow = 0
            perGrainMass = [0 for grain in self.grains]
            perGrainMassFlow = [0 for grain in self.grains]
            perGrainMassFlux = [0 for grain in self.grains]
            perGrainWeb = [0 for grain in self.grains]
            for gid, grain in enumerate(self.grains):
                if grain.getWebLeft(perGrainReg[gid]) > burnoutWebThres:
                    # Calculate regression at the current pressure
                    reg = dTime * self.propellant.getBurnRate(
                        simRes.channels["pressure"].getLast()
                    )
                    # Find the mass flux through the grain based on the mass flow fed into from grains above it
                    perGrainMassFlux[gid] = grain.getPeakMassFlux(
                        massFlow, dTime, perGrainReg[gid], reg, density
                    )
                    # Find the mass of the grain after regression
                    perGrainMass[gid] = (
                        grain.getVolumeAtRegression(perGrainReg[gid]) * density
                    )
                    # Add the change in grain mass to the mass flow
                    massFlow += (
                        simRes.channels["mass"].getLast()[gid] - perGrainMass[gid]
                    ) / dTime
                    # Apply the regression
                    perGrainReg[gid] += reg
                    perGrainWeb[gid] = grain.getWebLeft(perGrainReg[gid])
                perGrainMassFlow[gid] = massFlow
            simRes.channels["regression"].addData(perGrainReg[:])
            simRes.channels["web"].addData(perGrainWeb)

            simRes.channels["volumeLoading"].addData(
                100 * (1 - (self.calcFreeVolume(perGrainReg) / motorVolume))
            )
            simRes.channels["mass"].addData(perGrainMass)
            simRes.channels["massFlow"].addData(perGrainMassFlow)
            simRes.channels["massFlux"].addData(perGrainMassFlux)

            # Calculate KN
            dThroat = simRes.channels["dThroat"].getLast()
            simRes.channels["kn"].addData(self.calcKN(perGrainReg, dThroat))

            # Calculate Pressure
            lastKn = simRes.channels["kn"].getLast()
            pressure = self.calcIdealPressure(perGrainReg, dThroat, lastKn)
            simRes.channels["pressure"].addData(pressure)

            # Calculate Mach Number
            perGrainMachNumber = [0 for grain in self.grains]
            for gid, grain in enumerate(self.grains):
                perGrainMachNumber[gid] = self.calcMachNumber(
                    pressure, perGrainMassFlux[gid]
                )
            simRes.channels["machNumber"].addData(perGrainMachNumber)

            # Calculate Exit Pressure
            _, _, gamma, _, _ = self.propellant.getCombustionProperties(pressure)
            exitPressure = self.nozzle.getExitPressure(gamma, pressure)
            simRes.channels["exitPressure"].addData(exitPressure)

            # Calculate force
            force = self.calcForce(
                simRes.channels["pressure"].getLast(), dThroat, exitPressure
            )
            simRes.channels["force"].addData(force)

            simRes.channels["time"].addData(simRes.channels["time"].getLast() + dTime)

            # Calculate any slag deposition or erosion of the throat
            if pressure == 0:
                slagRate = 0
            else:
                slagRate = (1 / pressure) * self.nozzle.getProperty("slagCoeff")
            erosionRate = pressure * self.nozzle.getProperty("erosionCoeff")
            change = dTime * ((-2 * slagRate) + (2 * erosionRate))
            simRes.channels["dThroat"].addData(dThroat + change)

            if callback is not None:
                # Uses the grain with the largest percentage of its web left
                progress = max(
                    [
                        g.getWebLeft(r) / g.getWebLeft(0)
                        for g, r in zip(self.grains, perGrainReg)
                    ]
                )
                if callback(
                    1 - progress
                ):  # If the callback returns true, it is time to cancel
                    return simRes

        simRes.success = True

        if simRes.getPeakMassFlux() > self.config.getProperty("maxMassFlux"):
            desc = "Peak mass flux exceeded configured limit"
            alert = SimAlert(
                SimAlertLevel.WARNING, SimAlertType.CONSTRAINT, desc, "Motor"
            )
            simRes.addAlert(alert)

        if simRes.getMaxPressure() > self.config.getProperty("maxPressure"):
            desc = "Max pressure exceeded configured limit"
            alert = SimAlert(
                SimAlertLevel.WARNING, SimAlertType.CONSTRAINT, desc, "Motor"
            )
            simRes.addAlert(alert)

        if simRes.getPeakMachNumber() >= 1.0:
            desc = "Max core Mach number exceeded allowable subsonic limit (M>1.0)"
            alert = SimAlert(
                SimAlertLevel.WARNING, SimAlertType.CONSTRAINT, desc, "Motor"
            )
            simRes.addAlert(alert)
        elif simRes.getPeakMachNumber() > self.config.getProperty("maxMachNumber"):
            desc = "Max core Mach number exceeded configured limit"
            alert = SimAlert(
                SimAlertLevel.WARNING, SimAlertType.CONSTRAINT, desc, "Motor"
            )
            simRes.addAlert(alert)

        if simRes.getPercentBelowThreshold(
            "exitPressure",
            self.config.getProperty("ambPressure")
            * self.config.getProperty("sepPressureRatio"),
        ) > self.config.getProperty("flowSeparationWarnPercent"):
            desc = "Low exit pressure, nozzle flow may separate"
            alert = SimAlert(SimAlertLevel.WARNING, SimAlertType.VALUE, desc, "Nozzle")
            simRes.addAlert(alert)

        if simRes.getAverageForce() < burnoutThrustThres:
            desc = "Motor did not generate thrust. Check Kn, chamber pressure and expansion ratio."
            alert = SimAlert(SimAlertLevel.ERROR, SimAlertType.VALUE, desc, "Motor")
            simRes.addAlert(alert)

        # Note that this only adds all errors found on the first datapoint where there were errors to avoid repeating
        # errors. It should be revisited if getPressureErrors ever returns multiple types of errors
        for pressure in simRes.channels["pressure"].getData():
            if pressure > 0:
                err = self.propellant.getPressureErrors(pressure)
                if len(err) > 0:
                    simRes.addAlert(err[0])
                    break

        return simRes

    def getQuickResults(self):
        results = {
            "volumeLoading": 0,
            "initialKn": 0,
            "propellantMass": 0,
            "portRatio": 0,
            "length": 0,
            "diameter": 0,
        }

        simRes = SimulationResult(self)

        density = (
            self.propellant.getProperty("density")
            if self.propellant is not None
            else None
        )
        throatArea = self.nozzle.getThroatArea()
        motorVolume = self.calcTotalVolume()

        if motorVolume == 0:
            return results

        # Generate coremaps for perforated grains
        for grain in self.grains:
            for alert in grain.getGeometryErrors():
                if alert.level == SimAlertLevel.ERROR:
                    return results

            grain.simulationSetup(self.config)

        perGrainReg = [0 for grain in self.grains]

        results["volumeLoading"] = 100 * (
            1 - (self.calcFreeVolume(perGrainReg) / motorVolume)
        )
        if throatArea != 0:
            results["initialKn"] = self.calcKN(perGrainReg, 0)
            results["portRatio"] = simRes.getPortRatio()
        if density is not None:
            results["propellantMass"] = sum(
                [grain.getVolumeAtRegression(0) * density for grain in self.grains]
            )
        results["length"] = simRes.getPropellantLength()
        results["diameter"] = simRes.getMaxPropellantDiameter()

        return results
`,N=`"""This submodule houses the nozzle object and functions related to isentropic flow"""
import math

from scipy.optimize import fsolve

from .properties import FloatProperty, PropertyCollection
from . import geometry
from .simResult import SimAlert, SimAlertLevel, SimAlertType
from .constants import maximumRefDiameter, maximumRefLength

def eRatioFromPRatio(k, pRatio):
    """Returns the expansion ratio of a nozzle given the pressure ratio it causes."""
    return (((k+1)/2)**(1/(k-1))) * (pRatio ** (1/k)) * ((((k+1)/(k-1))*(1-(pRatio**((k-1)/k))))**0.5)

class Nozzle(PropertyCollection):
    """An object that contains the details about a motor's nozzle."""
    def __init__(self):
        super().__init__()
        self.props['throat'] = FloatProperty('Throat Diameter', 'm', 0, maximumRefDiameter)
        self.props['exit'] = FloatProperty('Exit Diameter', 'm', 0, maximumRefDiameter)
        self.props['efficiency'] = FloatProperty('Efficiency', '', 0, 2)
        self.props['divAngle'] = FloatProperty('Divergence Half Angle', 'deg', 0, 90)
        self.props['convAngle'] = FloatProperty('Convergence Half Angle', 'deg', 0, 90)
        self.props['throatLength'] = FloatProperty('Throat Length', 'm', 0, maximumRefLength / 10)
        self.props['slagCoeff'] = FloatProperty('Slag Buildup Coefficient', '(m*Pa)/s', 0, 1e6)
        self.props['erosionCoeff'] = FloatProperty('Throat Erosion Coefficient', 'm/(s*Pa)', 0, 1e6)

    def getDetailsString(self, lengthUnit='m'):
        """Returns a human-readable string containing some details about the nozzle."""
        return 'Throat: {}'.format(self.props['throat'].dispFormat(lengthUnit))

    def calcExpansion(self):
        """Returns the nozzle's expansion ratio."""
        return (self.props['exit'].getValue() / self.props['throat'].getValue()) ** 2

    def getThroatArea(self, dThroat=0):
        """Returns the area of the nozzle's throat. The optional parameter is added on to the nozzle throat diameter
        allow erosion or slag buildup during a burn."""
        return geometry.circleArea(self.props['throat'].getValue() + dThroat)

    def getExitArea(self):
        """Return the area of the nozzle's exit."""
        return geometry.circleArea(self.props['exit'].getValue())

    def getExitPressure(self, k, inputPressure):
        """Solves for the nozzle's exit pressure, given an input pressure and the gas's specific heat ratio."""
        return fsolve(lambda x: (1/self.calcExpansion()) - eRatioFromPRatio(k, x / inputPressure), 0)[0]

    def getDivergenceLosses(self):
        """Returns nozzle efficiency losses due to divergence angle"""
        divAngleRad = math.radians(self.props["divAngle"].getValue())
        return (1 + math.cos(divAngleRad)) / 2

    def getThroatLosses(self, dThroat=0):
        """Returns the losses caused by the throat aspect ratio as described in this document:
        http://rasaero.com/dloads/Departures%20from%20Ideal%20Performance.pdf"""
        throatAspect = self.props['throatLength'].getValue() / (self.props['throat'].getValue() + dThroat)
        if throatAspect > 0.45:
            return 0.95
        return 0.99 - (0.0333 * throatAspect)

    def getSkinLosses(self):
        """Returns the losses due to drag on the nozzle surface as described here:
        https://apps.dtic.mil/dtic/tr/fulltext/u2/a099791.pdf. This is a constant for now, as people likely don't have
        a way to measure this themselves."""
        return 0.99

    def getIdealThrustCoeff(self, chamberPres, ambPres, gamma, dThroat, exitPres=None):
        """Calculates C_f, the ideal thrust coefficient for the nozzle, given the propellant's specific heat ratio, the
        ambient and chamber pressures. If nozzle exit presure isn't provided, it will be calculated. dThroat is the 
        change in throat diameter due to erosion or slag accumulation."""
        if chamberPres == 0:
            return 0

        if exitPres is None:
            exitPres = self.getExitPressure(gamma, chamberPres)
        exitArea = self.getExitArea()
        throatArea = self.getThroatArea(dThroat)

        term1 = (2 * (gamma ** 2)) / (gamma - 1)
        term2 = (2 / (gamma + 1)) ** ((gamma + 1) / (gamma - 1))
        term3 = 1 - ((exitPres / chamberPres) ** ((gamma - 1) / gamma))

        momentumThrust = (term1 * term2 * term3) ** 0.5
        pressureThrust = ((exitPres - ambPres) * exitArea) / (throatArea * chamberPres)

        return momentumThrust + pressureThrust

    def getAdjustedThrustCoeff(self, chamberPres, ambPres, gamma, dThroat, exitPres=None):
        """Calculates adjusted thrust coefficient for the nozzle, given the propellant's specific heat ratio, the
        ambient and chamber pressures. If nozzle exit presure isn't provided, it will be calculated. dThroat is the 
        change in throat diameter due to erosion or slag accumulation. This method uses a combination of the techniques
        described in these resources to adjust the thrust coefficient:
        https://apps.dtic.mil/dtic/tr/fulltext/u2/a099791.pdf
        http://rasaero.com/dloads/Departures%20from%20Ideal%20Performance.pdf"""
        thrustCoeffIdeal = self.getIdealThrustCoeff(chamberPres, ambPres, gamma, dThroat, exitPres)
        divLoss = self.getDivergenceLosses()
        throatLoss = self.getThroatLosses(dThroat)
        skinLoss = self.getSkinLosses()
        efficiency = self.getProperty('efficiency')
        return divLoss * throatLoss * efficiency * (skinLoss * thrustCoeffIdeal + (1 - skinLoss))

    def getGeometryErrors(self):
        """Returns a list containing any errors with the nozzle's properties."""
        errors = []
        if self.props['throat'].getValue() == 0:
            aText = 'Throat diameter must not be 0'
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, aText, 'Nozzle'))
        if self.props['exit'].getValue() < self.props['throat'].getValue():
            aText = 'Exit diameter must not be smaller than throat diameter'
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.GEOMETRY, aText, 'Nozzle'))
        if self.props['efficiency'].getValue() == 0:
            aText = 'Efficiency must not be 0'
            errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.CONSTRAINT, aText, 'Nozzle'))
        return errors
`,V=`"""Propellant submodule that contains the propellant class."""

from scipy.optimize import fsolve

from .properties import PropertyCollection, FloatProperty, StringProperty, TabularProperty
from .simResult import SimAlert, SimAlertLevel, SimAlertType
from .constants import gasConstant

class PropellantTab(PropertyCollection):
    """Contains the combustion properties of a propellant over a specified pressure range."""
    def __init__(self, tabDict=None):
        super().__init__()
        self.props['minPressure'] = FloatProperty('Minimum Pressure', 'Pa', 0, 7e7)
        self.props['maxPressure'] = FloatProperty('Maximum Pressure', 'Pa', 0, 7e7)
        self.props['a'] = FloatProperty('Burn rate Coefficient', 'm/(s*Pa^n)', 1E-8, 2)
        self.props['n'] = FloatProperty('Burn rate Exponent', '', -0.99, 0.99)
        self.props['k'] = FloatProperty('Specific Heat Ratio', '', 1+1e-6, 10)
        self.props['t'] = FloatProperty('Combustion Temperature', 'K', 1, 10000)
        self.props['m'] = FloatProperty('Exhaust Molar Mass', 'g/mol', 1e-6, 100)
        if tabDict is not None:
            self.setProperties(tabDict)


class Propellant(PropertyCollection):
    """Contains the physical and thermodynamic properties of a propellant formula."""
    def __init__(self, propDict=None):
        super().__init__()
        self.props['name'] = StringProperty('Name')
        self.props['density'] = FloatProperty('Density', 'kg/m^3', 1, 10000)
        self.props['tabs'] = TabularProperty('Properties', PropellantTab)
        if propDict is not None:
            self.setProperties(propDict)

    def getCStar(self, pressure):
        """Returns the propellant's characteristic velocity."""
        _, _, gamma, temp, molarMass = self.getCombustionProperties(pressure)
        num = (gamma * gasConstant / molarMass * temp)**0.5
        denom = gamma * ((2 / (gamma + 1))**((gamma + 1) / (gamma - 1)))**0.5
        return num / denom

    def getBurnRate(self, pressure):
        """Returns the propellant's burn rate for the given pressure"""
        ballA, ballN, _, _, _ = self.getCombustionProperties(pressure)
        return ballA * (pressure ** ballN)

    def getPressureFromKn(self, kn):
        density = self.getProperty('density')
        tabPressures = []
        for tab in self.getProperty('tabs'):
            ballA, ballN, gamma, temp, molarMass = tab['a'], tab['n'], tab['k'], tab['t'], tab['m']
            num = kn * density * ballA
            exponent = 1 / (1 - ballN)
            denom = ((gamma / ((gasConstant / molarMass) * temp)) * ((2 / (gamma + 1)) ** ((gamma + 1) / (gamma - 1)))) ** 0.5
            tabPressure = (num / denom) ** exponent
            # If the pressure that a burnrate produces falls into its range, we know it is the proper burnrate
            # Due to floating point error, we sometimes get a situation in which no burnrate produces the proper pressure
            # For this scenario, we go by whichever produces the least error
            minTabPressure = tab['minPressure']
            maxTabPressure = tab['maxPressure']
            if minTabPressure == self.getMinimumValidPressure() and tabPressure < maxTabPressure:
                return tabPressure
            if maxTabPressure == self.getMaximumValidPressure() and minTabPressure < tabPressure:
                return tabPressure
            if minTabPressure < tabPressure < maxTabPressure:
                return tabPressure
            tabPressures.append([min(abs(minTabPressure - tabPressure), abs(tabPressure - maxTabPressure)), tabPressure])

        tabPressures.sort(key=lambda x: x[0]) # Sort by the pressure error
        return tabPressures[0][1] # Return the pressure

    def getKnFromPressure(self, pressure):
        func = lambda kn: self.getPressureFromKn(kn) - pressure

        return fsolve(func, [250], maxfev=1000)

    def getCombustionProperties(self, pressure):
        """Returns the propellant's a, n, gamma, combustion temp and molar mass for a given pressure"""
        closest = {}
        closestPressure = 1e100
        for tab in self.getProperty('tabs'):
            if tab['minPressure'] < pressure < tab['maxPressure']:
                return tab['a'], tab['n'], tab['k'], tab['t'], tab['m']
            if abs(pressure - tab['minPressure']) < closestPressure:
                closest = tab
                closestPressure = abs(pressure - tab['minPressure'])
            if abs(pressure - tab['maxPressure']) < closestPressure:
                closest = tab
                closestPressure = abs(pressure - tab['maxPressure'])

        return closest['a'], closest['n'], closest['k'], closest['t'], closest['m']

    def getMinimumValidPressure(self):
        """Returns the lowest pressure value with associated combustion properties"""
        return min([tab['minPressure'] for tab in self.getProperty('tabs')])

    def getMaximumValidPressure(self):
        """Returns the highest pressure value with associated combustion properties"""
        return max([tab['maxPressure'] for tab in self.getProperty('tabs')])

    def getErrors(self):
        """Checks that all tabs have smaller start pressures than their end pressures, and verifies that no ranges
        overlap."""
        errors = []
        for tabId, tab in enumerate(self.getProperty('tabs')):
            if tab['maxPressure'] == tab['minPressure']:
                errText = 'Tab #{} has the same minimum and maximum pressures.'.format(tabId + 1)
                errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.VALUE, errText, 'Propellant'))
            if tab['maxPressure'] < tab['minPressure']:
                errText = 'Tab #{} has reversed pressure limits.'.format(tabId + 1)
                errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.VALUE, errText, 'Propellant'))
            for otherTabId, otherTab in enumerate(self.getProperty('tabs')):
                if tabId != otherTabId:
                    if otherTab['minPressure'] < tab['maxPressure'] < otherTab['maxPressure']:
                        err = 'Tabs #{} and #{} have overlapping ranges.'.format(tabId + 1, otherTabId + 1)
                        errors.append(SimAlert(SimAlertLevel.ERROR, SimAlertType.VALUE, err, 'Propellant'))
        return errors

    def getPressureErrors(self, pressure):
        """Returns if the propellant has any errors associated with the supplied pressure such as not having set
        combustion properties"""
        errors = []
        for tab in self.getProperty('tabs'):
            if tab['minPressure'] < pressure < tab['maxPressure']:
                return errors
        aText = "Chamber pressure deviated from propellant's entered ranges. Results may not be accurate."
        errors.append(SimAlert(SimAlertLevel.WARNING, SimAlertType.VALUE, aText, 'Propellant'))
        return errors

    def addTab(self, tab):
        """Adds a set of combustion properties to the propellant"""
        self.props['tabs'].addTab(tab)
`,C=`"""This module includes a properties, which are objects that contain different datatypes and enforce conditions on
them, such as allowed ranges. They also can optionally associate a unit with the value, which aids with display and
conversion of the value."""

from . import units


class Property:
    """The base class that properties inherit from. It associates a human-readable display name with the data, as well
    as a unit and value type that it casts all inputs to."""

    def __init__(self, dispName, unit, valueType):
        self.dispName = dispName
        self.unit = unit
        self.valueType = valueType
        self.value = None

    def setValue(self, value):
        """Set the value of the property, casting if necessary"""
        self.value = self.valueType(value)

    def getValue(self):
        """Returns the value of the property"""
        return self.value

    def dispFormat(self, unit):
        """Returns a human-readable version of the property's current value, including the unit."""
        return "{} {}".format(self.value, unit)


class FloatProperty(Property):
    """A property that handles floats. It forces the value to be in a certain range."""

    def __init__(self, dispName, unit, minValue, maxValue):
        super().__init__(dispName, unit, float)
        self.min = minValue
        self.max = maxValue
        self.value = minValue

    def setValue(self, value):
        if self.min <= value <= self.max:
            super().setValue(value)

    def dispFormat(self, unit):
        return "{:.6g} {}".format(units.convert(self.value, self.unit, unit), unit)


class EnumProperty(Property):
    """This property operates on strings, but only allows values from a list that is set when the property is
    defined"""

    def __init__(self, dispName, values):
        super().__init__(dispName, "", object)
        self.values = values
        self.value = self.values[0]

    def contains(self, value):
        """Checks if a value is in the allowed list"""
        return value in self.values

    def setValue(self, value):
        if self.contains(value):
            self.value = value


class IntProperty(Property):
    """A property with an integer as the value that is clamped to a certain range."""

    def __init__(self, dispName, unit, minValue, maxValue):
        super().__init__(dispName, unit, int)
        self.min = minValue
        self.max = maxValue
        self.value = minValue

    def setValue(self, value):
        if self.min <= value <= self.max:
            super().setValue(value)


class StringProperty(Property):
    """A property that works on the set of all strings"""

    def __init__(self, dispName):
        super().__init__(dispName, "", str)


class BooleanProperty(Property):
    """A property with a single boolean as the value"""

    def __init__(self, dispName):
        super().__init__(dispName, "", bool)


class PolygonProperty(Property):
    """A property that contains a list of polygons, each a list of points"""

    def __init__(self, dispName):
        super().__init__(dispName, "", list)
        self.value = []


class TabularProperty(Property):
    """A property that is composed of a number of 'tabs', each of which is a property collection of its own."""

    def __init__(self, dispName, collection):
        super().__init__(dispName, "", list)
        self.collection = collection
        self.tabs = []

    def addTab(self, tab):
        """Add a tab to the property's list of tabs."""
        self.tabs.append(tab)

    def getValue(self):
        return [tab.getProperties() for tab in self.tabs]

    def setValue(self, value):
        self.tabs = [self.collection(data) for data in value]


class PropertyCollection:
    """Holds a set of properties and allows batch operations on them through dictionaries"""

    def __init__(self):
        self.props = {}

    def setProperties(self, props):
        """Sets the value(s) of one of more properties at a time by passing in a dictionary of property names and
        values"""
        for prop in props.keys():
            # Conditional allows loading settings when the name of a field has changed
            if prop in self.props:
                self.props[prop].setValue(props[prop])

    def getProperties(self, props=None):
        """Get a dictionary of property names and values. The optional argument is a list of which properties are
        being requested. It defaults to None, which returns all properties."""
        if props is None:
            props = self.props.keys()
        return {k: self.props[k].getValue() for k in props}

    def getProperty(self, prop):
        """Returns the value of a specific property."""
        return self.props[prop].getValue()

    def setProperty(self, prop, value):
        """Set the value of a specific property"""
        self.props[prop].setValue(value)
`,E=`"""This module contains the classes that are returned from a simulation, including the main results class and
the channels and components that it is comprised of."""

from typing import List
import math
from enum import Enum

from . import geometry
from . import units
from . import constants


class SimAlertLevel(Enum):
    """Levels of severity for sim alerts"""

    ERROR = 1
    WARNING = 2
    MESSAGE = 3


class SimAlertType(Enum):
    """Types of sim alerts"""

    GEOMETRY = 1
    CONSTRAINT = 2
    VALUE = 3


alertLevelNames = {
    SimAlertLevel.ERROR: "Error",
    SimAlertLevel.WARNING: "Warning",
    SimAlertLevel.MESSAGE: "Message",
}

alertTypeNames = {
    SimAlertType.GEOMETRY: "Geometry",
    SimAlertType.CONSTRAINT: "Constraint",
    SimAlertType.VALUE: "Value",
}


class SimAlert:
    """A sim alert signifies a possible problem with a motor. It has levels of severity including 'error' (simulation
    should not continue or has failed), 'warning' (values entered appear incorrect but can be simulated), and 'message'
    (other information). The type describes the variety of issue the alert is associated with, and the description is
    a human-readable version string with more details about the problem. The location can either be None or a string to
    help the user find the problem."""

    def __init__(self, level, alertType, description, location=None):
        self.level = level
        self.type = alertType
        self.description = description
        self.location = location


class LogChannel:
    """A log channel accepts data from a single source throughout a simulation. It has a human-readable name such as
    'Pressure' to help the user interpret the result, a value type that data passed in will be cast to, and a unit to
    aid in conversion and display. The data type can either be a scalar (float or int) or a list (list or tuple)."""

    def __init__(self, name, valueType, unit):
        if valueType not in (int, float, list, tuple):
            raise TypeError("Value type not in allowed set")
        self.name = name
        self.unit = unit
        self.valueType = valueType
        self.data = []

    def getData(self, unit=None):
        """Return all of the data in the channel, converting it if a type is specified."""
        if unit is None:  # No conversion needed
            return self.data

        if self.valueType in (list, tuple):
            return [[units.convert(d, self.unit, unit) for d in p] for p in self.data]
        # If the data type isn't a list, it should be a scalar
        return [units.convert(p, self.unit, unit) for p in self.data]

    def getPoint(self, i):
        """Returns a specific datapoint by index."""
        return self.data[i]

    def getLast(self):
        """Returns the last datapoint."""
        return self.data[-1]

    def addData(self, data):
        """Adds a new datapoint to the end."""
        self.data.append(data)

    def getAverage(self):
        """Returns the average of the datapoints."""
        if self.valueType in (list, tuple):
            raise NotImplementedError("Average not supported for list types")
        return sum(self.data) / len(self.data)

    def getMax(self):
        """Returns the maximum value of all datapoints. For list datatypes, this operation finds the largest single
        value in any list."""
        if self.valueType in (list, tuple):
            return max([max(l) for l in self.data])
        return max(self.data)

    def getMin(self):
        """Returns the minimum value of all datapoints. For list datatypes, this operation finds the smallest single
        value in any list."""
        if self.valueType in (list, tuple):
            return min([min(l) for l in self.data])
        return min(self.data)


singleValueChannels = [
    "time",
    "kn",
    "pressure",
    "force",
    "volumeLoading",
    "exitPressure",
    "dThroat",
]
multiValueChannels = ["mass", "massFlow", "massFlux", "regression", "web", "machNumber"]


class SimulationResult:
    """A SimulationResult instance contains all results from a single simulation. It has a number of LogChannels, each
    capturing a single stream of outputs from the simulation. It also includes a flag of whether the simulation was
    considered a sucess, along with a list of alerts that the simulation produced while it was running."""

    def __init__(self, motor):
        self.motor = motor

        self.alerts: List[SimAlert] = []
        self.success = False

        self.channels = {
            "time": LogChannel("Time", float, "s"),
            "kn": LogChannel("Kn", float, ""),
            "pressure": LogChannel("Chamber Pressure", float, "Pa"),
            "force": LogChannel("Thrust", float, "N"),
            "mass": LogChannel("Propellant Mass", tuple, "kg"),
            "volumeLoading": LogChannel("Volume Loading", float, "%"),
            "massFlow": LogChannel("Mass Flow", tuple, "kg/s"),
            "massFlux": LogChannel("Mass Flux", tuple, "kg/(m^2*s)"),
            "regression": LogChannel("Regression Depth", tuple, "m"),
            "web": LogChannel("Web", tuple, "m"),
            "exitPressure": LogChannel("Nozzle Exit Pressure", float, "Pa"),
            "dThroat": LogChannel("Change in Throat Diameter", float, "m"),
            "machNumber": LogChannel("Core Mach Number", tuple, ""),
        }

    def addAlert(self, alert):
        """Add an entry to the list of alerts for the simulation."""
        self.alerts.append(alert)

    def getBurnTime(self):
        """Returns the burntime of the simulated motor, which is the time from the start when it was last producing
        thrust above the user's defined threshold."""
        return self.channels["time"].getLast()

    def getInitialKN(self):
        """Returns the motor's Kn before it started firing."""
        return self.channels["kn"].getPoint(0)

    def getPeakKN(self):
        """Returns the highest Kn that was observed during the motor's burn."""
        return self.channels["kn"].getMax()

    def getAveragePressure(self):
        """Returns the average chamber pressure observed during the simulation."""
        return self.channels["pressure"].getAverage()

    def getMaxPressure(self):
        """Returns the highest chamber pressure that was observed during the motor's burn."""
        return self.channels["pressure"].getMax()

    def getMinExitPressure(self):
        """Returns the lowest exit pressure that was observed during the motor's burn, ignoring startup and shutdown transients"""
        exit_pressures = self.channels["exitPressure"].getData()
        return min(exit_pressures)

    def getPercentBelowThreshold(self, channel, threshold):
        """Returns the total number of seconds spent below a given threshold value"""
        count = 0
        data = self.channels[channel].getData()
        for point in data:
            if point < threshold:
                count += 1
        return count / len(data)

    def getImpulse(self, stop=None):
        """Returns the impulse the simulated motor produced. If 'stop' is set to a value other than None, only the
        impulse to that point in the data is returned."""
        impulse = 0
        lastTime = 0
        for time, force in zip(
            self.channels["time"].data[:stop], self.channels["force"].data[:stop]
        ):
            impulse += force * (time - lastTime)
            lastTime = time
        return impulse

    def getAverageForce(self):
        """Returns the average force the motor produced during its burn."""
        return self.channels["force"].getAverage()

    def getDesignation(self):
        """Returns the standard amateur rocketry designation (H128, M1297) for the motor."""
        imp = self.getImpulse()
        if imp < 1.25:  # This is to avoid a domain error finding log(0)
            return "N/A"
        letters = ""
        order = (
            int(math.log(imp / 1.25, 2)) + 1
        )  # The number of powers of two in the impulse
        for place in range(
            0, int(math.log(order, 26)) + 1
        ):  # Loop over the number of letters in the designation
            remainder = order % 26
            letters = (
                chr(remainder + 64) + letters
            )  # 64 + 1 will produce "A", 64 + 2 "B", and so on
            order = int(
                (order - remainder) / 26
            )  # Move up a place by subtracting this one and dividing by the base (26)
        return "{}{:.0f}".format(letters, self.getAverageForce())

    def getFullDesignation(self):
        """Returns the full motor designation, which also includes the total impulse prepended on"""
        return "{:.0f}{}".format(self.getImpulse(), self.getDesignation())

    def getImpulseClassPercentage(self):
        """Returns the percentage of the way between the minimum and maximum impulse for the impulse class that the
        motor is"""
        impulse = self.getImpulse()
        if impulse < 1.25:  # This is to avoid a domain error finding log(0)
            return 0
        minClassImpulse = 1.25 * 2 ** int(math.log(impulse / 1.25, 2))
        return (impulse - minClassImpulse) / minClassImpulse

    def getPeakMassFlux(self):
        """Returns the maximum mass flux observed at any grain end."""
        return self.channels["massFlux"].getMax()

    def getPeakMassFluxLocation(self):
        """Returns the grain number at which the peak mass flux was observed."""
        value = self.getPeakMassFlux()
        # Find the value to get the location
        for frame in self.channels["massFlux"].getData():
            if value in frame:
                return frame.index(value)
        return None

    def getPeakMachNumber(self):
        """Returns the maximum core mach number observed at any grain end."""
        return self.channels["machNumber"].getMax()

    def getPeakMachNumberLocation(self):
        """Returns the grain number at which the peak core mach number was observed."""
        value = self.getPeakMachNumber()
        # Find the value to get the location
        for frame in self.channels["machNumber"].getData():
            if value in frame:
                return frame.index(value)
        return None

    def getISP(self, index=None):
        """Returns the specific impulse that the simulated motor delivered."""
        if index is None:
            propMass = self.getPropellantMass()
        else:
            propMass = self.getPropellantMass() - self.getPropellantMass(index)
        if propMass == 0:
            return 0
        return self.getImpulse(index) / (propMass * constants.standardGravity)

    def getPortRatio(self):
        """Returns the port/throat ratio of the motor, or None if it doesn't have a port."""
        aftPort = self.motor.grains[-1].getPortArea(0)
        if aftPort is not None:
            return aftPort / geometry.circleArea(
                self.motor.nozzle.props["throat"].getValue()
            )
        return None

    def getPropellantLength(self):
        """Returns the total length of all propellant before the simulated burn."""
        return sum([g.props["length"].getValue() for g in self.motor.grains])

    def getMaxPropellantDiameter(self):
        """Returns the outer diameter of the largest-diameter propellant grain."""
        return max([g.props["diameter"].getValue() for g in self.motor.grains])

    def getPropellantMass(self, index=0):
        """Returns the total mass of all propellant before the simulated burn. Optionally accepts a index that the mass
        will be sampled at."""
        return sum(self.channels["mass"].getPoint(index))

    def getVolumeLoading(self, index=0):
        """Returns the percentage of the motor's volume occupied by propellant. Optionally accepts a index that the
        value will be sampled at."""
        return self.channels["volumeLoading"].getPoint(index)

    def getIdealThrustCoefficient(self):
        """Returns the motor's thrust coefficient for the average pressure during the burn and no throat diameter
        changes or performance losses."""
        chamberPres = self.getAveragePressure()
        _, _, gamma, _, _ = self.motor.propellant.getCombustionProperties(chamberPres)
        ambPressure = self.motor.config.getProperty("ambPressure")
        return self.motor.nozzle.getIdealThrustCoeff(chamberPres, ambPressure, gamma, 0)

    def getAdjustedThrustCoefficient(self):
        """Returns the motor's thrust coefficient for the average pressure during the burn and no throat diameter
        changes, but including performance losses."""
        chamberPres = self.getAveragePressure()
        _, _, gamma, _, _ = self.motor.propellant.getCombustionProperties(chamberPres)
        ambPressure = self.motor.config.getProperty("ambPressure")
        return self.motor.nozzle.getAdjustedThrustCoeff(
            chamberPres, ambPressure, gamma, 0
        )

    def getAlertsByLevel(self, level):
        """Returns all simulation alerts of the specified level."""
        out = []
        for alert in self.alerts:
            if alert.level == level:
                out.append(alert)
        return out

    def shouldContinueSim(self, thrustThres):
        """Returns if the simulation should continue based on the thrust from the last timestep."""
        # With only one data point, there is nothing to compare
        if len(self.channels["time"].getData()) == 1:
            return True
        # Otherwise perform the comparison. 0.01 converts the threshold to a %
        return (
            self.channels["force"].getLast()
            > thrustThres * 0.01 * self.channels["force"].getMax()
        )

    def getCSV(self, pref=None, exclude=[], excludeGrains=[]):
        """Returns a string that contains a CSV of the simulated data. Preferences can be passed in to set units that
        the values will be converted to. All log channels are included unless their names are in the include
        argument."""
        out = ""
        outUnits = {}
        for chan in self.channels:
            if chan in exclude:
                continue
            # Get unit from preferences
            if pref is not None:
                outUnits[chan] = pref.getUnit(self.channels[chan].unit)
            else:
                outUnits[chan] = self.channels[chan].unit
            # Add title for column
            if self.channels[chan].valueType in (float, int):
                out += self.channels[chan].name
                if outUnits[chan] != "":
                    out += "({})".format(outUnits[chan])
                out += ","
            elif self.channels[chan].valueType in (list, tuple):
                for grain in range(1, len(self.channels[chan].getLast()) + 1):
                    if grain - 1 not in excludeGrains:
                        out += self.channels[chan].name + "("
                        out += "G{}".format(grain)
                        if outUnits[chan] != "":
                            out += ";{}".format(outUnits[chan])
                        out += "),"

        out = out[:-1]  # Remove the last comma
        out += "\\n"

        places = 5
        for ind, time in enumerate(self.channels["time"].getData()):
            out += str(round(time, places)) + ","
            for chan in self.channels:
                if chan in exclude:
                    continue
                if chan != "time":
                    if self.channels[chan].valueType in (float, int):
                        orig = self.channels[chan].getPoint(ind)
                        conv = units.convert(
                            orig, self.channels[chan].unit, outUnits[chan]
                        )
                        rounded = round(conv, places)
                        out += str(rounded) + ","
                    elif self.channels[chan].valueType in (list, tuple):
                        for gid, grainVal in enumerate(
                            self.channels[chan].getPoint(ind)
                        ):
                            if gid not in excludeGrains:
                                conv = round(
                                    units.convert(
                                        grainVal,
                                        self.channels[chan].unit,
                                        outUnits[chan],
                                    ),
                                    places,
                                )
                                out += str(conv) + ","

            out = out[:-1]  # Remove the last comma
            out += "\\n"

        return out
`,L=`"""This module contains tables of units and their long form names, their conversion rates with other units, and
functions for performing conversion."""

# The keys in this dictionary specify the units that all calculations are done in internally
unitLabels = {
    'm': 'Length',
    'm^3': 'Volume',
    'm/s': 'Velocity',
    'N': 'Force',
    'Ns': 'Impulse',
    'Pa': 'Pressure',
    'kg': 'Mass',
    'kg/m^3': 'Density',
    'kg/s': 'Mass Flow',
    'kg/(m^2*s)': 'Mass Flux',
    'm/(s*Pa^n)': 'Burn Rate Coefficient',
    '(m*Pa)/s': 'Nozzle Slag Coefficient',
    'm/(s*Pa)': 'Nozzle Erosion Coefficient'
}

unitTable = [
    ('m', 'cm', 100),
    ('m', 'mm', 1000),
    ('m', 'in', 39.37),
    ('m', 'ft', 3.28),

    ('m^3', 'cm^3', 100**3),
    ('m^3', 'mm^3', 1000**3),
    ('m^3', 'in^3', 39.37**3),
    ('m^3', 'ft^3', 3.28**3),

    ('m/s', 'cm/s', 100),
    ('m/s', 'mm/s', 1000),
    ('m/s', 'ft/s', 3.28),
    ('m/s', 'in/s', 39.37),

    ('N', 'lbf', 0.2248),

    ('Ns', 'lbfs', 0.2248),

    ('Pa', 'MPa', 1/1000000),
    ('Pa', 'psi', 1/6895),

    ('kg', 'g', 1000),
    ('kg', 'lb', 2.205),
    ('kg', 'oz', 2.205 * 16),

    ('kg/m^3', 'lb/in^3', 3.61273e-5),
    ('kg/m^3', 'g/cm^3', 0.001),

    ('kg/s', 'lb/s', 2.205),
    ('kg/s', 'g/s', 1000),

    ('kg/(m^2*s)', 'lb/(in^2*s)', 0.001422),

    ('(m*Pa)/s', '(m*MPa)/s', 1000000),
    ('(m*Pa)/s', '(in*psi)/s', 0.00571014715),

    ('m/(s*Pa)', 'thou/(s*psi)', 271447138),
    ('m/(s*Pa)', 'um/(s*mPa)', 1E9),

    ('m/(s*Pa^n)', 'in/(s*psi^n)', 39.37), # Ratio converts m/s to in/s. The pressure conversion must be done separately
    ('m/(s*Pa^n)', 'mm/(s*Pa^n)', 1000)
]

# Some base units are... not well chosen because any reasonable value in them will have too many/few digits to edit,
# leading to them getting truncated. They all have conversions that work much better, so just don't show them in the UI
internalOnlyUnits = ['m/(s*Pa^n)', 'm/(s*Pa)']

def getAllConversions(unit):
    """Returns a list of all units that the passed unit can be converted to."""
    allConversions = [unit]
    for conversion in unitTable:
        if conversion[0] == unit:
            allConversions.append(conversion[1])
        elif conversion[1] == unit:
            allConversions.append(conversion[0])
    for internalOnlyUnit in internalOnlyUnits:
        if internalOnlyUnit in allConversions:
            allConversions.remove(internalOnlyUnit)
    return allConversions

def getConversion(originUnit, destUnit):
    """Returns the ratio to convert between the two units. If the conversion does not exist, an exception is raised."""
    if originUnit == destUnit:
        return 1
    for conversion in unitTable:
        if conversion[0] == originUnit and conversion[1] == destUnit:
            return conversion[2]
        if conversion[1] == originUnit and conversion[0] == destUnit:
            return 1/conversion[2]
    raise KeyError("Cannot find conversion from <" + originUnit + "> to <" + destUnit + ">")

def convert(quantity, originUnit, destUnit):
    """Returns the value of 'quantity' when it is converted from 'originUnit' to 'destUnit'."""
    return quantity * getConversion(originUnit, destUnit)

def convertAll(quantities, originUnit, destUnit):
    """Converts a list of values from 'originUnit' to 'destUnit'."""
    convRate = getConversion(originUnit, destUnit)
    return [q * convRate for q in quantities]

def convFormat(quantity, originUnit, destUnit, places=3):
    """Takes in a quantity in originUnit, converts it to destUnit and outputs a rounded and formatted string that
    includes the unit appended to the end."""
    rounded = round(convert(quantity, originUnit, destUnit), places)
    return '{} {}'.format(rounded, destUnit)
`,l=document.getElementById("run"),a=document.getElementById("status"),m=document.getElementById("output"),G=Object.assign({"./src/openmotor_py/mathlib/__init__.py":u,"./src/openmotor_py/mathlib/_find_perimeter.py":d,"./src/openmotor_py/motorlib/__init__.py":g,"./src/openmotor_py/motorlib/constants.py":c,"./src/openmotor_py/motorlib/geometry.py":h,"./src/openmotor_py/motorlib/grain.py":b,"./src/openmotor_py/motorlib/grains/__init__.py":y,"./src/openmotor_py/motorlib/grains/bates.py":_,"./src/openmotor_py/motorlib/grains/cGrain.py":R,"./src/openmotor_py/motorlib/grains/conical.py":A,"./src/openmotor_py/motorlib/grains/custom.py":P,"./src/openmotor_py/motorlib/grains/dGrain.py":v,"./src/openmotor_py/motorlib/grains/endBurner.py":T,"./src/openmotor_py/motorlib/grains/finocyl.py":D,"./src/openmotor_py/motorlib/grains/moonBurner.py":x,"./src/openmotor_py/motorlib/grains/rodTube.py":S,"./src/openmotor_py/motorlib/grains/star.py":w,"./src/openmotor_py/motorlib/grains/xCore.py":F,"./src/openmotor_py/motorlib/motor.py":M,"./src/openmotor_py/motorlib/nozzle.py":N,"./src/openmotor_py/motorlib/propellant.py":V,"./src/openmotor_py/motorlib/properties.py":C,"./src/openmotor_py/motorlib/simResult.py":E,"./src/openmotor_py/motorlib/units.py":L});let p;async function k(){return p||(p=(async()=>{const n=await f();await n.loadPackage(["numpy","scipy"]);for(const[r,s]of Object.entries(G)){const e=`/openmotor_py/${r.replace("./src/openmotor_py/","")}`,t=e.substring(0,e.lastIndexOf("/"));n.FS.mkdirTree(t),n.FS.writeFile(e,s)}return await n.runPythonAsync(`
import sys
sys.path.insert(0, '/openmotor_py')
`),n})()),p}const z=`
import json
import traceback

result = {}
try:
    import motorlib.motor
    import motorlib.grains
    import motorlib.propellant

    tm = motorlib.motor.Motor()
    tc = motorlib.motor.MotorConfig()

    bg = motorlib.grains.BatesGrain()
    bg.setProperties({
        'diameter': 0.083058,
        'length': 0.1397,
        'coreDiameter': 0.05,
        'inhibitedEnds': 'Neither'
    })
    tm.grains.append(bg)
    bg.simulationSetup(tc)

    tm.nozzle.setProperties({
        'throat': 0.01428,
        'exit': 0.02,
        'efficiency': 0.95,
        'divAngle': 15,
        'convAngle': 45,
        'throatLength': 0.005,
        'slagCoeff': 0,
        'erosionCoeff': 0,
    })

    tm.propellant = motorlib.propellant.Propellant()
    tm.propellant.setProperties({
        'name': 'KNSU',
        'density': 1890,
        'tabs': [{
            'minPressure': 0,
            'maxPressure': 6895000,
            'a': 0.000101,
            'n': 0.319,
            't': 1720,
            'm': 41.98,
            'k': 1.133
        }]
    })

    kn0 = tm.calcKN([0], 0)
    p0 = tm.calcIdealPressure([0], 0)
    result['smoke'] = {
        'kn0': kn0,
        'pressure0': p0,
    }

    sim = tm.runSimulation()
    result['simulation'] = {
        'success': sim.success,
        'alerts': [a.description for a in sim.alerts],
        'burnTime': sim.getBurnTime() if sim.channels['time'].data else None,
        'peakPressure': sim.getMaxPressure() if sim.channels['pressure'].data else None,
        'impulse': sim.getImpulse() if sim.channels['force'].data else None,
        'designation': sim.getDesignation() if sim.channels['force'].data else None,
        'samples': len(sim.channels['time'].data),
    }

    sg = motorlib.grains.StarGrain()
    sg.setProperties({
        'diameter': 0.05,
        'length': 0.1,
        'numPoints': 6,
        'pointLength': 0.015,
        'pointWidth': 0.01,
        'inhibitedEnds': 'Both'
    })
    sg.simulationSetup(tc)
    result['fmm_probe'] = {
        'wallWeb': sg.wallWeb,
        'faceArea0': float(sg.getFaceArea(0)),
        'perimeter0': float(sg.getCorePerimeter(0)),
    }
except Exception as exc:
    result = {
        'error': str(exc),
        'traceback': traceback.format_exc(),
    }
json.dumps(result)
`;l.addEventListener("click",async()=>{l.disabled=!0,m.textContent="",a.textContent="Loading Pyodide and Python deps...";try{const n=await k();a.textContent="Running simulation...";const r=await n.runPythonAsync(z),s=JSON.parse(r);m.textContent=JSON.stringify(s,null,2),a.innerHTML=s.error?'<span class="err">Simulation failed.</span>':'<span class="ok">Simulation ran.</span>'}catch(n){m.textContent=String((n==null?void 0:n.stack)||n),a.innerHTML='<span class="err">Pyodide bootstrap failed.</span>'}finally{l.disabled=!1}});
