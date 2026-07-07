import express, { Request, Response } from "express";
import { EnsureAuthenticated } from "./auth"
import { body, param } from "express-validator";
import { SubmissionStatusRepository } from "../repository/oracle/SubmissionStatusRepository";
import knex from "knex";
import { DB_CONFIG_MIDWIFERY, SCHEMA_MIDWIFERY, SCHEMA_GENERAL } from "../config";
import { groupBy , helper, logger } from "../utils";
import { checkPermissions } from "../middleware/permissions";
import { ReturnValidationErrors } from "../middleware";
let db = knex(DB_CONFIG_MIDWIFERY)

var RateLimit = require('express-rate-limit');

var _ = require('lodash');

export const midwiferyRouter = express.Router();
midwiferyRouter.use(RateLimit({
    windowMs: 1*60*1000, // 1 minute
    max: 5000
}));

const submissionStatusRepo = new SubmissionStatusRepository();

/**
 * Obtain data to show in the index view
 *
 * @param { action_id } action id.
 * @param { action_value } action value.
 * @return json
 */
midwiferyRouter.get("/submissions/:action_id/:action_value", checkPermissions("midwifery_view"), [ param("action_id").notEmpty(), 
  param("action_value").notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        const actionId = req.params.action_id;
        const actionVal = req.params.action_value;
        const permissions = req.user?.db_user.permissions ?? [];
        const result = await submissionStatusRepo.getModuleSubmissions(SCHEMA_MIDWIFERY, actionId, actionVal, permissions);
        const groupedId = groupBy(result, i => i.id);
        const labels = groupBy(result, i => i.date_code);
                        
        res.send(
            {
                data: groupedId,
                labels: labels
            });

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Obtain data to show in the index view
 *
 * @param { action_id } action id.
 * @param { action_value } action value.
 * @return json
 */
midwiferyRouter.get("/submissions/status/:action_id/:action_value", checkPermissions("midwifery_view"), [ param("action_id").notEmpty(), 
  param("action_value").notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {

    try {

        const actionId = req.params.action_id;
        const actionVal = req.params.action_value;
        const permissions = req.user?.db_user.permissions ?? [];
        const result = await submissionStatusRepo.getModuleSubmissionsStatus(SCHEMA_MIDWIFERY, actionId, actionVal, permissions);
                        
        res.send({data: result});

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Obtain data to show in the index view
 *
 * @return json
 */
midwiferyRouter.post("/", checkPermissions("midwifery_view"), async (req: Request, res: Response) => {
    try {
        var dateFrom = req.body.params.dateFrom;
        var dateTo = req.body.params.dateTo;
        let status_request = req.body.params.status;
        var midwiferyStatus = Array();
        var midwiferyOptions = Object();
        db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);

        const allowedSortOrders = ["ASC", "DESC"];
        const allowedSortFields = ["ID", "PREFERRED_NAME", "PREFERRED_PHONE", "FIRST_PREGNANCY", "DUE_DATE", "BIRTH_LOCATIONS", "MEDICAL_CONCERNS", "MAJOR_MEDICAL_CONDITIONS", "DO_YOU_IDENTIFY_WITH_ONE_OR_MORE_OF_THESE_GROUPS_AND_COMMUNITIE","CREATED_AT", "STATUS_DESCRIPTION" ];

        const page = parseInt(req.body.params.page as string) || 1;
        const pageSize = parseInt(req.body.params.pageSize as string) || 10;
        const offset = (page - 1) * pageSize;
        const sortBy = req.body.params.sortBy;
        const sortOrder = req.body.params.sortOrder;
        const initialFetch = req.body.params.initialFetch;
        const safeSortOrder = allowedSortOrders.includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : "ASC";
        const safeSortBy = allowedSortFields.includes(sortBy?.toUpperCase()) ? sortBy.toUpperCase() : "ID";
        let query = db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_SERVICES`)
        .join(`${SCHEMA_MIDWIFERY}.MIDWIFERY_STATUS`, 'MIDWIFERY_SERVICES.STATUS', '=', 'MIDWIFERY_STATUS.ID')
        .leftJoin(`${SCHEMA_MIDWIFERY}.MIDWIFERY_BIRTH_LOCATIONS`, 'MIDWIFERY_SERVICES.WHERE_TO_GIVE_BIRTH', '=', 'MIDWIFERY_BIRTH_LOCATIONS.ID')
        .leftJoin(`${SCHEMA_MIDWIFERY}.MIDWIFERY_PREFERRED_CONTACT_TYPES`, 'MIDWIFERY_SERVICES.PREFER_TO_BE_CONTACTED', '=', 'MIDWIFERY_PREFERRED_CONTACT_TYPES.ID')
        .select('MIDWIFERY_SERVICES.ID',
                'MIDWIFERY_SERVICES.CONFIRMATION_NUMBER',
                'MIDWIFERY_SERVICES.PREFERRED_NAME',
                'MIDWIFERY_SERVICES.PREFERRED_PHONE',
                'MIDWIFERY_SERVICES.PREFERRED_EMAIL',
                'MIDWIFERY_SERVICES.FIRST_PREGNANCY',
                'MIDWIFERY_BIRTH_LOCATIONS.DESCRIPTION as BIRTH_LOCATIONS',
                'MIDWIFERY_SERVICES.MEDICAL_CONCERNS',
                'MIDWIFERY_SERVICES.MAJOR_MEDICAL_CONDITIONS',
                db.raw(`GENERAL.process_blob_value(MIDWIFERY_SERVICES.DO_YOU_IDENTIFY_WITH_ONE_OR_MORE_OF_THESE_GROUPS_AND_COMMUNITIE, '${SCHEMA_MIDWIFERY}.MIDWIFERY_GROUPS_COMMUNITIES') AS DO_YOU_IDENTIFY_WITH_ONE_OR_MORE_OF_THESE_GROUPS_AND_COMMUNITIE
                `),
                'MIDWIFERY_STATUS.DESCRIPTION AS STATUS_DESCRIPTION',
                'MIDWIFERY_PREFERRED_CONTACT_TYPES.DESCRIPTION AS PREFERRED_CONTACT',
                db.raw("TO_CHAR(MIDWIFERY_SERVICES.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,"+
                        "CASE  WHEN DUE_DATE IS NULL THEN ''  ELSE TO_CHAR(DUE_DATE, 'YYYY, FMMonth, FMDD')  || CASE  WHEN DUE_DATE IS NULL THEN '' WHEN TO_CHAR(DUE_DATE, 'DD') IN ('01', '21', '31') THEN 'st' WHEN TO_CHAR(DUE_DATE, 'DD') IN ('02', '22') THEN 'nd' WHEN TO_CHAR(DUE_DATE, 'DD') IN ('03', '23') THEN 'rd'  ELSE 'th'  END  END AS DUE_DATE ")
        )
        .where('MIDWIFERY_SERVICES.STATUS', '<>', 4 );

        const countAllQuery = query.clone().clearSelect().clearOrder().count('* as count').first();

        if(dateFrom && dateTo) {
            query.where(db.raw("TO_CHAR(MIDWIFERY_SERVICES.CREATED_AT, 'YYYY-MM-DD') >=  ? AND TO_CHAR(MIDWIFERY_SERVICES.CREATED_AT, 'YYYY-MM-DD') <= ?",
                [dateFrom, dateTo]));
        }
        if (status_request && status_request.length > 0) {
            query.whereIn("MIDWIFERY_SERVICES.STATUS", status_request);
        }
        if (safeSortBy) {
            switch (safeSortBy) {
                case "BIRTH_LOCATIONS":
                    query = query.orderBy(`MIDWIFERY_SERVICES.WHERE_TO_GIVE_BIRTH`, safeSortOrder);
                    break;
                case "STATUS_DESCRIPTION":
                        query = query.orderBy(`MIDWIFERY_STATUS.DESCRIPTION`, safeSortOrder);
                        break;
                case "do_you_identify_with_one_or_more_of_these_groups_and_communitie":
                 query = query.orderByRaw(`GENERAL.process_blob_value(MIDWIFERY_SERVICES.DO_YOU_IDENTIFY_WITH_ONE_OR_MORE_OF_THESE_GROUPS_AND_COMMUNITIE, '${SCHEMA_MIDWIFERY}.MIDWIFERY_GROUPS_COMMUNITIES')  ${safeSortOrder}`);
                    break;
                default:
                    query = query.orderBy(`MIDWIFERY_SERVICES.${safeSortBy.toUpperCase()}`, safeSortOrder);
                    break;
            }
        } else {
            query = query.orderBy('MIDWIFERY_SERVICES.ID', 'ASC');
        }

        const countQuery = query.clone().clearSelect().clearOrder().count('* as count').first();

        if(pageSize !== -1 && initialFetch == 0){
            query = query.offset(offset).limit(pageSize);
        }else if(initialFetch == 1){
            query = query.offset(offset).limit(250);
        }

        var [midwifery, countResult, countResultAll] = await Promise.all([
            query,
            countQuery,
            countAllQuery
        ]);
        const countAll = countResultAll ? countResultAll.count : 0;
        const countSubmissions = countResult ? countResult.count : 0;

        midwiferyStatus = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_STATUS`).select().whereNot('DESCRIPTION', 'Closed')
            .then((rows: any) => {
                let arrayResult = Array();
                for (let row of rows) {
                    arrayResult.push({text: row['description'], value: row['id']});
                }

                return arrayResult;
        });

        midwiferyOptions = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_OPTIONS`).select().then((rows: any) => {
            let arrayResult = Object();

            for (let row of rows) {
                arrayResult[row['id']] = row['field_value'];
            }

            return arrayResult;
        });

        midwifery = midwifery.map(value => {
            value.first_pregnancy = value.first_pregnancy ? (midwiferyOptions[value.first_pregnancy] == 1 ? 'Yes' : 'No') : '';
            value.medical_concerns = value.medical_concerns ? (midwiferyOptions[value.medical_concerns] == 1 ? 'Yes' : 'No') : '';
            value.major_medical_conditions = value.major_medical_conditions ? (midwiferyOptions[value.major_medical_conditions] == 1 ? 'Yes' : 'No') : '';
            value.due_date = value.due_date || "N/A";
            value.preferred_name = value.preferred_name || value.preferred_name;
            value.showUrl = `midwifery/show/${value.id}`;
            return value;
        });

        res.send({data: midwifery, dataStatus: midwiferyStatus, total: countSubmissions, all: countAll});

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Validate if request is non existant or with closed status
 *
 * @param {midwifery_id} id of request
 * @return json
 */
midwiferyRouter.get("/validateRecord/:midwifery_id", checkPermissions("midwifery_view"), [param("midwifery_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        var midwifery_id = Number(req.params.midwifery_id);
        var midwifery = Object();
        var flagExists= true;
        var message= "";
        var type= "error";
        db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);

        midwifery = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_SERVICES`)
            .join(`${SCHEMA_MIDWIFERY}.MIDWIFERY_STATUS`, 'MIDWIFERY_SERVICES.STATUS', 'MIDWIFERY_STATUS.ID')
            .where('MIDWIFERY_SERVICES.ID', midwifery_id)
            .select(`${SCHEMA_MIDWIFERY}.MIDWIFERY_SERVICES.*`,
                    'MIDWIFERY_STATUS.DESCRIPTION as status_description').then((data:any) => {
                        return data[0];
                    });

        if(!midwifery || midwifery.status == 4){
            flagExists= false;
            message= "The request you are consulting is closed or non existant, please choose a valid request.";
        }

        res.json({ status: 200, flagMidwifery: flagExists, message: message, type: type});

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Obtain data to show in details view
 *
 * @param {midwifery_id} id of request
 * @return json
 */
midwiferyRouter.get("/show/:midwifery_id", checkPermissions("midwifery_view"), [param("midwifery_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        var midwiferyStatus = Array();
        let midwifery_id = Number(req.params.midwifery_id);
        var midwifery = Object();
        var midwiferyOptions = Object();
        var communityLocations = Object();
        var languages = Object();
        db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);

        midwifery = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_SERVICES`)
            .leftJoin(`${SCHEMA_MIDWIFERY}.MIDWIFERY_BIRTH_LOCATIONS`, 'MIDWIFERY_SERVICES.WHERE_TO_GIVE_BIRTH', 'MIDWIFERY_BIRTH_LOCATIONS.ID')
            .leftJoin(`${SCHEMA_MIDWIFERY}.MIDWIFERY_PREFERRED_CONTACT_TYPES`, 'MIDWIFERY_SERVICES.PREFER_TO_BE_CONTACTED', 'MIDWIFERY_PREFERRED_CONTACT_TYPES.ID')
            .joinRaw(`
                LEFT JOIN ${SCHEMA_MIDWIFERY}.MIDWIFERY_COMMUNITY_LOCATIONS 
                ON CASE 
                    WHEN REGEXP_LIKE(MIDWIFERY_SERVICES.COMMUNITY_LOCATED, '^[0-9]+$') 
                    THEN TO_NUMBER(MIDWIFERY_SERVICES.COMMUNITY_LOCATED) 
                    ELSE NULL 
                END = MIDWIFERY_COMMUNITY_LOCATIONS.ID
            `)
            .joinRaw(`
                LEFT JOIN ${SCHEMA_MIDWIFERY}.MIDWIFERY_LANGUAGES 
                ON CASE 
                    WHEN REGEXP_LIKE(MIDWIFERY_SERVICES.PREFERRED_LANGUAGE, '^[0-9]+$') 
                    THEN TO_NUMBER(MIDWIFERY_SERVICES.PREFERRED_LANGUAGE) 
                    ELSE NULL 
                END = MIDWIFERY_LANGUAGES.ID
            `)
            .select('MIDWIFERY_SERVICES.ID',
                    'MIDWIFERY_SERVICES.CONFIRMATION_NUMBER',
                    'MIDWIFERY_SERVICES.STATUS',
                    'MIDWIFERY_SERVICES.FIRST_NAME',
                    'MIDWIFERY_SERVICES.LAST_NAME',
                    'MIDWIFERY_SERVICES.PREFERRED_NAME',
                    'MIDWIFERY_SERVICES.PRONOUNS',
                    'MIDWIFERY_SERVICES.YUKON_HEALTH_INSURANCE',
                    db.raw(`
                    COALESCE(
                        MIDWIFERY_COMMUNITY_LOCATIONS.DESCRIPTION, 
                        MIDWIFERY_SERVICES.COMMUNITY_LOCATED
                    ) AS COMMUNITY_LOCATED
                    `),
                    db.raw(`
                        COALESCE(
                            MIDWIFERY_LANGUAGES.DESCRIPTION, 
                            MIDWIFERY_SERVICES.PREFERRED_LANGUAGE
                        ) AS PREFERRED_LANGUAGE
                    `),
                    'MIDWIFERY_SERVICES.NEED_INTERPRETATION',
                    'MIDWIFERY_SERVICES.PREFERRED_PHONE',
                    'MIDWIFERY_SERVICES.PREFERRED_EMAIL',
                    'MIDWIFERY_SERVICES.OKAY_TO_LEAVE_MESSAGE',
                    'MIDWIFERY_SERVICES.PREFER_TO_BE_CONTACTED',
                    'MIDWIFERY_SERVICES.DATE_CONFIRMED',
                    'MIDWIFERY_SERVICES.FIRST_PREGNANCY',
                    'MIDWIFERY_SERVICES.HOW_MANY_VAGINAL_BIRTHS',
                    'MIDWIFERY_SERVICES.HOW_MANY_C_SECTION_BIRTHS',
                    'MIDWIFERY_SERVICES.COMPLICATIONS_WITH_PREVIOUS',
                    'MIDWIFERY_SERVICES.PROVIDE_DETAILS',
                    'MIDWIFERY_SERVICES.MIDWIFE_BEFORE',
                    'MIDWIFERY_SERVICES.WHERE_TO_GIVE_BIRTH',
                    'MIDWIFERY_SERVICES.MEDICAL_CONCERNS',
                    'MIDWIFERY_SERVICES.PROVIDE_DETAILS2',
                    'MIDWIFERY_SERVICES.HAVE_YOU_HAD_PRIMARY_HEALTH_CARE',
                    'MIDWIFERY_SERVICES.MENSTRUAL_CYCLE_LENGTH',
                    'MIDWIFERY_SERVICES.FAMILY_PHYSICIAN',
                    'MIDWIFERY_SERVICES.PHYSICIAN_S_NAME',
                    'MIDWIFERY_SERVICES.MAJOR_MEDICAL_CONDITIONS',
                    'MIDWIFERY_SERVICES.PROVIDE_DETAILS3',
                    db.raw(`GENERAL.process_blob_value(MIDWIFERY_SERVICES.DO_YOU_IDENTIFY_WITH_ONE_OR_MORE_OF_THESE_GROUPS_AND_COMMUNITIE, '${SCHEMA_MIDWIFERY}.MIDWIFERY_GROUPS_COMMUNITIES') AS DO_YOU_IDENTIFY_WITH_ONE_OR_MORE_OF_THESE_GROUPS_AND_COMMUNITIE,
                        GENERAL.process_blob_value(MIDWIFERY_SERVICES.HOW_DID_YOU_FIND_OUT_ABOUT_THE_MIDWIFERY_CLINIC_SELECT_ALL_THAT, '${SCHEMA_MIDWIFERY}.MIDWIFERY_CLINIC_CONTACT_TYPES') AS HOW_DID_YOU_FIND_OUT_ABOUT_THE_MIDWIFERY_CLINIC_SELECT_ALL_THAT
                    `),
                    'MIDWIFERY_PREFERRED_CONTACT_TYPES.DESCRIPTION as preferred_contact',
                    'MIDWIFERY_BIRTH_LOCATIONS.DESCRIPTION AS BIRTH_LOCATIONS',
                    db.raw("TO_CHAR(MIDWIFERY_SERVICES.DATE_OF_BIRTH, 'YYYY-MM-DD') AS DATE_OF_BIRTH, "+
                    " CASE  WHEN WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_ IS NULL THEN ''  ELSE TO_CHAR(WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, 'YYYY, FMMonth, FMDD')  || CASE  WHEN WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_ IS NULL THEN '' WHEN TO_CHAR(WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, 'DD') IN ('01', '21', '31') THEN 'st' WHEN TO_CHAR(WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, 'DD') IN ('02', '22') THEN 'nd' WHEN TO_CHAR(WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, 'DD') IN ('03', '23') THEN 'rd'  ELSE 'th'  END  END  AS WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_,"+
                    " CASE  WHEN DUE_DATE IS NULL THEN ''  ELSE TO_CHAR(DUE_DATE, 'YYYY, FMMonth, FMDD')  || CASE  WHEN DUE_DATE IS NULL THEN '' WHEN TO_CHAR(DUE_DATE, 'DD') IN ('01', '21', '31') THEN 'st' WHEN TO_CHAR(DUE_DATE, 'DD') IN ('02', '22') THEN 'nd' WHEN TO_CHAR(DUE_DATE, 'DD') IN ('03', '23') THEN 'rd'  ELSE 'th'  END  END AS DUE_DATE ")
            )
            .where("MIDWIFERY_SERVICES.ID", midwifery_id)
            .first();

        midwiferyOptions = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_OPTIONS`).select().then((rows: any) => {
            let arrayResult = Object();

            for (let row of rows) {
                arrayResult[row['id']] = row['description'];
            }

            return arrayResult;
        });

        midwiferyStatus = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_STATUS`).select()
            .then((rows: any) => {
                let arrayResult = Array();
                for (let row of rows) {
                    arrayResult.push({text: row['description'], value: row['id']});
                }

                return arrayResult;
        });

        var contact = Object();
        contact =  await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_CLINIC_CONTACT_TYPES`).select().then((rows: any) => {
            let arrayResult = Object();
            for (let row of rows) {
                arrayResult[row['id']] = row['description'];
            }

            return arrayResult;
        });

        var statusMidwifery =  await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_STATUS`).where("DESCRIPTION", "Closed").select().first();

        let today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0');
        let yyyy = today.getFullYear();
        let todayDate = mm+'_'+dd+'_'+yyyy;
        let fileName = 'midwifery_request_details_'+todayDate+".pdf";

        res.json({ midwifery: midwifery, options: midwiferyOptions, fileName:fileName, midwiferyStatusClosed: statusMidwifery.id ,  dataStatus: midwiferyStatus});

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }

});

/**
 * Store midwifery data
 *
 * @return json
 */
midwiferyRouter.post("/store", async (req: Request, res: Response) => {

    try {
        let data = Object();
        var midwifery = Object();
        var midwiferyCommunityLocations = Object();
        var midwiferyLanguages = Object();
        var midwiferyPreferredContactTypes = Object();
        var midwiferyBirthLocations = Object();
        let midwiferySaved = Object();

        data = req.body;

        let stringOriginalData = JSON.stringify(data);
        let bufferOriginalData = Buffer.from(stringOriginalData);

        let logOriginalSubmission = {
            ACTION_TYPE: 2,
            TITLE: "Original submission request",
            SCHEMA_NAME: SCHEMA_MIDWIFERY,
            TABLE_NAME: "MIDWIFERY_SERVICES",
            ACTION_DATA: bufferOriginalData
        };
        db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);

        const logSaved = await helper.insertLogIdReturn(logOriginalSubmission);
        if(!logSaved){
            console.log('The action could not be logged: '+logOriginalSubmission.TABLE_NAME+' '+logOriginalSubmission.TITLE);
        }

        midwifery.CONFIRMATION_NUMBER = getConfirmationNumber();
        midwifery.FIRST_NAME = data.first_name;
        midwifery.LAST_NAME = data.last_name;

        let legal_name = !_.isUndefined(data.preferred_name) && !_.isEmpty(data.preferred_name) ? data.preferred_name : data.first_name+" "+data.last_name;
        midwifery.PREFERRED_NAME = legal_name;
        midwifery.PRONOUNS = data.pronouns;

        if(!_.isNull(data.date_of_birth) && !_.isEmpty(data.date_of_birth)) {
            data.date_of_birth = new Date(data.date_of_birth);
            let result: string =   data.date_of_birth.toISOString().split('T')[0];
            midwifery.DATE_OF_BIRTH  = db.raw("TO_DATE('"+result+"','YYYY-MM-DD') ");
        }

        midwifery.PREFERRED_PHONE = data.preferred_phone;
        midwifery.PREFERRED_EMAIL = data.preferred_email;

        if(!_.isNull(data.when_was_the_first_day_of_your_last_period_) &&  !_.isEmpty(data.when_was_the_first_day_of_your_last_period_)) {
            data.when_was_the_first_day_of_your_last_period_ = new Date(data.when_was_the_first_day_of_your_last_period_);
            let period: string =   data.when_was_the_first_day_of_your_last_period_.toISOString().split('T')[0];
             midwifery.WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_  = db.raw("TO_DATE('"+period+"','YYYY-MM-DD') ");
        }

        midwiferyCommunityLocations = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_COMMUNITY_LOCATIONS`).where({ DESCRIPTION: data.community_located }).select().then((data:any) => {
            return data[0];
        });
        db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);

        if(midwiferyCommunityLocations) {
            midwifery.COMMUNITY_LOCATED = midwiferyCommunityLocations.id;
        }else{
            midwifery.COMMUNITY_LOCATED = data.community_located;
        }

        midwiferyLanguages = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_LANGUAGES`).where({ DESCRIPTION: data.preferred_language }).select().then((data:any) => {
            return data[0];
        });

        if(midwiferyLanguages) {
            midwifery.PREFERRED_LANGUAGE = midwiferyLanguages.id ;
        }else{
            midwifery.PREFERRED_LANGUAGE = data.preferred_language;
        }

        midwiferyPreferredContactTypes = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_PREFERRED_CONTACT_TYPES`).where({ NAME: data.prefer_to_be_contacted }).select().then((data:any) => {
            return data[0];
        });

        if(midwiferyPreferredContactTypes) {
            midwifery.PREFER_TO_BE_CONTACTED = midwiferyPreferredContactTypes.id ;
        }else{
            midwifery.PREFER_TO_BE_CONTACTED = null;
        }

        midwiferyBirthLocations = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_BIRTH_LOCATIONS`).where({ NAME: data.where_to_give_birth }).select().then((data:any) => {
            return data[0];
        });

        if(midwiferyBirthLocations) {
            midwifery.WHERE_TO_GIVE_BIRTH = midwiferyBirthLocations.id ;
        }else{
            midwifery.WHERE_TO_GIVE_BIRTH = null;
        }
        db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);

        const groupValue = await getMultipleIdsByModel("MidwiferyGroupsCommunities", data.do_you_identify_with_one_or_more_of_these_groups_and_communities);
        midwifery.DO_YOU_IDENTIFY_WITH_ONE_OR_MORE_OF_THESE_GROUPS_AND_COMMUNITIE = groupValue ? db.raw(`UTL_RAW.CAST_TO_RAW(?)`,groupValue) : null;

        const contactValue = await getMultipleIdsByModel("MidwiferyClinicContactTypes", data.how_did_you_find_out_about_the_midwifery_clinic_select_all_that_);
        midwifery.HOW_DID_YOU_FIND_OUT_ABOUT_THE_MIDWIFERY_CLINIC_SELECT_ALL_THAT = contactValue ? db.raw(`UTL_RAW.CAST_TO_RAW(?)`,contactValue) : null;

        midwifery.YUKON_HEALTH_INSURANCE = await getMidwiferyOptions("yukon_health_insurance", data.yukon_health_insurance);
        midwifery.NEED_INTERPRETATION = await getMidwiferyOptions("need_interpretation", data.need_interpretation);
        midwifery.OKAY_TO_LEAVE_MESSAGE = await getMidwiferyOptions("okay_to_leave_message", data.okay_to_leave_message);
        midwifery.DATE_CONFIRMED = await getMidwiferyOptions("date_confirmed", data.date_confirmed);
        midwifery.FIRST_PREGNANCY = await getMidwiferyOptions("first_pregnancy", data.first_pregnancy);
        midwifery.COMPLICATIONS_WITH_PREVIOUS = await getMidwiferyOptions("complications_with_previous", data.complications_with_previous);
        midwifery.MIDWIFE_BEFORE = await getMidwiferyOptions("midwife_before", data.midwife_before);
        midwifery.MEDICAL_CONCERNS = await getMidwiferyOptions("medical_concerns", data.medical_concerns);
        midwifery.HAVE_YOU_HAD_PRIMARY_HEALTH_CARE = await getMidwiferyOptions("have_you_had_primary_health_care", data.have_you_had_primary_health_care);
        midwifery.FAMILY_PHYSICIAN = await getMidwiferyOptions("family_physician", data.family_physician);
        midwifery.MAJOR_MEDICAL_CONDITIONS = await getMidwiferyOptions("major_medical_conditions", data.major_medical_conditions);

        db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);

        if(!_.isNull(data.due_date) && !_.isEmpty(data.due_date)) {
            data.due_date = new Date(data.due_date);
            let dueDate: string =   data.due_date.toISOString().split('T')[0];
             midwifery.DUE_DATE  = db.raw("TO_DATE('"+dueDate+"','YYYY-MM-DD') ");
        }

        midwifery.HOW_MANY_VAGINAL_BIRTHS = data.how_many_vaginal_births;
        midwifery.HOW_MANY_C_SECTION_BIRTHS = data.how_many_c_section_births;
        midwifery.PROVIDE_DETAILS = data.provide_details;
        midwifery.PROVIDE_DETAILS2 = data.provide_details2;
        midwifery.MENSTRUAL_CYCLE_LENGTH = data.menstrual_cycle_length;
        midwifery.PHYSICIAN_S_NAME = data.physician_s_name;
        midwifery.PROVIDE_DETAILS3 = data.provide_details3;

        midwiferySaved = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_SERVICES`).insert(midwifery).into(`${SCHEMA_MIDWIFERY}.MIDWIFERY_SERVICES`).returning('ID');
        const idMidwifery = midwiferySaved.find((obj: any) => {return obj.id;})

        if(midwiferySaved){

            var updateSubmission = await db(`${SCHEMA_GENERAL}.ACTION_LOGS`).update('SUBMISSION_ID', idMidwifery.id).where("ID", logSaved);

            if(!updateSubmission){
                console.log('The action could not be logged: Update '+logOriginalSubmission.TABLE_NAME+' '+logOriginalSubmission.TITLE);
            }

            res.json({ status:200, message: 'Request saved' });
        }

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 404,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Export file
 *
 * @param {request}
 * @return file
 */
midwiferyRouter.post("/export", checkPermissions("midwifery_view"), async (req: Request, res: Response) => {
    try {
        var requests = req.body.params.requests;
        var dateFrom = req.body.params.dateFrom;
        var dateTo = req.body.params.dateTo;
        let status_request = req.body.params.status;
        var midwiferyOptions = Object();
        db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);
        let userId = req.user?.db_user.user.id || null;
        var offset = req.body.params.offset;
        var limit = req.body.params.limit;
        var isAllData = req.body.params.isAllData;
 
        let query = db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_SERVICES`)
        .join(`${SCHEMA_MIDWIFERY}.MIDWIFERY_STATUS`, 'MIDWIFERY_SERVICES.STATUS', '=', 'MIDWIFERY_STATUS.ID')
        .leftJoin(`${SCHEMA_MIDWIFERY}.MIDWIFERY_BIRTH_LOCATIONS`, 'MIDWIFERY_SERVICES.WHERE_TO_GIVE_BIRTH', 'MIDWIFERY_BIRTH_LOCATIONS.ID')
        .leftJoin(`${SCHEMA_MIDWIFERY}.MIDWIFERY_PREFERRED_CONTACT_TYPES`, 'MIDWIFERY_SERVICES.PREFER_TO_BE_CONTACTED', 'MIDWIFERY_PREFERRED_CONTACT_TYPES.ID')
        .joinRaw(`
            LEFT JOIN ${SCHEMA_MIDWIFERY}.MIDWIFERY_COMMUNITY_LOCATIONS 
            ON CASE 
                 WHEN REGEXP_LIKE(MIDWIFERY_SERVICES.COMMUNITY_LOCATED, '^[0-9]+$') 
                 THEN TO_NUMBER(MIDWIFERY_SERVICES.COMMUNITY_LOCATED) 
                 ELSE NULL 
               END = MIDWIFERY_COMMUNITY_LOCATIONS.ID
        `)
        .joinRaw(`
            LEFT JOIN ${SCHEMA_MIDWIFERY}.MIDWIFERY_LANGUAGES 
            ON CASE 
                 WHEN REGEXP_LIKE(MIDWIFERY_SERVICES.PREFERRED_LANGUAGE, '^[0-9]+$') 
                 THEN TO_NUMBER(MIDWIFERY_SERVICES.PREFERRED_LANGUAGE) 
                 ELSE NULL 
               END = MIDWIFERY_LANGUAGES.ID
        `)
        .select('MIDWIFERY_SERVICES.ID',
                'MIDWIFERY_SERVICES.CONFIRMATION_NUMBER',
                'MIDWIFERY_SERVICES.STATUS',
                'MIDWIFERY_SERVICES.FIRST_NAME',
                'MIDWIFERY_SERVICES.LAST_NAME',
                'MIDWIFERY_SERVICES.PREFERRED_NAME',
                'MIDWIFERY_SERVICES.PRONOUNS',
                'MIDWIFERY_SERVICES.YUKON_HEALTH_INSURANCE',
                'MIDWIFERY_SERVICES.NEED_INTERPRETATION',
                'MIDWIFERY_SERVICES.PREFERRED_PHONE',
                'MIDWIFERY_SERVICES.PREFERRED_EMAIL',
                'MIDWIFERY_SERVICES.OKAY_TO_LEAVE_MESSAGE',
                'MIDWIFERY_SERVICES.PREFER_TO_BE_CONTACTED',
                'MIDWIFERY_SERVICES.DATE_CONFIRMED',
                'MIDWIFERY_SERVICES.FIRST_PREGNANCY',
                'MIDWIFERY_SERVICES.HOW_MANY_VAGINAL_BIRTHS',
                'MIDWIFERY_SERVICES.HOW_MANY_C_SECTION_BIRTHS',
                'MIDWIFERY_SERVICES.COMPLICATIONS_WITH_PREVIOUS',
                'MIDWIFERY_SERVICES.PROVIDE_DETAILS',
                'MIDWIFERY_SERVICES.MIDWIFE_BEFORE',
                'MIDWIFERY_SERVICES.WHERE_TO_GIVE_BIRTH',
                'MIDWIFERY_SERVICES.MEDICAL_CONCERNS',
                'MIDWIFERY_SERVICES.PROVIDE_DETAILS2',
                'MIDWIFERY_SERVICES.HAVE_YOU_HAD_PRIMARY_HEALTH_CARE',
                'MIDWIFERY_SERVICES.MENSTRUAL_CYCLE_LENGTH',
                'MIDWIFERY_SERVICES.FAMILY_PHYSICIAN',
                'MIDWIFERY_SERVICES.PHYSICIAN_S_NAME',
                'MIDWIFERY_SERVICES.MAJOR_MEDICAL_CONDITIONS',
                'MIDWIFERY_SERVICES.PROVIDE_DETAILS3',
                 db.raw(`GENERAL.process_blob_value(MIDWIFERY_SERVICES.DO_YOU_IDENTIFY_WITH_ONE_OR_MORE_OF_THESE_GROUPS_AND_COMMUNITIE, '${SCHEMA_MIDWIFERY}.MIDWIFERY_GROUPS_COMMUNITIES') AS DO_YOU_IDENTIFY_WITH_ONE_OR_MORE_OF_THESE_GROUPS_AND_COMMUNITIE,
                        GENERAL.process_blob_value(MIDWIFERY_SERVICES.HOW_DID_YOU_FIND_OUT_ABOUT_THE_MIDWIFERY_CLINIC_SELECT_ALL_THAT, '${SCHEMA_MIDWIFERY}.MIDWIFERY_CLINIC_CONTACT_TYPES') AS HOW_DID_YOU_FIND_OUT_ABOUT_THE_MIDWIFERY_CLINIC_SELECT_ALL_THAT
                `),
                'MIDWIFERY_BIRTH_LOCATIONS.DESCRIPTION AS BIRTH_LOCATIONS',
                'MIDWIFERY_PREFERRED_CONTACT_TYPES.DESCRIPTION AS PREFERRED_CONTACT',
            db.raw("TO_CHAR(MIDWIFERY_SERVICES.DATE_OF_BIRTH, 'YYYY-MM-DD') AS DATE_OF_BIRTH, "+
                " CASE  WHEN WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_ IS NULL THEN ''  ELSE TO_CHAR(WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, 'YYYY, FMMonth, FMDD')  || CASE  WHEN WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_ IS NULL THEN '' WHEN TO_CHAR(WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, 'DD') IN ('01', '21', '31') THEN 'st' WHEN TO_CHAR(WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, 'DD') IN ('02', '22') THEN 'nd' WHEN TO_CHAR(WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, 'DD') IN ('03', '23') THEN 'rd'  ELSE 'th'  END  END AS WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_,"+
                " CASE  WHEN DUE_DATE IS NULL THEN ''  ELSE TO_CHAR(DUE_DATE, 'YYYY, FMMonth, FMDD')  || CASE  WHEN DUE_DATE IS NULL THEN '' WHEN TO_CHAR(DUE_DATE, 'DD') IN ('01', '21', '31') THEN 'st' WHEN TO_CHAR(DUE_DATE, 'DD') IN ('02', '22') THEN 'nd' WHEN TO_CHAR(DUE_DATE, 'DD') IN ('03', '23') THEN 'rd'  ELSE 'th'  END  END AS DUE_DATE ,"+
                "TO_CHAR(MIDWIFERY_SERVICES.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,"+
                "TO_CHAR(MIDWIFERY_SERVICES.UPDATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS UPDATED_AT"),
                db.raw(`
                    COALESCE(
                        MIDWIFERY_COMMUNITY_LOCATIONS.DESCRIPTION, 
                        MIDWIFERY_SERVICES.COMMUNITY_LOCATED
                    ) AS COMMUNITY_LOCATED
                `),
                db.raw(`
                    COALESCE(
                        MIDWIFERY_LANGUAGES.DESCRIPTION, 
                        MIDWIFERY_SERVICES.PREFERRED_LANGUAGE
                    ) AS PREFERRED_LANGUAGE
                `)
            ).where('MIDWIFERY_SERVICES.STATUS', '<>', 4 );

        if(requests.length > 0 &&  query){
            query.whereIn("MIDWIFERY_SERVICES.ID", requests);
        }

        if(dateFrom && dateTo &&  query) {
            query.where(db.raw("TO_CHAR(MIDWIFERY_SERVICES.CREATED_AT, 'YYYY-MM-DD') >=  ? AND TO_CHAR(MIDWIFERY_SERVICES.CREATED_AT, 'YYYY-MM-DD') <= ?",
            [dateFrom, dateTo]));
        }

        if (status_request && status_request.length > 0 &&  query) {
            query.whereIn("MIDWIFERY_SERVICES.STATUS", status_request);
        }

        if (isAllData) {
            query = query.orderBy('MIDWIFERY_SERVICES.ID', 'ASC');
            query = query.offset(offset).limit(limit);
        }


        const midwifery = await query;

        db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);

        interface MidwiferyOption {
            id: number;
            description: string;
        }

        midwiferyOptions = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_OPTIONS`).select().then((rows: MidwiferyOption[]) => {
            let arrayResult = Object();

            for (let row of rows) {
                arrayResult[row['id']] = row['description'];
            }

            return arrayResult;
        });

        midwifery.forEach(function (value: any) {

            if(!value.preferred_name || value.preferred_name == "") {
                value.preferred_name = value.preferred_name;
            }

            if(!_.isNull(value.okay_to_leave_message)){
                value.okay_to_leave_message = midwiferyOptions[value.okay_to_leave_message];
            }

            if(!_.isNull(value.yukon_health_insurance)){
                value.yukon_health_insurance = midwiferyOptions[value.yukon_health_insurance];
            }

            if(!_.isNull(value.need_interpretation)){
                value.need_interpretation = midwiferyOptions[value.need_interpretation];
            }

            if(!_.isNull(value.date_confirmed)){
                value.date_confirmed = midwiferyOptions[value.date_confirmed];
            }

            if(!_.isNull(value.first_pregnancy)){
                value.first_pregnancy = midwiferyOptions[value.first_pregnancy];
            }

            if(!_.isNull(value.complications_with_previous)){
                value.complications_with_previous = midwiferyOptions[value.complications_with_previous];
            }

            if(!_.isNull(value.midwife_before)){
                value.midwife_before = midwiferyOptions[value.midwife_before];
            }

            if(!_.isNull(value.medical_concerns)){
                value.medical_concerns = midwiferyOptions[value.medical_concerns];
            }

            if(!_.isNull(value.have_you_had_primary_health_care)){
                value.have_you_had_primary_health_care = midwiferyOptions[value.have_you_had_primary_health_care];
            }

            if(!_.isNull(value.family_physician)){
                value.family_physician = midwiferyOptions[value.family_physician];
            }

            if(!_.isNull(value.major_medical_conditions)){
                value.major_medical_conditions = midwiferyOptions[value.major_medical_conditions];
            }
            if (value && 'rownum_' in value) {
                delete value.rownum_;
            }
            delete value.id;
            delete value.status;
            delete value.where_to_give_birth;
            delete value.prefer_to_be_contacted;
        });

        let today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0');
        let yyyy = today.getFullYear();
        let todayDate = mm+'-'+dd+'-'+yyyy;
        let random = (Math.random() + 1).toString(36).substring(7);
        let fileName = 'midwifery_'+random+'_requests_'+todayDate+".xlsx";

        var bufferQuery = Object();
        let stringQuery = query.toString();

        // Verify the length of the serialized JSON
        const maxLengthInBytes = 1 * (1024 * 1024); // 1MB to  bytes

        if (Buffer.byteLength(stringQuery, 'utf8') > maxLengthInBytes) {
            console.log('The object exceeds 1MB. It will be truncated.');
            stringQuery = stringQuery.substring(0, maxLengthInBytes);
        }

        if(!_.isEmpty(query)) {
            bufferQuery = Buffer.from(stringQuery);
        }else{
            bufferQuery = null;
        }

        var logFields = {
            ACTION_TYPE: 5,
            TITLE: "Export submission",
            SCHEMA_NAME: SCHEMA_MIDWIFERY,
            TABLE_NAME: "MIDWIFERY_SERVICES",
            SUBMISSION_ID: null,
            ACTION_DATA: bufferQuery,
            USER_ID: userId
        };

        let loggedAction = await helper.insertLog(logFields);

        if(!loggedAction){
            console.log("Midwifery Export could not be logged");
        }

        res.json({ status:200, data:midwifery, fileName:fileName });

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Change the status request to "closed"
 *
 * @param {midwifery_id} id of request
 * @return json
 */
midwiferyRouter.patch("/changeStatus", checkPermissions("midwifery_update"), [body("params.requests").isArray({ min: 1 })], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        var midwifery_id = req.body.params.requests;
        var status_id = req.body.params.requestStatus;
        db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);

        var updateStatus = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_SERVICES`).update({STATUS: status_id}).whereIn("MIDWIFERY_SERVICES.ID", midwifery_id);
        var statusData = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_STATUS`).where('ID', status_id).first();
        var logFields = Array();

        if(updateStatus) {
            let type = "success";
            let message = "Status changed successfully.";

            if(midwifery_id instanceof Array){
                _.forEach(midwifery_id, function(value: any) {
                    logFields.push({
                        ACTION_TYPE: 4,
                        TITLE: "Submission updated to status "+statusData.description,
                        SCHEMA_NAME: SCHEMA_MIDWIFERY,
                        TABLE_NAME: "MIDWIFERY_SERVICES",
                        SUBMISSION_ID: value,
                        USER_ID: req.user?.db_user.user.id
                    });
                });

                let loggedAction = await helper.insertLog(logFields);

                if(!loggedAction){
                    res.send( {
                        status: 400,
                        message: 'The action could not be logged'
                    });
                }
            }

            res.json({ status:200, message: message, type: type });
        }

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed change'
        });
    }
});

midwiferyRouter.post("/duplicates", checkPermissions("midwifery_view"), async (req: Request, res: Response) => {
    try {
        var midwiferyOriginal = Object();
        var midwiferyDuplicate = Object();
        var midwifery = Array();
        db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);

        midwiferyOriginal = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_DUPLICATED_REQUESTS`)
            .join(`${SCHEMA_MIDWIFERY}.MIDWIFERY_SERVICES`, 'MIDWIFERY_DUPLICATED_REQUESTS.ORIGINAL_ID', '=', 'MIDWIFERY_SERVICES.ID')
            .join(`${SCHEMA_MIDWIFERY}.MIDWIFERY_STATUS`, 'MIDWIFERY_SERVICES.STATUS', '=', 'MIDWIFERY_STATUS.ID')
            .leftJoin(`${SCHEMA_MIDWIFERY}.MIDWIFERY_BIRTH_LOCATIONS`, 'MIDWIFERY_SERVICES.WHERE_TO_GIVE_BIRTH', '=', 'MIDWIFERY_BIRTH_LOCATIONS.ID')
            .leftJoin(`${SCHEMA_MIDWIFERY}.MIDWIFERY_PREFERRED_CONTACT_TYPES`, 'MIDWIFERY_SERVICES.PREFER_TO_BE_CONTACTED', '=', 'MIDWIFERY_PREFERRED_CONTACT_TYPES.ID')
            .select('MIDWIFERY_SERVICES.ID AS MIDWIFERY_SERVICES_ID',
                    'MIDWIFERY_SERVICES.FIRST_NAME',
                    'MIDWIFERY_SERVICES.LAST_NAME',
                    'MIDWIFERY_SERVICES.PREFERRED_EMAIL',
                    'MIDWIFERY_SERVICES.PREFERRED_PHONE',
                    'MIDWIFERY_SERVICES.STATUS',
                    'MIDWIFERY_DUPLICATED_REQUESTS.ORIGINAL_ID',
                    'MIDWIFERY_DUPLICATED_REQUESTS.DUPLICATED_ID',
                    'MIDWIFERY_STATUS.DESCRIPTION AS STATUS_DESCRIPTION',
                    'MIDWIFERY_BIRTH_LOCATIONS.DESCRIPTION AS BIRTH_LOCATIONS',
                    'MIDWIFERY_PREFERRED_CONTACT_TYPES.DESCRIPTION AS PREFERRED_CONTACT',
                    db.raw("TO_CHAR(MIDWIFERY_SERVICES.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,"+
                        "TO_CHAR(midwifery_services.date_of_birth, 'YYYY-MM-DD') as date_of_birth")
            )
            .orderBy("MIDWIFERY_SERVICES.CREATED_AT").then((rows: any) => {
                let arrayResult = Object();

                for (let row of rows) {
                    arrayResult[row['original_id']] = row;
                }

                return arrayResult;
            });

        midwiferyDuplicate = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_DUPLICATED_REQUESTS`)
            .join(`${SCHEMA_MIDWIFERY}.MIDWIFERY_SERVICES`, 'MIDWIFERY_DUPLICATED_REQUESTS.DUPLICATED_ID', '=', 'MIDWIFERY_SERVICES.ID')
            .join(`${SCHEMA_MIDWIFERY}.MIDWIFERY_STATUS`, 'MIDWIFERY_SERVICES.STATUS', '=', 'MIDWIFERY_STATUS.ID')
            .leftJoin(`${SCHEMA_MIDWIFERY}.MIDWIFERY_BIRTH_LOCATIONS`, 'MIDWIFERY_SERVICES.WHERE_TO_GIVE_BIRTH', '=', 'MIDWIFERY_BIRTH_LOCATIONS.ID')
            .leftJoin(`${SCHEMA_MIDWIFERY}.MIDWIFERY_PREFERRED_CONTACT_TYPES`, 'MIDWIFERY_SERVICES.PREFER_TO_BE_CONTACTED', '=', 'MIDWIFERY_PREFERRED_CONTACT_TYPES.ID')
            .select('MIDWIFERY_SERVICES.ID AS MIDWIFERY_SERVICES_ID',
                    'MIDWIFERY_SERVICES.FIRST_NAME',
                    'MIDWIFERY_SERVICES.LAST_NAME',
                    'MIDWIFERY_SERVICES.PREFERRED_EMAIL',
                    'MIDWIFERY_SERVICES.PREFERRED_PHONE',
                    'MIDWIFERY_SERVICES.STATUS',
                    'MIDWIFERY_DUPLICATED_REQUESTS.ID',
                    'MIDWIFERY_DUPLICATED_REQUESTS.ORIGINAL_ID',
                    'MIDWIFERY_DUPLICATED_REQUESTS.DUPLICATED_ID',
                    'MIDWIFERY_STATUS.DESCRIPTION AS STATUS_DESCRIPTION',
                    'MIDWIFERY_BIRTH_LOCATIONS.DESCRIPTION AS BIRTH_LOCATIONS',
                    'MIDWIFERY_PREFERRED_CONTACT_TYPES.DESCRIPTION AS PREFERRED_CONTACT',
                    db.raw("TO_CHAR(MIDWIFERY_SERVICES.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,"+
                        "TO_CHAR(MIDWIFERY_SERVICES.DATE_OF_BIRTH, 'YYYY-MM-DD') AS DATE_OF_BIRTH")
            )
            .orderBy("MIDWIFERY_SERVICES.CREATED_AT");

        let index = 0;

        midwiferyDuplicate.forEach(function (value: any) {
            if(value.status !== 4 && midwiferyOriginal[value.original_id].status !== 4){

                let url = "midwiferyWarnings/details/"+value.id;

                delete value.id;

                midwifery.push({
                    midwifery_services_id: null,
                    original_id: null,
                    duplicated_id: null,
                    first_name: 'Duplicated #'+(index+1),
                    last_name: null,
                    preferred_email: null,
                    preferred_phone: null,
                    date_of_birth: null,
                    status_description: null,
                    created_at: 'ACTIONS:',
                    showUrl: url
                });

                midwifery.push(midwiferyOriginal[value.original_id]);
                midwifery.push(value);
                index = index + 1;
            }
        });
        res.send({data: midwifery});

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }

});

/**
 * Obtain data to show in details view
 *
 * @param id of request
 * @return json
 */
midwiferyRouter.get("/duplicates/details/:duplicate_id", checkPermissions("midwifery_view"), [param("duplicate_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        let duplicate_id = Number(req.params.duplicate_id);
        var midwifery = Object();
        var midwiferyDuplicate = Object();
        var midwiferyEntries = Object();
        var midwiferyOptions = Object();
        var communityLocations = Object();
        var languages = Object();
        var communities = Object();
        var contact = Object();
        db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);

        var duplicateEntry = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_DUPLICATED_REQUESTS`)
        .where("ID", duplicate_id).then((rows: any) => {
            let arrayResult = Object();

            for (let row of rows) {
                arrayResult.original = row['original_id'];
                arrayResult.duplicated = row['duplicated_id'];
            }

            return arrayResult;
        });

        midwiferyEntries = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_SERVICES`)
        .leftJoin(`${SCHEMA_MIDWIFERY}.MIDWIFERY_BIRTH_LOCATIONS`, 'MIDWIFERY_SERVICES.WHERE_TO_GIVE_BIRTH', 'MIDWIFERY_BIRTH_LOCATIONS.ID')
        .leftJoin(`${SCHEMA_MIDWIFERY}.MIDWIFERY_PREFERRED_CONTACT_TYPES`, 'MIDWIFERY_SERVICES.PREFER_TO_BE_CONTACTED', 'MIDWIFERY_PREFERRED_CONTACT_TYPES.ID')
        .joinRaw(`
            LEFT JOIN ${SCHEMA_MIDWIFERY}.MIDWIFERY_COMMUNITY_LOCATIONS 
            ON CASE 
                 WHEN REGEXP_LIKE(MIDWIFERY_SERVICES.COMMUNITY_LOCATED, '^[0-9]+$') 
                 THEN TO_NUMBER(MIDWIFERY_SERVICES.COMMUNITY_LOCATED) 
                 ELSE NULL 
               END = MIDWIFERY_COMMUNITY_LOCATIONS.ID
        `)
        .joinRaw(`
            LEFT JOIN ${SCHEMA_MIDWIFERY}.MIDWIFERY_LANGUAGES 
            ON CASE 
                 WHEN REGEXP_LIKE(MIDWIFERY_SERVICES.PREFERRED_LANGUAGE, '^[0-9]+$') 
                 THEN TO_NUMBER(MIDWIFERY_SERVICES.PREFERRED_LANGUAGE) 
                 ELSE NULL 
               END = MIDWIFERY_LANGUAGES.ID
        `)
        .select('MIDWIFERY_SERVICES.ID',
                'MIDWIFERY_SERVICES.CONFIRMATION_NUMBER',
                'MIDWIFERY_SERVICES.STATUS',
                'MIDWIFERY_SERVICES.FIRST_NAME',
                'MIDWIFERY_SERVICES.LAST_NAME',
                'MIDWIFERY_SERVICES.PREFERRED_NAME',
                'MIDWIFERY_SERVICES.PRONOUNS',
                'MIDWIFERY_SERVICES.YUKON_HEALTH_INSURANCE',
                db.raw(`
                    COALESCE(
                      MIDWIFERY_COMMUNITY_LOCATIONS.DESCRIPTION, 
                      MIDWIFERY_SERVICES.COMMUNITY_LOCATED
                    ) AS COMMUNITY_LOCATED
                `),
                'MIDWIFERY_SERVICES.NEED_INTERPRETATION',
                'MIDWIFERY_SERVICES.PREFERRED_PHONE',
                'MIDWIFERY_SERVICES.PREFERRED_EMAIL',
                'MIDWIFERY_SERVICES.OKAY_TO_LEAVE_MESSAGE',
                'MIDWIFERY_SERVICES.PREFER_TO_BE_CONTACTED',
                'MIDWIFERY_SERVICES.DATE_CONFIRMED',
                'MIDWIFERY_SERVICES.FIRST_PREGNANCY',
                'MIDWIFERY_SERVICES.HOW_MANY_VAGINAL_BIRTHS',
                'MIDWIFERY_SERVICES.HOW_MANY_C_SECTION_BIRTHS',
                'MIDWIFERY_SERVICES.COMPLICATIONS_WITH_PREVIOUS',
                'MIDWIFERY_SERVICES.PROVIDE_DETAILS',
                'MIDWIFERY_SERVICES.MIDWIFE_BEFORE',
                'MIDWIFERY_SERVICES.WHERE_TO_GIVE_BIRTH',
                'MIDWIFERY_SERVICES.MEDICAL_CONCERNS',
                'MIDWIFERY_SERVICES.PROVIDE_DETAILS2',
                'MIDWIFERY_SERVICES.HAVE_YOU_HAD_PRIMARY_HEALTH_CARE',
                'MIDWIFERY_SERVICES.MENSTRUAL_CYCLE_LENGTH',
                'MIDWIFERY_SERVICES.FAMILY_PHYSICIAN',
                'MIDWIFERY_SERVICES.PHYSICIAN_S_NAME',
                'MIDWIFERY_SERVICES.MAJOR_MEDICAL_CONDITIONS',
                'MIDWIFERY_SERVICES.PROVIDE_DETAILS3',
                 db.raw(`GENERAL.process_blob_value(MIDWIFERY_SERVICES.DO_YOU_IDENTIFY_WITH_ONE_OR_MORE_OF_THESE_GROUPS_AND_COMMUNITIE, '${SCHEMA_MIDWIFERY}.MIDWIFERY_GROUPS_COMMUNITIES') AS DO_YOU_IDENTIFY_WITH_ONE_OR_MORE_OF_THESE_GROUPS_AND_COMMUNITIE,
                    GENERAL.process_blob_value(MIDWIFERY_SERVICES.HOW_DID_YOU_FIND_OUT_ABOUT_THE_MIDWIFERY_CLINIC_SELECT_ALL_THAT, '${SCHEMA_MIDWIFERY}.MIDWIFERY_CLINIC_CONTACT_TYPES') AS HOW_DID_YOU_FIND_OUT_ABOUT_THE_MIDWIFERY_CLINIC_SELECT_ALL_THAT
                `),
                'MIDWIFERY_BIRTH_LOCATIONS.DESCRIPTION AS BIRTH_LOCATIONS',
                'MIDWIFERY_PREFERRED_CONTACT_TYPES.DESCRIPTION AS PREFERRED_CONTACT',
                db.raw(`
                    COALESCE(
                        MIDWIFERY_LANGUAGES.DESCRIPTION, 
                        MIDWIFERY_SERVICES.PREFERRED_LANGUAGE
                    ) AS PREFERRED_LANGUAGE
                `),
                db.raw("TO_CHAR(MIDWIFERY_SERVICES.DATE_OF_BIRTH, 'YYYY-MM-DD') AS DATE_OF_BIRTH, "+
                    " CASE  WHEN WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_ IS NULL THEN ''  ELSE TO_CHAR(WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, 'YYYY, FMMonth, FMDD')  || CASE  WHEN WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_ IS NULL THEN '' WHEN TO_CHAR(WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, 'DD') IN ('01', '21', '31') THEN 'st' WHEN TO_CHAR(WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, 'DD') IN ('02', '22') THEN 'nd' WHEN TO_CHAR(WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_, 'DD') IN ('03', '23') THEN 'rd'  ELSE 'th'  END  END AS WHEN_WAS_THE_FIRST_DAY_OF_YOUR_LAST_PERIOD_,"+
                    " CASE  WHEN DUE_DATE IS NULL THEN ''  ELSE TO_CHAR(DUE_DATE, 'YYYY, FMMonth, FMDD')  || CASE  WHEN DUE_DATE IS NULL THEN '' WHEN TO_CHAR(DUE_DATE, 'DD') IN ('01', '21', '31') THEN 'st' WHEN TO_CHAR(DUE_DATE, 'DD') IN ('02', '22') THEN 'nd' WHEN TO_CHAR(DUE_DATE, 'DD') IN ('03', '23') THEN 'rd'  ELSE 'th'  END  END AS DUE_DATE ")
        )
        .whereIn("MIDWIFERY_SERVICES.ID", [duplicateEntry.original, duplicateEntry.duplicated])
        .whereNot('MIDWIFERY_SERVICES.STATUS', '4');

        interface MidwiferyOption {
            id: number;
            description: string;
        }

        interface Community {
            id: number;
            description: string;
        }

        interface ContactType {
            id: number;
            description: string;
        }

        communities = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_GROUPS_COMMUNITIES`).select().then((rows: Community[]) => {
            let arrayResult = Object();

            for (let row of rows) {
                arrayResult[row['id']] = row['description'];
            }

            return arrayResult;
        });

        contact =  await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_CLINIC_CONTACT_TYPES`).select().then((rows: ContactType[]) => {
            let arrayResult = Object();
            for (let row of rows) {
                arrayResult[row['id']] = row['description'];
            }

            return arrayResult;
        });

        midwiferyOptions = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_OPTIONS`).select().then((rows: MidwiferyOption[]) => {
            let arrayResult = Object();

            for (let row of rows) {
                arrayResult[row['id']] = row['description'];
            }

            return arrayResult;
        });

        if(midwiferyEntries){
            midwiferyEntries.forEach(function (value: any) {

                if(value.id == duplicateEntry.original){
                    midwifery = value;
                }else if(value.id == duplicateEntry.duplicated){
                    midwiferyDuplicate = value;
                }

            });
        }

        res.json({ midwifery: midwifery, midwiferyDuplicate: midwiferyDuplicate, options: midwiferyOptions});

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Validate if warning is non existant
 *
 * @param {duplicate_id} id of warning
 * @return json
 */
midwiferyRouter.get("/duplicates/validateWarning/:duplicate_id", checkPermissions("midwifery_view"), [param("duplicate_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        var duplicate_id = Number(req.params.duplicate_id);
        var warning = Object();
        var flagExists = true;
        var message = "";
        var type = "error";
        db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);

        warning = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_DUPLICATED_REQUESTS`)
            .where('ID', duplicate_id)
            .select()
            .then((data:any) => {
                return data[0];
            });

        if(!warning){
            flagExists = false;
            message = "The request you are consulting is non existant, please choose a valid request.";
        }

        res.json({ status: 200, flagWarning: flagExists, message: message, type: type});

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Reject duplicate warning
 *
 * @param {warning}
 * @param {request}
 * @return json
 */
midwiferyRouter.patch("/duplicates/primary", checkPermissions("midwifery_update"), async (req: Request, res: Response) => {

    try {
        var warning = Number(req.body.params.warning);
        var request = Number(req.body.params.request);
        var type = req.body.params.type;
        var updateRequest = Object();
        var rejectWarning = Object();
        var logTitle = "";
        var updatedFields = Object();
        var fieldList = Object();
        var primarySubmission = Number();
        var logFields = Array();
        db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);

        if(!request){
            rejectWarning = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_DUPLICATED_REQUESTS`).where("ID", warning).del();
            logTitle = "Duplicated Warning Rejected";
        }else{
            var warningRequest = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_DUPLICATED_REQUESTS`).where("ID", warning).first();

            if(type == 'O'){
                updateRequest = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_SERVICES`).update({STATUS: "4"}).where("ID", warningRequest.duplicated_id);
                primarySubmission = warningRequest.duplicated_id;
            }else if(type == 'D'){
                updateRequest = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_SERVICES`).update({STATUS: "4"}).where("ID", warningRequest.original_id);
                primarySubmission = warningRequest.original_id;
            }

            logFields.push({
                ACTION_TYPE: 4,
                TITLE: "Submission updated to status Closed",
                SCHEMA_NAME: SCHEMA_MIDWIFERY,
                TABLE_NAME: "MIDWIFERY_SERVICES",
                SUBMISSION_ID: primarySubmission,
                USER_ID: req.user?.db_user.user.id
            });

            if(updateRequest){
                rejectWarning = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_DUPLICATED_REQUESTS`).where("ID", warning).del();
                logTitle = "Duplicated Warning Resolved";
                updatedFields.ORIGINAL_ID = warningRequest.original_id;
                updatedFields.DUPLICATED_ID = warningRequest.duplicated_id;
            }
        }

        if(!_.isEmpty(updatedFields)) {
            fieldList =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(updatedFields));
        }else{
            fieldList = null;
        }

        logFields.push({
                ACTION_TYPE: 7,
                TITLE: logTitle,
                SCHEMA_NAME: SCHEMA_MIDWIFERY,
                TABLE_NAME: "MIDWIFERY_DUPLICATED_REQUESTS",
                SUBMISSION_ID: warning,
                USER_ID: req.user?.db_user.user.id,
                ACTION_DATA: fieldList
        });

        let loggedAction = await helper.insertLog(logFields);

        if(!loggedAction){
            res.send( {
                status: 400,
                message: 'The action could not be logged'
            });
        }

        if(rejectWarning) {
            let type = "success";
            let message = "Warning updated successfully.";
            res.json({ status:200, message: message, type: type });
        }

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Generate a new confirmation number similar to php's uniqid()
 *
 * @return id confirmation number
 */
function getConfirmationNumber() {
    // Cryptographically-random 9-char confirmation code. Replaces the previous
    // timestamp + Math.random() "uniqid", which was guessable (see audit LOW-02).
    // Format (9 uppercase hex chars) and length are unchanged.
    const crypto = require("crypto");
    return crypto.randomBytes(5).toString("hex").toUpperCase().substring(0, 9);
}

/**
 * Transforms given array to the allowed database array format and replaces information with catalogue data.
 *
 * @param {model} name of catalogue
 * @param {names} array of information
 * @return {array}
 */
async function getMultipleIdsByModel(model: any, names: any) {
    var others = "";
    var groups = Object();
    var contact = Object();
    var data = Object();
    db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);

    if(model == "MidwiferyGroupsCommunities") {

        groups = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_GROUPS_COMMUNITIES`).select().then((rows: any) => {
                            let arrayResult = Object();
                            for (let row of rows) {
                                arrayResult[row['name']] = row['description'];
                            }

                            return arrayResult;
                    });

        names.forEach(function (value: any, key: any) {
            if(!groups.hasOwnProperty(value)){
                others = names[key];
                names.splice(key, 1);
            }
        });

        if (names.length > 0) {
            data = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_GROUPS_COMMUNITIES`)
                        .select(
                            db.raw(`JSON_OBJECT('data' VALUE JSON_ARRAYAGG(ID)) AS DATA`)
                        )
                        .whereIn('NAME', names);
        }

        if (Array.isArray(data) && data.length > 0) {
            data =  JSON.parse(data[0].data);
        }

    }else if(model == "MidwiferyClinicContactTypes") {
        contact =   await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_CLINIC_CONTACT_TYPES`).select().then((rows: any) => {
                            let arrayResult = Object();
                            for (let row of rows) {
                                arrayResult[row['name']] = row['description'];
                            }

                            return arrayResult;
                    });

        names.forEach(function (value: any, key: any) {
            if(!contact.hasOwnProperty(value)){
                others = names[key];
                names.splice(key, 1);
            }
        });

        if (names.length > 0) {
            data = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_CLINIC_CONTACT_TYPES`)
                        .select(
                            db.raw(`JSON_OBJECT('data' VALUE JSON_ARRAYAGG(ID)) AS DATA`)
                        )
                        .whereIn('NAME', names);
        }

        if (Array.isArray(data) && data.length > 0) {
            data =  JSON.parse(data[0].data);
        }

    }

    if(_.isEmpty(data) && others !== ""){

        data.data = [others];

    }else if(!_.isEmpty(data) && others !== "") {

        data.data.push(others);

    }

    return JSON.stringify(data);
}

/**
 * Obtain data from options catalogue
 *
 * @param {field}
 * @param {data}
 * @return id of option
 */
async function getMidwiferyOptions(field: any, data: string) {
    var bool = true;

    if(data == "yes" || data == "Yes" || data == "YES") {
        bool = true;
    }else if(data == "no" || data == "No" || data == "NO") {
        bool = false;
    }else if(!data || data == "") {
        return null;
    }
    db = await helper.getOracleClient(db, DB_CONFIG_MIDWIFERY);

    var options = await db(`${SCHEMA_MIDWIFERY}.MIDWIFERY_OPTIONS`).where({ FIELD_NAME: field }).where({ FIELD_VALUE: bool }).select().first();

    return options.id;
}
