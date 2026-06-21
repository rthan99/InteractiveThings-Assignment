interface MixedBreedToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function MixedBreedToggle({ checked, onChange }: MixedBreedToggleProps) {
  return (
    <label className="mixed-breed-toggle map-control">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="mixed-breed-toggle-switch" aria-hidden="true" />
      <span className="mixed-breed-toggle-label">Include mixed breeds (small &amp; large)</span>
    </label>
  )
}
