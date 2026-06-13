-- Runs once on first database initialisation (mounted into
-- /docker-entrypoint-initdb.d). Enables the pgvector extension used for
-- embedding similarity search (resume chunks, JD requirements, skill tags).
CREATE EXTENSION IF NOT EXISTS vector;
