import type { RequestHandler } from './$types'
import { error } from '@sveltejs/kit'
import pkg from 'pg'
const { Pool } = pkg

import { DATABASE_CONNECTION } from '$lib/server/variables/private'
import type { DashboardMapStyle, Pages, StacLink } from '$lib/types'
import { getStyleCount, pageNumber } from '$lib/server/helpers'
const connectionString = DATABASE_CONNECTION

/**
 * Get the list of saved style from PostGIS database
 * GET: ./api/style?limit=5&offset=10
 * [
 *   {
 *     "id": 1,
 *     "name": "UNDP GeoHub style",
 *     "createdat": "2022-07-29T15:59:23.781Z",
 *     "style": "http://localhost:3000/api/style/1.json",
 *     "viewer": "http://localhost:3000/viewer?style=http://localhost:3000/api/style/1.json"
 *   }
 * ]
 */
export const GET: RequestHandler = async ({ url }) => {
  const pool = new Pool({ connectionString })
  const client = await pool.connect()
  try {
    const limit = url.searchParams.get('limit') ?? '10'
    const offset = url.searchParams.get('offset') ?? '0'

    const options = {}
    if (limit) options['limit'] = limit
    if (offset) options['offset'] = offset

    const query = {
      text: `SELECT id, name, createdat FROM geohub.style ORDER BY id ${Object.keys(options)
        .map((key, index) => `${key} $${index + 1}`)
        .join(' ')}`,
      values: [...Object.keys(options).map((key) => options[key])],
    }

    const res = await client.query(query)
    if (res.rowCount === 0) {
      throw error(404)
    }

    const nextUrl = new URL(url.toString())
    nextUrl.searchParams.set('limit', limit)
    nextUrl.searchParams.set('offset', (Number(offset) + Number(limit)).toString())

    const links: StacLink[] = [
      {
        rel: 'root',
        type: 'application/json',
        href: `${url.origin}${url.pathname}`,
      },
      {
        rel: 'self',
        type: 'application/json',
        href: url.toString(),
      },
    ]

    if (res.rowCount === Number(limit)) {
      links.push({
        rel: 'next',
        type: 'application/json',
        href: nextUrl.toString(),
      })
    }

    if (Number(offset) > 0) {
      const previoustUrl = new URL(url.toString())
      previoustUrl.searchParams.set('limit', limit.toString())
      previoustUrl.searchParams.set('offset', (Number(offset) - Number(limit)).toString())

      links.push({
        rel: 'previous',
        type: 'application/json',
        href: previoustUrl.toString(),
      })
    }

    const totalCount = await getStyleCount()
    let totalPages = Math.round(totalCount / Number(limit))
    if (totalPages === 0) {
      totalPages = 1
    }
    const styles: DashboardMapStyle[] = res.rows
    const currentPage = pageNumber(totalCount, Number(limit), Number(offset))
    const pages: Pages = {
      totalCount,
      totalPages,
      currentPage,
    }

    return new Response(JSON.stringify({ styles, links, pages }))
  } catch (err) {
    throw error(400, JSON.stringify({ message: err.message }))
  } finally {
    client.release()
    pool.end()
  }
}

/**
 * Save style.json to PostgreSQL database
 * POST: ./style
 * body = {
 *   name: [style name]
 *   style: [style.json]
 * }
 */
export const POST: RequestHandler = async ({ request, url }) => {
  const pool = new Pool({ connectionString })
  const client = await pool.connect()
  try {
    const body = await request.json()
    if (!body.name) {
      throw new Error('name property is required')
    }
    if (!body.style) {
      throw new Error('style property is required')
    }

    const query = {
      text: `INSERT INTO geohub.style (name, style) VALUES ($1, $2) returning id`,
      values: [body.name, JSON.stringify(body.style)],
    }

    const res = await client.query(query)
    if (res.rowCount === 0) {
      throw new Error('failed to insert to the database.')
    }
    const id = res.rows[0].id
    return new Response(
      JSON.stringify({
        url: `${url.origin}/viewer?style=${url.origin}/api/style/${id}.json`,
      }),
    )
  } catch (err) {
    throw error(400, JSON.stringify({ message: err.message }))
  } finally {
    client.release()
    pool.end()
  }
}
