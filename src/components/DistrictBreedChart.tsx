import { useMemo, useState } from 'react'
import { getBreedColor, PALETTE } from '../data/palette'
import { formatCount } from '../formatCount'
import type { BreedRank, DistrictDogStats } from '../types/geo'

const TOP_BREED_COUNT = 10
const OTHERS_LABEL = 'Others'

function shortenBreedName(breed: string): string {
  if (breed === OTHERS_LABEL) return OTHERS_LABEL
  return breed
    .replace('Mixed breed (small)', 'Mixed (small)')
    .replace('Mixed breed (large)', 'Mixed (large)')
    .replace('Mixed breed (unspecified size)', 'Mixed (unspecified)')
    .replace(' Retriever', '')
}

function buildDisplayedBreeds(breeds: BreedRank[]): BreedRank[] {
  if (breeds.length <= TOP_BREED_COUNT) return breeds

  const topBreeds = breeds.slice(0, TOP_BREED_COUNT)
  const othersCount = breeds.slice(TOP_BREED_COUNT).reduce((sum, entry) => sum + entry.count, 0)

  if (othersCount === 0) return topBreeds

  return [...topBreeds, { breed: OTHERS_LABEL, count: othersCount }]
}

function getBarColor(breed: string): string {
  if (breed === OTHERS_LABEL) return PALETTE.accentLight
  return getBreedColor(breed)
}

interface DistrictBreedChartProps {
  district: DistrictDogStats
}

export function DistrictBreedChart({ district }: DistrictBreedChartProps) {
  const [hoveredBreed, setHoveredBreed] = useState<string | null>(null)

  const displayedBreeds = useMemo(
    () => buildDisplayedBreeds(district.breeds),
    [district.breeds],
  )

  if (district.totalDogs === 0) {
    return <p className="district-breed-chart-empty">No dogs match the current filters</p>
  }

  const maxCount = displayedBreeds[0]?.count ?? 1

  return (
    <div className="district-breed-chart">
      <p className="district-breed-chart-summary">
        {formatCount(district.totalDogs)} dogs
      </p>
      <div className="district-breed-chart-list" aria-label="Breeds in district">
        {displayedBreeds.map(({ breed, count }) => (
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
                    backgroundColor: getBarColor(breed),
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
