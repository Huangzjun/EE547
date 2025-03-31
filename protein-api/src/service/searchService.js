const db = require('../db/db');

async function searchProteins(queryStr, limit = 10, offset = 0, orderBy = 'name') {
    const sql = `
        SELECT * FROM proteins
        WHERE name ILIKE '%' || $1 || '%' OR description ILIKE '%' || $1 || '%'
        ORDER BY ${orderBy}
        LIMIT $2 OFFSET $3
    `;
    const result = await db.query(sql, [queryStr, limit, offset]);
    return result.rows;
}

module.exports = { searchProteins };
