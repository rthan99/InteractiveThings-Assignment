interface MixedBreedToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function MixedBreedToggle({ checked, onChange }: MixedBreedToggleProps) {
  return (
    <div className="age-filter mixed-breed-filter">
      <span className="age-filter-label">Mixed breeds</span>
      <label className="mixed-breed-toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="mixed-breed-toggle-switch" aria-hidden="true" />
        <span className="mixed-breed-toggle-label">Include small &amp; large mixed breed dogs</span>
      </label>
    </div>
  )
}
