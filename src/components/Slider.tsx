type Props = { value: number; min: number; max: number; step?: number; label: string; onChange: (v: number) => void; valueText?: string }

export function Slider({ value, min, max, step = 0.01, label, onChange, valueText }: Props) {
  return (
    <input
      className="slider"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      aria-valuetext={valueText}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )
}
