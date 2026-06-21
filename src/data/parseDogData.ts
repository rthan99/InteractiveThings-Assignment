import type {
  AgeExtents,
  AgeFilters,
  AgeRange,
  DistrictDogStats,
  DogDataset,
  DogRecord,
} from '../types/geo'

function parseOwnerAgeGroup(group: string): { label: string } | null {
  const match = group.match(/^(\d+)-(\d+)$/)
  if (!match) return null
  return { label: group }
}

function parseCsv(text: string): {
  breedPrimary: string
  district: number
  dogBirthYear: number
  ownerAgeGroup: string
}[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((header) => header.trim())
  const records: {
    breedPrimary: string
    district: number
    dogBirthYear: number
    ownerAgeGroup: string
  }[] = []

  for (const line of lines.slice(1)) {
    const values = line.split(',')
    if (values.length < headers.length) continue

    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? '']))
    const district = Number(row.district)
    const breedPrimary = row.breed_primary
    const ownerAgeGroup = parseOwnerAgeGroup(row.owner_age_group)
    const dogBirthYear = row.dog_birth_year ? Number(row.dog_birth_year) : null

    if (
      !Number.isInteger(district) ||
      district < 1 ||
      district > 12 ||
      !breedPrimary ||
      ownerAgeGroup === null ||
      dogBirthYear === null ||
      !Number.isFinite(dogBirthYear)
    ) {
      continue
    }

    records.push({
      district,
      breedPrimary,
      dogBirthYear,
      ownerAgeGroup: ownerAgeGroup.label,
    })
  }

  return records
}

function computeAgeExtents(records: DogRecord[]): AgeExtents {
  if (records.length === 0) {
    return { dogAge: { min: 0, max: 0 } }
  }

  return {
    dogAge: {
      min: Math.min(...records.map((record) => record.dogAge)),
      max: Math.max(...records.map((record) => record.dogAge)),
    },
  }
}

function computeOwnerAgeGroups(records: DogRecord[]): string[] {
  return [...new Set(records.map((record) => record.ownerAgeGroup))].sort(
    (a, b) => Number(a.split('-')[0]) - Number(b.split('-')[0]),
  )
}

export function normalizeAgeRange(range: AgeRange, extents: AgeRange): AgeRange {
  const min = Math.round(Math.max(extents.min, Math.min(range.min, range.max)))
  const max = Math.round(Math.min(extents.max, Math.max(range.min, range.max)))
  return { min, max }
}

function isMixedBreed(breed: string): boolean {
  return breed.startsWith('Mixed breed')
}

export function filterMixedBreeds(records: DogRecord[], includeMixedBreeds: boolean): DogRecord[] {
  if (includeMixedBreeds) return records
  return records.filter((record) => !isMixedBreed(record.breedPrimary))
}

function buildDogDataset(csvText: string): DogDataset {
  const parsed = parseCsv(csvText)
  const referenceYear = parsed.length
    ? Math.max(...parsed.map((record) => record.dogBirthYear))
    : new Date().getFullYear()

  const records: DogRecord[] = parsed.map((record) => ({
    district: record.district,
    breedPrimary: record.breedPrimary,
    ownerAgeGroup: record.ownerAgeGroup,
    dogAge: referenceYear - record.dogBirthYear,
  }))

  return {
    records,
    referenceYear,
    ageExtents: computeAgeExtents(records),
    ownerAgeGroups: computeOwnerAgeGroups(records),
    totalRecords: records.length,
  }
}

export function filterRecords(records: DogRecord[], filters: AgeFilters): DogRecord[] {
  const selectedGroups = new Set(filters.ownerAgeGroups)

  return records.filter(
    (record) =>
      record.dogAge >= filters.dogAge.min &&
      record.dogAge <= filters.dogAge.max &&
      selectedGroups.has(record.ownerAgeGroup),
  )
}

export function computeDistrictStats(records: DogRecord[]): DistrictDogStats[] {
  const breedCounts = new Map<number, Map<string, number>>()
  const totalDogs = new Map<number, number>()

  for (const record of records) {
    const districtCounts = breedCounts.get(record.district) ?? new Map<string, number>()
    districtCounts.set(record.breedPrimary, (districtCounts.get(record.breedPrimary) ?? 0) + 1)
    breedCounts.set(record.district, districtCounts)
    totalDogs.set(record.district, (totalDogs.get(record.district) ?? 0) + 1)
  }

  return Array.from({ length: 12 }, (_, index) => {
    const id = index + 1
    const counts = breedCounts.get(id) ?? new Map<string, number>()
    const rankedBreeds = [...counts.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
    const [topBreed = 'No data', topBreedCount = 0] = rankedBreeds[0] ?? []
    const breeds = rankedBreeds.map(([breed, count]) => ({ breed, count }))

    return {
      id,
      label: `Kreis ${id}`,
      topBreed,
      topBreedCount,
      breeds,
      totalDogs: totalDogs.get(id) ?? 0,
    }
  })
}

export function createDefaultFilters(dataset: DogDataset): AgeFilters {
  return {
    dogAge: { ...dataset.ageExtents.dogAge },
    ownerAgeGroups: [...dataset.ownerAgeGroups],
  }
}

export async function loadDogDataset(): Promise<DogDataset> {
  const response = await fetch('/data/dog_owners_zurich_clean_en.csv')
  if (!response.ok) throw new Error('Could not load dog owner data')
  const csvText = await response.text()
  return buildDogDataset(csvText)
}
