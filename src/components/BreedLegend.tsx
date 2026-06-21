import { getBreedBorderColor, getBreedColor } from '../data/palette'

interface BreedLegendProps {
  breeds: string[]
}

export function BreedLegend({ breeds }: BreedLegendProps) {
  if (breeds.length === 0) {
    return null
  }

  return (
    <div className="breed-legend" aria-label="Top breed color legend">
      {breeds.map((breed) => {
        const color = getBreedColor(breed)
        return (
          <div key={breed} className="breed-legend-item">
            <span
              className="breed-legend-swatch"
              style={{
                backgroundColor: color,
                borderColor: getBreedBorderColor(breed),
              }}
            />
            <span>{breed}</span>
          </div>
        )
      })}
    </div>
  )
}
