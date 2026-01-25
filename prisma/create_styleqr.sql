-- Run as postgres: psql -U postgres -h localhost -f prisma/create_styleqr.sql
-- Or: $env:PGPASSWORD='your_postgres_password'; psql -U postgres -h localhost -f prisma/create_styleqr.sql

DROP DATABASE IF EXISTS styleqr;
DROP USER IF EXISTS styleqr_user;

CREATE USER styleqr_user WITH PASSWORD 'styleqr123';
CREATE DATABASE styleqr OWNER styleqr_user;
GRANT ALL PRIVILEGES ON DATABASE styleqr TO styleqr_user;

\c styleqr

GRANT ALL ON SCHEMA public TO styleqr_user;
GRANT CREATE ON SCHEMA public TO styleqr_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO styleqr_user;
