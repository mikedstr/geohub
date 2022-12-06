import type { RequestHandler } from './$types'
import { generateMetadataJson, getMartinTileJson, getPgtileservTileJson } from '$lib/helper'
import { error } from '@sveltejs/kit'
import type { TileJson, VectorTileMetadata } from '$lib/types'
import { PUBLIC_MARTIN_API_ENDPOINT, PUBLIC_PGTILESERV_API_ENDPOINT } from '$lib/variables/public'

/**
 * /[source]/tile.json?table={tablename}
 * @param params.source source name either pgtileserv or martin
 * @param params.table schemaname and table name (e.g., zambia.poverty)
 * @returns return TileJSON v3.0.0 (https://github.com/mapbox/tilejson-spec/tree/master/3.0.0)
 */
export const GET: RequestHandler = async ({ params, url }) => {
  const source = params.source
  const table = url.searchParams.get('table')
  const type = url.searchParams.get('type')

  if (!table) {
    throw error(400, { message: `Missing table parameter` })
  }

  let tilejson: TileJson
  let metadatajson: VectorTileMetadata
  switch (source) {
    case 'martin':
      tilejson = await getMartinTileJson(table, PUBLIC_MARTIN_API_ENDPOINT)
      break
    case 'pgtileserv':
      tilejson = await getPgtileservTileJson(table, type, PUBLIC_PGTILESERV_API_ENDPOINT)
      if (tilejson.vector_layers.length === 0) {
        metadatajson = await generateMetadataJson(tilejson, url.origin)
        tilejson.vector_layers = metadatajson.json.vector_layers
        tilejson.geometrytype = metadatajson.json.tilestats.layers[0].geometry
      }
      break
    default:
      throw error(400, { message: `Invalid source parameter.` })
  }

  return new Response(JSON.stringify(tilejson))
}
