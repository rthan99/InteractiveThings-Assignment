import { useState } from 'react'
import { getBreedColor } from '../data/palette'
import { formatCount } from '../formatCount'
import type { DistrictDogStats } from '../types/geo'

function shortenBreedName(breed: string): string {
  return breed
    .replace('Mixed breed (small)', 'Mixed (small)')
    .replace('Mixed breed (large)', 'Mixed (large)')
    .replace('Mixed breed (unspecified size)', 'Mixed (unspecified)')
    .replace(' Retriever', '')
}

interface DistrictBreedChartProps {
  district: DistrictDogStats
}

export function DistrictBreedChart({ district }: DistrictBreedChartProps) {
  const [hoveredBreed, setHoveredBreed] = useState<string | null>(null)

  if (district.totalDogs === 0) {
    return <p className="district-breed-chart-empty">No dogs match the current filters</p>
  }

  const maxCount = district.breeds[0]?.count ?? 1

  return (
    <div className="district-breed-chart">
      <p className="district-breed-chart-summary">
        {formatCount(district.totalDogs)} dogs
      </p>
      <div className="district-breed-chart-list" aria-label="Breeds in district">
        {district.breeds.map(({ breed, count }) => (
          <div
            key={breed}
            className="district-breed-row"
            onMouseEnter={() => setHoveredBreed(breed)}
            onMouseLeave={() => setHoveredBreed(null)}
          >
            <span className="district-breed-label" title={breed}>
              {shortenBreedName(breed)}
            </span>
            <div className="district-breed-bar">
              {hoveredBreed === breed && (
                <span className="district-breed-count">{formatCount(count)}</span>
              )}
              <div className="district-breed-track">
                <div
                  className="district-breed-fill"
                  style={{
                    width: `${(count / maxCount) * 100}%`,
                    backgroundColor: getBreedColor(breed),
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
