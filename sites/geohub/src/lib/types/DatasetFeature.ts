import type { Tag } from './Tag'

export interface DatasetFeature {
  type: 'Feature'
  geometry: {
    type: string
    coordinates: [number, number] | [number, number][] | [number, number][][]
  }
  properties: {
    id: string
    url: string
    name: string
    description: string
    is_raster: boolean
    license?: string
    createdat?: string
    updatedat?: string
    tags?: Tag[]
    no_stars?: number
    is_star?: boolean
  }
}