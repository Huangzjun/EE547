const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const DATA_DIR = './data/proteins/'; 
const INDEX_FILE = './data/proteins.json';
const MAX_PROTEIN_LENGTH = 2000;

app.use(express.json());
app.use(express.text());

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

function getProteins() {
    if (!fs.existsSync(INDEX_FILE)) return { proteins: [] };
    const data = fs.readFileSync(INDEX_FILE, 'utf8');
    return data ? JSON.parse(data) : { proteins: [] };
}

function generateProteinId() {
    return uuidv4();
}

function getProteinSync(proteinId) {
    const filePath = `${DATA_DIR}${proteinId}.json`;
    if (!fs.existsSync(filePath)) {
        throw new NotFoundError(`Protein with id ${proteinId} not found`);
    }
    const protein = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!protein.data || !protein.data.sequence) {
        throw new Error(`Protein data is invalid for id ${proteinId}`);
    }

    return protein.data; 
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

app.get('/api/proteins', (req, res, next) => {
    try {
        const proteins = getProteins().proteins;
        res.json({ proteins, total: proteins.length });
    } catch (error) {
        next(error);
    }
});

app.get('/api/proteins/:proteinId', (req, res, next) => {
    try {
        const { proteinId } = req.params;
        const protein = getProteinSync(proteinId);
        res.json(protein);
    } catch (error) {
        next(error);
    }
});

app.post('/api/proteins', (req, res, next) => {
    try {
        let proteins = getProteins();
        const { name, sequence, description } = req.body;

        if (!sequence || sequence.length > MAX_PROTEIN_LENGTH) {
            throw new Error('Invalid protein sequence');
        }

        const proteinId = generateProteinId();
        const newProtein = {
            id: proteinId,
            name: name || `Protein ${sequence.substring(0, 8)}`,
            sequence: sequence.toUpperCase(),
            description: description || "",
            molecularWeight: calculateMolecularWeight(sequence),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        proteins.proteins.push({ id: newProtein.id, name: newProtein.name });
        saveProteins(proteins);
        fs.writeFileSync(`${DATA_DIR}${proteinId}.json`, JSON.stringify({
            metadata: { version: "1.0", createdAt: newProtein.createdAt, updatedAt: newProtein.updatedAt },
            data: newProtein
        }, null, 2));

        res.status(201).json(newProtein);
    } catch (error) {
        next(error);
    }
});

app.post('/api/proteins/sequence', (req, res, next) => {
    try {
        const sequence = req.body.trim().toUpperCase();
        if (!sequence || sequence.length > MAX_PROTEIN_LENGTH) {
            throw new Error('Invalid sequence: Must be non-empty and ≤ 2000 characters');
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const name = `Protein ${sequence.substring(0, 8)} ${timestamp}`;
        const proteinId = generateProteinId();
        const newProtein = {
            id: proteinId,
            name,
            sequence,
            description: "",
            molecularWeight: calculateMolecularWeight(sequence),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        let proteins = getProteins();
        proteins.proteins.push({ id: newProtein.id, name: newProtein.name });
        saveProteins(proteins);
        fs.writeFileSync(`${DATA_DIR}${proteinId}.json`, JSON.stringify({
            metadata: { version: "1.0", createdAt: newProtein.createdAt, updatedAt: newProtein.updatedAt },
            data: newProtein
        }, null, 2));

        res.status(201).json(newProtein);
    } catch (error) {
        next(error);
    }
});

app.put('/api/proteins/:proteinId', (req, res, next) => {
    try {
        const { proteinId } = req.params;
        const { name, description } = req.body;

        let proteinData = getProteinSync(proteinId);
        let updatedProtein = proteinData.data;

        if (name) updatedProtein.name = name;
        if (description) updatedProtein.description = description;
        updatedProtein.updatedAt = new Date().toISOString();

        fs.writeFileSync(`${DATA_DIR}${proteinId}.json`, JSON.stringify({
            metadata: { version: "1.0", createdAt: proteinData.metadata.createdAt, updatedAt: updatedProtein.updatedAt },
            data: updatedProtein
        }, null, 2));

        let proteins = getProteins();
        let proteinIndex = proteins.proteins.findIndex(p => p.id === proteinId);
        proteins.proteins[proteinIndex].name = updatedProtein.name;
        saveProteins(proteins);

        res.json(updatedProtein);
    } catch (error) {
        next(error);
    }
});

app.delete('/api/proteins/:proteinId', (req, res, next) => {
    try {
        const { proteinId } = req.params;
        let proteins = getProteins();
        const proteinIndex = proteins.proteins.findIndex(p => p.id === proteinId);

        if (proteinIndex === -1) throw new NotFoundError('Protein not found');

        proteins.proteins.splice(proteinIndex, 1);
        saveProteins({ proteins });

        const filePath = `${DATA_DIR}${proteinId}.json`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

app.get('/api/proteins/:proteinId/structure', (req, res) => {
    try {
    const { proteinId } = req.params;
    const protein = getProteinSync(proteinId);
    const structure = predictSecondaryStructure(protein.sequence);
    if (req.accepts('json')) {
    res.json(structure);
    } else if (req.accepts('svg')) {
    const svg = generateStructureSVG(protein.sequence, structure.
    secondaryStructure);
    res.type('svg').send(svg);
    } else {
    res.status(406).json({ error: 'Not Acceptable' });
    }
    } catch (error) {
    res.status(400).json({ error: error.message });
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

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

initializeServer();