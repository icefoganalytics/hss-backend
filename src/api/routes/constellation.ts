import express, { Request, Response } from "express";
import { body, param } from "express-validator";
import { SubmissionStatusRepository } from "../repository/oracle/SubmissionStatusRepository";
import knex from "knex";
import { DB_CONFIG_CONSTELLATION, SCHEMA_CONSTELLATION, SCHEMA_GENERAL } from "../config";
import { groupBy, helper, logger } from "../utils";
import { checkPermissions } from "../middleware/permissions";
import { ReturnValidationErrors } from "../middleware";
var RateLimit = require('express-rate-limit');
var _ = require('lodash');
let db = knex(DB_CONFIG_CONSTELLATION);

export const constellationRouter = express.Router();
constellationRouter.use(RateLimit({
    windowMs: 1*60*1000, // 1 minute
    max: 5000
  }));
/**
 * Obtain data to show in the index view
 *
 * @param { action_id } action id.
 * @param { action_value } action value.
 * @return json
 */
constellationRouter.get("/submissions/:action_id/:action_value", checkPermissions("constellation_view"), [
    param("action_id").notEmpty(), 
    param("action_value").notEmpty()
], ReturnValidationErrors, async (req: Request, res: Response) => {

    try {
        const submissionStatusRepo = new SubmissionStatusRepository();

        const actionId = req.params.action_id;
        const actionVal = req.params.action_value;
        const permissions = req.user?.db_user.permissions ?? [];
        const result = await submissionStatusRepo.getModuleSubmissions(SCHEMA_CONSTELLATION, actionId, actionVal, permissions);
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
constellationRouter.get("/submissions/status/:action_id/:action_value", checkPermissions("constellation_view"), [
    param("action_id").notEmpty(), 
    param("action_value").notEmpty()
], ReturnValidationErrors, async (req: Request, res: Response) => {

    try {
        const submissionStatusRepo = new SubmissionStatusRepository();
        const actionId = req.params.action_id;
        const actionVal = req.params.action_value;
        const permissions = req.user?.db_user.permissions ?? [];
        const result = await submissionStatusRepo.getModuleSubmissionsStatus(SCHEMA_CONSTELLATION, actionId, actionVal, permissions);
                        
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
constellationRouter.post("/", checkPermissions("constellation_view"), async (req: Request, res: Response) => {
    try {
        db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);
        const allowedSortOrders = ["ASC", "DESC"];
        const allowedSortFields = ["ID", "YOUR_LEGAL_NAME", "FAMILY_PHYSICIAN", "DATE_OF_BIRTH", "CREATED_AT", "STATUS", "DIAGNOSIS"];
        var dateFrom = req.body.params.dateFrom;
        var dateTo = req.body.params.dateTo;
        let status_request = req.body.params.status;

        const page = parseInt(req.body.params.page as string) || 1;
        const pageSize = parseInt(req.body.params.pageSize as string) || 10;
        const offset = (page - 1) * pageSize;
        const sortBy = req.body.params.sortBy;
        const sortOrder = req.body.params.sortOrder;
        const initialFetch = req.body.params.initialFetch;
        const safeSortOrder = allowedSortOrders.includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : "ASC";
        const safeSortBy = allowedSortFields.includes(sortBy?.toUpperCase()) ? sortBy.toUpperCase() : "ID";

        let query = db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH`)
            .join(`${SCHEMA_CONSTELLATION}.CONSTELLATION_STATUS`, 'CONSTELLATION_HEALTH.STATUS', '=', 'CONSTELLATION_STATUS.ID')
            .select('CONSTELLATION_HEALTH.YOUR_LEGAL_NAME',
                    'CONSTELLATION_HEALTH.ID',
                    'CONSTELLATION_HEALTH.FAMILY_PHYSICIAN',
                    db.raw(`GENERAL.process_blob_value(CONSTELLATION_HEALTH.DIAGNOSIS, 'CONSTELLATION_HEALTH.CONSTELLATION_HEALTH_DIAGNOSIS_HISTORY') AS DIAGNOSIS,
                        TO_CHAR(CONSTELLATION_HEALTH.DATE_OF_BIRTH, 'YYYY-MM-DD')  AS DATE_OF_BIRTH,
                        TO_CHAR(CONSTELLATION_HEALTH.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS')  AS CREATED_AT`
                    ),
                    'CONSTELLATION_STATUS.DESCRIPTION as STATUS',
                    'CONSTELLATION_HEALTH.ID as CONSTELLATION_HEALTH_ID')
            .where('CONSTELLATION_HEALTH.STATUS', '<>', 4 );

        const countAllQuery = query.clone().clearSelect().clearOrder().count('* as count').first();

        if(dateFrom && dateTo) {
            query.whereRaw("TO_CHAR(CONSTELLATION_HEALTH.CREATED_AT, 'YYYY-MM-DD') BETWEEN ? AND ?", [dateFrom, dateTo]);
        }

        if (status_request && status_request.length > 0) {
            query.whereIn("CONSTELLATION_HEALTH.STATUS", status_request);
        }
        
        if (safeSortBy && safeSortBy?.toUpperCase() === "DIAGNOSIS") {
            query = query.orderByRaw(` GENERAL.process_blob_value(CONSTELLATION_HEALTH.DIAGNOSIS, 'CONSTELLATION_HEALTH.CONSTELLATION_HEALTH_DIAGNOSIS_HISTORY')  ${safeSortOrder}`);
        } else if (safeSortBy) {
            query = query.orderBy(`CONSTELLATION_HEALTH.${safeSortBy.toUpperCase()}`, safeSortOrder);
        }else{
            query = query.orderBy('CONSTELLATION_HEALTH.ID', 'ASC');
        }

        const countQuery = query.clone().clearSelect().clearOrder().count('* as count').first();

        if(pageSize !== -1 && initialFetch == 0){
            query = query.offset(offset).limit(pageSize);
        }else if(initialFetch == 1){
            query = query.offset(offset).limit(250);
        }

        var [constellationHealth, countResult, countResultAll] = await Promise.all([
            query,
            countQuery,
            countAllQuery
        ]);

        const countAll = countResultAll ? countResultAll.count : 0;
        const countSubmissions = countResult ? countResult.count : 0;
        constellationHealth.forEach(function (value: any) {
            if(value.date_of_birth === null) {
                value.date_of_birth =  "N/A";
            }

            if(value.language_prefer_to_receive_services){
                value.language_prefer_to_receive_services = value.preferred_language;
            }else{
                value.language_prefer_to_receive_services = value.language_preferred;
            }
            value.showUrl = "constellation/show/"+value.constellation_health_id;
        });

        var constellationStatus = await getAllStatus();
        res.send({data: constellationHealth, dataStatus: constellationStatus, total: countSubmissions, all: countAll});
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
 * @param {constellationHealth_id} id of request
 * @return json
 */
constellationRouter.get("/validateRecord/:constellationHealth_id", checkPermissions("constellation_view"), [param("constellationHealth_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {

    try {
        db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);
        var constellationHealth_id = Number(req.params.constellationHealth_id);
        var constellationHealth = Object();
        var flagExists= true;
        var message= "";
        var type= "error";

        constellationHealth = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH`)
            .join(`${SCHEMA_CONSTELLATION}.CONSTELLATION_STATUS`, 'CONSTELLATION_HEALTH.STATUS', '=', 'CONSTELLATION_STATUS.ID')
            .where('CONSTELLATION_HEALTH.ID', constellationHealth_id)
            .select(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.*`,
                    'CONSTELLATION_STATUS.DESCRIPTION AS STATUS_DESCRIPTION')
            .then((data:any) => {
                return data[0];
            });


        if(!constellationHealth || constellationHealth.status_description == "closed"){
            flagExists= false;
            message= "The request you are consulting is closed or non existant, please choose a valid request.";
        }

        res.json({ status: 200, flagConstellation: flagExists, message: message, type: type});
    } catch(e) {
        logger.error("Unhandled error in request handler", e);
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Obtain data to show in details view
 *
 * @param {constellationHealth_id} id of request
 * @return json
 */
constellationRouter.get("/show/:constellationHealth_id", checkPermissions("constellation_view"), [param("constellationHealth_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        var constellationHealth_id = Number(req.params.constellationHealth_id); 
        db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);
        var constellationHealth = Object();
        var constellationFamily = Object();

        constellationHealth = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH`)
            .joinRaw(`
                LEFT JOIN GENERAL.COMMUNITY_LOCATIONS
                ON CASE 
                        WHEN REGEXP_LIKE(CONSTELLATION_HEALTH.COMMUNITY_LOCATED, '^[0-9]+$') 
                        THEN TO_NUMBER(CONSTELLATION_HEALTH.COMMUNITY_LOCATED) 
                        ELSE NULL 
                    END = COMMUNITY_LOCATIONS.ID
            `)   
            .leftJoin(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_LANGUAGE`, 'CONSTELLATION_HEALTH.LANGUAGE_PREFER_TO_RECEIVE_SERVICES', 'CONSTELLATION_HEALTH_LANGUAGE.ID')
            .leftJoin(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DEMOGRAPHICS`, 'CONSTELLATION_HEALTH.DEMOGRAPHICS_GROUPS', 'CONSTELLATION_HEALTH_DEMOGRAPHICS.ID')
            .where('CONSTELLATION_HEALTH.ID', constellationHealth_id)
            .select(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.ID`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.STATUS`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.FIRST_NAME`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.LAST_NAME`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.IS_THIS_YOUR_LEGAL_NAME_`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.YOUR_LEGAL_NAME`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.PRONOUNS`,
                    db.raw(`GENERAL.process_blob_value(CONSTELLATION_HEALTH.DIAGNOSIS, 'CONSTELLATION_HEALTH.CONSTELLATION_HEALTH_DIAGNOSIS_HISTORY') AS DIAGNOSIS,
                    TO_CHAR(CONSTELLATION_HEALTH.DATE_OF_BIRTH, 'YYYY-MM-DD')  AS DATE_OF_BIRTH,
                    TO_CHAR(CONSTELLATION_HEALTH.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS')  AS CREATED_AT,
                    TO_CHAR(CONSTELLATION_HEALTH.UPDATED_AT, 'YYYY-MM-DD HH24:MI:SS')  AS UPDATED_AT`
                    ),
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.HAVE_YHCIP`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.HEALTH_CARE_CARD`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.PROVINCE`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.YHCIP`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.POSTAL_CODE`,
                    db.raw(`
                        COALESCE(
                            COMMUNITY_LOCATIONS.DESCRIPTION, 
                           CONSTELLATION_HEALTH.COMMUNITY_LOCATED
                        ) AS COMMUNITY_LOCATED
                    `),
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.PREFER_TO_BE_CONTACTED`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.PHONE_NUMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.EMAIL_ADDRESS`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.LEAVE_PHONE_MESSAGE`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.LANGUAGE_PREFER_TO_RECEIVE_SERVICES`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.PREFERRED_LANGUAGE`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.INTERPRETATION_SUPPORT`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.FAMILY_PHYSICIAN`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.CURRENT_FAMILY_PHYSICIAN`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.ACCESSING_HEALTH_CARE`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.DEMOGRAPHICS_GROUPS`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.INCLUDE_FAMILY_MEMBERS`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_LANGUAGE.DESCRIPTION AS LANGUAGE_PREFER_DESCRIPTION`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DEMOGRAPHICS.DESCRIPTION AS DEMOGRAPHIC_DESCRIPTION`)
            .first();

        constellationFamily = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS`)
            .leftJoin(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_LANGUAGE`, 'CONSTELLATION_HEALTH_FAMILY_MEMBERS.LANGUAGE_PREFER_TO_RECEIVE_SERVICES_FAMILY_MEMBER', 'CONSTELLATION_HEALTH_LANGUAGE.ID')
            .leftJoin(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DEMOGRAPHICS`, 'CONSTELLATION_HEALTH_FAMILY_MEMBERS.DEMOGRAPHICS_GROUPS_FAMILY_MEMBER', 'CONSTELLATION_HEALTH_DEMOGRAPHICS.ID')
            .select(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.ID`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.CONSTELLATION_HEALTH_ID`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.FIRST_NAME_FAMILY_MEMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.LAST_NAME_FAMILY_MEMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.IS_THIS_YOUR_LEGAL_NAME_FAMILY_MEMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.YOUR_LEGAL_NAME_FAMILY_MEMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.PRONOUNS_FAMILY_MEMBER`,
                    db.raw(`GENERAL.process_blob_value(${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.DIAGNOSIS_FAMILY_MEMBER, 'CONSTELLATION_HEALTH.CONSTELLATION_HEALTH_DIAGNOSIS_HISTORY') AS DIAGNOSIS_FAMILY_MEMBER,
                    TO_CHAR(CONSTELLATION_HEALTH_FAMILY_MEMBERS.DATE_OF_BIRTH_FAMILY_MEMBER, 'YYYY-MM-DD')  AS DATE_OF_BIRTH_FAMILY_MEMBER,
                    TO_CHAR(CONSTELLATION_HEALTH_FAMILY_MEMBERS.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS')  AS CREATED_AT,
                    TO_CHAR(CONSTELLATION_HEALTH_FAMILY_MEMBERS.UPDATED_AT, 'YYYY-MM-DD HH24:MI:SS')  AS UPDATED_AT`
                    ),
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.HAVE_YHCIP_FAMILY_MEMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.HEALTH_CARE_CARD_FAMILY_MEMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.PROVINCE_FAMILY_MEMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.YHCIP_FAMILY_MEMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.RELATIONSHIP_FAMILY_MEMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.LANGUAGE_PREFER_TO_RECEIVE_SERVICES_FAMILY_MEMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.PREFERRED_LANGUAGE_FAMILY_MEMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.INTERPRETATION_SUPPORT_FAMILY_MEMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.FAMILY_PHYSICIAN_FAMILY_MEMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.CURRENT_FAMILY_PHYSICIAN_FAMILY_MEMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.ACCESSING_HEALTH_CARE_FAMILY_MEMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.DEMOGRAPHICS_GROUPS_FAMILY_MEMBER`,
                    'CONSTELLATION_HEALTH_LANGUAGE.DESCRIPTION AS LANGUAGE_PREFER_DESCRIPTION_FAMILY_MEMBER',
                    'CONSTELLATION_HEALTH_DEMOGRAPHICS.DESCRIPTION AS DEMOGRAPHIC_DESCRIPTION_FAMILY_MEMBER')
            .where('CONSTELLATION_HEALTH_FAMILY_MEMBERS.CONSTELLATION_HEALTH_ID', constellationHealth_id);

        if(constellationHealth.date_of_birth === null) {
            constellationHealth.date_of_birth =  "N/A";
        }

        constellationHealth.flagFamilyMembers = false;

        //If the client has family members, the same treatment of the corresponding data is given.
        if(constellationFamily.length){
            constellationHealth.flagFamilyMembers = true;

            constellationFamily.forEach(function (value: any, key: any) {

                if(value.date_of_birth_family_member === null) {
                    value.date_of_birth_family_member =  "N/A";
                }
            });
        }

        let today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0');
        let yyyy = today.getFullYear();
        let todayDate = mm+'_'+dd+'_'+yyyy;
        let fileName = 'constellation_request_details_'+todayDate+".pdf";

        var constellationStatus = await getAllStatus();

        
        res.json({ status: 200, dataStatus: constellationStatus, dataConstellation: constellationHealth, dataConstellationFamily: constellationFamily, fileName:fileName});
    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed

        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Store constellation data
 *
 * @return json
 */
constellationRouter.post("/store", async (req: Request, res: Response) => {

    try {
        let data = Object(); 
        db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);
        const constellationHealth = Object();
        let demographicsQuery = Object();
        let languagesQuery = Object();
        let constellationSaved = Object();

        data = req.body;

        let stringOriginalData = JSON.stringify(data);
        let bufferOriginalData = Buffer.from(stringOriginalData);

        let logOriginalSubmission = {
            ACTION_TYPE: 2,
            TITLE: "Original submission request",
            SCHEMA_NAME: SCHEMA_CONSTELLATION,
            TABLE_NAME: "CONSTELLATION_HEALTH",
            ACTION_DATA: bufferOriginalData
        };

        const logSaved = await helper.insertLogIdReturn(logOriginalSubmission);
        if(!logSaved){
            console.log('The action could not be logged: '+logOriginalSubmission.TABLE_NAME+' '+logOriginalSubmission.TITLE);
        }

        constellationHealth.first_name = data.first_name;
        constellationHealth.last_name = data.last_name;
        constellationHealth.is_this_your_legal_name_ = data.is_this_your_legal_name_;

        const dob = new Date(data.date_of_birth);

        let legal_name = "";
        if(!_.isUndefined(data.your_legal_name) &&  !_.isEmpty(data.your_legal_name )){
            legal_name = data.your_legal_name;
        }else{
            legal_name = data.first_name+" "+data.last_name;
        }

        constellationHealth.your_legal_name = legal_name;
        constellationHealth.pronouns = data.pronouns;
        if(!_.isEmpty(data.date_of_birth)){
            data.date_of_birth = new Date(data.date_of_birth);
            let result: string =   data.date_of_birth.toISOString().split('T')[0];
            constellationHealth.date_of_birth  = db.raw("TO_DATE( ? ,'YYYY-MM-DD') ", result);
        }else{
            constellationHealth.date_of_birth = null;
        }


        constellationHealth.yhcip = data.yhcip;
        constellationHealth.postal_code = data.postal_code;
        constellationHealth.community_located = data.community_located;
        constellationHealth.phone_number = data.phone_number;
        constellationHealth.email_address = data.email_address;
        constellationHealth.current_family_physician = data.current_family_physician;
        constellationHealth.accessing_health_care = data.accessing_health_care;
        constellationHealth.leave_phone_message = data.leave_phone_message;
        constellationHealth.interpretation_support = data.interpretation_support;
        constellationHealth.family_physician = data.family_physician;
        constellationHealth.prefer_to_be_contacted = data.prefer_to_be_contacted;
        constellationHealth.have_yhcip = data.have_yhcip;
        constellationHealth.health_care_card = data.health_care_card;
        constellationHealth.province = data.province;

        db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);
        languagesQuery = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_LANGUAGE`).where({ VALUE: data.language_prefer_to_receive_services }).select();
        const language = languagesQuery.length == 1 ? languagesQuery[0] : undefined;

        if (language){
            constellationHealth.language_prefer_to_receive_services = language.id;
        }

        if(data.language_prefer_to_receive_services !== ''){
            constellationHealth.preferred_language = data.other_language;
        }

        const diagnosisList = data.diagnosis;
        const diagnosisVal = await getMultipleIdsByModel("ConstellationHealthDiagnosisHistory", diagnosisList);
        constellationHealth.diagnosis = diagnosisVal ? db.raw(`UTL_RAW.CAST_TO_RAW( ? )`, diagnosisVal) : null;

        demographicsQuery = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DEMOGRAPHICS`).where({ VALUE: data.demographics_groups }).select();
        const demographic = demographicsQuery.length == 1 ? demographicsQuery[0] : undefined;

        if (demographic) {
            constellationHealth.demographics_groups = demographic.id;
        }

        constellationHealth.include_family_members = data.include_family_members;
        db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);
        constellationSaved = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH`).insert(constellationHealth).into(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH`).returning('ID');
        const idConstellation = constellationSaved.find((obj: any) => {return obj.id;})

        if(constellationSaved){
            var updateSubmission = await db(`${SCHEMA_GENERAL}.ACTION_LOGS`).update('SUBMISSION_ID', idConstellation.id).where("ID", logSaved);

            if(!updateSubmission){
                console.log('The action could not be logged: Update '+logOriginalSubmission.TABLE_NAME+' '+logOriginalSubmission.TITLE);
            }
        }

        let logFields = {
            ACTION_TYPE: 2,
            TITLE: "Insert submission",
            SCHEMA_NAME: SCHEMA_CONSTELLATION,
            TABLE_NAME: "CONSTELLATION_HEALTH",
            SUBMISSION_ID: idConstellation.id
        };

        let loggedAction = await helper.insertLog(logFields);

        if(!loggedAction){
            console.log('The action could not be logged: '+logFields.TABLE_NAME+' '+logFields.TITLE);
        }

        if(!_.isEmpty(data.family_members_json) && data.family_members_json !== "[]"){
            const replaceString = data.family_members_json;
            const jsonFixed = replaceString.replace(/\'/gm, '"');
            const jsonFm = JSON.parse(jsonFixed);

            let familyMembers = await dataFamilyMembers(idConstellation.id, jsonFm);
            let familyMembersSaved = false;
            db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);

            for (const familyMember of familyMembers) {
                try {
                    await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS`).insert(familyMember).into(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS`);
                    familyMembersSaved = true;
                } catch (e) {
                    familyMembersSaved = false;
                    logger.error("Unhandled error in request handler", e);
                    break; // stop on first failure; a single response is sent below
                }
            }

            // Exactly one response per request (see audit HIGH-05).
            if(constellationSaved && familyMembersSaved){
                res.json({ status:200, message: 'Request saved' });
            } else {
                res.send({ status: 400, message: 'Request could not be processed' });
            }

        }else if(constellationSaved){
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
 * Obtain data to show in export file
 *
 * @param {status} status of request
 * @return json
 */
constellationRouter.post("/export/", checkPermissions("constellation_view"), async (req: Request, res: Response) => {
    try {
        var requests = req.body.params.requests; 
        db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);
        let status_request = req.body.params.status;
        var dateFrom = req.body.params.dateFrom;
        var dateTo = req.body.params.dateTo;
        var idSubmission: any[] = [];
        let userId = req.user?.db_user.user.id || null;

        const offset = req.body.params.offset;
        const limit = req.body.params.limit;
        const isAllData  = req.body.params.isAllData;

        let query = db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH`)
            .joinRaw(`
                LEFT JOIN GENERAL.COMMUNITY_LOCATIONS
                ON CASE 
                        WHEN REGEXP_LIKE(CONSTELLATION_HEALTH.COMMUNITY_LOCATED, '^[0-9]+$') 
                        THEN TO_NUMBER(CONSTELLATION_HEALTH.COMMUNITY_LOCATED) 
                        ELSE NULL 
                    END = COMMUNITY_LOCATIONS.ID
            `)
            .leftJoin(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_LANGUAGE`, 'CONSTELLATION_HEALTH.LANGUAGE_PREFER_TO_RECEIVE_SERVICES', 'CONSTELLATION_HEALTH_LANGUAGE.ID')
            .leftJoin(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DEMOGRAPHICS`, 'CONSTELLATION_HEALTH.DEMOGRAPHICS_GROUPS', 'CONSTELLATION_HEALTH_DEMOGRAPHICS.ID')
            .select(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.FIRST_NAME`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.LAST_NAME`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.IS_THIS_YOUR_LEGAL_NAME_`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.YOUR_LEGAL_NAME`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.PRONOUNS`,
                    db.raw(`TO_CHAR(CONSTELLATION_HEALTH.DATE_OF_BIRTH, 'YYYY-MM-DD')  AS DATE_OF_BIRTH`),
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.HAVE_YHCIP`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.HEALTH_CARE_CARD`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.YHCIP`,
                     `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.POSTAL_CODE`,
                    db.raw(`
                        COALESCE(
                            COMMUNITY_LOCATIONS.DESCRIPTION, 
                           CONSTELLATION_HEALTH.COMMUNITY_LOCATED
                        ) AS COMMUNITY_LOCATED
                    `),
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.PREFER_TO_BE_CONTACTED`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.PHONE_NUMBER`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.EMAIL_ADDRESS`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.LEAVE_PHONE_MESSAGE`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_LANGUAGE.DESCRIPTION AS LANGUAGE_PREFER_DESCRIPTION`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.INTERPRETATION_SUPPORT`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.FAMILY_PHYSICIAN`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.CURRENT_FAMILY_PHYSICIAN`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.ACCESSING_HEALTH_CARE`,
                    db.raw(`GENERAL.process_blob_value(${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.DIAGNOSIS, '${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DIAGNOSIS_HISTORY' ) AS DIAGNOSIS`),
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DEMOGRAPHICS.DESCRIPTION AS DEMOGRAPHIC_DESCRIPTION`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.INCLUDE_FAMILY_MEMBERS`,
                    db.raw(`TO_CHAR(CONSTELLATION_HEALTH.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS')  AS CREATED_AT`),
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.ID`,
                )
            .where('CONSTELLATION_HEALTH.STATUS', '<>', 4 );

        if(requests && requests.length > 0  && requests.length < 1000){
            query.whereIn("CONSTELLATION_HEALTH.ID", requests);
        }

        if(dateFrom && dateTo) {
            query.whereRaw(
                "CONSTELLATION_HEALTH.CREATED_AT BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')",
                [dateFrom, dateTo]
            );
        }

        if (status_request && status_request.length > 0) {
            query.whereIn("CONSTELLATION_HEALTH.STATUS", status_request);
        }

        if (isAllData || requests.length > 1000) {
            query = query.offset(offset).limit(limit);
        }

        const constellationHealth = await query;

        constellationHealth.forEach(function (value: any) {
            idSubmission.push(value.id); 
            value.date_of_birth = value.date_of_birth || "N/A";
            if(value.language_prefer_to_receive_services){
                value.language_prefer_to_receive_services = value.preferred_language;
            }else{
                value.language_prefer_to_receive_services = value.language_preferred;
            }
            if (value && 'rownum_' in value) {
                delete value.rownum_;
            }
            delete value.id;
        });

        let queryFamily = db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS`)
        .innerJoin(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH`,'CONSTELLATION_HEALTH_FAMILY_MEMBERS.CONSTELLATION_HEALTH_ID','CONSTELLATION_HEALTH.ID')
        .leftJoin(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_LANGUAGE`, 'CONSTELLATION_HEALTH_FAMILY_MEMBERS.LANGUAGE_PREFER_TO_RECEIVE_SERVICES_FAMILY_MEMBER', 'CONSTELLATION_HEALTH_LANGUAGE.ID')
        .leftJoin(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DEMOGRAPHICS`, 'CONSTELLATION_HEALTH_FAMILY_MEMBERS.DEMOGRAPHICS_GROUPS_FAMILY_MEMBER', 'CONSTELLATION_HEALTH_DEMOGRAPHICS.ID')
        .select('CONSTELLATION_HEALTH.YOUR_LEGAL_NAME AS FAMILYMEMBEROF' ,
                'CONSTELLATION_HEALTH_FAMILY_MEMBERS.FIRST_NAME_FAMILY_MEMBER',
                'CONSTELLATION_HEALTH_FAMILY_MEMBERS.LAST_NAME_FAMILY_MEMBER',
                'CONSTELLATION_HEALTH_FAMILY_MEMBERS.YOUR_LEGAL_NAME_FAMILY_MEMBER',
                'CONSTELLATION_HEALTH_FAMILY_MEMBERS.PRONOUNS_FAMILY_MEMBER',
                db.raw(`TO_CHAR(CONSTELLATION_HEALTH_FAMILY_MEMBERS.DATE_OF_BIRTH_FAMILY_MEMBER, 'YYYY-MM-DD')  AS DATE_OF_BIRTH_FAMILY_MEMBER`),
                'CONSTELLATION_HEALTH_FAMILY_MEMBERS.HAVE_YHCIP_FAMILY_MEMBER',
                'CONSTELLATION_HEALTH_FAMILY_MEMBERS.HEALTH_CARE_CARD_FAMILY_MEMBER',
                'CONSTELLATION_HEALTH_FAMILY_MEMBERS.PROVINCE_FAMILY_MEMBER',
                'CONSTELLATION_HEALTH_FAMILY_MEMBERS.YHCIP_FAMILY_MEMBER',
                'CONSTELLATION_HEALTH_FAMILY_MEMBERS.RELATIONSHIP_FAMILY_MEMBER',
                'CONSTELLATION_HEALTH_LANGUAGE.DESCRIPTION AS LANGUAGE_PREFER_DESCRIPTION_FAMILY_MEMBER',
                'CONSTELLATION_HEALTH_FAMILY_MEMBERS.PREFERRED_LANGUAGE_FAMILY_MEMBER',
                'CONSTELLATION_HEALTH_FAMILY_MEMBERS.INTERPRETATION_SUPPORT_FAMILY_MEMBER',
                'CONSTELLATION_HEALTH_FAMILY_MEMBERS.FAMILY_PHYSICIAN_FAMILY_MEMBER',
                'CONSTELLATION_HEALTH_FAMILY_MEMBERS.CURRENT_FAMILY_PHYSICIAN_FAMILY_MEMBER',
                'CONSTELLATION_HEALTH_FAMILY_MEMBERS.ACCESSING_HEALTH_CARE_FAMILY_MEMBER',
                db.raw(`GENERAL.process_blob_value(${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS.DIAGNOSIS_FAMILY_MEMBER, '${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DIAGNOSIS_HISTORY' ) AS DIAGNOSIS_FAMILY_MEMBER`),
                'CONSTELLATION_HEALTH_DEMOGRAPHICS.DESCRIPTION AS DEMOGRAPHIC_DESCRIPTION_FAMILY_MEMBER');


        if(requests && requests.length > 0  && requests.length < 1000){
            queryFamily.whereIn("CONSTELLATION_HEALTH.ID", requests);
        }

        if(dateFrom && dateTo) {
            queryFamily.whereRaw(
                "CONSTELLATION_HEALTH.CREATED_AT BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')",
                [dateFrom, dateTo]
            );
        }

        if (status_request && status_request.length > 0) {
            queryFamily.whereIn("CONSTELLATION_HEALTH.STATUS", status_request);
        }

        if (isAllData || requests.length > 1000) {
            queryFamily = queryFamily.offset(offset).limit(limit);
        }

        const constellationFamily = await queryFamily;
        let flagFamilyMembers = false;

        //If the client has family members, the same treatment of the corresponding data is given.
        if(constellationFamily.length){
            flagFamilyMembers = true;
            constellationFamily.forEach(function (value: any, key: any) {

                var date_of_birth : string= JSON.stringify(value.date_of_birth_family_member);
                value.date_of_birth_family_member ? 
                    value.date_of_birth_family_member= date_of_birth.substring(1, 11): 
                    value.date_of_birth_family_member =  "N/A";

                if(value.date_of_birth_family_member == 0) {
                    value.date_of_birth_family_member =  "N/A";
                }
                if (value && 'rownum_' in value) {
                    delete value.rownum_;
                }
            });
        }

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
            SCHEMA_NAME: SCHEMA_CONSTELLATION,
            TABLE_NAME: "CONSTELLATION_HEALTH",
            SUBMISSION_ID: null,
            ACTION_DATA: bufferQuery,
            USER_ID: userId
        };

        let loggedAction = await helper.insertLog(logFields);

        if(!loggedAction){
            console.log("Constellation Export could not be logged");
        }

        res.json({ status: 200, dataConstellation: constellationHealth, dataFamilyMembers: constellationFamily});

    } catch(error) {
        console.error("Error in /export/:", error);  // debug if needed
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }    
});


/**
 * Change the status request"
 *
 * @param {constellationHealth_id} id of request
 * @return json
 */

constellationRouter.patch("/changeStatus", checkPermissions("constellation_update"), [body("params.requests").isArray({ min: 1 }), body("params.requestStatus").notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        var constellation_id = req.body.params.requests; 
        db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);
        var status_id = req.body.params.requestStatus;
        var updateStatus = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH`).update({STATUS: status_id}).whereIn("ID", constellation_id);
        var statusData = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_STATUS`).where('ID', status_id).first();
        var logFields = Array();

        if(updateStatus) {
            let type = "success";
            let message = "Status changed successfully.";

            if(constellation_id instanceof Array){
                _.forEach(constellation_id, function(value: any) {
                    logFields.push({
                        ACTION_TYPE: 4,
                        TITLE: "Submission updated to status "+statusData.description,
                        SCHEMA_NAME: SCHEMA_CONSTELLATION,
                        TABLE_NAME: "CONSTELLATION_HEALTH",
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
        } else {
            // No rows matched — report this rather than silently succeeding or
            // sending no response at all (see audit LOW-09).
            res.json({ status:400, message: 'No matching submissions were updated.', type: "error" });
        }

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

constellationRouter.post("/duplicates", checkPermissions("constellation_view"), async (req: Request, res: Response) => {
    try {
        db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);
        var constellationOriginal = Object();
        var constellationDuplicate = Object();
        var constellation = Array();

        constellationOriginal =  await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_DUPLICATED_REQUESTS`)
            .join(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH`, 'CONSTELLATION_DUPLICATED_REQUESTS.ORIGINAL_ID', '=', 'CONSTELLATION_HEALTH.ID')
            .join(`${SCHEMA_CONSTELLATION}.CONSTELLATION_STATUS`, 'CONSTELLATION_HEALTH.STATUS', '=', 'CONSTELLATION_STATUS.ID')
            .select('CONSTELLATION_HEALTH.YOUR_LEGAL_NAME',
                    'CONSTELLATION_HEALTH.STATUS',
                    'CONSTELLATION_STATUS.DESCRIPTION AS STATUS_DESCRIPTION',
                    'CONSTELLATION_HEALTH.ID AS CONSTELLATION_HEALTH_ID',
                    'CONSTELLATION_DUPLICATED_REQUESTS.ORIGINAL_ID',
                    'CONSTELLATION_DUPLICATED_REQUESTS.DUPLICATED_ID',
                    db.raw("TO_CHAR(CONSTELLATION_HEALTH.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,"+
                    "(CONSTELLATION_DUPLICATED_REQUESTS.ID|| '-'|| CONSTELLATION_HEALTH.ID) AS UNIQUE_ID, "+
                    "TO_CHAR(CONSTELLATION_HEALTH.DATE_OF_BIRTH, 'YYYY-MM-DD') AS DATE_OF_BIRTH"))
            .orderBy("CONSTELLATION_HEALTH.CREATED_AT").then((rows: any) => {
                let arrayResult = Object();

                for (let row of rows) {
                    arrayResult[row['original_id']] = row;
                }

                return arrayResult;
            });

        constellationDuplicate = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_DUPLICATED_REQUESTS`)
            .join(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH`, 'CONSTELLATION_DUPLICATED_REQUESTS.DUPLICATED_ID', '=', 'CONSTELLATION_HEALTH.ID')
            .join(`${SCHEMA_CONSTELLATION}.CONSTELLATION_STATUS`, 'CONSTELLATION_HEALTH.STATUS', '=', 'CONSTELLATION_STATUS.ID')
            .select('CONSTELLATION_HEALTH.YOUR_LEGAL_NAME',
                    'CONSTELLATION_HEALTH.STATUS',
                    'CONSTELLATION_DUPLICATED_REQUESTS.ID',
                    'CONSTELLATION_STATUS.DESCRIPTION AS STATUS_DESCRIPTION',
                    'CONSTELLATION_HEALTH.ID AS CONSTELLATION_HEALTH_ID',
                    'CONSTELLATION_DUPLICATED_REQUESTS.ORIGINAL_ID',
                    'CONSTELLATION_DUPLICATED_REQUESTS.DUPLICATED_ID',
                    db.raw("TO_CHAR(CONSTELLATION_HEALTH.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,"+
                        "(CONSTELLATION_DUPLICATED_REQUESTS.ID|| '-'|| CONSTELLATION_HEALTH.ID) AS UNIQUE_ID, "+
                        "TO_CHAR(CONSTELLATION_HEALTH.DATE_OF_BIRTH, 'YYYY-MM-DD') AS DATE_OF_BIRTH"))
            .orderBy("CONSTELLATION_HEALTH.CREATED_AT");

        let index = 0;
        constellationDuplicate.forEach(function (value: any) {
            if(value.status !== 4 &&  constellationOriginal[value.original_id] && constellationOriginal[value.original_id].status !== 4){
                let url = "constellationWarnings/details/"+value.id;

                delete value.id;

                constellation.push({
                    constellation_health_id: null,
                    id: null,
                    constellation_health_original_id: null,
                    constellation_health_duplicated_id: null,
                    your_legal_name: 'Duplicated #'+(index+1),
                    date_of_birth: null,
                    status_description: null,
                    created_at: 'ACTIONS:',
                    showUrl: url
                });

                constellation.push(constellationOriginal[value.original_id]);
                constellation.push(value);
                index = index + 1;
            }
        });

        res.send({data: constellation});

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
constellationRouter.get("/duplicates/details/:duplicate_id", checkPermissions("constellation_view"), [param("duplicate_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);
        let duplicate_id = Number(req.params.duplicate_id);
        var constellation = Object();
        var constellationDuplicate = Object();
        var constellationEntries = Object();
        var communityLocations = Object();
        var constellationFamilyOriginal = Object();
        var constellationFamilyDuplicated = Object();

        var duplicateEntry = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_DUPLICATED_REQUESTS`)
        .where("id", duplicate_id).then((rows: any) => {
            let arrayResult = Object();

            for (let row of rows) {
                arrayResult.original = row['original_id'];
                arrayResult.duplicated = row['duplicated_id'];
            }

            return arrayResult;
        });

        constellationEntries = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH`)
            .leftJoin(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_LANGUAGE`, 'CONSTELLATION_HEALTH.LANGUAGE_PREFER_TO_RECEIVE_SERVICES', 'CONSTELLATION_HEALTH_LANGUAGE.ID')
            .leftJoin(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DEMOGRAPHICS`, 'CONSTELLATION_HEALTH.DEMOGRAPHICS_GROUPS', 'CONSTELLATION_HEALTH_DEMOGRAPHICS.ID')
            .select(db.raw("TO_CHAR(CONSTELLATION_HEALTH.DATE_OF_BIRTH, 'YYYY-MM-DD')  AS DATE_OF_BIRTH" ),
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH.*`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_LANGUAGE.DESCRIPTION AS LANGUAGE_PREFER_DESCRIPTION`,
                    `${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DEMOGRAPHICS.DESCRIPTION AS DEMOGRAPHIC_DESCRIPTION`)
            .whereIn("CONSTELLATION_HEALTH.ID", [duplicateEntry.original, duplicateEntry.duplicated])
            .whereNot('CONSTELLATION_HEALTH.STATUS', '4');

        constellationFamilyOriginal = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS`)
            .leftJoin(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_LANGUAGE`, 'CONSTELLATION_HEALTH_FAMILY_MEMBERS.LANGUAGE_PREFER_TO_RECEIVE_SERVICES_FAMILY_MEMBER', 'CONSTELLATION_HEALTH_LANGUAGE.ID')
            .leftJoin(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DEMOGRAPHICS`, 'CONSTELLATION_HEALTH_FAMILY_MEMBERS.DEMOGRAPHICS_GROUPS_FAMILY_MEMBER', 'CONSTELLATION_HEALTH_DEMOGRAPHICS.ID')
            .select(db.raw("TO_CHAR(CONSTELLATION_HEALTH_FAMILY_MEMBERS.DATE_OF_BIRTH_FAMILY_MEMBER, 'YYYY-MM-DD')  AS DATE_OF_BIRTH_FAMILY_MEMBER" ),
                    'CONSTELLATION_HEALTH_FAMILY_MEMBERS.*',
                    'CONSTELLATION_HEALTH_LANGUAGE.DESCRIPTION AS LANGUAGE_PREFER_DESCRIPTION_FAMILY_MEMBER',
                    'CONSTELLATION_HEALTH_DEMOGRAPHICS.DESCRIPTION AS DEMOGRAPHIC_DESCRIPTION_FAMILY_MEMBER')
            .where('CONSTELLATION_HEALTH_FAMILY_MEMBERS.CONSTELLATION_HEALTH_ID', duplicateEntry.original);

        constellationFamilyDuplicated = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_FAMILY_MEMBERS`)
            .leftJoin(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_LANGUAGE`, 'CONSTELLATION_HEALTH_FAMILY_MEMBERS.LANGUAGE_PREFER_TO_RECEIVE_SERVICES_FAMILY_MEMBER', 'CONSTELLATION_HEALTH_LANGUAGE.ID')
            .leftJoin(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DEMOGRAPHICS`, 'CONSTELLATION_HEALTH_FAMILY_MEMBERS.DEMOGRAPHICS_GROUPS_FAMILY_MEMBER', 'CONSTELLATION_HEALTH_DEMOGRAPHICS.ID')
            .select(db.raw("TO_CHAR(CONSTELLATION_HEALTH_FAMILY_MEMBERS.DATE_OF_BIRTH_FAMILY_MEMBER, 'YYYY-MM-DD')  AS DATE_OF_BIRTH_FAMILY_MEMBER" ),
                    'CONSTELLATION_HEALTH_FAMILY_MEMBERS.*',
                    'CONSTELLATION_HEALTH_LANGUAGE.DESCRIPTION AS LANGUAGE_PREFER_DESCRIPTION_FAMILY_MEMBER',
                    'CONSTELLATION_HEALTH_DEMOGRAPHICS.DESCRIPTION AS DEMOGRAPHIC_DESCRIPTION_FAMILY_MEMBER')
            .where('CONSTELLATION_HEALTH_FAMILY_MEMBERS.CONSTELLATION_HEALTH_ID', duplicateEntry.duplicated);

        let dataString = "";
        var diagnosis = Object();

        diagnosis = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DIAGNOSIS_HISTORY`).select().then((rows: any) => {
            let arrayResult = Object();

            for (let row of rows) {
                arrayResult[row['id']] = row['description'];
            }

            return arrayResult;
        });

        if(constellationEntries){
            constellationEntries.forEach(function (value: any) {
                const diagnosisList = helper.getJsonDataList(value.diagnosis);
                _.forEach(diagnosisList, function(valueDiagnosis: any, key: any) {
                    if(valueDiagnosis in diagnosis){
                        dataString += diagnosis[valueDiagnosis]+",";
                    }else{
                        dataString += valueDiagnosis+",";
                    }
                });

                if(dataString.substr(-1) == ","){
                    dataString = dataString.slice(0, -1);
                }

                value.diagnosis = dataString.replace(/,/g, ', ');

                value.flagFamilyMembers = false;

                if(value.id == duplicateEntry.original){
                    constellation = value;

                    if(constellationFamilyOriginal.length){
                        value.flagFamilyMembers = true;
    
                        constellationFamilyOriginal.forEach(function (value: any, key: any) {
    
                            if(value.date_of_birth_family_member == 0) {
                                value.date_of_birth_family_member =  "N/A";
                            }
    
                            let dataString = "";
                            const diagnosisList = helper.getJsonDataList(value.diagnosis_family_member);

                            _.forEach(diagnosisList, function(valueDiagnosisFm: any, key: any) {
    
                                if(valueDiagnosisFm in diagnosis){
                                    dataString += diagnosis[valueDiagnosisFm]+",";
                                }else{
                                    dataString += valueDiagnosisFm+",";
                                }
                            });
    
                            if(dataString.substr(-1) == ","){
                                dataString = dataString.slice(0, -1);
                            }
    
                            constellationFamilyOriginal[key].diagnosis_family_member = dataString.replace(/,/g, ', ');
    
                        });
                    }

                }else if(value.id == duplicateEntry.duplicated){
                    constellationDuplicate = value;

                    if(constellationFamilyDuplicated.length){
                        value.flagFamilyMembers = true;

                        constellationFamilyDuplicated.forEach(function (value: any, key: any) {

                            if(value.date_of_birth_family_member == 0) {
                                value.date_of_birth_family_member =  "N/A";
                            }

                            let dataString = "";
                            const diagnosisList = helper.getJsonDataList(value.diagnosis_family_member);
                            _.forEach(diagnosisList, function(valueDiagnosisFm: any, key: any) {

                                if(valueDiagnosisFm in diagnosis){
                                    dataString += diagnosis[valueDiagnosisFm]+",";
                                }else{
                                    dataString += valueDiagnosisFm+",";
                                }
                            });

                            if(dataString.substr(-1) == ","){
                                dataString = dataString.slice(0, -1);
                            }

                            constellationFamilyDuplicated[key].diagnosis_family_member = dataString.replace(/,/g, ', ');

                        });
                    }

                }

            });
        }

        res.json({  dataConstellation: constellation, dataConstellationDuplicate: constellationDuplicate,
                    dataConstellationFamily: constellationFamilyOriginal,
                    dataConstellationFamilyDuplicated: constellationFamilyDuplicated
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
 * Validate if warning is non existant
 *
 * @param {duplicate_id} id of warning
 * @return json
 */
constellationRouter.get("/duplicates/validateWarning/:duplicate_id", checkPermissions("constellation_view"), [param("duplicate_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        var duplicate_id = Number(req.params.duplicate_id); 
        db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);
        var warning = Object();
        var flagExists = true;
        var message = "";
        var type = "error";

        warning = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_DUPLICATED_REQUESTS`)
            .where('id', duplicate_id)
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
constellationRouter.patch("/duplicates/primary", checkPermissions("constellation_update"), async (req: Request, res: Response) => {
    try {
        db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);
        var warning = Number(req.body.params.warning);
        var request = Number(req.body.params.request);
        var type = req.body.params.type;
        var updateRequest = Object();
        var rejectWarning = Object();
        let message = "Warning updated successfully.";
        var logTitle = "";
        var updatedFields = Object();
        var fieldList = Object();
        var primarySubmission = Number();
        var logFields = Array()

        if(!request){
            message = "Warning deleted successfully.";
            rejectWarning = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_DUPLICATED_REQUESTS`).where("id", warning).del();
            logTitle = "Duplicated Warning Rejected";
        }else{
            var warningRequest = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_DUPLICATED_REQUESTS`).where("id", warning).then((data:any) => {
                return data[0];
            });
            if(type == 'O'){
                updateRequest = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH`).update({STATUS: "4"}).where("ID", warningRequest.duplicated_id);
                primarySubmission = warningRequest.duplicated_id;
            }else if(type == 'D'){
                updateRequest = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH`).update({STATUS: "4"}).where("ID", warningRequest.original_id);
                primarySubmission = warningRequest.original_id;
            }

            logFields.push({
                ACTION_TYPE: 4,
                TITLE: "Submission updated to status Closed",
                SCHEMA_NAME: SCHEMA_CONSTELLATION,
                TABLE_NAME: "CONSTELLATION_HEALTH",
                SUBMISSION_ID: primarySubmission,
                USER_ID: req.user?.db_user.user.id
            });

            if(updateRequest){
                rejectWarning = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_DUPLICATED_REQUESTS`).where("id", warning).del();
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
                SCHEMA_NAME: SCHEMA_CONSTELLATION,
                TABLE_NAME: "CONSTELLATION_DUPLICATED_REQUESTS",
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
 * Obtains and transforms the data for storage
 *
 * @param {idConstellationHealth} id of saved ConstellationHealth record
 * @param {arrayMembers} array of family members information
 * @return {familyMembersInsert}
 */

interface Row {
    id: number;
    value: string;
}

async function dataFamilyMembers(idConstellationHealth:number, arrayMembers:any){

    db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);
    var familyMembersInsert = Array();
    var languages = Object();
    var demographics = Object();

    languages = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_LANGUAGE`).select().then((rows: Row[]) => {
                let arrayResult = Object();

                for (let row of rows) {
                    arrayResult[row['value']] = row['id'];
                }

                return arrayResult;
    });

    demographics = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DEMOGRAPHICS`).select().then((rows: Row[]) => {
            let arrayResult = Object();

            for (let row of rows) {
                arrayResult[row['value']] = row['id'];
            }

            return arrayResult;
    });

    if (Array.isArray(arrayMembers)) {
        for (const dataMember of arrayMembers) {
            dataMember.constellation_health_id = +idConstellationHealth;
            if(!_.isEmpty( dataMember.date_of_birth_family_member)){
                dataMember.date_of_birth_family_member = new Date(dataMember.date_of_birth_family_member);
                let result: string =   dataMember.date_of_birth_family_member.toISOString().split('T')[0];
                dataMember.date_of_birth_family_member  = db.raw("TO_DATE(?,'YYYY-MM-DD') ",result);
            }else{
                dataMember.date_of_birth_family_member = null;
            }
            if(_.isEmpty(dataMember.your_legal_name_family_member)){
                dataMember.your_legal_name_family_member = dataMember.first_name_family_member + " " + dataMember.last_name_family_member;
            }
            if (dataMember.language_prefer_to_receive_services_family_member in languages) {
                dataMember.language_prefer_to_receive_services_family_member = languages[dataMember.language_prefer_to_receive_services_family_member];
            } else {
                dataMember.language_prefer_to_receive_services_family_member = null;
            }
            if( !_.isEmpty(dataMember.other_language_family_member)){
                dataMember.preferred_language_family_member = dataMember.other_language_family_member;
            }
            const diagnosisList = dataMember.diagnosis_family_member;
            const diagnosisVal = await getMultipleIdsByModel("ConstellationHealthDiagnosisHistory", diagnosisList);
            dataMember.diagnosis_family_member = diagnosisVal ? db.raw(`UTL_RAW.CAST_TO_RAW(?)`, diagnosisVal) : null;

            if (dataMember.demographics_groups_family_member in demographics) {
                dataMember.demographics_groups_family_member = demographics[dataMember.demographics_groups_family_member];
            }

            // Remove unused properties to prepare for the insert.
            delete dataMember.personal_info_text_family_member;
            delete dataMember.other_language_family_member;
            delete dataMember.demographics_text_family_member;
            delete dataMember.warning_yhic_fm;
            familyMembersInsert.push(dataMember);
        }
    }
    return familyMembersInsert;
}

async function getAllStatus(){
db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);
  var constellationStatus = Array();
  constellationStatus = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_STATUS`).select().then((rows: any) => {
    let arrayResult = Array();
    for (let row of rows) {
        arrayResult.push({text: row['description'], value: row['id']});
    }
    return arrayResult;
  });
  return constellationStatus;
}
/**
 * Transforms given array to the allowed database array format and replaces information with catalogue data.
 *
 * @param {model} name of catalogue
 * @param {names} array of information
 * @return {array}
 */
async function getMultipleIdsByModel(model: string, names: any) {
    db = await helper.getOracleClient(db, DB_CONFIG_CONSTELLATION);
    var others = "";
    var data: any[] = [];
    var catalog = Object();

    if(model == "ConstellationHealthDiagnosisHistory") {      
        if (Array.isArray(names) && names.length > 0) {
            catalog = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DIAGNOSIS_HISTORY`)
                        .select()
                        .whereIn('VALUE', names);
            names.forEach(function (value: any, key: any) {
                if(!_.find(catalog, { 'value':value })){
                    others = names[key];
                    names.splice(key, 1);
                }else{
                    data.push(_.find(catalog, { 'value':value }));
                }
            });

        }
    } else if (model == "ConstellationHealthDemographics") {
        catalog = await db(`${SCHEMA_CONSTELLATION}.CONSTELLATION_HEALTH_DEMOGRAPHICS`).select().then((rows: any) => {
                            let arrayResult = Object();
                            for (let row of rows) {
                                arrayResult[row['value']] = row['description'];
                            }

                            return arrayResult;
                        });

        names.forEach(function (value: any, key: any) {
            if(!catalog.hasOwnProperty(value)){
                others = names[key];
                names.splice(key, 1);
            }
        });

    }

    if(data.length){  
        var modelValues = "";
        var max = data.length;
        var count = 1;
        if(max == 1){
            modelValues = data[0].id.toString();
        }else{
            data.forEach(function (value: any) {
                if(count == max){
                    modelValues += value.id.toString();
                }else{
                    modelValues += value.id.toString()+",";
                }

                count++;
            });
        }
        // Assemble via JSON.stringify so an "other" value containing a double
        // quote can't corrupt the stored JSON (see audit LOW-07).
        const ids = modelValues === "" ? [] : modelValues.split(",").map(Number);
        if(others !== "") {
            return JSON.stringify([...ids, others]);
        }else{
            return JSON.stringify(ids);
        }
    }else if(!data.length && others.length > 0){
        return JSON.stringify([others]);
    }else{
        return null;
    }
}
