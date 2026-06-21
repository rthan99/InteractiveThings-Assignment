import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { GeoPermissibleObjects } from 'd3'
import { getBreedColor, getContrastColor, PALETTE } from '../data/palette'
import type { DistrictCollection, DistrictDogStats, DistrictFeature } from '../types/geo'

function asGeoObject(value: DistrictCollection | DistrictFeature): GeoPermissibleObjects {
  return value as unknown as GeoPermissibleObjects
}

interface ZurichMapProps {
  geojson: DistrictCollection
  districtStats: DistrictDogStats[]
  selectedDistrictId: number | null
  onHover: (district: DistrictFeature | null, position: { x: number; y: number } | null) => void
  onSelect: (district: DistrictFeature | null, position: { x: number; y: number } | null) => void
}

export function ZurichMap({ geojson, districtStats, selectedDistrictId, onHover, onSelect }: ZurichMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const onHoverRef = useRef(onHover)
  const onSelectRef = useRef(onSelect)
  const selectedDistrictIdRef = useRef(selectedDistrictId)
  onHoverRef.current = onHover
  onSelectRef.current = onSelect
  selectedDistrictIdRef.current = selectedDistrictId

  useEffect(() => {
    const container = containerRef.current
    const svgElement = svgRef.current
    if (!container || !svgElement) return

    const statsById = new Map(districtStats.map((district) => [district.id, district]))

    const getDistrictFill = (districtId: number) => {
      const stats = statsById.get(districtId)
      if (!stats || stats.totalDogs === 0) return getBreedColor('No data')
      return getBreedColor(stats.topBreed)
    }

    const getPosition = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
    }

    const setHighlight = (districtId: number | null) => {
      const activeId = districtId ?? selectedDistrictIdRef.current
      d3.select(svgElement)
        .selectAll<SVGPathElement, DistrictFeature>('path.district')
        .attr('opacity', (feature) =>
          activeId === null || feature.properties.name === activeId ? 1 : 0.45,
        )
    }

    const render = () => {
      const width = container.clientWidth
      const height = container.clientHeight || Math.min(window.innerHeight * 0.85, width * 0.9)
      if (width <= 0 || height <= 0) return

      const svg = d3.select(svgElement)
      svg.selectAll('*').remove()
      svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height)

      const projection = d3
        .geoMercator()
        .fitExtent(
          [
            [24, 24],
            [width - 24, height - 24],
          ],
          asGeoObject(geojson),
        )

      const path = d3.geoPath().projection(projection)
      const root = svg.append('g').attr('class', 'districts')

      root
        .selectAll('path')
        .data(geojson.features)
        .join('path')
        .attr('class', 'district')
        .attr('d', (feature) => path(asGeoObject(feature)) ?? '')
        .attr('fill', (feature) => getDistrictFill(feature.properties.name))
        .attr('stroke', PALETTE.white)
        .attr('stroke-width', 0.75)
        .attr('cursor', 'pointer')
        .attr('opacity', 1)
        .on('mouseenter', function (event, feature) {
          d3.select(this).attr('stroke-width', 1.25)
          setHighlight(feature.properties.name)
          onHoverRef.current(feature, getPosition(event))
        })
        .on('mousemove', function (event, feature) {
          onHoverRef.current(feature, getPosition(event))
        })
        .on('mouseleave', function () {
          d3.select(this).attr('stroke-width', 0.75)
          setHighlight(selectedDistrictIdRef.current)
          onHoverRef.current(null, null)
        })
        .on('click', function (event, feature) {
          event.stopPropagation()
          onSelectRef.current(feature, getPosition(event))
        })

      root
        .selectAll('text.district-number')
        .data(geojson.features)
        .join('text')
        .attr('class', 'district-number')
        .attr('transform', (feature) => {
          const centroid = path.centroid(asGeoObject(feature))
          return `translate(${centroid[0]}, ${centroid[1]})`
        })
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('pointer-events', 'none')
        .attr('font-size', width > 560 ? 13 : 11)
        .attr('font-weight', 700)
        .attr('fill', (feature) => getContrastColor(getDistrictFill(feature.properties.name)))
        .text((feature) => String(feature.properties.name))

      setHighlight(selectedDistrictIdRef.current)
    }

    render()
    requestAnimationFrame(render)

    const observer = new ResizeObserver(render)
    observer.observe(container)

    const handleContainerLeave = (event: MouseEvent) => {
      const related = event.relatedTarget as Node | null
      if (related && container.parentElement?.contains(related)) return
      setHighlight(selectedDistrictIdRef.current)
      onHoverRef.current(null, null)
    }
    container.addEventListener('mouseleave', handleContainerLeave)

    return () => {
      observer.disconnect()
      container.removeEventListener('mouseleave', handleContainerLeave)
    }
  }, [geojson, districtStats, selectedDistrictId])

  return (
    <div ref={containerRef} className="map-container">
      <svg ref={svgRef} role="img" aria-label="Map of Zurich districts colored by top dog breed" />
    </div>
  )
}
