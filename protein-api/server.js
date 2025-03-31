const { Pool } = require('pg');
const config = require('./src/config');

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('./db'); 
require('dotenv').config();
const app = express();
const PORT = config.PORT;

const MAX_PROTEIN_LENGTH = 2000;

const fragmentRoutes = require('./src/routes/fragmentRoutes');
const searchRoutes = require('./src/routes/searchRoutes');

app.use(express.json());
app.use(express.text());
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'protein_db',
    password: 'password',
    port: 5432,
});


class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
    }
}


class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConflictError';
    }
}

const gorPropensities = {
    A: { a: 1.42, b: 0.83, c: 0.80 },
    R: { a: 1.21, b: 0.84, c: 0.96 },
    N: { a: 0.67, b: 0.89, c: 1.34 },
    D: { a: 1.01, b: 0.54, c: 1.35 },
    C: { a: 0.70, b: 1.19, c: 1.06 },
    Q: { a: 1.11, b: 1.10, c: 0.84 },
    E: { a: 1.51, b: 0.37, c: 1.08 },
    G: { a: 0.57, b: 0.75, c: 1.56 },
    H: { a: 1.00, b: 0.87, c: 1.09 },
    I: { a: 1.08, b: 1.60, c: 0.47 },
    L: { a: 1.21, b: 1.30, c: 0.59 },
    K: { a: 1.16, b: 0.74, c: 1.07 },
    M: { a: 1.45, b: 1.05, c: 0.60 },
    F: { a: 1.13, b: 1.38, c: 0.59 },
    P: { a: 0.57, b: 0.55, c: 1.72 },
    S: { a: 0.77, b: 0.75, c: 1.39 },
    T: { a: 0.83, b: 1.19, c: 0.96 },
    W: { a: 1.08, b: 1.37, c: 0.64 },
    Y: { a: 0.69, b: 1.47, c: 0.87 },
    V: { a: 1.06, b: 1.70, c: 0.41 }
};

async function getProteins() {
    const { rows } = await pool.query('SELECT id, name FROM proteins');
    return rows;
}


function generateProteinId() {
    return uuidv4();
}

async function getProtein(proteinId) {
    const { rows } = await pool.query('SELECT * FROM proteins WHERE id=$1', [proteinId]);
    if (rows.length === 0) throw new NotFoundError(`Protein with id ${proteinId} not found`);
    return rows[0];
}


function saveProteins(data) {
    fs.writeFileSync(INDEX_FILE, JSON.stringify(data, null, 2));
}

function calculateMolecularWeight(sequence) {
    const molecularWeights = {
        A: 89.09, R: 174.20, N: 132.12, D: 133.10, C: 121.16,
        Q: 146.15, E: 147.13, G: 75.07, H: 155.16, I: 131.17,
        L: 131.17, K: 146.19, M: 149.21, F: 165.19, P: 115.13,
        S: 105.09, T: 119.12, W: 204.23, Y: 181.19, V: 117.15
    };
    return sequence.split('').reduce((sum, aa) => sum + (molecularWeights[aa] || 0), 0);
}

function predictSecondaryStructure(sequence) {
    let structure = '', confidenceScores = [];

    for (let aa of sequence) {
        if (!gorPropensities[aa]) throw new Error(`Invalid amino acid: ${aa}`);
        const { a, b, c } = gorPropensities[aa];

        let propensities = [a, b, c].sort((x, y) => y - x);
        let maxPropensity = propensities[0];
        let secondMax = propensities[1];

        let type = (maxPropensity === a) ? 'H' : (maxPropensity === b) ? 'E' : 'C';
        structure += type;
        confidenceScores.push(parseFloat((maxPropensity - secondMax).toFixed(2)));
    }

    return { secondaryStructure: structure, confidenceScores };
}

function generateStructureSVG(sequence, secondaryStructure) {
    const svgWidth = sequence.length * 10 + 200; 
    const svgHeight = 60;
    let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;

    for (let i = 0; i < sequence.length; i++) {
        let color;
        switch (secondaryStructure[i]) {
            case 'H': color = 'red'; break;
            case 'E': color = 'yellow'; break;
            default: color = 'gray';
        }
        svg += `<rect x="${i * 10}" y="0" width="10" height="30" fill="${color}"/>`;
    }

    svg += `
        <rect x="${sequence.length * 10 + 10}" y="5" width="10" height="10" fill="red" />
        <text x="${sequence.length * 10 + 25}" y="15" font-size="10">Alpha-Helix (H)</text>

        <rect x="${sequence.length * 10 + 10}" y="20" width="10" height="10" fill="yellow" />
        <text x="${sequence.length * 10 + 25}" y="30" font-size="10">Beta-Sheet (E)</text>

        <rect x="${sequence.length * 10 + 10}" y="35" width="10" height="10" fill="gray" />
        <text x="${sequence.length * 10 + 25}" y="45" font-size="10">Coil (C)</text>
    `;

    svg += '</svg>';
    return svg;
}

async function insertFragments(proteinId, sequence) {
    const fragments = [];
    for (let i = 0; i <= sequence.length - 5; i++) {
        const fragment = sequence.substr(i, 5); // 截取5个字符
        const id = uuidv4(); // fragment 也需要 uuid
        const start = i; // 位置
        fragments.push([id, proteinId, fragment, start]);
    }

    for (const [id, protein_id, fragment, start] of fragments) {
        await pool.query(
            'INSERT INTO fragments (id, protein_id, fragment, start) VALUES ($1, $2, $3, $4)',
            [id, protein_id, fragment, start]
        );
    }
}

app.get('/api/proteins', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const result = await pool.query('SELECT * FROM proteins LIMIT $1 OFFSET $2', [limit, offset]);
        const total = (await pool.query('SELECT COUNT(*) FROM proteins')).rows[0].count;
        res.json({ proteins: result.rows, total: parseInt(total), limit, offset });
    } catch (err) {
        next(err);
    }
});



app.get('/api/proteins/:proteinId', async (req, res, next) => {
    try {
        const { proteinId } = req.params;
        const result = await pool.query('SELECT * FROM proteins WHERE id = $1', [proteinId]);
        if (result.rows.length === 0) throw new NotFoundError('Protein not found');
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});



app.post('/api/proteins', async (req, res, next) => {
    try {
        const { name, sequence, description } = req.body;
        if (!sequence || sequence.length > MAX_PROTEIN_LENGTH) throw new Error('Invalid protein sequence');

        const id = uuidv4();
        const createdAt = new Date();
        const molecularWeight = calculateMolecularWeight(sequence);

        await pool.query(
            `INSERT INTO proteins (id, name, sequence, description, molecular_weight, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $6)`,
            [id, name || `Protein ${sequence.substring(0,8)}`, sequence, description || '', molecularWeight, createdAt]
        );

        await insertFragments(proteinId, sequence);
        res.status(201).json({ id, name, sequence, description, molecularWeight, createdAt, updatedAt: createdAt });
    } catch (err) {
        next(err);
    }
});


app.get('/api/proteins/:proteinId/motifs', async (req, res, next) => {
    try {
        const { proteinId } = req.params;
        const protein = await getProtein(proteinId);
        const sequence = protein.sequence;
        const motifs = [];
        for (let i = 0; i <= sequence.length - 5; i++) {
            motifs.push(sequence.substring(i, i + 5));
        }
        res.json({ motifs });
    } catch (error) { next(error); }
});

app.get('/api/motifs/:motif', async (req, res, next) => {
    try {
        const { motif } = req.params;
        if (motif.length !== 5) throw new Error('Motif must be exactly 5 characters');
        const { rows } = await pool.query('SELECT * FROM proteins WHERE sequence LIKE $1', [`%${motif}%`]);
        res.json({ proteins: rows });
    } catch (error) { next(error); }
});


app.post('/api/proteins/sequence', async (req, res, next) => {
    try {
        const sequence = req.body.trim().toUpperCase();
        if (!sequence || sequence.length > MAX_PROTEIN_LENGTH) throw new Error('Invalid sequence');

        const id = uuidv4();
        const timestamp = Math.floor(Date.now() / 1000);
        const name = `Protein ${sequence.substring(0,8)} ${timestamp}`;
        const createdAt = new Date();
        const molecularWeight = calculateMolecularWeight(sequence);

        await pool.query(
            `INSERT INTO proteins (id, name, sequence, description, molecular_weight, created_at, updated_at)
             VALUES ($1, $2, $3, '', $4, $5, $5)`,
            [id, name, sequence, molecularWeight, createdAt]
        );

        await insertFragments(proteinId, sequence);
        res.status(201).json({ id, name, sequence, description: '', molecularWeight, createdAt, updatedAt: createdAt });
    } catch (err) {
        next(err);
    }
});


app.put('/api/proteins/:proteinId', async (req, res, next) => {
    try {
        const { proteinId } = req.params;
        const { name, description } = req.body;
        const updatedAt = new Date();

        const result = await pool.query('SELECT * FROM proteins WHERE id = $1', [proteinId]);
        if (result.rows.length === 0) throw new NotFoundError('Protein not found');

        const updatedName = name || result.rows[0].name;
        const updatedDescription = description || result.rows[0].description;

        await pool.query(
            `UPDATE proteins SET name = $1, description = $2, updated_at = $3 WHERE id = $4`,
            [updatedName, updatedDescription, updatedAt, proteinId]
        );

        res.json({ ...result.rows[0], name: updatedName, description: updatedDescription, updatedAt });
    } catch (err) {
        next(err);
    }
});


app.delete('/api/proteins/:proteinId', async (req, res, next) => {
    try {
        const { proteinId } = req.params;
        const result = await pool.query('DELETE FROM proteins WHERE id = $1 RETURNING *', [proteinId]);
        if (result.rowCount === 0) throw new NotFoundError('Protein not found');
        res.status(204).end();
    } catch (err) {
        next(err);
    }
});



app.get('/api/proteins/:proteinId/structure', async (req, res, next) => {
    try {
        const { proteinId } = req.params;
        const protein = await getProtein(proteinId); // 改成 await
        const structure = predictSecondaryStructure(protein.sequence);
        if (req.accepts('json')) {
            res.json(structure);
        } else if (req.accepts('svg')) {
            const svg = generateStructureSVG(protein.sequence, structure.secondaryStructure);
            res.type('svg').send(svg);
        } else {
            res.status(406).json({ error: 'Not Acceptable' });
        }
    } catch (error) {
        next(error);
    }
});

app.get('/api/fragments', async (req, res, next) => {
    try {
        const { motif } = req.query;
        if (!motif || motif.length !== 5) throw new Error('motif must be 5 characters');

        const result = await pool.query(
            'SELECT * FROM fragments WHERE fragment = $1',
            [motif]
        );
        res.json({ fragments: result.rows });
    } catch (err) {
        next(err);
    }
});

app.get('/api/search', async (req, res, next) => {
    try {
        const { query } = req.query;
        if (!query) throw new Error('query is required');

        const result = await pool.query(
            `SELECT * FROM proteins WHERE name ILIKE $1 OR description ILIKE $1`,
            [`%${query}%`]
        );
        res.json({ proteins: result.rows });
    } catch (err) {
        next(err);
    }
});

app.get('/api/proteins/:proteinId/structure', async (req, res, next) => {
    try {
        const { proteinId } = req.params;
        const result = await pool.query('SELECT * FROM proteins WHERE id = $1', [proteinId]);
        if (result.rows.length === 0) throw new NotFoundError('Protein not found');

        const sequence = result.rows[0].sequence;
        const structure = predictSecondaryStructure(sequence);

        if (req.accepts('json')) {
            res.json({ proteinId, sequence, ...structure });
        } else if (req.accepts('svg')) {
            const svg = generateStructureSVG(sequence, structure.secondaryStructure);
            res.type('svg').send(svg);
        } else {
            res.status(406).json({ error: 'Not Acceptable' });
        }
    } catch (err) {
        next(err);
    }
});



function errorHandler(err, req, res, next) {
    console.error(err);

    if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
    } else if (err instanceof ConflictError) {
        res.status(409).json({ error: err.message });
    } else {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

app.use(errorHandler);

function initializeServer() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(INDEX_FILE)) fs.writeFileSync(INDEX_FILE, JSON.stringify({ proteins: [] }, null, 2));

    app.use('/api/proteins', fragmentRoutes); 
    app.use('/api/search', searchRoutes);    

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

initializeServer();