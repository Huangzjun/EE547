const db = require('../db/db');

async function getFragments(proteinId, limit = 10, offset = 0, orderBy = 'start') {
    const sql = `
        SELECT * FROM fragments
        WHERE protein_id = $1
        ORDER BY ${orderBy}
        LIMIT $2 OFFSET $3
    `;
    const result = await db.query(sql, [proteinId, limit, offset]);
    return result.rows;
}

module.exports = { getFragments };
