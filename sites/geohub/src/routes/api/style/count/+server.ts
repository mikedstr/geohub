import type { RequestHandler } from './$types'
import { error } from '@sveltejs/kit'
import pkg from 'pg'
const { Pool } = pkg

import { DATABASE_CONNECTION } from '$lib/server/variables/private'
const connectionString = DATABASE_CONNECTION

/**
 * Get the total count of styles stored in database
 * GET: ./api/style/count
 */
export const GET: RequestHandler = async () => {
  const pool = new Pool({ connectionString })
  const client = await pool.connect()
  try {
    const query = {
      text: `SELECT count(*) as count FROM geohub.style`,
      values: [],
    }

    const res = await client.query(query)

    return new Response(JSON.stringify({ count: Number(res.rows[0].count) }))
  } catch (err) {
    throw error(400, JSON.stringify({ message: err.message }))
  } finally {
    client.release()
    pool.end()
  }
}