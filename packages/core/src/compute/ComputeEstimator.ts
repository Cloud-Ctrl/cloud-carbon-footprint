/*
 * © 2021 Thoughtworks, Inc.
 */

import {
  estimateCo2,
  FootprintEstimate,
  IFootprintEstimator,
  CloudConstantsEmissionsFactors,
  CloudConstants,
} from '../.'
import {
  Logger,
} from '@cloud-carbon-footprint/common'
import { ComputeUsage } from '.'

//averageCPUUtilization expected to be in percentage
const ENERGY_ESTIMATION_FORMULA = (
  averageCPUUtilization: number,
  virtualCPUHours: number,
  minWatts: number,
  maxWatts: number,
  powerUsageEffectiveness: number,
  replicationFactor = 1,
  averageWatts?: number,
) => {
  const calculatedAverageWatts = averageWatts
    ? averageWatts
    : minWatts + (averageCPUUtilization / 100) * (maxWatts - minWatts)
  return (
    (calculatedAverageWatts *
      virtualCPUHours *
      powerUsageEffectiveness *
      replicationFactor) /
    1000
  )
}

export default class ComputeEstimator implements IFootprintEstimator {
  private estimateLogger: Logger;
  estimate(
    data: ComputeUsage[],
    region: string,
    emissionsFactors: CloudConstantsEmissionsFactors,
    constants: CloudConstants,
  ): FootprintEstimate[] {
    this.estimateLogger = new Logger('Estimate')
    return data.map((usage) => {
      const estimatedKilowattHours = ENERGY_ESTIMATION_FORMULA(
        usage.cpuUtilizationAverage,
        usage.vCpuHours,
        constants.minWatts,
        constants.maxWatts,
        constants.powerUsageEffectiveness,
        constants.replicationFactor,
        constants.averageWatts,
      )

      if(region == 'Unknown')
      {
        this.estimateLogger.info(
          `Using unknown emissions factor: ${(emissionsFactors[region] || emissionsFactors['Unknown'])}`,)
      }

      const estimatedCO2Emissions = estimateCo2(
        estimatedKilowattHours,
        region,
        emissionsFactors,
      )
      return {
        timestamp: usage.timestamp,
        kilowattHours: estimatedKilowattHours,
        co2e: estimatedCO2Emissions,
        usesAverageCPUConstant: usage.usesAverageCPUConstant,
      }
    })
  }
}
