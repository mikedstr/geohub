import pkg from 'pg'
const { Pool } = pkg

const connectionString = import.meta.env.VITE_DATABASE_CONNECTION

/**
 * Delete style.json which is stored in PostgreSQL database
 * DELETE: ./style/{id}
 */
export async function del({ params }) {
  const pool = new Pool({ connectionString })
  const client = await pool.connect()
  try {
    const styleId = params.id
    if (!styleId) {
      throw new Error(`id parameter is required.`)
    }
    const query = {
      text: `DELETE FROM geohub.style WHERE id = $1`,
      values: [styleId],
    }

    const res = await client.query(query)
    if (res.rowCount === 0) {
      throw new Error(`${styleId} does not exist in the database`)
    }
    return {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
      },
    }
  } catch (err) {
    return {
      status: 400,
      headers: {
        'access-control-allow-origin': '*',
      },
      body: {
        message: err.message,
      },
    }
  } finally {
    client.release()
    pool.end()
  }
}
