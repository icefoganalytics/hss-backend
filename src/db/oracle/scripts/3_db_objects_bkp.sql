--------------------------------------------------------
--  DDL for View STATUS_V
--------------------------------------------------------

  CREATE OR REPLACE FORCE EDITIONABLE VIEW "CONSTELLATION_HEALTH"."STATUS_V" ("ID", "DESCRIPTION") AS 
  SELECT
    ID,
    DESCRIPTION
FROM
    CONSTELLATION_STATUS
;
--------------------------------------------------------
--  DDL for View AUDIT_TIMELINE_V
--------------------------------------------------------

  CREATE OR REPLACE FORCE EDITIONABLE VIEW "GENERAL"."AUDIT_TIMELINE_V" ("ID", "TITLE", "EVENT_DATE", "SCHEMA_NAME", "TABLE_NAME", "DEPARTMENT", "ICON_NAME", "PERMISSIONS", "MESSAGE") AS 
  SELECT
    ev.ID,
    ev.TITLE,
    ev.EVENT_DATE,
    ev.SCHEMA_NAME,
    ev.TABLE_NAME,
    c.val_str1 AS department,
    c2.val_str1 AS icon_name,
    c3.val_str1 AS permissions,
    GENERAL.GETTRANSFORMVALUE(ev.SCHEMA_NAME,
    ev.TABLE_NAME,
    ev.ENTITY_ID,
    ev.REV_ID,
    er.TITLE,
    er.TRANSFORM_VALUE,
    er.COLUMN_KEY) AS MESSAGE
FROM 
    GENERAL.EVENTS ev
    JOIN GENERAL.EVENT_RULES er
        ON ev.event_type = er.event_type
        AND er.IS_ENABLED = 1
    LEFT JOIN GENERAL.CONFIG c ON c.type = 'SCHEMA_TITLE' AND c.name = ev.schema_name
    LEFT JOIN GENERAL.CONFIG c2 ON c2.type = 'ICONS' AND c2.val_int1 = ev.event_type
    LEFT JOIN GENERAL.CONFIG c3 ON c3.type = 'SCHEMA_PERMISSION_VIEW' AND c3.name = ev.schema_name
    WHERE   TO_CHAR(ev.EVENT_DATE, 'YYYY-MM-DD') =  TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
    AND ROWNUM <= 15
    ORDER BY ev.EVENT_DATE DESC
;
--------------------------------------------------------
--  DDL for View SUBMISSIONS_MONTH_V
--------------------------------------------------------

  CREATE OR REPLACE FORCE EDITIONABLE VIEW "GENERAL"."SUBMISSIONS_MONTH_V" ("ID", "DEPARTMENT", "COLOR", "PERMISSIONS", "SUBMISSIONS", "DATE_CODE", "MONTHID") AS 
  SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    to_char(ch.created_at, 'WW') AS date_code,
    to_char(ch.created_at, 'yyyy-mm') AS monthid
   FROM CONSTELLATION_HEALTH.constellation_health ch
     LEFT JOIN all_tables tab ON tab.table_name = 'CONSTELLATION_HEALTH'
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'SCHEMA_CHART_COLOR' AND cc.name = tab.owner
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  GROUP BY tab.owner, (to_char(ch.created_at, 'yyyy-mm')), (to_char(ch.created_at, 'WW')), cd.val_str1, cc.val_str1, cp.val_str1
UNION
 SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    to_char(ch.created_at, 'WW') AS date_code,
    to_char(ch.created_at, 'yyyy-mm') AS monthid
   FROM HIPMA.health_information ch
     LEFT JOIN all_tables tab ON tab.table_name = 'HEALTH_INFORMATION'
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'SCHEMA_CHART_COLOR' AND cc.name = tab.owner
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner     
  GROUP BY tab.owner, (to_char(ch.created_at, 'yyyy-mm')), (to_char(ch.created_at, 'WW')), cd.val_str1, cc.val_str1, cp.val_str1
UNION
 SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    to_char(ch.created_at, 'WW') AS date_code,
    to_char(ch.created_at, 'yyyy-mm') AS monthid
   FROM MIDWIFERY.midwifery_services ch
     LEFT JOIN all_tables tab ON tab.table_name = 'MIDWIFERY_SERVICES'
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'SCHEMA_CHART_COLOR' AND cc.name = tab.owner
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  GROUP BY tab.owner, (to_char(ch.created_at, 'yyyy-mm')), (to_char(ch.created_at, 'WW')), cd.val_str1, cc.val_str1, cp.val_str1
  UNION
 SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    to_char(ch.created_at, 'WW') AS date_code,
    to_char(ch.created_at, 'yyyy-mm') AS monthid
   FROM DENTAL.DENTAL_SERVICE ch
     LEFT JOIN all_tables tab ON tab.table_name = 'DENTAL_SERVICE'
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'SCHEMA_CHART_COLOR' AND cc.name = tab.owner
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  GROUP BY tab.owner, (to_char(ch.created_at, 'yyyy-mm')), (to_char(ch.created_at, 'WW')), cd.val_str1, cc.val_str1, cp.val_str1
;
--------------------------------------------------------
--  DDL for View SUBMISSIONS_STATUS_MONTH_V
--------------------------------------------------------

  CREATE OR REPLACE FORCE EDITIONABLE VIEW "GENERAL"."SUBMISSIONS_STATUS_MONTH_V" ("ID", "DEPARTMENT", "COLOR", "PERMISSIONS", "SUBMISSIONS", "STATUS", "MONTHID") AS 
  SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    cs.description AS status,
    to_char(ch.created_at, 'yyyy-mm') AS monthid
   FROM CONSTELLATION_HEALTH.constellation_health ch
     LEFT JOIN all_tables tab ON tab.table_name = 'CONSTELLATION_HEALTH'
     LEFT JOIN CONSTELLATION_HEALTH.constellation_status cs ON cs.id = ch.status
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'STATUS_CHART_COLOR' AND cc.name = tab.owner AND cc.val_int1 = cs.id
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  GROUP BY tab.owner, (to_char(ch.created_at, 'yyyy-mm')), cd.val_str1, cc.val_str1, cp.val_str1, cs.description
UNION
 SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    st.description AS status,
    to_char(ms.created_at, 'yyyy-mm') AS monthid
   FROM MIDWIFERY.midwifery_services ms
     LEFT JOIN all_tables tab ON tab.table_name = 'MIDWIFERY_SERVICES'
     LEFT JOIN MIDWIFERY.midwifery_status st ON st.id = ms.status
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'STATUS_CHART_COLOR' AND cc.name = tab.owner AND cc.val_int1 = st.id
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  GROUP BY tab.owner, (to_char(ms.created_at, 'yyyy-mm')), cd.val_str1, cc.val_str1, cp.val_str1, st.description
UNION
 SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    st.description AS status,
    to_char(hi.created_at, 'yyyy-mm') AS monthid
   FROM HIPMA.health_information hi
     LEFT JOIN all_tables tab ON tab.table_name = 'HEALTH_INFORMATION'
     LEFT JOIN HIPMA.hipma_status st ON st.id = hi.status
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'STATUS_CHART_COLOR' AND cc.name = tab.owner AND cc.val_int1 = st.id
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  GROUP BY tab.owner, (to_char(hi.created_at, 'yyyy-mm')), cd.val_str1, cc.val_str1, cp.val_str1, st.description
UNION
 SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    st.description AS status,
    to_char(ds.created_at, 'yyyy-mm') AS monthid
   FROM DENTAL.DENTAL_SERVICE ds
     LEFT JOIN all_tables tab ON tab.table_name = 'DENTAL_SERVICE'
     LEFT JOIN DENTAL.DENTAL_STATUS st ON st.id = ds.status
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'STATUS_CHART_COLOR' AND cc.name = tab.owner AND cc.val_int1 = st.id
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  GROUP BY tab.owner, (to_char(ds.created_at, 'yyyy-mm')), cd.val_str1, cc.val_str1, cp.val_str1, st.description
;
--------------------------------------------------------
--  DDL for View SUBMISSIONS_STATUS_WEEK_V
--------------------------------------------------------

  CREATE OR REPLACE FORCE EDITIONABLE VIEW "GENERAL"."SUBMISSIONS_STATUS_WEEK_V" ("ID", "DEPARTMENT", "COLOR", "PERMISSIONS", "SUBMISSIONS", "STATUS") AS 
  SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    cs.description AS status
   FROM CONSTELLATION_HEALTH.constellation_health ch
     LEFT JOIN CONSTELLATION_HEALTH.constellation_status cs ON cs.id = ch.status
     LEFT JOIN all_tables tab ON tab.table_name = 'CONSTELLATION_HEALTH'
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'STATUS_CHART_COLOR' AND cc.name = tab.owner AND cc.val_int1 = cs.id
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  WHERE ch.created_at > (CURRENT_DATE - INTERVAL '7' DAY)
  GROUP BY tab.owner, cs.id, cd.val_str1, cc.val_str1, cp.val_str1, cs.DESCRIPTION
UNION
 SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    st.description AS status
   FROM MIDWIFERY.midwifery_services ms
     LEFT JOIN MIDWIFERY.midwifery_status st ON st.id = ms.status
     LEFT JOIN all_tables tab ON tab.table_name = 'MIDWIFERY_SERVICES'
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'STATUS_CHART_COLOR' AND cc.name = tab.owner AND cc.val_int1 = st.id
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  WHERE ms.created_at > (CURRENT_DATE - INTERVAL '7' DAY)
  GROUP BY tab.owner, st.id, cd.val_str1, cc.val_str1, cp.val_str1, st.DESCRIPTION 
UNION
 SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    st.description AS status
   FROM HIPMA.health_information hi
     LEFT JOIN HIPMA.hipma_status st ON st.id = hi.status
     LEFT JOIN all_tables tab ON tab.table_name = 'HEALTH_INFORMATION'
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'STATUS_CHART_COLOR' AND cc.name = tab.owner AND cc.val_int1 = st.id
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  WHERE hi.created_at > (CURRENT_DATE - INTERVAL '7' DAY)
  GROUP BY tab.owner, st.id, cd.val_str1, cc.val_str1, cp.val_str1, st.DESCRIPTION
UNION
 SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    st.description AS status
   FROM DENTAL.DENTAL_SERVICE ds
     LEFT JOIN DENTAL.DENTAL_STATUS st ON st.id = ds.status
     LEFT JOIN all_tables tab ON tab.table_name = 'DENTAL_SERVICE'
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'STATUS_CHART_COLOR' AND cc.name = tab.owner AND cc.val_int1 = st.id
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  WHERE ds.created_at > (CURRENT_DATE - INTERVAL '7' DAY)
  GROUP BY tab.owner, st.id, cd.val_str1, cc.val_str1, cp.val_str1, st.DESCRIPTION
;
--------------------------------------------------------
--  DDL for View SUBMISSIONS_WEEK_V
--------------------------------------------------------

  CREATE OR REPLACE FORCE EDITIONABLE VIEW "GENERAL"."SUBMISSIONS_WEEK_V" ("ID", "DEPARTMENT", "COLOR", "PERMISSIONS", "SUBMISSIONS", "DATE_CODE") AS 
  SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    to_char(ch.created_at, 'yyyy-mm-dd') AS date_code
   FROM CONSTELLATION_HEALTH.constellation_health ch
     LEFT JOIN all_tables tab ON tab.table_name = 'CONSTELLATION_HEALTH'
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'SCHEMA_CHART_COLOR' AND cc.name = tab.owner
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  WHERE ch.created_at > (CURRENT_DATE - interval '7' DAY)
  GROUP BY tab.owner, (to_char(ch.created_at, 'yyyy-mm-dd')), cd.val_str1, cc.val_str1, cp.val_str1
UNION
 SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    to_char(ch.created_at, 'yyyy-mm-dd') AS date_code
   FROM HIPMA.health_information ch
     LEFT JOIN all_tables tab ON tab.table_name = 'HEALTH_INFORMATION'
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'SCHEMA_CHART_COLOR' AND cc.name = tab.owner
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  WHERE ch.created_at > (CURRENT_DATE - interval '7' DAY)
  GROUP BY tab.owner, (to_char(ch.created_at, 'yyyy-mm-dd')), cd.val_str1, cc.val_str1, cp.val_str1
UNION
 SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    to_char(ch.created_at, 'yyyy-mm-dd') AS date_code
   FROM MIDWIFERY.midwifery_services ch
     LEFT JOIN all_tables tab ON tab.table_name = 'MIDWIFERY_SERVICES'
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'SCHEMA_CHART_COLOR' AND cc.name = tab.owner
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  WHERE ch.created_at > (CURRENT_DATE - interval '7' DAY)
  GROUP BY tab.owner, (to_char(ch.created_at, 'yyyy-mm-dd')), cd.val_str1, cc.val_str1, cp.val_str1
UNION
 SELECT tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    to_char(ds.created_at, 'yyyy-mm-dd') AS date_code
   FROM DENTAL.DENTAL_SERVICE ds
     LEFT JOIN all_tables tab ON tab.table_name = 'DENTAL_SERVICE'
     LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
     LEFT JOIN GENERAL.config cc ON cc.type = 'SCHEMA_CHART_COLOR' AND cc.name = tab.owner
     LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  WHERE ds.created_at > (CURRENT_DATE - interval '7' DAY)
  GROUP BY tab.owner, (to_char(ds.created_at, 'yyyy-mm-dd')), cd.val_str1, cc.val_str1, cp.val_str1
;
--------------------------------------------------------
--  DDL for View USER_PERMISSIONS_V
--------------------------------------------------------

  CREATE OR REPLACE FORCE EDITIONABLE VIEW "GENERAL"."USER_PERMISSIONS_V" ("USER_ID", "USER_EMAIL", "PERMISSION_ID", "PERMISSION_NAME") AS 
  SELECT ud.id AS user_id,
ud.user_email,
pd.id AS permission_id,
pd.permission_name
FROM GENERAL.user_data ud
 JOIN GENERAL.user_roles ur ON ud.id = ur.user_id
 JOIN GENERAL.roles_data rd ON rd.id = ur.role_id
 JOIN GENERAL.role_permissions rp ON rd.id = rp.role_id
 JOIN GENERAL.permission_data pd ON rp.permission_id = pd.id
GROUP BY ud.id, ud.user_email, pd.id, pd.permission_name
;
--------------------------------------------------------
--  DDL for View STATUS_V
--------------------------------------------------------

  CREATE OR REPLACE FORCE EDITIONABLE VIEW "HIPMA"."STATUS_V" ("ID", "DESCRIPTION") AS 
  SELECT
    ID,
    DESCRIPTION
FROM
    HIPMA_STATUS
;
--------------------------------------------------------
--  DDL for View STATUS_V
--------------------------------------------------------

  CREATE OR REPLACE FORCE EDITIONABLE VIEW "MIDWIFERY"."STATUS_V" ("ID", "DESCRIPTION") AS 
  SELECT
    ID,
    DESCRIPTION
FROM
    MIDWIFERY_STATUS
;
--------------------------------------------------------
--  DDL for View STATUS_V
--------------------------------------------------------

  CREATE OR REPLACE FORCE EDITIONABLE VIEW "DENTAL"."STATUS_V" ("ID", "DESCRIPTION") AS
  SELECT
    ID,
    DESCRIPTION
FROM
    DENTAL_STATUS
;
--------------------------------------------------------
-- GENERAL.AUDIT_TIMELINE_V calls GENERAL-owned functions (GETVALUEFORRULESTATUS/
-- RULENAME) that read each module's STATUS_V and *_REV via dynamic SQL. Those run
-- with the function owner's (GENERAL) privileges, so GENERAL needs SELECT on them
-- or the audit timeline fails with ORA-00942.
--------------------------------------------------------
  GRANT SELECT ON "CONSTELLATION_HEALTH"."STATUS_V" TO "GENERAL";
  GRANT SELECT ON "HIPMA"."STATUS_V" TO "GENERAL";
  GRANT SELECT ON "MIDWIFERY"."STATUS_V" TO "GENERAL";
  GRANT SELECT ON "DENTAL"."STATUS_V" TO "GENERAL";
  GRANT SELECT ON "DENTAL"."DENTAL_SERVICE_REV" TO "GENERAL";
--------------------------------------------------------
--  DDL for View DENTAL_SERVICE_SUBMISSIONS
--------------------------------------------------------
  CREATE OR REPLACE FORCE EDITIONABLE VIEW "DENTAL"."DENTAL_SERVICE_SUBMISSIONS" (
    "ID", "FIRST_NAME", "LAST_NAME", "MIDDLE_NAME", "HEALTH_CARD_NUMBER", "POSTAL_CODE", "EMAIL", "DATE_OF_BIRTH",
		"STATUS", "STATUS_DESCRIPTION", "CREATED_AT",
    "DEPENDENT", "FILE_DENTAL", "ELIGIBLE_PHARMACARE", "HAS_COMMENTS" , "showUrl"
) AS
SELECT
    DENTAL_SERVICE.ID,
    DENTAL_SERVICE.FIRST_NAME,
    DENTAL_SERVICE.LAST_NAME,
    DENTAL_SERVICE.MIDDLE_NAME,
		DENTAL_SERVICE.HEALTH_CARD_NUMBER,
		DENTAL_SERVICE.POSTAL_CODE,
		DENTAL_SERVICE.EMAIL,
	TO_CHAR(DENTAL_SERVICE.DATE_OF_BIRTH, 'YYYY-MM-DD') AS DATE_OF_BIRTH,
    DENTAL_SERVICE.STATUS,
    DENTAL_STATUS.DESCRIPTION AS STATUS_DESCRIPTION,
	TO_CHAR(DENTAL_SERVICE.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,
    CASE WHEN COUNT(DENTAL_SERVICE_DEPENDENTS.ID) > 0 THEN 'Yes' ELSE 'No' END AS DEPENDENT,
    CASE WHEN COUNT(DENTAL_SERVICE_FILES.FILE_NAME) > 0 THEN 'Yes' ELSE 'No' END AS FILE_DENTAL,
    DECODE(DENTAL_SERVICE.ARE_YOU_ELIGIBLE_FOR_THE_PHARMACARE_AND_EXTENDED_HEALTH_CARE_BEN, null, 'Not Applicable', DENTAL_SERVICE.ARE_YOU_ELIGIBLE_FOR_THE_PHARMACARE_AND_EXTENDED_HEALTH_CARE_BEN) AS ELIGIBLE_PHARMACARE,
    CASE WHEN DENTAL_SERVICE_COMMENTS.DENTAL_SERVICE_ID IS NULL THEN 'No' ELSE 'Yes' END AS HAS_COMMENTS,
    'dental/show/' || TO_CHAR(DENTAL_SERVICE.ID) AS showUrl
FROM
    DENTAL.DENTAL_SERVICE
    JOIN DENTAL.DENTAL_STATUS ON DENTAL_SERVICE.STATUS = DENTAL_STATUS.ID
    LEFT JOIN DENTAL.DENTAL_SERVICE_DEPENDENTS ON DENTAL_SERVICE.ID = DENTAL_SERVICE_DEPENDENTS.DENTAL_SERVICE_ID
    LEFT JOIN DENTAL.DENTAL_SERVICE_FILES ON DENTAL_SERVICE.ID = DENTAL_SERVICE_FILES.DENTAL_SERVICE_ID
    LEFT JOIN DENTAL.DENTAL_SERVICE_COMMENTS ON DENTAL_SERVICE.ID = DENTAL_SERVICE_COMMENTS.DENTAL_SERVICE_ID
WHERE
    DENTAL_SERVICE.STATUS <> 4
  GROUP BY  DENTAL_SERVICE.ID,
    DENTAL_SERVICE.FIRST_NAME,
    DENTAL_SERVICE.LAST_NAME,
    DENTAL_SERVICE.MIDDLE_NAME,
		DENTAL_SERVICE.HEALTH_CARD_NUMBER,
		DENTAL_SERVICE.POSTAL_CODE,
		DENTAL_SERVICE.EMAIL,
	TO_CHAR(DENTAL_SERVICE.DATE_OF_BIRTH, 'YYYY-MM-DD'), DENTAL_SERVICE.STATUS,
    DENTAL_STATUS.DESCRIPTION,TO_CHAR(DENTAL_SERVICE.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS'),
    DENTAL_SERVICE.ARE_YOU_ELIGIBLE_FOR_THE_PHARMACARE_AND_EXTENDED_HEALTH_CARE_BEN,
    CASE WHEN DENTAL_SERVICE_COMMENTS.DENTAL_SERVICE_ID IS NULL THEN 'No' ELSE 'Yes' END
;

--------------------------------------------------------
--  DDL for View DENTAL_SERVICE_SUBMISSIONS_DETAILS
--------------------------------------------------------
CREATE OR REPLACE FORCE EDITIONABLE VIEW "DENTAL"."DENTAL_SERVICE_SUBMISSIONS_DETAILS" ("ID", "STATUS", "FIRST_NAME", "MIDDLE_NAME", "LAST_NAME", "DATE_OF_BIRTH", "HEALTH_CARD_NUMBER", "MAILING_ADDRESS", "CITY_OR_TOWN", "POSTAL_CODE", "PHONE", "EMAIL", "OTHER_COVERAGE", "ARE_YOU_ELIGIBLE_FOR_THE_PHARMACARE_AND_EXTENDED_HEALTH_CARE_BEN", "ELIGIBLE_PHARMACARE", "EMAIL_INSTEAD", "HAVE_CHILDREN", "ASK_DEMOGRAPHIC", "IDENTIFY_GROUPS", "GENDER", "EDUCATION", "OFTEN_BRUSH", "STATE_TEETH", "OFTEN_FLOSS", "STATE_GUMS", "LAST_SAW_DENTIST", "REASON_FOR_DENTIST", "BUY_SUPPLIES", "PAY_FOR_VISIT", "BARRIERS", "PROBLEMS", "SERVICES_NEEDED", "CREATED_AT", "FILE_ID", "FILE_NAME", "FILE_TYPE", "FILE_SIZE") AS 
  SELECT
    DENTAL_SERVICE.ID,
    DENTAL_SERVICE.STATUS,
    DENTAL_SERVICE.FIRST_NAME,
    DENTAL_SERVICE.MIDDLE_NAME,
    DENTAL_SERVICE.LAST_NAME,
    TO_CHAR(DENTAL_SERVICE.DATE_OF_BIRTH, 'YYYY-MM-DD') AS DATE_OF_BIRTH,
    DENTAL_SERVICE.HEALTH_CARD_NUMBER,
    DENTAL_SERVICE.MAILING_ADDRESS,
    DENTAL_SERVICE.CITY_OR_TOWN,
    DENTAL_SERVICE.POSTAL_CODE,
    DENTAL_SERVICE.PHONE,
    DENTAL_SERVICE.EMAIL,
    DENTAL_SERVICE.OTHER_COVERAGE,
    DENTAL_SERVICE.ARE_YOU_ELIGIBLE_FOR_THE_PHARMACARE_AND_EXTENDED_HEALTH_CARE_BEN,
    CASE
        WHEN DENTAL_SERVICE.ARE_YOU_ELIGIBLE_FOR_THE_PHARMACARE_AND_EXTENDED_HEALTH_CARE_BEN IS NULL THEN 'Not Applicable'
        ELSE CAST(DENTAL_SERVICE.ARE_YOU_ELIGIBLE_FOR_THE_PHARMACARE_AND_EXTENDED_HEALTH_CARE_BEN AS VARCHAR2(500))
    END AS ELIGIBLE_PHARMACARE,
    CASE WHEN DENTAL_SERVICE.EMAIL_INSTEAD = 1 THEN 'Yes' ELSE 'No' END AS EMAIL_INSTEAD,
    DENTAL_SERVICE.HAVE_CHILDREN,
    DENTAL_SERVICE.ASK_DEMOGRAPHIC,
		GENERAL.process_blob_value(DENTAL_SERVICE.IDENTIFY_GROUPS, 'DENTAL.DENTAL_SERVICE_GROUPS_COMMUNITIES') AS IDENTIFY_GROUPS,
    DENTAL_SERVICE.GENDER,
    DENTAL_SERVICE.EDUCATION,
    DENTAL_SERVICE.OFTEN_BRUSH,
    DENTAL_SERVICE.STATE_TEETH,
    DENTAL_SERVICE.OFTEN_FLOSS,
    DENTAL_SERVICE.STATE_GUMS,
    DENTAL_SERVICE.LAST_SAW_DENTIST,
		GENERAL.process_blob_value(DENTAL_SERVICE.REASON_FOR_DENTIST, 'DENTAL.DENTAL_SERVICE_REASONS_DENTIST') AS REASON_FOR_DENTIST,
    DENTAL_SERVICE.BUY_SUPPLIES,
		GENERAL.process_blob_value(DENTAL_SERVICE.PAY_FOR_VISIT, 'DENTAL.DENTAL_SERVICE_PAYMENT_METHODS') AS PAY_FOR_VISIT,
		GENERAL.process_blob_value(DENTAL_SERVICE.BARRIERS, 'DENTAL.DENTAL_SERVICE_BARRIERS') AS BARRIERS,
		GENERAL.process_blob_value(DENTAL_SERVICE.PROBLEMS, 'DENTAL.DENTAL_SERVICE_PROBLEMS') AS PROBLEMS,
		GENERAL.process_blob_value(DENTAL_SERVICE.SERVICES_NEEDED, 'DENTAL.DENTAL_SERVICE_NEED_SERVICES') AS SERVICES_NEEDED,
    TO_CHAR(DENTAL_SERVICE.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,
		DENTAL_SERVICE_FILES.id AS FILE_ID,
		DENTAL_SERVICE_FILES.FILE_NAME,
		DENTAL_SERVICE_FILES.FILE_TYPE,
    DENTAL_SERVICE_FILES.FILE_SIZE
FROM
    DENTAL.DENTAL_SERVICE
    LEFT JOIN DENTAL.DENTAL_SERVICE_FILES ON DENTAL_SERVICE.ID = DENTAL_SERVICE_FILES.DENTAL_SERVICE_ID
;
--------------------------------------------------------
--  DDL for View SUBMISSIONS_DENTAL_AGE_WEEK_V
--------------------------------------------------------

CREATE OR REPLACE FORCE EDITIONABLE VIEW "GENERAL"."SUBMISSIONS_DENTAL_AGE_WEEK_V" ("ID", "DEPARTMENT", "COLOR", "PERMISSIONS",
                                          "SUBMISSIONS", "AGE_RANGE") AS
  SELECT tab.owner AS id,
    cd.val_str1 AS department,
		cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
		GENERAL.GETAGERANGE(ch.date_of_birth) AS age_range
    FROM DENTAL.DENTAL_SERVICE ch
    LEFT JOIN all_tables tab ON tab.table_name = 'DENTAL_SERVICE'
    LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
		LEFT JOIN GENERAL.config cc ON cc.type = 'STATUS_CHART_COLOR' AND cc.name = tab.owner AND cc.val_str2 = GENERAL.GETAGERANGE(ch.date_of_birth)
    LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  WHERE ch.created_at > (CURRENT_DATE - INTERVAL '7' DAY)
  GROUP BY tab.owner, cd.val_str1, cp.val_str1, cc.val_str1, (GENERAL.GETAGERANGE(ch.date_of_birth))
;

--------------------------------------------------------
--  DDL for View SUBMISSIONS_DENTAL_AGE_MONTH_V
--------------------------------------------------------


CREATE OR REPLACE FORCE EDITIONABLE VIEW "GENERAL"."SUBMISSIONS_DENTAL_AGE_MONTH_V" ("ID", "DEPARTMENT", "COLOR", "PERMISSIONS", "SUBMISSIONS", "MONTHID", "AGE_RANGE") AS 
  SELECT tab.owner AS id,
  cd.val_str1 AS department,
  cc.val_str1 AS color,
  cp.val_str1 AS permissions,
  count(1) AS submissions,
  to_char(ds.created_at, 'yyyy-mm') AS monthid,
  GENERAL.GETAGERANGE(ds.date_of_birth) AS age_range
  FROM DENTAL.DENTAL_SERVICE ds
    LEFT JOIN all_tables tab ON tab.table_name = 'DENTAL_SERVICE'
    LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
    LEFT JOIN GENERAL.config cc ON cc.type = 'STATUS_CHART_COLOR' AND cc.name = tab.owner AND cc.val_str2 = GENERAL.GETAGERANGE(ds.date_of_birth)
    LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  GROUP BY tab.owner, (to_char(ds.created_at, 'yyyy-mm')), cd.val_str1, cp.val_str1, cc.val_str1, (GENERAL.GETAGERANGE(ds.date_of_birth));
--------------------------------------------------------
--  DDL for View SUBMISSIONS_DENTAL_GENDER_WEEK_V
--------------------------------------------------------

CREATE OR REPLACE FORCE EDITIONABLE VIEW "GENERAL"."SUBMISSIONS_DENTAL_GENDER_WEEK_V" ("ID", "DEPARTMENT", "COLOR", "PERMISSIONS",
                                          "SUBMISSIONS", "GENDER_NAME", "GENDER_ID") AS
SELECT
    tab.owner AS id,
    cd.val_str1 AS department,
    cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    COUNT(1) AS submissions,
    dsg.NAME as gender_name,
		cc.val_int2
FROM
    DENTAL.DENTAL_SERVICE ds
    LEFT JOIN all_tables tab ON tab.table_name = 'DENTAL_SERVICE'
		LEFT JOIN DENTAL.DENTAL_SERVICE_GENDERS dsg ON ds.GENDER = dsg.NAME
    LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
    JOIN GENERAL.config cc ON cc.val_str3 = 'DENTAL_CHART_COLOR' AND cc.val_int2 = dsg.ID AND cc.name = tab.owner
    LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
WHERE
    ds.created_at > (CURRENT_DATE - INTERVAL '7' DAY)
GROUP BY
    tab.owner, cd.val_str1, cc.val_str1, cp.val_str1, dsg.NAME, cc.val_int2
;

--------------------------------------------------------
--  DDL for View SUBMISSIONS_DENTAL_GENDER_MONTH_V
--------------------------------------------------------

CREATE OR REPLACE FORCE EDITIONABLE VIEW "GENERAL"."SUBMISSIONS_DENTAL_GENDER_MONTH_V" ("ID", "DEPARTMENT", "COLOR", "PERMISSIONS",
                                          "SUBMISSIONS", "MONTHID", "GENDER_NAME", "GENDER_ID") AS
SELECT tab.owner AS id,
    cd.val_str1 AS department,
		cc.val_str1 AS color,
    cp.val_str1 AS permissions,
    count(1) AS submissions,
    to_char(ds.created_at, 'yyyy-mm') AS monthid,
		dsg.NAME as gender_name,
		cc.val_int2
  FROM DENTAL.DENTAL_SERVICE ds
    LEFT JOIN all_tables tab ON tab.table_name = 'DENTAL_SERVICE'
    LEFT JOIN DENTAL.DENTAL_SERVICE_GENDERS dsg ON ds.GENDER = dsg.NAME
    LEFT JOIN GENERAL.config cd ON cd.type = 'SCHEMA_TITLE' AND cd.name = tab.owner
    JOIN GENERAL.config cc ON cc.val_str3 = 'DENTAL_CHART_COLOR' AND cc.val_int2 = dsg.ID AND cc.name = tab.owner
    LEFT JOIN GENERAL.config cp ON cp.type = 'SCHEMA_PERMISSION_VIEW' AND cp.name = tab.owner
  GROUP BY tab.owner, (to_char(ds.created_at, 'yyyy-mm')), cd.val_str1, cp.val_str1, cc.val_str1, dsg.NAME, cc.val_int2
;

--------------------------------------------------------
--  DDL for Index CONSTELLATION_DUPLICATED_REQUESTS_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "CONSTELLATION_HEALTH"."CONSTELLATION_DUPLICATED_REQUESTS_PK" ON "CONSTELLATION_HEALTH"."CONSTELLATION_DUPLICATED_REQUESTS" ("ID") 
  ;
--------------------------------------------------------
--  DDL for Index CONSTELLATION_HEALTH_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "CONSTELLATION_HEALTH"."CONSTELLATION_HEALTH_PK" ON "CONSTELLATION_HEALTH"."CONSTELLATION_HEALTH" ("ID") 
  ;
--------------------------------------------------------
--  DDL for Index CONSTELLATION_HEALTH_REV_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "CONSTELLATION_HEALTH"."CONSTELLATION_HEALTH_REV_PK" ON "CONSTELLATION_HEALTH"."CONSTELLATION_HEALTH_REV" ("REV_ID") 
  ;
--------------------------------------------------------
--  DDL for Index CONSTELLATION_HEALTH_REV_STATUS_INDEX
--------------------------------------------------------

  CREATE INDEX "CONSTELLATION_HEALTH"."CONSTELLATION_HEALTH_REV_STATUS_INDEX" ON "CONSTELLATION_HEALTH"."CONSTELLATION_HEALTH_REV" ("STATUS") 
  ;
--------------------------------------------------------
--  DDL for Index CONSTELLATION_HEALTH_STATUS_INDEX
--------------------------------------------------------

  CREATE INDEX "CONSTELLATION_HEALTH"."CONSTELLATION_HEALTH_STATUS_INDEX" ON "CONSTELLATION_HEALTH"."CONSTELLATION_HEALTH" ("STATUS") 
  ;

--------------------------------------------------------
--  DDL for Index CONFIG_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "GENERAL"."CONFIG_PK" ON "GENERAL"."CONFIG" ("ID") 
  ;
--------------------------------------------------------
--  DDL for Index EVENTS_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "GENERAL"."EVENTS_PK" ON "GENERAL"."EVENTS" ("ID") 
  ;
--------------------------------------------------------
--  DDL for Index PERMISSION_DATA_INDEX1
--------------------------------------------------------

  CREATE INDEX "GENERAL"."PERMISSION_DATA_INDEX1" ON "GENERAL"."PERMISSION_DATA" ("PERMISSION_NAME") 
  ;
--------------------------------------------------------
--  DDL for Index PERMISSION_DATA_INDEX2
--------------------------------------------------------

  CREATE INDEX "GENERAL"."PERMISSION_DATA_INDEX2" ON "GENERAL"."PERMISSION_DATA" ("PERMISSION_DESC") 
  ;
--------------------------------------------------------
--  DDL for Index PERMISSION_DATA_INDEX3
--------------------------------------------------------

  CREATE INDEX "GENERAL"."PERMISSION_DATA_INDEX3" ON "GENERAL"."PERMISSION_DATA" ("PERMISSION_CATEGORY") 
  ;
--------------------------------------------------------
--  DDL for Index PERMISSION_DATA_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "GENERAL"."PERMISSION_DATA_PK" ON "GENERAL"."PERMISSION_DATA" ("ID") 
  ;
--------------------------------------------------------
--  DDL for Index ROLES_DATA_INDEX1
--------------------------------------------------------

  CREATE INDEX "GENERAL"."ROLES_DATA_INDEX1" ON "GENERAL"."ROLES_DATA" ("ROLE_NAME") 
  ;
--------------------------------------------------------
--  DDL for Index ROLES_DATA_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "GENERAL"."ROLES_DATA_PK" ON "GENERAL"."ROLES_DATA" ("ID") 
  ;
--------------------------------------------------------
--  DDL for Index ROLE_PERMISSIONS_INDEX1
--------------------------------------------------------

  CREATE INDEX "GENERAL"."ROLE_PERMISSIONS_INDEX1" ON "GENERAL"."ROLE_PERMISSIONS" ("ROLE_ID") 
  ;
--------------------------------------------------------
--  DDL for Index ROLE_PERMISSIONS_INDEX2
--------------------------------------------------------

  CREATE INDEX "GENERAL"."ROLE_PERMISSIONS_INDEX2" ON "GENERAL"."ROLE_PERMISSIONS" ("PERMISSION_ID") 
  ;
--------------------------------------------------------
--  DDL for Index ROLE_PERMISSIONS_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "GENERAL"."ROLE_PERMISSIONS_PK" ON "GENERAL"."ROLE_PERMISSIONS" ("ID") 
  ;

--------------------------------------------------------
--  DDL for Index USER_DATA_INDEX1
--------------------------------------------------------

  CREATE INDEX "GENERAL"."USER_DATA_INDEX1" ON "GENERAL"."USER_DATA" ("USER_NAME") 
  ;
--------------------------------------------------------
--  DDL for Index USER_DATA_INDEX2
--------------------------------------------------------

  CREATE INDEX "GENERAL"."USER_DATA_INDEX2" ON "GENERAL"."USER_DATA" ("USER_EMAIL") 
  ;
--------------------------------------------------------
--  DDL for Index USER_DATA_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "GENERAL"."USER_DATA_PK" ON "GENERAL"."USER_DATA" ("ID") 
  ;
--------------------------------------------------------
--  DDL for Index USER_ROLES_INDEX1
--------------------------------------------------------

  CREATE INDEX "GENERAL"."USER_ROLES_INDEX1" ON "GENERAL"."USER_ROLES" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index USER_ROLES_INDEX2
--------------------------------------------------------

  CREATE INDEX "GENERAL"."USER_ROLES_INDEX2" ON "GENERAL"."USER_ROLES" ("ROLE_ID") 
  ;
--------------------------------------------------------
--  DDL for Index USER_ROLES_INDEX3
--------------------------------------------------------

  CREATE INDEX "GENERAL"."USER_ROLES_INDEX3" ON "GENERAL"."USER_ROLES" ("USER_ID", "ROLE_ID") 
  ;
--------------------------------------------------------
--  DDL for Index USER_ROLES_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "GENERAL"."USER_ROLES_PK" ON "GENERAL"."USER_ROLES" ("ID") 
  ;

--------------------------------------------------------
--  DDL for Index ACTION_LOGS_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "GENERAL"."ACTION_LOGS_PK" ON "GENERAL"."ACTION_LOGS" ("ID")
  ;

--------------------------------------------------------
--  DDL for Index ACTION_LOGS_IDX
--------------------------------------------------------

  CREATE INDEX "GENERAL"."ACTION_LOGS_IDX" ON "GENERAL"."ACTION_LOGS" ("USER_ID")
  ;

--------------------------------------------------------
--  DDL for Index ACTION_TYPES_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "GENERAL"."ACTION_TYPES_PK" ON "GENERAL"."ACTION_TYPES" ("ID")
  ;

--------------------------------------------------------
--  DDL for Index HIPMA_DUPLICATED_REQUESTS_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "HIPMA"."HIPMA_DUPLICATED_REQUESTS_PK" ON "HIPMA"."HIPMA_DUPLICATED_REQUESTS" ("ID") 
  ;

--------------------------------------------------------
--  DDL for Index MIDWIFERY_DUPLICATED_REQUESTS_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "MIDWIFERY"."MIDWIFERY_DUPLICATED_REQUESTS_PK" ON "MIDWIFERY"."MIDWIFERY_DUPLICATED_REQUESTS" ("ID") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_CONFIRMATION_NUMBER
--------------------------------------------------------

  CREATE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_CONFIRMATION_NUMBER" ON "MIDWIFERY"."MIDWIFERY_SERVICES" ("CONFIRMATION_NUMBER") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_CREATED
--------------------------------------------------------

  CREATE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_CREATED" ON "MIDWIFERY"."MIDWIFERY_SERVICES" ("CREATED_AT") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_DOB
--------------------------------------------------------

  CREATE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_DOB" ON "MIDWIFERY"."MIDWIFERY_SERVICES" ("DATE_OF_BIRTH") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_FIRST_NAME
--------------------------------------------------------

  CREATE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_FIRST_NAME" ON "MIDWIFERY"."MIDWIFERY_SERVICES" ("FIRST_NAME") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_LAST_NAME
--------------------------------------------------------

  CREATE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_LAST_NAME" ON "MIDWIFERY"."MIDWIFERY_SERVICES" ("LAST_NAME") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_PK" ON "MIDWIFERY"."MIDWIFERY_SERVICES" ("ID") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_REV_CONFIRMATION_NUMBER
--------------------------------------------------------

  CREATE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_REV_CONFIRMATION_NUMBER" ON "MIDWIFERY"."MIDWIFERY_SERVICES_REV" ("CONFIRMATION_NUMBER") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_REV_CREATED
--------------------------------------------------------

  CREATE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_REV_CREATED" ON "MIDWIFERY"."MIDWIFERY_SERVICES_REV" ("CREATED_AT") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_REV_DOB
--------------------------------------------------------

  CREATE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_REV_DOB" ON "MIDWIFERY"."MIDWIFERY_SERVICES_REV" ("DATE_OF_BIRTH") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_REV_FIRST_NAME
--------------------------------------------------------

  CREATE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_REV_FIRST_NAME" ON "MIDWIFERY"."MIDWIFERY_SERVICES_REV" ("FIRST_NAME") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_REV_LAST_NAME
--------------------------------------------------------

  CREATE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_REV_LAST_NAME" ON "MIDWIFERY"."MIDWIFERY_SERVICES_REV" ("LAST_NAME") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_REV_PK
--------------------------------------------------------

  -- Revision-history PK is per revision, so it must be on REV_ID (like every other
  -- module's *_REV_PK). On "ID" it allowed only one revision per submission, so a
  -- second update collided (ORA-00001 MIDWIFERY_SERVICES_REV_PK).
  CREATE UNIQUE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_REV_PK" ON "MIDWIFERY"."MIDWIFERY_SERVICES_REV" ("REV_ID")
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_REV_STATUS
--------------------------------------------------------

  CREATE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_REV_STATUS" ON "MIDWIFERY"."MIDWIFERY_SERVICES_REV" ("STATUS") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_REV_UPDATED
--------------------------------------------------------

  CREATE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_REV_UPDATED" ON "MIDWIFERY"."MIDWIFERY_SERVICES_REV" ("UPDATED_AT") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_STATUS
--------------------------------------------------------

  CREATE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_STATUS" ON "MIDWIFERY"."MIDWIFERY_SERVICES" ("STATUS") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_SERVICES_UPDATED
--------------------------------------------------------

  CREATE INDEX "MIDWIFERY"."MIDWIFERY_SERVICES_UPDATED" ON "MIDWIFERY"."MIDWIFERY_SERVICES" ("UPDATED_AT") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_STATUS_DESCRIPTION
--------------------------------------------------------

  CREATE INDEX "MIDWIFERY"."MIDWIFERY_STATUS_DESCRIPTION" ON "MIDWIFERY"."MIDWIFERY_STATUS" ("DESCRIPTION") 
  ;
--------------------------------------------------------
--  DDL for Index MIDWIFERY_STATUS_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "MIDWIFERY"."MIDWIFERY_STATUS_PK" ON "MIDWIFERY"."MIDWIFERY_STATUS" ("ID") 
  ;

--------------------------------------------------------
--  DDL for Index DENTAL_DUPLICATED_REQUESTS_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "DENTAL"."DENTAL_DUPLICATED_REQUESTS_PK" ON "DENTAL"."DENTAL_DUPLICATED_REQUESTS" ("ID")
  ;
--------------------------------------------------------
--  DDL for Index DENTAL_SERVICE_CREATED
--------------------------------------------------------

  CREATE INDEX "DENTAL"."DENTAL_SERVICE_CREATED" ON "DENTAL"."DENTAL_SERVICE" ("CREATED_AT")
  ;
--------------------------------------------------------
--  DDL for Index DENTAL_SERVICE_DOB
--------------------------------------------------------

  CREATE INDEX "DENTAL"."DENTAL_SERVICE_DOB" ON "DENTAL"."DENTAL_SERVICE" ("DATE_OF_BIRTH")
  ;
--------------------------------------------------------
--  DDL for Index DENTAL_SERVICE_FIRST_NAME
--------------------------------------------------------

  CREATE INDEX "DENTAL"."DENTAL_SERVICE_FIRST_NAME" ON "DENTAL"."DENTAL_SERVICE" ("FIRST_NAME")
  ;
--------------------------------------------------------
--  DDL for Index DENTAL_SERVICE_LAST_NAME
--------------------------------------------------------

  CREATE INDEX "DENTAL"."DENTAL_SERVICE_LAST_NAME" ON "DENTAL"."DENTAL_SERVICE" ("LAST_NAME")
  ;
--------------------------------------------------------
--  DDL for Index DENTAL_SERVICE_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "DENTAL"."DENTAL_SERVICE_PK" ON "DENTAL"."DENTAL_SERVICE" ("ID")
  ;
--------------------------------------------------------
--  DDL for Index DENTAL_SERVICE_REV_CREATED
--------------------------------------------------------

  CREATE INDEX "DENTAL"."DENTAL_SERVICE_REV_CREATED" ON "DENTAL"."DENTAL_SERVICE_REV" ("CREATED_AT")
  ;
--------------------------------------------------------
--  DDL for Index DENTAL_SERVICE_REV_DOB
--------------------------------------------------------

  CREATE INDEX "DENTAL"."DENTAL_SERVICE_REV_DOB" ON "DENTAL"."DENTAL_SERVICE_REV" ("DATE_OF_BIRTH")
  ;
--------------------------------------------------------
--  DDL for Index DENTAL_SERVICE_REV_FIRST_NAME
--------------------------------------------------------

  CREATE INDEX "DENTAL"."DENTAL_SERVICE_REV_FIRST_NAME" ON "DENTAL"."DENTAL_SERVICE_REV" ("FIRST_NAME")
  ;
--------------------------------------------------------
--  DDL for Index DENTAL_SERVICE_REV_LAST_NAME
--------------------------------------------------------

  CREATE INDEX "DENTAL"."DENTAL_SERVICE_REV_LAST_NAME" ON "DENTAL"."DENTAL_SERVICE_REV" ("LAST_NAME")
  ;
--------------------------------------------------------
--  DDL for Index DENTAL_SERVICE_REV_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "DENTAL"."DENTAL_SERVICE_REV_PK" ON "DENTAL"."DENTAL_SERVICE_REV" ("REV_ID")
  ;
--------------------------------------------------------
--  DDL for Index DENTAL_STATUS_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "DENTAL"."DENTAL_STATUS_PK" ON "DENTAL"."DENTAL_STATUS" ("ID")
  ;

--------------------------------------------------------
--  DDL for Index DENTAL_SERVICE_INTERNAL_FIELDS_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "DENTAL"."DENTAL_SERVICE_INTERNAL_FIELDS_PK" ON "DENTAL"."DENTAL_SERVICE_INTERNAL_FIELDS" ("ID")
  ;

--------------------------------------------------------
--  DDL for Index DENTAL_SERVICE_COMMENTS_PK
--------------------------------------------------------

  CREATE UNIQUE INDEX "DENTAL"."DENTAL_SERVICE_COMMENTS_PK" ON "DENTAL"."DENTAL_SERVICE_COMMENTS" ("ID")
  ;


--------------------------------------------------------
--  DDL for Trigger CONSTELLATION_HEALTH_LOG_SUBMISSIONS
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE TRIGGER "CONSTELLATION_HEALTH"."CONSTELLATION_HEALTH_LOG_SUBMISSIONS" 
BEFORE DELETE OR INSERT OR UPDATE ON CONSTELLATION_HEALTH.CONSTELLATION_HEALTH 
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
DECLARE
    v_guid RAW(20) := SYS_GUID();
    v_rev_id NUMBER;
    v_cur_schema NVARCHAR2(500);
    v_cur_table NVARCHAR2(500);
BEGIN

    SELECT
        OWNER,
        TABLE_NAME
    INTO
        v_cur_schema,
        v_cur_table
    FROM ALL_TABLES
    WHERE TABLE_NAME = 'CONSTELLATION_HEALTH';

    IF INSERTING
    THEN
        INSERT INTO GENERAL.events (schema_name, table_name, entity_id, event_type, title, event_by, entity_data, guid, uuid)
		VALUES (v_cur_schema, v_cur_table, :new.id, 1, 'INSERT', 'system', NULL, v_guid, :NEW.ROWID);
    END IF;

    IF UPDATING
    THEN
        INSERT INTO CONSTELLATION_HEALTH.CONSTELLATION_HEALTH_REV (ID, STATUS, FIRST_NAME, LAST_NAME, IS_THIS_YOUR_LEGAL_NAME_, YOUR_LEGAL_NAME, PRONOUNS, DATE_OF_BIRTH, HAVE_YHCIP, HEALTH_CARE_CARD, PROVINCE, YHCIP, POSTAL_CODE, PREFER_TO_BE_CONTACTED, PHONE_NUMBER, EMAIL_ADDRESS, LEAVE_PHONE_MESSAGE, LANGUAGE_PREFER_TO_RECEIVE_SERVICES, PREFERRED_LANGUAGE, INTERPRETATION_SUPPORT, FAMILY_PHYSICIAN, CURRENT_FAMILY_PHYSICIAN, ACCESSING_HEALTH_CARE, DIAGNOSIS, DEMOGRAPHICS_GROUPS, INCLUDE_FAMILY_MEMBERS, CREATED_AT, UPDATED_AT)
        VALUES (:OLD.ID, :OLD.STATUS, :OLD.FIRST_NAME, :OLD.LAST_NAME, :OLD.IS_THIS_YOUR_LEGAL_NAME_, :OLD.YOUR_LEGAL_NAME, :OLD.PRONOUNS, :OLD.DATE_OF_BIRTH, :OLD.HAVE_YHCIP, :OLD.HEALTH_CARE_CARD, :OLD.PROVINCE, :OLD.YHCIP, :OLD.POSTAL_CODE, :OLD.PREFER_TO_BE_CONTACTED, :OLD.PHONE_NUMBER, :OLD.EMAIL_ADDRESS, :OLD.LEAVE_PHONE_MESSAGE, :OLD.LANGUAGE_PREFER_TO_RECEIVE_SERVICES, :OLD.PREFERRED_LANGUAGE, :OLD.INTERPRETATION_SUPPORT, :OLD.FAMILY_PHYSICIAN, :OLD.CURRENT_FAMILY_PHYSICIAN, :OLD.ACCESSING_HEALTH_CARE, :OLD.DIAGNOSIS, :OLD.DEMOGRAPHICS_GROUPS, :OLD.INCLUDE_FAMILY_MEMBERS, :OLD.CREATED_AT, :OLD.UPDATED_AT)
        RETURNING REV_ID INTO v_rev_id;
        INSERT INTO GENERAL.events (schema_name, table_name, entity_id, event_type, title, event_by, entity_data, guid, uuid, rev_id)
		VALUES (v_cur_schema, v_cur_table, :old.id, 3, 'UPDATE_OLD', 'system', NULL, v_guid, :OLD.ROWID, v_rev_id);
    END IF;

    IF DELETING
    THEN
        INSERT INTO CONSTELLATION_HEALTH.CONSTELLATION_HEALTH_REV (ID, STATUS, FIRST_NAME, LAST_NAME, IS_THIS_YOUR_LEGAL_NAME_, YOUR_LEGAL_NAME, PRONOUNS, DATE_OF_BIRTH, HAVE_YHCIP, HEALTH_CARE_CARD, PROVINCE, YHCIP, POSTAL_CODE, PREFER_TO_BE_CONTACTED, PHONE_NUMBER, EMAIL_ADDRESS, LEAVE_PHONE_MESSAGE, LANGUAGE_PREFER_TO_RECEIVE_SERVICES, PREFERRED_LANGUAGE, INTERPRETATION_SUPPORT, FAMILY_PHYSICIAN, CURRENT_FAMILY_PHYSICIAN, ACCESSING_HEALTH_CARE, DIAGNOSIS, DEMOGRAPHICS_GROUPS, INCLUDE_FAMILY_MEMBERS, CREATED_AT, UPDATED_AT)
        VALUES (:OLD.ID, :OLD.STATUS, :OLD.FIRST_NAME, :OLD.LAST_NAME, :OLD.IS_THIS_YOUR_LEGAL_NAME_, :OLD.YOUR_LEGAL_NAME, :OLD.PRONOUNS, :OLD.DATE_OF_BIRTH, :OLD.HAVE_YHCIP, :OLD.HEALTH_CARE_CARD, :OLD.PROVINCE, :OLD.YHCIP, :OLD.POSTAL_CODE, :OLD.PREFER_TO_BE_CONTACTED, :OLD.PHONE_NUMBER, :OLD.EMAIL_ADDRESS, :OLD.LEAVE_PHONE_MESSAGE, :OLD.LANGUAGE_PREFER_TO_RECEIVE_SERVICES, :OLD.PREFERRED_LANGUAGE, :OLD.INTERPRETATION_SUPPORT, :OLD.FAMILY_PHYSICIAN, :OLD.CURRENT_FAMILY_PHYSICIAN, :OLD.ACCESSING_HEALTH_CARE, :OLD.DIAGNOSIS, :OLD.DEMOGRAPHICS_GROUPS, :OLD.INCLUDE_FAMILY_MEMBERS, :OLD.CREATED_AT, :OLD.UPDATED_AT)
        RETURNING REV_ID INTO v_rev_id;
        INSERT INTO GENERAL.events (schema_name, table_name, entity_id, event_type, title, event_by, entity_data, guid, uuid, rev_id)
		VALUES (v_cur_schema, v_cur_table, :old.id, 4, 'DELETE', 'system', NULL, v_guid, :OLD.ROWID, v_rev_id);
    END IF;
END;
/
ALTER TRIGGER "CONSTELLATION_HEALTH"."CONSTELLATION_HEALTH_LOG_SUBMISSIONS" ENABLE;
--------------------------------------------------------
--  CONSTELLATION_HEALTH_DUPLICATED_REQUESTS
--------------------------------------------------------

CREATE OR REPLACE TRIGGER "CONSTELLATION_HEALTH"."CONSTELLATION_HEALTH_DUPLICATED_REQUESTS"
BEFORE INSERT ON CONSTELLATION_HEALTH.CONSTELLATION_HEALTH
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
DECLARE
  exist_record NUMBER;
  oldest_request NUMBER;
BEGIN
	SELECT COUNT(*)
	INTO exist_record
	FROM CONSTELLATION_HEALTH.CONSTELLATION_HEALTH
	WHERE  STATUS  <> 4  AND YOUR_LEGAL_NAME  = :NEW.YOUR_LEGAL_NAME AND DATE_OF_BIRTH  = :NEW.DATE_OF_BIRTH ;
	IF exist_record > 0 THEN
		SELECT ID
		INTO oldest_request
		FROM CONSTELLATION_HEALTH.CONSTELLATION_HEALTH
		WHERE STATUS <> 4  AND YOUR_LEGAL_NAME = :NEW.YOUR_LEGAL_NAME  AND DATE_OF_BIRTH  = :NEW.DATE_OF_BIRTH
		ORDER BY CREATED_AT ASC FETCH FIRST 1 ROW ONLY;

		INSERT INTO CONSTELLATION_HEALTH.CONSTELLATION_DUPLICATED_REQUESTS  (ORIGINAL_ID , DUPLICATED_ID) VALUES (oldest_request, :NEW.ID);

    END IF;

END;
/
ALTER TRIGGER "CONSTELLATION_HEALTH"."CONSTELLATION_HEALTH_DUPLICATED_REQUESTS" ENABLE;

--------------------------------------------------------
--  CONSTELLATION_DUPLICATED_REQUESTS_DELETE_UPDATES
--------------------------------------------------------
CREATE OR REPLACE TRIGGER CONSTELLATION_HEALTH.CONSTELLATION_DUPLICATED_REQUESTS_DELETE_UPDATES
AFTER UPDATE ON CONSTELLATION_HEALTH.CONSTELLATION_HEALTH
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
BEGIN
    IF :NEW.STATUS = 4 THEN
				DELETE FROM CONSTELLATION_HEALTH.CONSTELLATION_DUPLICATED_REQUESTS
				WHERE ORIGINAL_ID = :NEW.ID;

				DELETE FROM CONSTELLATION_HEALTH.CONSTELLATION_DUPLICATED_REQUESTS
				WHERE DUPLICATED_ID = :NEW.ID;
		END IF;
END;
/
ALTER TRIGGER "CONSTELLATION_HEALTH"."CONSTELLATION_DUPLICATED_REQUESTS_DELETE_UPDATES" ENABLE;

--------------------------------------------------------
--  CONSTELLATION_HEALTH_DUPLICATED_REQUESTS_ACTION_LOG
--------------------------------------------------------
CREATE OR REPLACE TRIGGER "CONSTELLATION_HEALTH"."CONSTELLATION_HEALTH_DUPLICATED_REQUESTS_ACTION_LOG"
AFTER INSERT ON CONSTELLATION_HEALTH.CONSTELLATION_DUPLICATED_REQUESTS
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
DECLARE
log_data VARCHAR2(250);
BEGIN
	log_data := '{"ORIGINAL_ID":' || :NEW.ORIGINAL_ID || ', "DUPLICATED_ID": ' || :NEW.DUPLICATED_ID || '}';

	INSERT INTO GENERAL.ACTION_LOGS ( ACTION_TYPE, TITLE, ACTION_DATE, SUBMISSION_ID, SCHEMA_NAME, TABLE_NAME, ACTION_DATA)
  VALUES ( 6, 'Duplicated Warning Detected', SYSTIMESTAMP, :NEW.ID, 'CONSTELLATION_HEALTH', 'CONSTELLATION_DUPLICATED_REQUESTS', UTL_RAW.CAST_TO_RAW(log_data));
END;
/
ALTER TRIGGER "CONSTELLATION_HEALTH"."CONSTELLATION_HEALTH_DUPLICATED_REQUESTS_ACTION_LOG" ENABLE;

--------------------------------------------------------
--  DDL for Trigger HEALTH_INFORMATION_LOG_SUBMISSIONS
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE TRIGGER "HIPMA"."HEALTH_INFORMATION_LOG_SUBMISSIONS" 
AFTER DELETE OR INSERT OR UPDATE ON HIPMA.HEALTH_INFORMATION
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
DECLARE
    v_guid RAW(20) := SYS_GUID();
    v_rev_id NUMBER;
    v_cur_schema NVARCHAR2(500);
    v_cur_table NVARCHAR2(500);
BEGIN

    SELECT
        OWNER,
        TABLE_NAME
    INTO
        v_cur_schema,
        v_cur_table
    FROM ALL_TABLES
    WHERE TABLE_NAME = 'HEALTH_INFORMATION';

    IF INSERTING
    THEN
        INSERT INTO GENERAL.events (schema_name, table_name, entity_id, event_type, title, event_by, entity_data, guid, uuid)
		VALUES (v_cur_schema, v_cur_table, :new.id, 1, 'INSERT', 'system', NULL, v_guid, :NEW.ROWID);
    END IF;

    IF UPDATING
    THEN
        INSERT INTO HIPMA.HEALTH_INFORMATION_REV (ID, CONFIRMATION_NUMBER, STATUS, WHAT_TYPE_OF_REQUEST_DO_YOU_WANT_TO_MAKE_, ARE_YOU_REQUESTING_ACCESS_TO_YOUR_OWN_PERSONAL_HEALTH_INFORMATI, SELECT_THE_SITUATION_THAT_APPLIES_, FIRST_NAME_BEHALF, LAST_NAME_BEHALF, COMPANY_OR_ORGANIZATION_OPTIONAL_BEHALF, ADDRESS_BEHALF, CITY_OR_TOWN_BEHALF, POSTAL_CODE_BEHALF, EMAIL_ADDRESS_BEHALF, PHONE_NUMBER_BEHALF, FIRST_NAME, LAST_NAME, DATE_OF_BIRTH, ADDRESS, CITY_OR_TOWN, POSTAL_CODE, EMAIL_ADDRESS, PHONE_NUMBER, GET_A_COPY_OF_YOUR_HEALTH_INFORMATION_, GET_A_COPY_OF_YOUR_ACTIVITY_REQUEST, NAME_OF_HEALTH_AND_SOCIAL_SERVICES_PROGRAM_AREA_OPTIONAL_, INDICATE_THE_HSS_SYSTEM_S_YOU_WOULD_LIKE_A_RECORD_OF_USER_ACTIV, PROVIDE_DETAILS_ABOUT_YOUR_REQUEST_, DATE_FROM_, DATE_TO_, DATE_RANGE_IS_UNKNOWN_OR_I_NEED_HELP_IDENTIFYING_THE_DATE_RANGE, I_AFFIRM_THE_INFORMATION_ABOVE_TO_BE_TRUE_AND_ACCURATE_, ISSUED_IDENTIFICATION, CREATED_AT, UPDATED_AT)
        VALUES (:OLD.ID, :OLD.CONFIRMATION_NUMBER, :OLD.STATUS, :OLD.WHAT_TYPE_OF_REQUEST_DO_YOU_WANT_TO_MAKE_, :OLD.ARE_YOU_REQUESTING_ACCESS_TO_YOUR_OWN_PERSONAL_HEALTH_INFORMATI, :OLD.SELECT_THE_SITUATION_THAT_APPLIES_, :OLD.FIRST_NAME_BEHALF, :OLD.LAST_NAME_BEHALF, :OLD.COMPANY_OR_ORGANIZATION_OPTIONAL_BEHALF, :OLD.ADDRESS_BEHALF, :OLD.CITY_OR_TOWN_BEHALF, :OLD.POSTAL_CODE_BEHALF, :OLD.EMAIL_ADDRESS_BEHALF, :OLD.PHONE_NUMBER_BEHALF, :OLD.FIRST_NAME, :OLD.LAST_NAME, :OLD.DATE_OF_BIRTH, :OLD.ADDRESS, :OLD.CITY_OR_TOWN, :OLD.POSTAL_CODE, :OLD.EMAIL_ADDRESS, :OLD.PHONE_NUMBER, :OLD.GET_A_COPY_OF_YOUR_HEALTH_INFORMATION_, :OLD.GET_A_COPY_OF_YOUR_ACTIVITY_REQUEST, :OLD.NAME_OF_HEALTH_AND_SOCIAL_SERVICES_PROGRAM_AREA_OPTIONAL_, :OLD.INDICATE_THE_HSS_SYSTEM_S_YOU_WOULD_LIKE_A_RECORD_OF_USER_ACTIV, :OLD.PROVIDE_DETAILS_ABOUT_YOUR_REQUEST_, :OLD.DATE_FROM_, :OLD.DATE_TO_, :OLD.DATE_RANGE_IS_UNKNOWN_OR_I_NEED_HELP_IDENTIFYING_THE_DATE_RANGE, :OLD.I_AFFIRM_THE_INFORMATION_ABOVE_TO_BE_TRUE_AND_ACCURATE_, :OLD.ISSUED_IDENTIFICATION, :OLD.CREATED_AT, :OLD.UPDATED_AT)
        RETURNING REV_ID INTO v_rev_id;
        INSERT INTO GENERAL.events (schema_name, table_name, entity_id, event_type, title, event_by, entity_data, guid, uuid, rev_id)
		VALUES (v_cur_schema, v_cur_table, :old.id, 3, 'UPDATE_OLD', 'system', NULL, v_guid, :OLD.ROWID, v_rev_id);
    END IF;

    IF DELETING
    THEN
        INSERT INTO HIPMA.HEALTH_INFORMATION_REV (ID, CONFIRMATION_NUMBER, STATUS, WHAT_TYPE_OF_REQUEST_DO_YOU_WANT_TO_MAKE_, ARE_YOU_REQUESTING_ACCESS_TO_YOUR_OWN_PERSONAL_HEALTH_INFORMATI, SELECT_THE_SITUATION_THAT_APPLIES_, FIRST_NAME_BEHALF, LAST_NAME_BEHALF, COMPANY_OR_ORGANIZATION_OPTIONAL_BEHALF, ADDRESS_BEHALF, CITY_OR_TOWN_BEHALF, POSTAL_CODE_BEHALF, EMAIL_ADDRESS_BEHALF, PHONE_NUMBER_BEHALF, FIRST_NAME, LAST_NAME, DATE_OF_BIRTH, ADDRESS, CITY_OR_TOWN, POSTAL_CODE, EMAIL_ADDRESS, PHONE_NUMBER, GET_A_COPY_OF_YOUR_HEALTH_INFORMATION_, GET_A_COPY_OF_YOUR_ACTIVITY_REQUEST, NAME_OF_HEALTH_AND_SOCIAL_SERVICES_PROGRAM_AREA_OPTIONAL_, INDICATE_THE_HSS_SYSTEM_S_YOU_WOULD_LIKE_A_RECORD_OF_USER_ACTIV, PROVIDE_DETAILS_ABOUT_YOUR_REQUEST_, DATE_FROM_, DATE_TO_, DATE_RANGE_IS_UNKNOWN_OR_I_NEED_HELP_IDENTIFYING_THE_DATE_RANGE, I_AFFIRM_THE_INFORMATION_ABOVE_TO_BE_TRUE_AND_ACCURATE_, ISSUED_IDENTIFICATION, CREATED_AT, UPDATED_AT)
        VALUES (:OLD.ID, :OLD.CONFIRMATION_NUMBER, :OLD.STATUS, :OLD.WHAT_TYPE_OF_REQUEST_DO_YOU_WANT_TO_MAKE_, :OLD.ARE_YOU_REQUESTING_ACCESS_TO_YOUR_OWN_PERSONAL_HEALTH_INFORMATI, :OLD.SELECT_THE_SITUATION_THAT_APPLIES_, :OLD.FIRST_NAME_BEHALF, :OLD.LAST_NAME_BEHALF, :OLD.COMPANY_OR_ORGANIZATION_OPTIONAL_BEHALF, :OLD.ADDRESS_BEHALF, :OLD.CITY_OR_TOWN_BEHALF, :OLD.POSTAL_CODE_BEHALF, :OLD.EMAIL_ADDRESS_BEHALF, :OLD.PHONE_NUMBER_BEHALF, :OLD.FIRST_NAME, :OLD.LAST_NAME, :OLD.DATE_OF_BIRTH, :OLD.ADDRESS, :OLD.CITY_OR_TOWN, :OLD.POSTAL_CODE, :OLD.EMAIL_ADDRESS, :OLD.PHONE_NUMBER, :OLD.GET_A_COPY_OF_YOUR_HEALTH_INFORMATION_, :OLD.GET_A_COPY_OF_YOUR_ACTIVITY_REQUEST, :OLD.NAME_OF_HEALTH_AND_SOCIAL_SERVICES_PROGRAM_AREA_OPTIONAL_, :OLD.INDICATE_THE_HSS_SYSTEM_S_YOU_WOULD_LIKE_A_RECORD_OF_USER_ACTIV, :OLD.PROVIDE_DETAILS_ABOUT_YOUR_REQUEST_, :OLD.DATE_FROM_, :OLD.DATE_TO_, :OLD.DATE_RANGE_IS_UNKNOWN_OR_I_NEED_HELP_IDENTIFYING_THE_DATE_RANGE, :OLD.I_AFFIRM_THE_INFORMATION_ABOVE_TO_BE_TRUE_AND_ACCURATE_, :OLD.ISSUED_IDENTIFICATION, :OLD.CREATED_AT, :OLD.UPDATED_AT)
        RETURNING REV_ID INTO v_rev_id;
        INSERT INTO GENERAL.events (schema_name, table_name, entity_id, event_type, title, event_by, entity_data, guid, uuid, rev_id)
		VALUES (v_cur_schema, v_cur_table, :old.id, 4, 'DELETE', 'system', NULL, v_guid, :OLD.ROWID, v_rev_id);
    END IF;
END;
/
ALTER TRIGGER "HIPMA"."HEALTH_INFORMATION_LOG_SUBMISSIONS" ENABLE;
--------------------------------------------------------
--  Trigger HEALTH_INFORMATION_DUPLICATED_REQUESTS
--------------------------------------------------------

CREATE OR REPLACE EDITIONABLE TRIGGER "HIPMA"."HEALTH_INFORMATION_DUPLICATED_REQUESTS"
BEFORE INSERT ON HIPMA.HEALTH_INFORMATION
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
DECLARE
exist_record NUMBER;
oldest_request NUMBER;

BEGIN
	SELECT COUNT(*)
	INTO exist_record
	FROM HIPMA.HEALTH_INFORMATION
	WHERE  status = 1 AND FIRST_NAME = :NEW.FIRST_NAME  AND LAST_NAME  = :NEW.LAST_NAME AND DATE_OF_BIRTH  = :NEW.DATE_OF_BIRTH;
	IF exist_record > 0 THEN
		SELECT health_information.id
		INTO oldest_request
		FROM HIPMA.health_information
		WHERE STATUS = 1 AND FIRST_NAME = :NEW.FIRST_NAME AND LAST_NAME  = :NEW.LAST_NAME AND DATE_OF_BIRTH  = :NEW.DATE_OF_BIRTH
		ORDER BY CREATED_AT ASC FETCH FIRST 1 ROW ONLY;

		INSERT INTO HIPMA.HIPMA_DUPLICATED_REQUESTS (ORIGINAL_ID , DUPLICATED_ID) VALUES (oldest_request, :NEW.ID);

  END IF;

END;
/
ALTER TRIGGER "HIPMA"."HEALTH_INFORMATION_DUPLICATED_REQUESTS" ENABLE;

--------------------------------------------------------
--  Trigger HIPMA_DUPLICATED_REQUESTS_DELETE_UPDATES
--------------------------------------------------------
CREATE OR REPLACE TRIGGER HIPMA.HIPMA_DUPLICATED_REQUESTS_DELETE_UPDATES
AFTER UPDATE ON HIPMA.HEALTH_INFORMATION
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
BEGIN
    IF :NEW.STATUS = 2 THEN
				DELETE FROM HIPMA.HIPMA_DUPLICATED_REQUESTS
				WHERE ORIGINAL_ID = :NEW.ID;

				DELETE FROM HIPMA.HIPMA_DUPLICATED_REQUESTS
				WHERE DUPLICATED_ID = :NEW.ID;
		END IF;
END;
/
ALTER TRIGGER "HIPMA"."HIPMA_DUPLICATED_REQUESTS_DELETE_UPDATES" ENABLE;

--------------------------------------------------------
--  Trigger HIPMA_DUPLICATED_REQUESTS_ACTION_LOG
--------------------------------------------------------
CREATE OR REPLACE TRIGGER "HIPMA"."HIPMA_DUPLICATED_REQUESTS_ACTION_LOG"
AFTER INSERT ON HIPMA.HIPMA_DUPLICATED_REQUESTS
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
DECLARE
log_data VARCHAR2(250);
BEGIN
	log_data := '{"ORIGINAL_ID":' || :NEW.ORIGINAL_ID || ', "DUPLICATED_ID": ' || :NEW.DUPLICATED_ID || '}';

	INSERT INTO GENERAL.ACTION_LOGS ( ACTION_TYPE, TITLE, ACTION_DATE, SUBMISSION_ID, SCHEMA_NAME, TABLE_NAME, ACTION_DATA)
  VALUES ( 6, 'Duplicated Warning Detected', SYSTIMESTAMP, :NEW.ID, 'HIPMA', 'HEALTH_INFORMATION_DUPLICATED_REQUESTS', UTL_RAW.CAST_TO_RAW(log_data));
END;
/
ALTER TRIGGER "HIPMA"."HIPMA_DUPLICATED_REQUESTS_ACTION_LOG" ENABLE;

--------------------------------------------------------
--  DDL for Trigger MIDWIFERY_SERVICES_LOG_SUBMISSIONS
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE TRIGGER "MIDWIFERY"."MIDWIFERY_SERVICES_LOG_SUBMISSIONS" 
AFTER DELETE OR INSERT OR UPDATE ON MIDWIFERY.MIDWIFERY_SERVICES 
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW  
DECLARE
    v_guid RAW(20) := SYS_GUID();
    v_rev_id NUMBER;
    v_cur_schema NVARCHAR2(500);
    v_cur_table NVARCHAR2(500);
BEGIN

    SELECT
        OWNER,
        TABLE_NAME
    INTO
        v_cur_schema,
        v_cur_table
    FROM ALL_TABLES
    WHERE TABLE_NAME = 'MIDWIFERY_SERVICES';

    IF INSERTING
    THEN
        INSERT INTO GENERAL.events (schema_name, table_name, entity_id, event_type, title, event_by, entity_data, guid, uuid)
		VALUES (v_cur_schema, v_cur_table, :new.id, 1, 'INSERT', 'system', NULL, v_guid, :NEW.ROWID);
    END IF;

    IF UPDATING
    THEN
        INSERT INTO MIDWIFERY.MIDWIFERY_SERVICES_REV (ID, CONFIRMATION_NUMBER, STATUS, FIRST_NAME, LAST_NAME, PREFERRED_NAME, PRONOUNS, DATE_OF_BIRTH, YUKON_HEALTH_INSURANCE, COMMUNITY_LOCATED, PREFERRED_LANGUAGE, NEED_INTERPRETATION, PREFERRED_PHONE, PREFERRED_EMAIL, OKAY_TO_LEAVE_MESSAGE, PREFER_TO_BE_CONTACTED, WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, DUE_DATE, DATE_CONFIRMED, FIRST_PREGNANCY, HOW_MANY_VAGINAL_BIRTHS, HOW_MANY_C_SECTION_BIRTHS, COMPLICATIONS_WITH_PREVIOUS, PROVIDE_DETAILS, MIDWIFE_BEFORE, WHERE_TO_GIVE_BIRTH, MEDICAL_CONCERNS, PROVIDE_DETAILS2, HAVE_YOU_HAD_PRIMARY_HEALTH_CARE, MENSTRUAL_CYCLE_LENGTH, FAMILY_PHYSICIAN, PHYSICIAN_S_NAME, MAJOR_MEDICAL_CONDITIONS, PROVIDE_DETAILS3, DO_YOU_IDENTIFY_WITH_ONE_OR_MORE_OF_THESE_GROUPS_AND_COMMUNITIE, HOW_DID_YOU_FIND_OUT_ABOUT_THE_MIDWIFERY_CLINIC_SELECT_ALL_THAT, CREATED_AT, UPDATED_AT)
        VALUES (:OLD.ID, :OLD.CONFIRMATION_NUMBER, :OLD.STATUS, :OLD.FIRST_NAME, :OLD.LAST_NAME, :OLD.PREFERRED_NAME, :OLD.PRONOUNS, :OLD.DATE_OF_BIRTH, :OLD.YUKON_HEALTH_INSURANCE, :OLD.COMMUNITY_LOCATED, :OLD.PREFERRED_LANGUAGE, :OLD.NEED_INTERPRETATION, :OLD.PREFERRED_PHONE, :OLD.PREFERRED_EMAIL, :OLD.OKAY_TO_LEAVE_MESSAGE, :OLD.PREFER_TO_BE_CONTACTED, :OLD.WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, :OLD.DUE_DATE, :OLD.DATE_CONFIRMED, :OLD.FIRST_PREGNANCY, :OLD.HOW_MANY_VAGINAL_BIRTHS, :OLD.HOW_MANY_C_SECTION_BIRTHS, :OLD.COMPLICATIONS_WITH_PREVIOUS, :OLD.PROVIDE_DETAILS, :OLD.MIDWIFE_BEFORE, :OLD.WHERE_TO_GIVE_BIRTH, :OLD.MEDICAL_CONCERNS, :OLD.PROVIDE_DETAILS2, :OLD.HAVE_YOU_HAD_PRIMARY_HEALTH_CARE, :OLD.MENSTRUAL_CYCLE_LENGTH, :OLD.FAMILY_PHYSICIAN, :OLD.PHYSICIAN_S_NAME, :OLD.MAJOR_MEDICAL_CONDITIONS, :OLD.PROVIDE_DETAILS3, :OLD.DO_YOU_IDENTIFY_WITH_ONE_OR_MORE_OF_THESE_GROUPS_AND_COMMUNITIE, :OLD.HOW_DID_YOU_FIND_OUT_ABOUT_THE_MIDWIFERY_CLINIC_SELECT_ALL_THAT, :OLD.CREATED_AT, :OLD.UPDATED_AT)
        RETURNING REV_ID INTO v_rev_id;
        INSERT INTO GENERAL.events (schema_name, table_name, entity_id, event_type, title, event_by, entity_data, guid, uuid, rev_id)
		VALUES (v_cur_schema, v_cur_table, :old.id, 3, 'UPDATE_OLD', 'system', NULL, v_guid, :OLD.ROWID, v_rev_id);
    END IF;

    IF DELETING
    THEN
        INSERT INTO MIDWIFERY.MIDWIFERY_SERVICES_REV (ID, CONFIRMATION_NUMBER, STATUS, FIRST_NAME, LAST_NAME, PREFERRED_NAME, PRONOUNS, DATE_OF_BIRTH, YUKON_HEALTH_INSURANCE, COMMUNITY_LOCATED, PREFERRED_LANGUAGE, NEED_INTERPRETATION, PREFERRED_PHONE, PREFERRED_EMAIL, OKAY_TO_LEAVE_MESSAGE, PREFER_TO_BE_CONTACTED, WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, DUE_DATE, DATE_CONFIRMED, FIRST_PREGNANCY, HOW_MANY_VAGINAL_BIRTHS, HOW_MANY_C_SECTION_BIRTHS, COMPLICATIONS_WITH_PREVIOUS, PROVIDE_DETAILS, MIDWIFE_BEFORE, WHERE_TO_GIVE_BIRTH, MEDICAL_CONCERNS, PROVIDE_DETAILS2, HAVE_YOU_HAD_PRIMARY_HEALTH_CARE, MENSTRUAL_CYCLE_LENGTH, FAMILY_PHYSICIAN, PHYSICIAN_S_NAME, MAJOR_MEDICAL_CONDITIONS, PROVIDE_DETAILS3, DO_YOU_IDENTIFY_WITH_ONE_OR_MORE_OF_THESE_GROUPS_AND_COMMUNITIE, HOW_DID_YOU_FIND_OUT_ABOUT_THE_MIDWIFERY_CLINIC_SELECT_ALL_THAT, CREATED_AT, UPDATED_AT)
        VALUES (:OLD.ID, :OLD.CONFIRMATION_NUMBER, :OLD.STATUS, :OLD.FIRST_NAME, :OLD.LAST_NAME, :OLD.PREFERRED_NAME, :OLD.PRONOUNS, :OLD.DATE_OF_BIRTH, :OLD.YUKON_HEALTH_INSURANCE, :OLD.COMMUNITY_LOCATED, :OLD.PREFERRED_LANGUAGE, :OLD.NEED_INTERPRETATION, :OLD.PREFERRED_PHONE, :OLD.PREFERRED_EMAIL, :OLD.OKAY_TO_LEAVE_MESSAGE, :OLD.PREFER_TO_BE_CONTACTED, :OLD.WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, :OLD.DUE_DATE, :OLD.DATE_CONFIRMED, :OLD.FIRST_PREGNANCY, :OLD.HOW_MANY_VAGINAL_BIRTHS, :OLD.HOW_MANY_C_SECTION_BIRTHS, :OLD.COMPLICATIONS_WITH_PREVIOUS, :OLD.PROVIDE_DETAILS, :OLD.MIDWIFE_BEFORE, :OLD.WHERE_TO_GIVE_BIRTH, :OLD.MEDICAL_CONCERNS, :OLD.PROVIDE_DETAILS2, :OLD.HAVE_YOU_HAD_PRIMARY_HEALTH_CARE, :OLD.MENSTRUAL_CYCLE_LENGTH, :OLD.FAMILY_PHYSICIAN, :OLD.PHYSICIAN_S_NAME, :OLD.MAJOR_MEDICAL_CONDITIONS, :OLD.PROVIDE_DETAILS3, :OLD.DO_YOU_IDENTIFY_WITH_ONE_OR_MORE_OF_THESE_GROUPS_AND_COMMUNITIE, :OLD.HOW_DID_YOU_FIND_OUT_ABOUT_THE_MIDWIFERY_CLINIC_SELECT_ALL_THAT, :OLD.CREATED_AT, :OLD.UPDATED_AT)
        RETURNING REV_ID INTO v_rev_id;
        INSERT INTO GENERAL.events (schema_name, table_name, entity_id, event_type, title, event_by, entity_data, guid, uuid, rev_id)
		VALUES (v_cur_schema, v_cur_table, :old.id, 4, 'DELETE', 'system', NULL, v_guid, :OLD.ROWID, v_rev_id);
    END IF;
END;
/
ALTER TRIGGER "MIDWIFERY"."MIDWIFERY_SERVICES_LOG_SUBMISSIONS" ENABLE;
--------------------------------------------------------
--  Trigger MIDWIFERY_SERVICES_DUPLICATED_REQUESTS
--------------------------------------------------------

CREATE OR REPLACE EDITIONABLE TRIGGER "MIDWIFERY"."MIDWIFERY_SERVICES_DUPLICATED_REQUESTS"
BEFORE INSERT ON MIDWIFERY.MIDWIFERY_SERVICES
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
DECLARE 
exist_record NUMBER;
oldest_request NUMBER;
BEGIN
  
SELECT COUNT(*) 
  INTO exist_record  
  FROM MIDWIFERY.MIDWIFERY_SERVICES
  WHERE  status = 1 AND FIRST_NAME = :NEW.FIRST_NAME  AND LAST_NAME  = :NEW.LAST_NAME AND DATE_OF_BIRTH  = :NEW.DATE_OF_BIRTH;
  IF exist_record > 0 THEN
    SELECT MIDWIFERY_SERVICES.id 
    INTO oldest_request
    FROM MIDWIFERY.MIDWIFERY_SERVICES 
    WHERE STATUS = 1 AND FIRST_NAME = :NEW.FIRST_NAME AND LAST_NAME  = :NEW.LAST_NAME AND DATE_OF_BIRTH  = :NEW.DATE_OF_BIRTH
    ORDER BY CREATED_AT ASC FETCH FIRST 1 ROW ONLY;

    INSERT INTO MIDWIFERY.MIDWIFERY_DUPLICATED_REQUESTS (ORIGINAL_ID , DUPLICATED_ID) VALUES (oldest_request, :NEW.ID);

  END IF;

END;
/
ALTER TRIGGER "MIDWIFERY"."MIDWIFERY_SERVICES_DUPLICATED_REQUESTS" ENABLE;

--------------------------------------------------------
--  Trigger MIDWIFERY_DUPLICATED_REQUESTS_ACTION_LOG
--------------------------------------------------------

CREATE OR REPLACE TRIGGER "MIDWIFERY"."MIDWIFERY_DUPLICATED_REQUESTS_ACTION_LOG"
AFTER INSERT ON MIDWIFERY.MIDWIFERY_DUPLICATED_REQUESTS
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
DECLARE
log_data VARCHAR2(250);
BEGIN
	log_data := '{"ORIGINAL_ID":' || :NEW.ORIGINAL_ID || ', "DUPLICATED_ID": ' || :NEW.DUPLICATED_ID || '}';

	INSERT INTO GENERAL.ACTION_LOGS ( ACTION_TYPE, TITLE, ACTION_DATE, SUBMISSION_ID, SCHEMA_NAME, TABLE_NAME, ACTION_DATA)
  VALUES ( 6, 'Duplicated Warning Detected', SYSTIMESTAMP, :NEW.ID, 'MIDWIFERY', 'MIDWIFERY_SERVICES_DUPLICATED_REQUESTS', UTL_RAW.CAST_TO_RAW(log_data));
END;
/
ALTER TRIGGER "MIDWIFERY"."MIDWIFERY_DUPLICATED_REQUESTS_ACTION_LOG" ENABLE;

--------------------------------------------------------
--  DDL for Trigger DENTAL_SERVICE_LOG_SUBMISSIONS
--------------------------------------------------------

  CREATE OR REPLACE EDITIONABLE TRIGGER "DENTAL"."DENTAL_SERVICE_LOG_SUBMISSIONS"
AFTER DELETE OR INSERT OR UPDATE ON DENTAL.DENTAL_SERVICE
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
DECLARE
    v_guid RAW(20) := SYS_GUID();
    v_rev_id NUMBER;
    v_cur_schema NVARCHAR2(500);
    v_cur_table NVARCHAR2(500);
BEGIN

    SELECT
        OWNER,
        TABLE_NAME
    INTO
        v_cur_schema,
        v_cur_table
    FROM ALL_TABLES
    WHERE TABLE_NAME = 'DENTAL_SERVICE';

    IF INSERTING
    THEN
        INSERT INTO GENERAL.events (schema_name, table_name, entity_id, event_type, title, event_by, entity_data, guid, uuid)
		VALUES (v_cur_schema, v_cur_table, :new.id, 1, 'INSERT', 'system', NULL, v_guid, :NEW.ROWID);
    END IF;

    IF UPDATING
    THEN
        INSERT INTO DENTAL.DENTAL_SERVICE_REV (ID,
        STATUS,
        FIRST_NAME,
        MIDDLE_NAME,
        LAST_NAME,
        DATE_OF_BIRTH,
        HEALTH_CARD_NUMBER,
        MAILING_ADDRESS,
        CITY_OR_TOWN,
        POSTAL_CODE,
        PHONE,
        EMAIL,
        OTHER_COVERAGE,
        ARE_YOU_ELIGIBLE_FOR_THE_PHARMACARE_AND_EXTENDED_HEALTH_CARE_BEN,
        EMAIL_INSTEAD,
        HAVE_CHILDREN,
        ASK_DEMOGRAPHIC,
        IDENTIFY_GROUPS,
        GENDER,
        EDUCATION,
        OFTEN_BRUSH,
        STATE_TEETH,
        OFTEN_FLOSS,
        STATE_GUMS,
        LAST_SAW_DENTIST,
        REASON_FOR_DENTIST,
        BUY_SUPPLIES,
        PAY_FOR_VISIT,
        BARRIERS,
        PROBLEMS,
        SERVICES_NEEDED,
        CREATED_AT,
        UPDATED_AT)
        VALUES (:OLD.ID,
        :OLD.STATUS,
        :OLD.FIRST_NAME,
        :OLD.MIDDLE_NAME,
        :OLD.LAST_NAME,
        :OLD.DATE_OF_BIRTH,
        :OLD.HEALTH_CARD_NUMBER,
        :OLD.MAILING_ADDRESS,
        :OLD.CITY_OR_TOWN,
        :OLD.POSTAL_CODE,
        :OLD.PHONE,
        :OLD.EMAIL,
        :OLD.OTHER_COVERAGE,
        :OLD.ARE_YOU_ELIGIBLE_FOR_THE_PHARMACARE_AND_EXTENDED_HEALTH_CARE_BEN,
        :OLD.EMAIL_INSTEAD,
        :OLD.HAVE_CHILDREN,
        :OLD.ASK_DEMOGRAPHIC,
        :OLD.IDENTIFY_GROUPS,
        :OLD.GENDER,
        :OLD.EDUCATION,
        :OLD.OFTEN_BRUSH,
        :OLD.STATE_TEETH,
        :OLD.OFTEN_FLOSS,
        :OLD.STATE_GUMS,
        :OLD.LAST_SAW_DENTIST,
        :OLD.REASON_FOR_DENTIST,
        :OLD.BUY_SUPPLIES,
        :OLD.PAY_FOR_VISIT,
        :OLD.BARRIERS,
        :OLD.PROBLEMS,
        :OLD.SERVICES_NEEDED,
        :OLD.CREATED_AT,
        :OLD.UPDATED_AT)
        RETURNING REV_ID INTO v_rev_id;
        IF :OLD.STATUS = :NEW.STATUS THEN
          INSERT INTO GENERAL.events (schema_name, table_name, entity_id, event_type, title, event_by, entity_data, guid, uuid, rev_id)
          VALUES (v_cur_schema, v_cur_table, :old.id, 7, 'SUBMISSION_UPDATED', 'system', NULL, v_guid, :OLD.ROWID, v_rev_id);
				ELSE
          INSERT INTO GENERAL.events (schema_name, table_name, entity_id, event_type, title, event_by, entity_data, guid, uuid, rev_id)
          VALUES (v_cur_schema, v_cur_table, :old.id, 3, 'UPDATE_OLD', 'system', NULL, v_guid, :OLD.ROWID, v_rev_id);
        END IF;
    END IF;

    IF DELETING
    THEN
        INSERT INTO DENTAL.DENTAL_SERVICE_REV (ID,
        STATUS,
        FIRST_NAME,
        MIDDLE_NAME,
        LAST_NAME,
        DATE_OF_BIRTH,
        HEALTH_CARD_NUMBER,
        MAILING_ADDRESS,
        CITY_OR_TOWN,
        POSTAL_CODE,
        PHONE,
        EMAIL,
        OTHER_COVERAGE,
        ARE_YOU_ELIGIBLE_FOR_THE_PHARMACARE_AND_EXTENDED_HEALTH_CARE_BEN,
        EMAIL_INSTEAD,
        HAVE_CHILDREN,
        ASK_DEMOGRAPHIC,
        IDENTIFY_GROUPS,
        GENDER,
        EDUCATION,
        OFTEN_BRUSH,
        STATE_TEETH,
        OFTEN_FLOSS,
        STATE_GUMS,
        LAST_SAW_DENTIST,
        REASON_FOR_DENTIST,
        BUY_SUPPLIES,
        PAY_FOR_VISIT,
        BARRIERS,
        PROBLEMS,
        SERVICES_NEEDED,
        CREATED_AT,
        UPDATED_AT)
        VALUES (:OLD.ID,
        :OLD.STATUS,
        :OLD.FIRST_NAME,
        :OLD.MIDDLE_NAME,
        :OLD.LAST_NAME,
        :OLD.DATE_OF_BIRTH,
        :OLD.HEALTH_CARD_NUMBER,
        :OLD.MAILING_ADDRESS,
        :OLD.CITY_OR_TOWN,
        :OLD.POSTAL_CODE,
        :OLD.PHONE,
        :OLD.EMAIL,
        :OLD.OTHER_COVERAGE,
        :OLD.ARE_YOU_ELIGIBLE_FOR_THE_PHARMACARE_AND_EXTENDED_HEALTH_CARE_BEN,
        :OLD.EMAIL_INSTEAD,
        :OLD.HAVE_CHILDREN,
        :OLD.ASK_DEMOGRAPHIC,
        :OLD.IDENTIFY_GROUPS,
        :OLD.GENDER,
        :OLD.EDUCATION,
        :OLD.OFTEN_BRUSH,
        :OLD.STATE_TEETH,
        :OLD.OFTEN_FLOSS,
        :OLD.STATE_GUMS,
        :OLD.LAST_SAW_DENTIST,
        :OLD.REASON_FOR_DENTIST,
        :OLD.BUY_SUPPLIES,
        :OLD.PAY_FOR_VISIT,
        :OLD.BARRIERS,
        :OLD.PROBLEMS,
        :OLD.SERVICES_NEEDED,
        :OLD.CREATED_AT,
        :OLD.UPDATED_AT)
        RETURNING REV_ID INTO v_rev_id;
        INSERT INTO GENERAL.events (schema_name, table_name, entity_id, event_type, title, event_by, entity_data, guid, uuid, rev_id)
		VALUES (v_cur_schema, v_cur_table, :old.id, 4, 'DELETE', 'system', NULL, v_guid, :OLD.ROWID, v_rev_id);
    END IF;
END;
/
ALTER TRIGGER "DENTAL"."DENTAL_SERVICE_LOG_SUBMISSIONS" ENABLE;

--------------------------------------------------------
--  Trigger DENTAL_SERVICE_DUPLICATED_REQUESTS
--------------------------------------------------------

CREATE OR REPLACE TRIGGER "DENTAL"."DENTAL_SERVICE_DUPLICATED_REQUESTS"
BEFORE INSERT ON DENTAL.DENTAL_SERVICE
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
DECLARE
  exist_record NUMBER;
  oldest_request NUMBER;
BEGIN
	SELECT COUNT(*)
	INTO exist_record
	FROM DENTAL.DENTAL_SERVICE
	WHERE  STATUS  <> 4  AND FIRST_NAME COLLATE BINARY_CI LIKE :NEW.FIRST_NAME AND LAST_NAME COLLATE BINARY_CI LIKE :NEW.LAST_NAME AND DATE_OF_BIRTH  = :NEW.DATE_OF_BIRTH
  AND CREATED_AT >= SYSTIMESTAMP - INTERVAL '1' YEAR;
	IF exist_record > 0 THEN
		SELECT ID
		INTO oldest_request
		FROM DENTAL.DENTAL_SERVICE
		WHERE STATUS <> 4  AND FIRST_NAME COLLATE BINARY_CI LIKE :NEW.FIRST_NAME AND LAST_NAME COLLATE BINARY_CI LIKE :NEW.LAST_NAME AND DATE_OF_BIRTH  = :NEW.DATE_OF_BIRTH
		AND CREATED_AT >= SYSTIMESTAMP - INTERVAL '1' YEAR ORDER BY CREATED_AT ASC FETCH FIRST 1 ROW ONLY;

		INSERT INTO DENTAL.DENTAL_DUPLICATED_REQUESTS (ORIGINAL_ID , DUPLICATED_ID) VALUES (oldest_request, :NEW.ID);

    END IF;

END;
/
ALTER TRIGGER "DENTAL"."DENTAL_SERVICE_DUPLICATED_REQUESTS" ENABLE;

--------------------------------------------------------
--  Trigger DENTAL_DUPLICATED_REQUESTS_ACTION_LOG
--------------------------------------------------------

CREATE OR REPLACE TRIGGER "DENTAL"."DENTAL_DUPLICATED_REQUESTS_ACTION_LOG"
AFTER INSERT ON DENTAL.DENTAL_DUPLICATED_REQUESTS
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
DECLARE
log_data VARCHAR2(250);
BEGIN
	log_data := '{"ORIGINAL_ID":' || :NEW.ORIGINAL_ID || ', "DUPLICATED_ID": ' || :NEW.DUPLICATED_ID || '}';

	INSERT INTO GENERAL.ACTION_LOGS ( ACTION_TYPE, TITLE, ACTION_DATE, SUBMISSION_ID, SCHEMA_NAME, TABLE_NAME, ACTION_DATA)
  VALUES ( 6, 'Duplicated Warning Detected', SYSTIMESTAMP, :NEW.ID, 'DENTAL', 'DENTAL_DUPLICATED_REQUESTS', UTL_RAW.CAST_TO_RAW(log_data));
END;
/
ALTER TRIGGER "DENTAL"."DENTAL_DUPLICATED_REQUESTS_ACTION_LOG" ENABLE;

--------------------------------------------------------
--  Trigger DENTAL_SERVICE_DUPLICATED_REQUESTS_DELETE_UPDATES
--------------------------------------------------------

CREATE OR REPLACE TRIGGER DENTAL.DENTAL_SERVICE_DUPLICATED_REQUESTS_DELETE_UPDATES
AFTER UPDATE ON DENTAL.DENTAL_SERVICE
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
BEGIN
		IF :OLD.FIRST_NAME <> :NEW.FIRST_NAME OR :OLD.LAST_NAME <> :NEW.LAST_NAME OR :OLD.DATE_OF_BIRTH <> :NEW.DATE_OF_BIRTH THEN
				DELETE FROM DENTAL.DENTAL_DUPLICATED_REQUESTS
				WHERE ORIGINAL_ID = :NEW.ID;

				DELETE FROM DENTAL.DENTAL_DUPLICATED_REQUESTS
				WHERE DUPLICATED_ID = :NEW.ID;
		END IF;

    IF :NEW.STATUS = 4 THEN
				DELETE FROM DENTAL.DENTAL_DUPLICATED_REQUESTS
				WHERE ORIGINAL_ID = :NEW.ID;

				DELETE FROM DENTAL.DENTAL_DUPLICATED_REQUESTS
				WHERE DUPLICATED_ID = :NEW.ID;
		END IF;
END;
/
ALTER TRIGGER "DENTAL"."DENTAL_SERVICE_DUPLICATED_REQUESTS_DELETE_UPDATES" ENABLE;

--------------------------------------------------------
--  Trigger DENTAL_SERVICE_LOG_INTERNAL_FIELDS
--------------------------------------------------------

CREATE OR REPLACE EDITIONABLE TRIGGER "DENTAL"."DENTAL_SERVICE_LOG_INTERNAL_FIELDS"
BEFORE INSERT ON DENTAL.DENTAL_SERVICE_INTERNAL_FIELDS
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
DECLARE
    v_guid RAW(20) := SYS_GUID();
    v_cur_schema NVARCHAR2(500);
    v_cur_table NVARCHAR2(500);
BEGIN

    SELECT
        OWNER,
        TABLE_NAME
    INTO
        v_cur_schema,
        v_cur_table
    FROM ALL_TABLES
    WHERE TABLE_NAME = 'DENTAL_SERVICE_INTERNAL_FIELDS';

    INSERT INTO GENERAL.events (schema_name, table_name, entity_id, event_type, title, event_by, entity_data, guid, uuid)
		VALUES (v_cur_schema, v_cur_table, :new.id, 5, 'INSERT', 'system', NULL, v_guid, :NEW.ROWID);
END;
/
ALTER TRIGGER "DENTAL"."DENTAL_SERVICE_LOG_INTERNAL_FIELDS" DISABLE;

--------------------------------------------------------
--  Trigger DENTAL_SERVICE_LOG_COMMENTS
--------------------------------------------------------

CREATE OR REPLACE EDITIONABLE TRIGGER "DENTAL"."DENTAL_SERVICE_LOG_COMMENTS"
BEFORE INSERT ON DENTAL.DENTAL_SERVICE_COMMENTS
REFERENCING OLD AS "OLD" NEW AS "NEW" FOR EACH ROW 
DECLARE
    v_guid RAW(20) := SYS_GUID();
    v_cur_schema NVARCHAR2(500);
    v_cur_table NVARCHAR2(500);
BEGIN

    SELECT
        OWNER,
        TABLE_NAME
    INTO
        v_cur_schema,
        v_cur_table
    FROM ALL_TABLES
    WHERE TABLE_NAME = 'DENTAL_SERVICE_COMMENTS';

    INSERT INTO GENERAL.events (schema_name, table_name, entity_id, event_type, title, event_by, entity_data, guid, uuid)
		VALUES (v_cur_schema, v_cur_table, :new.id, 6, 'INSERT', 'system', NULL, v_guid, :NEW.ROWID);
END;
/
ALTER TRIGGER "DENTAL"."DENTAL_SERVICE_LOG_COMMENTS" DISABLE;

--------------------------------------------------------
--  DDL for Function GETAGERANGE
--------------------------------------------------------
CREATE OR REPLACE FUNCTION "GENERAL"."GETAGERANGE"(p_date_of_birth IN DATE)
  RETURN VARCHAR2
AS
  v_age NUMBER;
BEGIN
  v_age := TRUNC(MONTHS_BETWEEN(SYSDATE, p_date_of_birth) / 12);

  IF v_age < 18 THEN
    RETURN '<18';
  ELSIF v_age BETWEEN 19 AND 30 THEN
    RETURN '19-30';
  ELSIF v_age BETWEEN 31 AND 50 THEN
    RETURN '31-50';
  ELSE
    RETURN '>51';
  END IF;
END;
/

--------------------------------------------------------
--  DDL for Function GETTRANSFORMVALUE
--------------------------------------------------------

CREATE OR REPLACE FUNCTION "GENERAL"."GETTRANSFORMVALUE" (
		p_table_schema IN NVARCHAR2,
		p_table_name IN NVARCHAR2,
		p_entity_id IN NUMBER,
		p_rev_id IN NUMBER,
		p_title IN NVARCHAR2,
		p_function_name IN NVARCHAR2,
		p_column_key IN NVARCHAR2 
	) RETURN NVARCHAR2 AS v_message NVARCHAR2 (3000);
v_result NVARCHAR2(3000) := '';
BEGIN
		v_message := p_title;
	IF
		p_function_name IS NOT NULL THEN
			EXECUTE IMMEDIATE 'CALL ' || p_function_name || ' INTO :FUNCRES' USING p_entity_id,
			p_rev_id,
			p_table_name,
			p_table_schema,
			OUT v_result;
		IF
			v_result IS NULL THEN
				v_message := NULL;

		END IF;
		v_message := REPLACE ( v_message, '%s', v_result );

	END IF;
	RETURN v_message;

END GETTRANSFORMVALUE;

/
--------------------------------------------------------
--  DDL for Function GETVALUEFORRULENAME
--------------------------------------------------------

CREATE OR REPLACE FUNCTION "GENERAL"."GETVALUEFORRULENAME" 
(
  P_ENTITY_ID IN NUMBER 
, P_REV_ID IN NUMBER
, P_TABLE_NAME IN NVARCHAR2
, P_TABLE_SCHEMA IN NVARCHAR2
) RETURN NVARCHAR2 AS
    v_general_schema NVARCHAR2(1000) := 'GENERAL';
    v_sql_stmt NVARCHAR2(4000);
    v_result NVARCHAR2(4000);
BEGIN

    v_sql_stmt := '
    SELECT
        CASE WHEN co.FIRST_NAME <> re.FIRST_NAME THEN co.FIRST_NAME ELSE NULL END AS STATUS
    FROM '||v_general_schema||'.EVENTS ev
        JOIN '||P_TABLE_SCHEMA||'.'||P_TABLE_NAME||' co
            ON ev.entity_id = co.id
            AND ev.table_name = :1
            AND co.ID = :2
        JOIN '||P_TABLE_SCHEMA||'.'||P_TABLE_NAME||'_REV re
            ON  re.id = co.id
            AND ev.rev_id = re.rev_id
            AND ev.table_name = :3
            AND re.rev_id = :4';

    EXECUTE IMMEDIATE v_sql_stmt INTO v_result USING P_TABLE_NAME, P_ENTITY_ID, P_TABLE_NAME, P_REV_ID;

    RETURN v_result;
END GETVALUEFORRULENAME;

/
--------------------------------------------------------
--  DDL for Function GETVALUEFORRULESTATUS
--------------------------------------------------------

CREATE OR REPLACE FUNCTION "GENERAL"."GETVALUEFORRULESTATUS" 
(
  P_ENTITY_ID IN NUMBER
, P_REV_ID IN NUMBER
, P_TABLE_NAME IN NVARCHAR2
, P_TABLE_SCHEMA IN NVARCHAR2
) RETURN NVARCHAR2 AS
    v_general_schema NVARCHAR2(1000) := 'GENERAL';
    v_sql_stmt NVARCHAR2(4000);
    v_result NVARCHAR2(4000);
BEGIN

    v_sql_stmt := '
    SELECT
        CASE WHEN co.STATUS <> re.STATUS THEN st.DESCRIPTION ELSE NULL END AS STATUS
    FROM '||v_general_schema||'.EVENTS ev
        JOIN '||P_TABLE_SCHEMA||'.'||P_TABLE_NAME||' co
            ON ev.entity_id = co.id
            AND ev.table_name = :1
            AND co.ID = :2
        JOIN '||P_TABLE_SCHEMA||'.'||P_TABLE_NAME||'_REV re
            ON  re.id = co.id
            AND ev.rev_id = re.rev_id
            AND ev.table_name = :3
            AND re.rev_id = :4
        JOIN '||P_TABLE_SCHEMA||'.STATUS_V st
            ON co.STATUS = st.ID';

    EXECUTE IMMEDIATE v_sql_stmt INTO v_result USING P_TABLE_NAME, P_ENTITY_ID, P_TABLE_NAME, P_REV_ID;

    RETURN v_result;
END GETVALUEFORRULESTATUS;

/


CREATE OR REPLACE FUNCTION "GENERAL".process_blob_value_format(
    p_blob_value   BLOB,
    p_table_name   VARCHAR2
) RETURN VARCHAR2 IS
    v_original_value     VARCHAR2(4000);
    v_all_replace_text   VARCHAR2(4000);
    v_partial_value      VARCHAR2(4000);
    v_desc_text          VARCHAR2(4000);
    v_sql                VARCHAR2(4000);
    v_result_text        VARCHAR2(4000);
BEGIN
    -- Check if p_blob_value is NULL
    IF p_blob_value IS NULL THEN
        RETURN NULL;
    END IF;

    -- Convert BLOB to VARCHAR2
    v_original_value := utl_raw.cast_to_varchar2(p_blob_value);
    DBMS_OUTPUT.PUT_LINE('v_original_value: ' || v_original_value);

    -- Check if v_original_value is NULL
    IF v_original_value IS NULL THEN
        RETURN NULL;
    END IF;

    v_all_replace_text := v_original_value;
    v_all_replace_text := REPLACE(v_all_replace_text, '{"data":', '');
    v_all_replace_text := REPLACE(v_all_replace_text, '{', '');
    v_all_replace_text := REPLACE(v_all_replace_text, '}', '');
    v_all_replace_text := TRIM(v_all_replace_text);
    DBMS_OUTPUT.PUT_LINE('v_all_replace_text after cleanup: ' || v_all_replace_text);

    v_all_replace_text := REPLACE(v_all_replace_text, '[', '');
    v_all_replace_text := REPLACE(v_all_replace_text, ']', '');
    DBMS_OUTPUT.PUT_LINE('v_all_replace_text after removing brackets: ' || v_all_replace_text);

    v_all_replace_text := REPLACE(v_all_replace_text, '"', '');
    DBMS_OUTPUT.PUT_LINE('v_all_replace_text after removing quotes: ' || v_all_replace_text);

    -- Check if v_all_replace_text is NULL or empty
    IF v_all_replace_text IS NULL OR v_all_replace_text = '' THEN
        RETURN NULL;
    END IF;

    v_result_text := '';


    FOR i IN 1..NVL(REGEXP_COUNT(v_all_replace_text, ','), 0) + 1 LOOP

        v_partial_value := TRIM(REGEXP_SUBSTR(v_all_replace_text, '[^,]+', 1, i));
        DBMS_OUTPUT.PUT_LINE('Processing value: ' || v_partial_value);

        IF REGEXP_LIKE(v_partial_value, '^\d+(\.\d+)?$') THEN
            BEGIN

                v_sql := 'SELECT description FROM ' || p_table_name || ' WHERE id = :1';
                DBMS_OUTPUT.PUT_LINE('Executing SQL: ' || v_sql || ' with ID: ' || v_partial_value);
                EXECUTE IMMEDIATE v_sql INTO v_desc_text USING TO_NUMBER(v_partial_value);
                DBMS_OUTPUT.PUT_LINE('Fetched description: ' || v_desc_text);
            EXCEPTION
                WHEN NO_DATA_FOUND THEN
                    v_desc_text := v_partial_value; -- Keep original value if no match found
                    DBMS_OUTPUT.PUT_LINE('No data found for ID: ' || v_partial_value);
                WHEN TOO_MANY_ROWS THEN
                    v_desc_text := v_partial_value;
                    DBMS_OUTPUT.PUT_LINE('Too many rows found for ID: ' || v_partial_value);
                WHEN OTHERS THEN
                    DBMS_OUTPUT.PUT_LINE('An error occurred: ' || SQLERRM);
                    RAISE;
            END;
        ELSE
            v_desc_text := v_partial_value;
            DBMS_OUTPUT.PUT_LINE('Non-numeric value, using as is: ' || v_desc_text);
        END IF;

        IF v_result_text IS NULL OR v_result_text = '' THEN
            v_result_text := v_desc_text;
        ELSE
            v_result_text := v_result_text || ', ' || v_desc_text;
        END IF;

        DBMS_OUTPUT.PUT_LINE('Updated v_result_text: ' || v_result_text);
    END LOOP;

    RETURN TRIM(v_result_text);
END process_blob_value_format;
/


CREATE OR REPLACE FUNCTION "GENERAL".base64encode(p_blob IN BLOB)
  RETURN CLOB
-- -----------------------------------------------------------------------------------
-- Encodes a BLOB into a Base64 CLOB.
-- -----------------------------------------------------------------------------------
IS
  l_clob CLOB;
  l_step PLS_INTEGER := 12000; -- make sure you set a multiple of 3 not higher than 24573
BEGIN
  FOR i IN 0 .. TRUNC((DBMS_LOB.getlength(p_blob) - 1 )/l_step) LOOP
    l_clob := l_clob || UTL_RAW.cast_to_varchar2(UTL_ENCODE.base64_encode(DBMS_LOB.substr(p_blob, l_step, i * l_step + 1)));
  END LOOP;
  RETURN l_clob;
END;
/

--------------------------------------------------------
--  Function to decode blob fields content
--------------------------------------------------------
CREATE OR REPLACE FUNCTION "GENERAL".process_blob_value(
    p_blob_value BLOB,
    p_table_name VARCHAR2
) RETURN VARCHAR2 IS
    v_original_value VARCHAR2(4000);
    v_all_replace_text VARCHAR2(4000);
    v_partial_value VARCHAR2(4000);
    v_desc_text VARCHAR2(4000);
   	v_sql VARCHAR2(4000);
BEGIN
    -- Convert BLOB to VARCHAR2
    v_original_value := utl_raw.cast_to_varchar2(p_blob_value);
   
    v_all_replace_text :=   REPLACE(REPLACE(v_original_value, '{"data":', ''), '}', '');
    -- Split the string by commas and iterate over each part
    FOR i IN 1..REGEXP_COUNT(v_all_replace_text, ',') + 1 LOOP
        -- Extract each element from the string
        SELECT TRIM(BOTH ']' FROM TRIM(BOTH '[' FROM REGEXP_SUBSTR(v_all_replace_text, '[^,]+', 1, i)))
        INTO v_partial_value
        FROM DUAL;
        
        IF REGEXP_LIKE(v_partial_value, '^\d+(\.\d+)?$') THEN
            -- If it is numeric, fetch description from the table
            BEGIN
                --SELECT description 
               -- INTO v_desc_text 
               -- FROM CONSTELLATION_HEALTH.CONSTELLATION_HEALTH_DIAGNOSIS_HISTORY 
               -- WHERE id = TO_NUMBER(v_partial_value);
                v_sql := 'SELECT description FROM ' || p_table_name || ' WHERE id = :1';
                EXECUTE IMMEDIATE v_sql INTO v_desc_text USING TO_NUMBER(v_partial_value);            
            EXCEPTION
                WHEN NO_DATA_FOUND THEN
                    v_desc_text := v_partial_value; -- If no match found, keep original value
            END;
        ELSE
            -- If not numeric, trim quotes
            v_desc_text := CONCAT(' ', TRIM(BOTH '"' FROM v_partial_value));
        END IF;
        
        -- Replace the original text with the mapped text
        v_all_replace_text := REPLACE(v_all_replace_text, v_partial_value, v_desc_text);
    END LOOP;
    
    -- Remove any remaining brackets
    v_all_replace_text := REPLACE(REPLACE(v_all_replace_text, '[', ''), ']', '');
    
    RETURN TRIM(v_all_replace_text);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END process_blob_value;
/
-- process_blob_value is called by views owned by the module schemas
-- (e.g. DENTAL.DENTAL_SERVICE_SUBMISSIONS_DETAILS), which compile with the
-- view owner's privileges, so each module needs EXECUTE on it.
GRANT EXECUTE ON "GENERAL".process_blob_value TO "DENTAL";
GRANT EXECUTE ON "GENERAL".process_blob_value TO "MIDWIFERY";
GRANT EXECUTE ON "GENERAL".process_blob_value TO "HIPMA";
GRANT EXECUTE ON "GENERAL".process_blob_value TO "CONSTELLATION_HEALTH";

--------------------------------------------------------
--  DDL for View SUBMISSIONS_LOGS
--------------------------------------------------------
CREATE OR REPLACE FORCE VIEW GENERAL.SUBMISSIONS_LOGS AS
SELECT
    al.ID,
    al.ACTION_TYPE,
    al.USER_ID,
    al.TITLE,
		TO_CHAR(al.ACTION_DATE, 'YYYY-MM-DD HH24:MI:SS') AS ACTION_DATE,
    al.SUBMISSION_ID,
    al.SCHEMA_NAME,
    al.TABLE_NAME,
    al.FIELD1,
    at.DESCRIPTION AS ACTION_TYPE_DESCRIPTION,
    ud.USER_NAME AS USER_NAME,
		ud.USER_EMAIL AS USER_EMAIL,
		ds.FIRST_NAME AS FIRST_NAME_CLIENT,
		ds.LAST_NAME AS LAST_NAME_CLIENT
FROM GENERAL.ACTION_LOGS al
LEFT JOIN GENERAL.ACTION_TYPES at 
       ON al.ACTION_TYPE = at.ID
LEFT JOIN GENERAL.USER_DATA ud 
       ON al.USER_ID = ud.ID
LEFT JOIN DENTAL.DENTAL_SERVICE ds
       ON al.SUBMISSION_ID = ds.ID
;
