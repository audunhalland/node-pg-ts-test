import sql, { Sql } from 'sql-template-tag';

const testQuery = (id?: number): Sql => {
  const query = sql`
    SELECT *
    FROM yo
    WHERE
      ${id ? sql`id = ${id}` : sql`TRUE`}
  `;

  return query;
}

async function main() {
  console.log(testQuery(32).text);
  console.log(testQuery().text);
}

main();
