-- ---------------------------------------------------------------------------
-- Seeds an initial administrator so the app is usable immediately after the
-- schema is built (login → API authorization works out of the box).
--
-- EDIT v_email / v_name for your environment. Idempotent: safe to re-run.
-- The user is granted EVERY role in GENERAL.ROLES_DATA, i.e. the union of all
-- permissions, so they can see every module. Narrow this for real accounts.
-- ---------------------------------------------------------------------------

DECLARE
    v_email   VARCHAR2(150) := 'michael@icefoganalytics.com';
    v_name    VARCHAR2(150) := 'Michael Johnson';
    v_user_id NUMBER;
BEGIN
    -- Upsert the user by email.
    BEGIN
        SELECT ID INTO v_user_id
          FROM GENERAL.USER_DATA
         WHERE LOWER(USER_EMAIL) = LOWER(v_email);
    EXCEPTION WHEN NO_DATA_FOUND THEN
        INSERT INTO GENERAL.USER_DATA (USER_NAME, USER_EMAIL)
        VALUES (v_name, v_email)
        RETURNING ID INTO v_user_id;
    END;

    -- Grant every role the user does not already have.
    INSERT INTO GENERAL.USER_ROLES (USER_ID, ROLE_ID)
    SELECT v_user_id, r.ID
      FROM GENERAL.ROLES_DATA r
     WHERE NOT EXISTS (
         SELECT 1 FROM GENERAL.USER_ROLES ur
          WHERE ur.USER_ID = v_user_id AND ur.ROLE_ID = r.ID
     );

    COMMIT;
END;
/
