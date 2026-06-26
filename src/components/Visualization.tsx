import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BreedLegend } from './BreedLegend'
import { DistrictBreedChart } from './DistrictBreedChart'
import { FilterSliders } from './FilterSliders'
import { ZurichMap } from './ZurichMap'
import {
  computeDistrictStats,
  createDefaultFilters,
  filterRecords,
  filterMixedBreeds,
  loadDogDataset,
} from '../data/parseDogData'
import { formatCount } from '../formatCount'
import { useIsMobile } from '../hooks/useIsMobile'
import { computePopupPosition } from '../utils/popupPosition'
import type {
  AgeFilters,
  DistrictCollection,
  DistrictFeature,
  DogDataset,
  DistrictDogStats,
} from '../types/geo'

const TITLE = 'Dogs of Zurich'
const SUBTITLE_INTRO = 'Zurich has 12 districts, or formally known as "Kreise".'
const SUBTITLE_DETAIL =
  'As you explore this map, each district will show its most common breed.'

const MOBILE_DETAIL_PANEL_MS = 420

interface DistrictState {
  district: DistrictFeature
  x: number
  y: number
}

interface DistrictDetailBodyProps {
  stats: DistrictDogStats
  showClose?: boolean
  onClose?: () => void
}

function DistrictDetailBody({ stats, showClose = false, onClose }: DistrictDetailBodyProps) {
  return (
    <>
      <div className="district-popup-header">
        <div className="district-popup-title">
          <strong>{stats.label}</strong>
          {stats.totalDogs > 0 && (
            <span className="district-popup-dog-count">
              {formatCount(stats.totalDogs)} dogs
            </span>
          )}
        </div>
        {showClose && onClose && (
          <button
            type="button"
            className="district-popup-close"
            aria-label="Close district details"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>
      <DistrictBreedChart district={stats} />
    </>
  )
}

export function Visualization() {
  const isMobile = useIsMobile()
  const [geojson, setGeojson] = useState<DistrictCollection | null>(null)
  const [dataset, setDataset] = useState<DogDataset | null>(null)
  const [filters, setFilters] = useState<AgeFilters | null>(null)
  const [includeMixedBreeds, setIncludeMixedBreeds] = useState(true)
  const [hovered, setHovered] = useState<DistrictState | null>(null)
  const [selected, setSelected] = useState<DistrictState | null>(null)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [mobilePanelStats, setMobilePanelStats] = useState<DistrictDogStats | null>(null)
  const [popupPosition, setPopupPosition] = useState<{ left: number; top: number } | null>(null)
  const mapMainRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/data/stadtkreise.geojson').then((response) => {
        if (!response.ok) throw new Error('Could not load district boundaries')
        return response.json() as Promise<DistrictCollection>
      }),
      loadDogDataset(),
    ])
      .then(([geoData, dogData]) => {
        setGeojson(geoData)
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

  const filteredRecords = useMemo(
    () => filterMixedBreeds(ageFilteredRecords, includeMixedBreeds),
    [ageFilteredRecords, includeMixedBreeds],
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

  const activePopup = isMobile ? selected : (selected ?? hovered)

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

  const clearDistrictSelection = () => {
    setSelected(null)
    setHovered(null)
  }

  const handleDistrictSelect = (
    district: DistrictFeature | null,
    position: { x: number; y: number } | null,
  ) => {
    if (!district || !position) return

    if (selected?.district.properties.name === district.properties.name) {
      clearDistrictSelection()
      return
    }

    setSelected({
      district,
      x: position.x,
      y: position.y,
    })
    setHovered(null)
  }

  useEffect(() => {
    if (!isMobile) {
      setMobilePanelOpen(false)
      setMobilePanelStats(null)
      return
    }

    if (selected && activeStats) {
      setMobilePanelStats(activeStats)
      const frame = requestAnimationFrame(() => setMobilePanelOpen(true))
      return () => cancelAnimationFrame(frame)
    }

    setMobilePanelOpen(false)
  }, [activeStats, isMobile, selected])

  useEffect(() => {
    if (!isMobile || mobilePanelOpen || !mobilePanelStats) return
    const timeout = window.setTimeout(() => setMobilePanelStats(null), MOBILE_DETAIL_PANEL_MS)
    return () => window.clearTimeout(timeout)
  }, [isMobile, mobilePanelOpen, mobilePanelStats])

  useEffect(() => {
    if (!selected) return

    const handleClickOutside = () => {
      clearDistrictSelection()
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [selected])

  useLayoutEffect(() => {
    if (isMobile || !activePopup || !mapMainRef.current) {
      setPopupPosition(null)
      return
    }

    const main = mapMainRef.current
    const mapEl = main.querySelector('.map-container') as HTMLElement | null
    const bounds = mapEl ?? main
    const offsetLeft = mapEl?.offsetLeft ?? 0
    const offsetTop = mapEl?.offsetTop ?? 0

    const updatePosition = () => {
      const margin = isMobile ? 12 : 8
      const popupWidth = Math.min(isMobile ? 280 : 340, bounds.clientWidth - margin * 2)
      const popupHeight = popupRef.current?.offsetHeight ?? 200

      const position = computePopupPosition({
        anchorX: activePopup.x,
        anchorY: activePopup.y,
        containerWidth: bounds.clientWidth,
        containerHeight: bounds.clientHeight,
        popupWidth,
        popupHeight,
        margin,
      })

      setPopupPosition({
        left: offsetLeft + position.left,
        top: offsetTop + position.top,
      })
    }

    updatePosition()

    const popupElement = popupRef.current
    const resizeObserver =
      popupElement && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updatePosition)
        : null
    if (popupElement && resizeObserver) {
      resizeObserver.observe(popupElement)
    }
    window.addEventListener('resize', updatePosition)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updatePosition)
    }
  }, [activePopup, activeStats, isMobile, selected])

  return (
    <div className={`visualization${isMobile ? ' visualization--mobile' : ''}`}>
      <header className="visualization-header">
        <h1>{TITLE}</h1>
        <p>
          {SUBTITLE_INTRO}
          <br />
          {SUBTITLE_DETAIL}
        </p>
        {dataset && (
          <p className="visualization-data-note">
            This dataset is based on {formatCount(dataset.totalRecords)} registered dogs recorded in{' '}
            {dataset.referenceYear}.
          </p>
        )}
      </header>

      {error && <p className="error">{error}</p>}
      {loading && !error && <p className="loading">Loading map…</p>}

      {geojson && dataset && filters && (
        <section className="map-section" aria-label="District map">
          <img
            src="/Dogsilhouette.png"
            alt=""
            className="map-dog-silhouette"
            aria-hidden="true"
          />
          <div className="map-main" ref={mapMainRef}>
            <aside className="map-legend-panel">
              <BreedLegend breeds={legendBreeds} />
            </aside>
            <ZurichMap
              geojson={geojson}
              districtStats={districtStats}
              selectedDistrictId={selected?.district.properties.name ?? null}
              enableHover={!isMobile}
              onHover={handleDistrictHover}
              onSelect={handleDistrictSelect}
            />
            {filteredRecords.length === 0 && (
              <div className="map-empty-state" role="status">
                No dogs match the current filters. Adjust the filters or mixed breed setting
                below.
              </div>
            )}
            {!isMobile && activeStats && activePopup && (
              <div
                ref={popupRef}
                className={`district-popup${selected ? ' district-popup--pinned' : ''}`}
                style={{
                  left: popupPosition?.left ?? activePopup.x + 14,
                  top: popupPosition?.top ?? activePopup.y + 14,
                  width: 'min(340px, calc(100% - 1rem))',
                }}
                role={selected ? 'dialog' : 'tooltip'}
                aria-label={`${activeStats.label} breed breakdown`}
                onClick={(event) => event.stopPropagation()}
              >
                <DistrictDetailBody
                  stats={activeStats}
                  showClose={Boolean(selected)}
                  onClose={clearDistrictSelection}
                />
              </div>
            )}
          </div>

          {isMobile && mobilePanelStats && (
            <div
              className={`district-detail-panel${mobilePanelOpen ? ' district-detail-panel--visible' : ''}`}
              aria-hidden={!mobilePanelOpen}
            >
              <div className="district-detail-panel__inner">
                <div
                  className="district-detail-panel__content"
                  role="dialog"
                  aria-label={`${mobilePanelStats.label} breed breakdown`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <DistrictDetailBody
                    stats={mobilePanelStats}
                    showClose
                    onClose={clearDistrictSelection}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="controls-panel" aria-label="Filters">
            <FilterSliders
              filters={filters}
              extents={dataset.ageExtents}
              ownerAgeGroups={dataset.ownerAgeGroups}
              includeMixedBreeds={includeMixedBreeds}
              isMobile={isMobile}
              onChange={setFilters}
              onIncludeMixedBreedsChange={setIncludeMixedBreeds}
            />
          </div>
        </section>
      )}
    </div>
  )
}
