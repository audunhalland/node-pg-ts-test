import { Pool, ClientBase } from 'pg';
import sql, { Sql } from 'sql-template-tag';
import DBMigrate from 'db-migrate';

// Some sql constants
const TRUE = sql`TRUE`;

async function migrate() {
  const instance = DBMigrate.getInstance(true);
  console.log('resetting migrations...');
  await instance.reset();
  console.log('migrating to latest...');
  await instance.up();
}

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
    console.log('releasing client...');
    client.release();
    console.log('released!');
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

  const result = await ctx.query(query);
  console.log('result: ', result);
}

async function main() {
  await migrate();

  console.log('creating connection pool...');
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5555/postgres'
  });

  console.log('running queries...');

  await transaction(async ctx => {
    await exampleQuery(ctx, { id: 32 });
    await exampleQuery(ctx, {});
  }, pool);

  console.log('done!');
}

main();
