function channel(value: string): number {
  return Number.parseInt(value, 16)
}

function getLuminance(hex: string): number {
  const normalized = hex.replace('#', '')
  const red = channel(normalized.slice(0, 2)) / 255
  const green = channel(normalized.slice(2, 4)) / 255
  const blue = channel(normalized.slice(4, 6)) / 255

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export const PALETTE = {
  white: '#FFFFFF',
  accent: '#268BCC',
  accentDark: '#1A5F8A',
  accentLight: '#B8D9EF',
} as const

export const BREED_PALETTE = [
  '#268BCC',
  '#E63946',
  '#F4A261',
  '#2A9D8F',
  '#8338EC',
  '#FB8500',
  '#06A77D',
  '#BC4749',
  '#457B9D',
  '#FFB703',
  '#7209B7',
  '#0096C7',
  '#EF476F',
  '#52B788',
  '#6A040F',
  '#073B4C',
  '#B5179E',
  '#4CC9F0',
  '#8AC926',
  '#FF006E',
  '#3A0CA3',
  '#E9C46A',
  '#118AB2',
  '#606C38',
] as const

export const BREED_COLORS: Record<string, string> = {
  'Mixed breed (small)': '#66CCEE',
  'Mixed breed (large)': '#4477AA',
  'Mixed breed (unspecified size)': '#999999',
  Chihuahua: '#EE6677',
  'Labrador Retriever': '#228833',
  'French Bulldog': '#CCBB44',
  'Yorkshire Terrier': '#AA3377',
  'Jack Russel Terrier': '#EE7733',
  Maltese: '#44AA99',
  'Golden Retriever': '#FFB703',
  Dachshund: '#BC6C25',
  'German Shepherd': '#332288',
  'Pomeranian (Zwergspitz)': '#F72585',
  'Border Collie': '#06A77D',
  Beagle: '#D4A373',
  Poodle: '#4895EF',
  'Shih Tzu': '#C77DFF',
  Boxer: '#9D0208',
  'No data': '#E8F4FC',
}

function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

export function getBreedColor(breed: string): string {
  if (BREED_COLORS[breed]) return BREED_COLORS[breed]
  return BREED_PALETTE[hashString(breed) % BREED_PALETTE.length]
}

export function getContrastColor(fill: string): string {
  return getLuminance(fill) > 0.62 ? PALETTE.accentDark : PALETTE.white
}

export function getBreedBorderColor(breed: string): string {
  const color = getBreedColor(breed)
  return getLuminance(color) > 0.62 ? PALETTE.accent : color
}
