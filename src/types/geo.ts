export interface DistrictProperties {
  bezeichnung: string
  name: number
  objectid: number
  objid: string
  entstehung: string
}

export interface DistrictFeature {
  type: 'Feature'
  geometry: {
    type: string
    coordinates: number[][][] | number[][][][]
  }
  properties: DistrictProperties
}

export interface DistrictCollection {
  type: 'FeatureCollection'
  features: DistrictFeature[]
}

export interface AgeRange {
  min: number
  max: number
}

export interface AgeFilters {
  dogAge: AgeRange
  ownerAgeGroups: string[]
}

export type DogSex = 'male' | 'female'

export type DogGenderFilter = 'both' | DogSex

export interface DogRecord {
  district: number
  breedPrimary: string
  ownerAgeGroup: string
  dogAge: number
  gender: DogSex
}

export interface AgeExtents {
  dogAge: AgeRange
}

export interface BreedRank {
  breed: string
  count: number
}

export interface DistrictDogStats {
  id: number
  label: string
  topBreed: string
  topBreedCount: number
  breeds: BreedRank[]
  totalDogs: number
}

export interface DogDataset {
  records: DogRecord[]
  referenceYear: number
  ageExtents: AgeExtents
  ownerAgeGroups: string[]
  totalRecords: number
}
