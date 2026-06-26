import { useEffect, useMemo, useRef, useState } from 'react'
import { MixedBreedToggle } from './MixedBreedToggle'
import type { AgeExtents, AgeFilters, AgeRange } from '../types/geo'
import { formatOwnerAgeGroupLabel, normalizeAgeRange } from '../data/parseDogData'

interface DiscreteDualRangeSliderProps {
  label: string
  range: AgeRange
  extents: AgeRange
  onChange: (range: AgeRange) => void
}

function buildSteps(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index)
}

function valueToPercent(value: number, min: number, max: number): number {
  if (max === min) return 0
  return ((value - min) / (max - min)) * 100
}

function snapValue(clientX: number, track: HTMLElement, extents: AgeRange): number {
  const rect = track.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  return Math.round(extents.min + ratio * (extents.max - extents.min))
}

function DiscreteDualRangeSlider({ label, range, extents, onChange }: DiscreteDualRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const rangeRef = useRef(range)
  const onChangeRef = useRef(onChange)
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null)
  rangeRef.current = range
  onChangeRef.current = onChange

  const steps = useMemo(() => buildSteps(extents.min, extents.max), [extents.min, extents.max])
  const minPercent = valueToPercent(range.min, extents.min, extents.max)
  const maxPercent = valueToPercent(range.max, extents.min, extents.max)

  const updateThumb = (thumb: 'min' | 'max', value: number) => {
    const current = rangeRef.current
    const next =
      thumb === 'min'
        ? normalizeAgeRange({ ...current, min: value }, extents)
        : normalizeAgeRange({ ...current, max: value }, extents)
    onChangeRef.current(next)
  }

  useEffect(() => {
    if (!activeThumb) return

    const handlePointerMove = (event: PointerEvent) => {
      const track = trackRef.current
      if (!track) return
      updateThumb(activeThumb, snapValue(event.clientX, track, extents))
    }

    const handlePointerUp = () => setActiveThumb(null)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [activeThumb, extents])

  const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('.discrete-range-thumb')) return

    const track = trackRef.current
    if (!track) return

    const value = snapValue(event.clientX, track, extents)
    const current = rangeRef.current
    const distanceToMin = Math.abs(value - current.min)
    const distanceToMax = Math.abs(value - current.max)
    updateThumb(distanceToMin <= distanceToMax ? 'min' : 'max', value)
  }

  const handleKeyDown = (thumb: 'min' | 'max') => (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const current = thumb === 'min' ? range.min : range.max
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      updateThumb(thumb, current - 1)
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      updateThumb(thumb, current + 1)
    }
  }

  return (
    <div className={`age-filter${label === 'Dog age' ? ' dog-age-filter' : ''}`}>
      <span className="age-filter-label">{label}</span>
      <div className="discrete-range">
        <div
          ref={trackRef}
          className="discrete-range-track"
          onPointerDown={handleTrackPointerDown}
        >
          <div className="discrete-range-line" />
          <div
            className="discrete-range-fill"
            style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
          />
          {steps.map((step) => {
            const inRange = step >= range.min && step <= range.max
            return (
              <span
                key={step}
                className={`discrete-range-dot${inRange ? ' discrete-range-dot--active' : ''}`}
                style={{ left: `${valueToPercent(step, extents.min, extents.max)}%` }}
              />
            )
          })}
          <button
            type="button"
            role="slider"
            className="discrete-range-thumb"
            style={{ left: `${minPercent}%`, zIndex: activeThumb === 'min' ? 4 : 3 }}
            aria-label={`${label} minimum`}
            aria-valuemin={extents.min}
            aria-valuemax={extents.max}
            aria-valuenow={range.min}
            onPointerDown={(event) => {
              event.stopPropagation()
              setActiveThumb('min')
            }}
            onKeyDown={handleKeyDown('min')}
          >
            {range.min}
          </button>
          <button
            type="button"
            role="slider"
            className="discrete-range-thumb"
            style={{ left: `${maxPercent}%`, zIndex: activeThumb === 'max' ? 4 : 3 }}
            aria-label={`${label} maximum`}
            aria-valuemin={extents.min}
            aria-valuemax={extents.max}
            aria-valuenow={range.max}
            onPointerDown={(event) => {
              event.stopPropagation()
              setActiveThumb('max')
            }}
            onKeyDown={handleKeyDown('max')}
          >
            {range.max}
          </button>
        </div>
      </div>
    </div>
  )
}

interface OwnerAgeGroupCheckboxesProps {
  groups: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  isMobile: boolean
}

function OwnerAgeGroupCheckboxes({
  groups,
  selected,
  onChange,
  isMobile,
}: OwnerAgeGroupCheckboxesProps) {
  const selectedSet = new Set(selected)
  const allSelected = groups.length > 0 && selected.length === groups.length

  const toggleGroup = (group: string) => {
    const next = selectedSet.has(group)
      ? selected.filter((value) => value !== group)
      : [...selected, group].sort((a, b) => Number(a.split('-')[0]) - Number(b.split('-')[0]))
    onChange(next)
  }

  const toggleAll = () => {
    onChange(allSelected ? [] : [...groups])
  }

  return (
    <div className="age-filter owner-age-filter">
      <div className="age-filter-header">
        <span className="age-filter-label">Owner age</span>
        <button type="button" className="age-filter-action" onClick={toggleAll}>
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      <div
        className={`owner-age-groups${isMobile ? ' owner-age-groups--mobile' : ''}`}
        role="group"
        aria-label="Owner age groups"
      >
        {groups.map((group) => (
          <label key={group} className="selection-chip owner-age-chip">
            <input
              type="checkbox"
              checked={selectedSet.has(group)}
              onChange={() => toggleGroup(group)}
            />
            <span title={`Ages ${group}`}>
              {group === '11-20' ? 'Under 20' : formatOwnerAgeGroupLabel(group)}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

interface FilterSlidersProps {
  filters: AgeFilters
  extents: AgeExtents
  ownerAgeGroups: string[]
  includeMixedBreeds: boolean
  isMobile: boolean
  onChange: (filters: AgeFilters) => void
  onIncludeMixedBreedsChange: (include: boolean) => void
}

export function FilterSliders({
  filters,
  extents,
  ownerAgeGroups,
  includeMixedBreeds,
  isMobile,
  onChange,
  onIncludeMixedBreedsChange,
}: FilterSlidersProps) {
  return (
    <div className="controls-columns">
        <div className="controls-section controls-section--owner">
          <OwnerAgeGroupCheckboxes
            groups={ownerAgeGroups}
            selected={filters.ownerAgeGroups}
            isMobile={isMobile}
            onChange={(ownerAgeGroupsSelection) =>
              onChange({
                ...filters,
                ownerAgeGroups: ownerAgeGroupsSelection,
              })
            }
          />
        </div>
        <div className="controls-section controls-section--dog">
          <DiscreteDualRangeSlider
            label="Dog age"
            range={filters.dogAge}
            extents={extents.dogAge}
            onChange={(dogAge) =>
              onChange({
                ...filters,
                dogAge: normalizeAgeRange(dogAge, extents.dogAge),
              })
            }
          />
        </div>
        <div className="controls-section controls-section--mixed">
          <MixedBreedToggle
            checked={includeMixedBreeds}
            onChange={onIncludeMixedBreedsChange}
          />
        </div>
    </div>
  )
}
