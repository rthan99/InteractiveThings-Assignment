interface MixedBreedToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function MixedBreedToggle({ checked, onChange }: MixedBreedToggleProps) {
  return (
    <label className="selection-chip mixed-breed-chip">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>Include mixed breeds</span>
    </label>
  )
}
