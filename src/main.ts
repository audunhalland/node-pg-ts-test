import { Pool, ClientBase, PoolClient } from 'pg';
import sql, { Sql } from 'sql-template-tag';

// Some sql constants
const TRUE = sql`TRUE`;

// Client wrapper for forcing the use of the Sql type
class PgContext {
  private client: ClientBase;

  constructor(client: ClientBase) {
    this.client = client;
  }

  async query<T>(sql: Sql): Promise<Array<T>> {
    const result = await this.client.query(
      sql.text,
      sql.values,
    );
    return result.rows;
  }
}

async function transaction<T>(
  exec: (context: PgContext) => Promise<T>,
  pool: Pool
): Promise<T> {
  // Acquire available connection from pool
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const context = new PgContext(client);
    const value =  await exec(context);
    await client.query('COMMIT');
    client.release();
    return value;
  } catch (err) {
    client.release(err);
    throw err;
  }
}

const exampleQuery = async (
  ctx: PgContext,
  { id }: {
    id?: number
  }
): Promise<any> => {
  const query = sql`
    SELECT *
    FROM foo
    WHERE
      ${id ? sql`id = ${id}` : TRUE}
  `;

  console.log(query.text);

  return await ctx.query(query);
}

async function main() {
  const pool = new Pool();

  await transaction(async ctx => {
    await exampleQuery(ctx, { id: 32 });
    await exampleQuery(ctx, {});
  }, pool);
}

main();
