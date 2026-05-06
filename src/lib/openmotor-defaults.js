export const defaultMotor = {
  nozzle: { throat: 0.01428, exit: 0.02, efficiency: 0.95, divAngle: 15, convAngle: 45, throatLength: 0.005, slagCoeff: 0, erosionCoeff: 0 },
  propellant: { name: 'KNSU', density: 1890, tabs: [{ minPressure: 0, maxPressure: 6895000, a: 0.000101, n: 0.319, t: 1720, m: 41.98, k: 1.133 }] },
  grains: [{ type: 'BATES', properties: { diameter: 0.083058, length: 0.1397, coreDiameter: 0.05, inhibitedEnds: 'Neither' } }],
  config: { maxPressure: 70000000, maxMassFlux: 10000, maxMachNumber: 100, minPortThroat: 1, flowSeparationWarnPercent: 0.01, burnoutWebThres: 0.0000254, burnoutThrustThres: 0.01, timestep: 0.0001, ambPressure: 101325, mapDim: 401, sepPressureRatio: 0.4 }
}
export const grainTemplates = {
  BATES: { diameter: 0.083058, length: 0.1397, coreDiameter: 0.05, inhibitedEnds: 'Neither' },
  'Star Grain': { diameter: 0.05, length: 0.1, numPoints: 6, pointLength: 0.015, pointWidth: 0.01, inhibitedEnds: 'Both' },
  Finocyl: { diameter: 0.06, length: 0.12, numFins: 6, finWidth: 0.006, finLength: 0.012, coreDiameter: 0.02, invertedFins: false, inhibitedEnds: 'Both' },
  'Moon Burner': { diameter: 0.06, length: 0.12, coreDiameter: 0.02, coreOffset: 0.008, inhibitedEnds: 'Both' },
  'X Core': { diameter: 0.06, length: 0.12, slotWidth: 0.008, slotLength: 0.015, inhibitedEnds: 'Both' },
  'D Grain': { diameter: 0.06, length: 0.12, slotOffset: 0.0, inhibitedEnds: 'Both' },
  'C Grain': { diameter: 0.06, length: 0.12, slotWidth: 0.01, slotOffset: 0.0, inhibitedEnds: 'Both' },
  Conical: { diameter: 0.06, length: 0.12, forwardCoreDiameter: 0.015, aftCoreDiameter: 0.025, inhibitedEnds: 'Neither' },
  'End Burner': { diameter: 0.06, length: 0.12 }
}
