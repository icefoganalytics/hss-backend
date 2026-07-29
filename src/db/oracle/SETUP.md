# HSS database setup

## Quick start (auto-build)

```bash
cd src/db/oracle
docker compose up -d               # starts Oracle XE (XEPDB1) and builds the schema
docker compose logs -f oracle-db   # watch for "HSS schema init complete"
```

On a **fresh** container the schema is built automatically: `init/00_init.sql`
(mounted into the image's one-time `setup` directory) switches into the `XEPDB1`
pluggable database and runs the scripts in order:

`1_create_schemas` → `2_table_data_bkp` (tables + seed roles/permissions) →
`3_db_objects_bkp` (views incl. `USER_PERMISSIONS_V`, procedures) →
`4_dummy_table_data` → `phase_2` → `dental-release2` → `99_seed_admin_user`.

`99_seed_admin_user.sql` inserts an initial admin (edit the email/name in it) and
grants every role, so login + API authorization work immediately.

Notes:
- Auto-init runs **only when the data volume is empty**. To rebuild from scratch:
  `docker compose down -v && docker compose up -d`.
- The app must connect to this PDB — set `DB_SERVICE=XEPDB1` in `src/api/.env*`
  (schema users are created with password `HSS_BACKEND`).
- `4_dummy_table_data.sql` is dev sample data — remove that line from
  `init/00_init.sql` for non-dev environments.
- The numbered scripts are mounted at `/opt/oracle/hss-scripts` (read-only), i.e.
  **outside** the image's `setup` dir, so they aren't each executed individually in
  the wrong container; only the `00_init.sql` wrapper runs, and it drives them.

## Manual run (alternative)

Run the scripts yourself, in the same order, against `XEPDB1`:
```bash
docker exec -i oracle-db sqlplus sys/Oracle123@//localhost:1521/XEPDB1 as sysdba \
  < scripts/1_create_schemas.sql   # then 2, 3, 4, phase_2, dental-release2, 99_seed_admin_user
```

> `src/api/database.json` + the `db-migrate` dependency are **not** used (configured
> for Postgres, no migrations dir). These SQL scripts are the source of truth.
