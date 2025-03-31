CREATE TABLE IF NOT EXISTS proteins (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    sequence TEXT,
    description VARCHAR(1000),
    molecular_weight FLOAT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fragments (
    id SERIAL PRIMARY KEY,
    protein_id UUID REFERENCES proteins(id) ON DELETE CASCADE,
    fragment TEXT NOT NULL
);
