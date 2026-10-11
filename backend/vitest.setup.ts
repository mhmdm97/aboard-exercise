// Tests run against a dedicated database; override with DATABASE_URL (see .env.test.example).
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL ??= 'postgres://library:library@localhost:5432/library_test'
