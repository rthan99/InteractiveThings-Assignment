import { useEffect, useMemo, useState } from 'react'
import { BreedLegend } from './BreedLegend'
import { GenderToggle } from './GenderToggle'
import { MixedBreedToggle } from './MixedBreedToggle'
import { DistrictBreedChart } from './DistrictBreedChart'
import { FilterSliders } from './FilterSliders'
import { ZurichMap } from './ZurichMap'
import {
  computeDistrictStats,
  createDefaultFilters,
  filterRecords,
  filterByGender,
  filterMixedBreeds,
  loadDogDataset,
} from '../data/parseDogData'
import { formatCount } from '../formatCount'
import type {
  AgeFilters,
  DistrictCollection,
  DistrictFeature,
  DogDataset,
  DogGenderFilter,
  LakeCollection,
} from '../types/geo'

const TITLE = 'Dogs of Zurich'
const SUBTITLE =
  'Zurich has 12 districts, or more locally known as "Kreise". As you explore this map, each district will show its most common breed.'

interface DistrictState {
  district: DistrictFeature
  x: number
  y: number
}

export function Visualization() {
  const [geojson, setGeojson] = useState<DistrictCollection | null>(null)
  const [lakeGeojson, setLakeGeojson] = useState<LakeCollection | null>(null)
  const [dataset, setDataset] = useState<DogDataset | null>(null)
  const [filters, setFilters] = useState<AgeFilters | null>(null)
  const [includeMixedBreeds, setIncludeMixedBreeds] = useState(true)
  const [genderFilter, setGenderFilter] = useState<DogGenderFilter>('both')
  const [hovered, setHovered] = useState<DistrictState | null>(null)
  const [selected, setSelected] = useState<DistrictState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/data/stadtkreise.geojson').then((response) => {
        if (!response.ok) throw new Error('Could not load district boundaries')
        return response.json() as Promise<DistrictCollection>
      }),
      fetch('/data/zurichsee.geojson').then((response) => {
        if (!response.ok) throw new Error('Could not load lake geometry')
        return response.json() as Promise<LakeCollection>
      }),
      loadDogDataset(),
    ])
      .then(([geoData, lakeData, dogData]) => {
        setGeojson(geoData)
        setLakeGeojson(lakeData)
        setDataset(dogData)
        setFilters(createDefaultFilters(dogData))
      })
      .catch((fetchError: Error) => setError(fetchError.message))
      .finally(() => setLoading(false))
  }, [])

  const ageFilteredRecords = useMemo(() => {
    if (!dataset || !filters) return []
    return filterRecords(dataset.records, filters)
  }, [dataset, filters])

  const genderFilteredRecords = useMemo(
    () => filterByGender(ageFilteredRecords, genderFilter),
    [ageFilteredRecords, genderFilter],
  )

  const filteredRecords = useMemo(
    () => filterMixedBreeds(genderFilteredRecords, includeMixedBreeds),
    [genderFilteredRecords, includeMixedBreeds],
  )

  const districtStats = useMemo(
    () => computeDistrictStats(filteredRecords),
    [filteredRecords],
  )

  const legendBreeds = useMemo(
    () =>
      [...new Set(
        districtStats
          .filter((district) => district.totalDogs > 0 && district.topBreed !== 'No data')
          .map((district) => district.topBreed),
      )].sort((a, b) => a.localeCompare(b)),
    [districtStats],
  )

  const activePopup = selected ?? hovered

  const activeStats = activePopup
    ? districtStats.find((district) => district.id === activePopup.district.properties.name)
    : undefined

  const handleDistrictHover = (
    district: DistrictFeature | null,
    position: { x: number; y: number } | null,
  ) => {
    if (district && position) {
      setHovered({ district, x: position.x, y: position.y })
      return
    }
    setHovered(null)
  }

  const handleDistrictSelect = (
    district: DistrictFeature | null,
    position: { x: number; y: number } | null,
  ) => {
    if (!district || !position) return

    setSelected({ district, x: position.x, y: position.y })
    setHovered(null)
  }

  useEffect(() => {
    if (!selected) return

    const handleClickOutside = () => {
      setSelected(null)
      setHovered(null)
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [selected])

  return (
    <div className="visualization">
      <header className="visualization-header">
        <h1>{TITLE}</h1>
        <p>{SUBTITLE}</p>
        {dataset && (
          <p className="visualization-data-note">
            Based on {formatCount(dataset.totalRecords)} registered dogs recorded in{' '}
            {dataset.referenceYear}.
          </p>
        )}
      </header>

      {error && <p className="error">{error}</p>}
      {loading && !error && <p className="loading">Loading map…</p>}

      {geojson && dataset && filters && (
        <section className="map-section" aria-label="District map">
          <div className="map-main">
            <div className="map-controls">
              <GenderToggle value={genderFilter} onChange={setGenderFilter} />
              <MixedBreedToggle checked={includeMixedBreeds} onChange={setIncludeMixedBreeds} />
            </div>
            <ZurichMap
              geojson={geojson}
              lakeGeojson={lakeGeojson?.features[0] ?? null}
              districtStats={districtStats}
              selectedDistrictId={selected?.district.properties.name ?? null}
              onHover={handleDistrictHover}
              onSelect={handleDistrictSelect}
            />
            {filteredRecords.length === 0 && (
              <div className="map-empty-state" role="status">
                No dogs match the current filters. Adjust the filters, gender, mixed breed setting, or reset
                filters below.
              </div>
            )}
            {activeStats && activePopup && (
              <div
                className={`district-popup${selected ? ' district-popup--pinned' : ''}`}
                style={{ left: activePopup.x + 14, top: activePopup.y + 14 }}
                role={selected ? 'dialog' : 'tooltip'}
                aria-label={`${activeStats.label} breed breakdown`}
                onClick={(event) => event.stopPropagation()}
              >
                <strong>{activeStats.label}</strong>
                <DistrictBreedChart district={activeStats} />
              </div>
            )}
          </div>

          <BreedLegend breeds={legendBreeds} />
          <FilterSliders
            filters={filters}
            extents={dataset.ageExtents}
            ownerAgeGroups={dataset.ownerAgeGroups}
            matchedCount={filteredRecords.length}
            onChange={setFilters}
            onReset={() => setFilters(createDefaultFilters(dataset))}
          />
        </section>
      )}
    </div>
  )
}
