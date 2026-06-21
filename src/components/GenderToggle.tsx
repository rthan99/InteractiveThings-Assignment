import type { DogGenderFilter } from '../types/geo'

const OPTIONS: { value: DogGenderFilter; label: string }[] = [
  { value: 'both', label: 'Both' },
  { value: 'male', label: 'M' },
  { value: 'female', label: 'W' },
]

interface GenderToggleProps {
  value: DogGenderFilter
  onChange: (value: DogGenderFilter) => void
}

export function GenderToggle({ value, onChange }: GenderToggleProps) {
  return (
    <fieldset className="gender-toggle map-control">
      <legend className="gender-toggle-label">Dog gender</legend>
      <div className="gender-toggle-options" role="radiogroup" aria-label="Dog gender">
        {OPTIONS.map((option) => (
          <label key={option.value} className="gender-toggle-option">
            <input
              type="radio"
              name="dog-gender-filter"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
