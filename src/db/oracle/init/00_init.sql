-- ---------------------------------------------------------------------------
-- Auto-init wrapper for a FRESH Oracle XE container.
--
-- The official Oracle image runs each *.sql in /opt/oracle/scripts/setup ONCE,
-- right after the database is created, connected as SYSDBA to the CDB root ($XE).
-- Our schemas live in the XEPDB1 pluggable database, so this wrapper switches
-- into XEPDB1 and runs the HSS setup scripts in the correct order.
--
-- The numbered scripts are mounted read-only at /opt/oracle/hss-scripts (NOT in
-- the setup dir) so the image doesn't try to run them individually in the wrong
-- container. See docker-compose.yml.
--
-- (If you switch to the community gvenzl/oracle-xe image, mount this file into
--  /container-entrypoint-initdb.d instead.)
-- ---------------------------------------------------------------------------

-- SET DEFINE OFF is essential: seed/data scripts may contain '&' which sqlplus
-- would otherwise treat as a substitution variable and hang the container.
SET DEFINE OFF
SET SQLBLANKLINES ON
-- Keep going if an individual statement fails (setup runs once; be resilient).
WHENEVER SQLERROR CONTINUE

ALTER SESSION SET CONTAINER = XEPDB1;

PROMPT ===== 1_create_schemas.sql =====
@/opt/oracle/hss-scripts/1_create_schemas.sql
PROMPT ===== 2_table_data_bkp.sql (tables + seed roles/permissions) =====
@/opt/oracle/hss-scripts/2_table_data_bkp.sql
PROMPT ===== 3_db_objects_bkp.sql (views/sequences/procedures) =====
@/opt/oracle/hss-scripts/3_db_objects_bkp.sql
PROMPT ===== 4_dummy_table_data.sql (dev sample data; delete this line for non-dev) =====
@/opt/oracle/hss-scripts/4_dummy_table_data.sql
PROMPT ===== phase_2.sql =====
@/opt/oracle/hss-scripts/phase_2.sql
PROMPT ===== dental-release2.sql =====
@/opt/oracle/hss-scripts/dental-release2.sql
PROMPT ===== 99_seed_admin_user.sql =====
@/opt/oracle/hss-scripts/99_seed_admin_user.sql

COMMIT;
PROMPT ===== HSS schema init complete =====
