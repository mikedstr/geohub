import type { RequestHandler } from './$types'
import pkg from 'pg'
const { Pool } = pkg

import { DATABASE_CONNECTION } from '$lib/server/variables/private'
const connectionString = DATABASE_CONNECTION

/**
 * Continent API
 * return continent data
 */
export const GET: RequestHandler = async () => {
  const pool = new Pool({ connectionString })
  const client = await pool.connect()
  try {
    const sql = {
      text: `
      SELECT region1_code as continent_code, region1_name as continent_name
      FROM geohub.country
      GROUP BY region1_code, region1_name
      ORDER BY region1_name`,
    }
    // console.log(sql)
    const res = await client.query(sql)
    return new Response(JSON.stringify(res.rows))
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 400,
    })
  } finally {
    client.release()
    pool.end()
  }
}