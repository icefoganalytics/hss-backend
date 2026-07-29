import express, { Request, Response } from "express";
import { body, param } from "express-validator";
import { SubmissionStatusRepository } from "../repository/oracle/SubmissionStatusRepository";
import knex from "knex";
import { DB_CONFIG_DENTAL, SCHEMA_DENTAL, SCHEMA_GENERAL } from "../config";
import { groupBy, helper, logger } from "../utils";
import { checkPermissions } from "../middleware/permissions";
import { ReturnValidationErrors } from "../middleware";
import { Console } from "console";
var RateLimit = require('express-rate-limit');
var _ = require('lodash');
let db = knex(DB_CONFIG_DENTAL);

const submissionStatusRepo = new SubmissionStatusRepository();
const path = require('path');

export const dentalRouter = express.Router();
dentalRouter.use(RateLimit({
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
dentalRouter.get("/submissions/:action_id/:action_value", checkPermissions("dental_view"), [
    param("action_id").notEmpty(), 
    param("action_value").notEmpty()
], ReturnValidationErrors, async (req: Request, res: Response) => {

    try {

        const actionId = req.params.action_id;
        const actionVal = req.params.action_value;
        const permissions = req.user?.db_user.permissions ?? [];

        const result = await submissionStatusRepo.getModuleSubmissions(SCHEMA_DENTAL, actionId, actionVal, permissions);
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
dentalRouter.get("/submissions/status/:action_id/:action_value", checkPermissions("dental_view"), [
    param("action_id").notEmpty(),
    param("action_value").notEmpty()
], ReturnValidationErrors, async (req: Request, res: Response) => {

    try {

        const actionId = req.params.action_id;
        const actionVal = req.params.action_value;
        const permissions = req.user?.db_user.permissions ?? [];
        const result = await submissionStatusRepo.getModuleSubmissionsStatus(SCHEMA_DENTAL, actionId, actionVal, permissions);

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
dentalRouter.post("/", checkPermissions("dental_view"), async (req: Request, res: Response) => {
    try {

        const page = parseInt(req.body.params.page as string) || 1;
        const pageSize = parseInt(req.body.params.pageSize as string) || 10;
        const offset = (page - 1) * pageSize;
        // Allow-list sortable columns and direction so request input can't probe
        // arbitrary columns / inject identifiers (see audit MED-05).
        const allowedSortOrders = ["ASC", "DESC"];
        const allowedSortFields = ["ID", "FIRST_NAME", "MIDDLE_NAME", "LAST_NAME", "HEALTH_CARD_NUMBER", "POSTAL_CODE", "EMAIL", "DATE_OF_BIRTH", "CREATED_AT", "STATUS"];
        const sortBy = req.body.params.sortBy;
        const sortOrder = req.body.params.sortOrder;
        const safeSortBy = allowedSortFields.includes(sortBy?.toUpperCase()) ? sortBy.toUpperCase() : "CREATED_AT";
        const safeSortOrder = allowedSortOrders.includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : "DESC";
        const initialFetch = req.body.params.initialFetch;

        var dateFrom = req.body.params.dateFrom;
        var dateTo = req.body.params.dateTo;
        var dateYear = req.body.params.dateYear;
        let status_request = req.body.params.status;
        let searchQuery = req.body.params.searchQuery;
        const archivedFlag = req.body.params?.archivedFlag ?? false;
        const exportFlag = req.body.params?.exportFlag ?? false;

        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);
        let query = db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_SUBMISSIONS`)

        if (!archivedFlag && !exportFlag) {
            query.whereNotIn("STATUS", [4, 6]);
        } else if (exportFlag) {
            query.whereNotIn("STATUS", [4]);
        }else if (archivedFlag) {
            query.whereNotIn("STATUS", [1,2,3,5]);
        }

        const countAllQuery = query.clone().clearSelect().clearOrder().count('* as count').first();

        const createdAt = db.raw("TO_DATE(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS')");

        if(dateYear) {
            query.where(db.raw("EXTRACT(YEAR FROM ?) = ?", [createdAt, dateYear]));
        }

        if(dateFrom && dateTo) {
            query.where(db.raw("TO_CHAR(?, 'YYYY-MM-DD') BETWEEN ? AND ?", [createdAt, dateFrom, dateTo]));
        }

        if (status_request && status_request.length > 0) {
            query.whereIn("STATUS", status_request);
        }

        if (searchQuery) {
            const sanitizedSearch = searchQuery.trim().replace(/[^a-zA-Z0-9\s@.-]/g, "");
            const lowerSearch = sanitizedSearch.toLowerCase();

            query.where(function () {
                this.whereRaw(`LOWER(FIRST_NAME) LIKE ?`, [`%${lowerSearch}%`])
                .orWhereRaw(`LOWER(MIDDLE_NAME) LIKE ?`, [`%${lowerSearch}%`])
                .orWhereRaw(`LOWER(LAST_NAME) LIKE ?`, [`%${lowerSearch}%`])
                .orWhereRaw(`LOWER(HEALTH_CARD_NUMBER) LIKE ?`, [`%${lowerSearch}%`])
                .orWhereRaw(`LOWER(POSTAL_CODE) LIKE ?`, [`%${lowerSearch}%`])
                .orWhereRaw(`LOWER(EMAIL) LIKE ?`, [`%${lowerSearch}%`]);
            });
        }

        const countQuery = query.clone();

        if (sortBy) {
            query = query.orderBy(safeSortBy, safeSortOrder);
        } else {
            query = query.orderBy('CREATED_AT', 'DESC');
        }

        if(pageSize !== -1 && initialFetch == 0){
            query = query.offset(offset).limit(pageSize);
        }else if(initialFetch == 1){
            query = query.offset(offset).limit(100);
        }

        const dentalService = await query;

        const countResult = await countQuery.count('* as count').first();
        const countResultAll = await countAllQuery;

        const countSubmissions = countResult ? countResult.count : 0;
        const countAll = countResultAll ? countResultAll.count : 0;

        var dentalStatus = await getAllStatus(archivedFlag);
        res.send({data: dentalService, dataStatus: dentalStatus, total: countSubmissions, all: countAll});

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Change the status request"
 *
 * @param {dentalService_id} id of request
 * @return json
 */

dentalRouter.patch("/changeStatus", checkPermissions("dental_update"), [body("params.requests").isArray({ min: 1 }), body("params.requestStatus").notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        const { requests: dentalService_id, requestStatus: status_id } = req.body.params;
        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);
        var updateStatus = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE`).update({STATUS: status_id}).whereIn("ID", dentalService_id);
        var statusData = await db(`${SCHEMA_DENTAL}.DENTAL_STATUS`).where('ID', status_id).first();
        let logFields: Array<any> = [];

        if(updateStatus) {
            let type = "success";
            let message = "Status changed successfully.";

            if(dentalService_id instanceof Array){
                _.forEach(dentalService_id, function(value: any) {
                    logFields.push({
                        ACTION_TYPE: 4,
                        TITLE: "Submission updated to status "+statusData.description,
                        SCHEMA_NAME: SCHEMA_DENTAL,
                        TABLE_NAME: "DENTAL_SERVICE",
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
            message: 'Request could not be processed',
            type: "error"
        });
    }
});

/**
 * Validate if request is non existant or with closed status
 *
 * @param {dentalService_id} id of request
 * @return json
 */
dentalRouter.get("/validateRecord/:dentalService_id", checkPermissions("dental_view"), [param("dentalService_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        const { dentalService_id } = req.params;
        var flagExists = true;
        var message = "";
        var type = "error";
        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);

        const dentalService = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE`)
            .join(`${SCHEMA_DENTAL}.DENTAL_STATUS`, 'DENTAL_SERVICE.STATUS', '=', 'DENTAL_STATUS.ID')
            .where('DENTAL_SERVICE.ID', Number(dentalService_id))
            .select(`${SCHEMA_DENTAL}.DENTAL_SERVICE.*`, 'DENTAL_STATUS.DESCRIPTION AS STATUS_DESCRIPTION')
            .first();

        if(!dentalService || dentalService.status_description == "closed"){
            flagExists= false;
            message= "The submission you are consulting is closed or non existant, please choose a valid submission.";
        }

        res.json({ status: 200, flagDental: flagExists, message: message, type: type});
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
 * @param {dentalService_id} id of request
 * @return json
 */
dentalRouter.get("/show/:dentalService_id", checkPermissions("dental_view"), [param("dentalService_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        var dentalService_id = Number(req.params.dentalService_id);
        var dentalService = Object();
        var dentalServiceDependents = Object();
        var dentalFiles = Object();
        var dentalInternalFields = Object();
        var dentalComments = Object();
        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);
        let archivedFlag = false;
        const userId = req.user?.db_user.user.id || null;

        dentalService = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_SUBMISSIONS_DETAILS`)
            .where('ID', dentalService_id)
            .first();

        dentalServiceDependents = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`)
                                        .select('ID',
                                                'DENTAL_SERVICE_ID',
                                                'C_FIRSTNAME',
                                                'C_LASTNAME',
                                                'C_HEALTHCARE',
                                                'C_APPLY',
                                                db.raw(`TO_CHAR(C_DOB, 'yyyy-mm-dd')  AS C_DOB`)
                                        )
                                        .where('DENTAL_SERVICE_DEPENDENTS.DENTAL_SERVICE_ID', dentalService_id);

        dentalFiles = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_FILES`).where("DENTAL_SERVICE_ID", dentalService_id)
            .select('ID',
                    'DENTAL_SERVICE_ID',
                    'DESCRIPTION',
                    'FILE_NAME',
                    'FILE_TYPE',
                    'FILE_SIZE'
            );

        dentalInternalFields = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_INTERNAL_FIELDS`)
                                .select('ID',
                                        'DENTAL_SERVICE_ID',
                                        'PROGRAM_YEAR',
                                        db.raw(`CASE
                                                WHEN INCOME_AMOUNT = TRUNC(INCOME_AMOUNT)
                                                THEN TO_CHAR(INCOME_AMOUNT, 'FM9999999')
                                                ELSE TO_CHAR(INCOME_AMOUNT, 'FM9999999.99')
                                                END AS INCOME_AMOUNT`),
                                        db.raw("TO_CHAR(DATE_ENROLLMENT, 'YYYY-MM-DD') AS DATE_ENROLLMENT"),
                                        'POLICY_NUMBER',
                                        db.raw("TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT")
                                )
                                .where('DENTAL_SERVICE_ID', dentalService_id).then((data:any) => {
                                    return data[0];
                                });

        dentalComments = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_COMMENTS`)
                        .join(`${SCHEMA_GENERAL}.USER_DATA`, 'DENTAL_SERVICE_COMMENTS.USER_ID', '=', 'USER_DATA.ID')
                        .select('DENTAL_SERVICE_COMMENTS.ID',
                                'DENTAL_SERVICE_COMMENTS.DENTAL_SERVICE_ID',
                                'DENTAL_SERVICE_COMMENTS.COMMENT_DESCRIPTION',
                                'USER_DATA.USER_NAME',
                                db.raw("TO_CHAR(DENTAL_SERVICE_COMMENTS.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT")
                        )
                        .where("DENTAL_SERVICE_ID", dentalService_id);

        dentalService.flagFile = true;

        if(!_.isEmpty(dentalFiles)){
            dentalFiles.forEach(function (value: any) {
                value.file_fullName = value.file_name+"."+value.file_type;
            });
        }else{
            dentalService.flagFile = false;
        }

        dentalService.flagDemographic = true;
        dentalService.flagDentalInformation = true;
        if(!_.isEmpty(dentalService.ask_demographic)){
            let askDemographic = dentalService.ask_demographic.split(",");

            if(askDemographic[0].toLowerCase() == "no"){
                dentalService.flagDemographic = false;
                dentalService.flagDentalInformation = false;
            }else{

                const dentalInformationFields = [
                    'often_brush',
                    'state_teeth',
                    'often_floss',
                    'state_gums',
                    'last_saw_dentist',
                    'reason_for_dentist',
                    'buy_supplies',
                    'pay_for_visit',
                    'barriers',
                    'check_all_coverage',
                    'problems',
                    'services_needed'
                ];

                const allFieldsEmpty = dentalInformationFields.every((fieldName) => {
                    const val = dentalService[fieldName];

                    if(val == null){
                        return true;
                    }

                    if(typeof val === 'string') {
                        return val.trim().length === 0;
                    }

                    if(Buffer.isBuffer(val)) {
                        return val.length === 0;
                    }

                    return false;
                });

                if (allFieldsEmpty) {
                    dentalService.flagDentalInformation = false;
                }
            }
        }

        dentalService.flagDependents = false;

        if(!_.isEmpty(dentalServiceDependents) && !dentalService.have_children.includes("No, I don't have children")){
            dentalService.flagDependents = true;

            _.forEach(dentalServiceDependents, function(valueDependents: any, key: any) {

                if(valueDependents["c_dob"] == 0) {
                    valueDependents["c_dob"] =  "N/A";
                }

                if(valueDependents["c_apply"] == "Yes"){
                    valueDependents["c_apply"] = "Yes, they are applying";
                }else if(valueDependents["c_apply"] == "No"){
                    valueDependents["c_apply"] = "No, they have coverage";
                }
            });
        }

        var dentalCityTown = await getCatalogSelect('DENTAL_SERVICE_CITY_TOWN');

        var dentalGroupsCommunities = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_GROUPS_COMMUNITIES`).select();

        var dentalGenders = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_GENDERS`)
                            .select("ID AS key",
                                    "NAME AS text",
                                    "NAME AS value"
                            );

        var dentalEducationLevels = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_EDUCATION_LEVELS`)
                            .select("ID AS key",
                                    "DESCRIPTION AS text",
                                    "DESCRIPTION AS value"
                            );

        var dentalOften = await getCatalogSelect('DENTAL_SERVICE_OFTEN');

        var dentalStates = await getCatalogSelect('DENTAL_SERVICE_STATES');

        var dentalTimePeriods = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_TIME_PERIODS`)
                            .select("ID AS key",
                                    "DESCRIPTION AS text",
                                    "DESCRIPTION AS value"
                            );

        var dentalReasons = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_REASONS_DENTIST`).select();

        var dentalPaymentMethods = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_PAYMENT_METHODS`).select();

        var dentalBarriers = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_BARRIERS`).select();
        
        var dentalCoverage = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_COVERAGE`).select();

        var dentalProblems = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_PROBLEMS`).select();

        var dentalNeedServices = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_NEED_SERVICES`).select();

        var statusDental =  await db(`${SCHEMA_DENTAL}.DENTAL_STATUS`).where("DESCRIPTION", "Closed").select().first();

        if(dentalService.status == 6){
            archivedFlag = true;
        }

        let today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0');
        let yyyy = today.getFullYear();
        let todayDate = mm+'_'+dd+'_'+yyyy;
        let fileName = 'dental_service_request_details_'+todayDate+".pdf";

        const internalFieldsYears = [];
        const startYear = new Date().getFullYear();
        const currentYear = 2023;
        const targetYear = startYear + 10;

        internalFieldsYears.push({
            text: currentYear,
            value: currentYear.toString(),
            dateFrom: currentYear,
            dateTo: currentYear
        });

        for (let year = currentYear; year <= targetYear; year += 1) {
            const dateFrom = year;
            const dateTo = year + 1;
            const value = `${dateFrom}-${dateTo}`;

            internalFieldsYears.push({
                text: value,
                value: value,
                dateFrom: dateFrom,
                dateTo: dateTo
            });
        }

        var dentalStatus = await getAllStatus();

        var logFields = {
            ACTION_TYPE: 8,
            TITLE: "Dental submission details",
            SCHEMA_NAME: SCHEMA_DENTAL,
            TABLE_NAME: "DENTAL_SERVICE",
            SUBMISSION_ID: dentalService_id,
            ACTION_DATA: null,
            USER_ID: userId
        };

        let loggedAction = await helper.insertLog(logFields);

        if(!loggedAction){
            console.log("Dental submission detail could not be logged");
        }
 
        res.json({ status: 200,
            dataStatus: dentalStatus,
            dataDentalService: dentalService,
            dataDentalDependents: dentalServiceDependents,
            dentalStatusClosed: statusDental.id,
            fileName:fileName,
            dentalFiles:dentalFiles,
            dataDentalInternalFields: dentalInternalFields || {},
            dataDentalComments: dentalComments,
            internalFieldsYears: internalFieldsYears,
            dataDentalCityTown: dentalCityTown,
            dataDentalGroups: dentalGroupsCommunities,
            dataDentalGenders: dentalGenders,
            dataEducationLevels: dentalEducationLevels,
            dataDentalOften: dentalOften,
            dataDentalStates: dentalStates,
            dataTimePeriods: dentalTimePeriods,
            dataDentalReasons: dentalReasons,
            dataPaymentMethods: dentalPaymentMethods,
            dataDentalBarriers: dentalBarriers,
            dataDentalCoverage: dentalCoverage,
            dataDentalProblems: dentalProblems,
            dataDentalNeedServices: dentalNeedServices,
            archivedFlag: archivedFlag
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
 * Obtain data to show in export file
 *
 * @param {status} status of request
 * @return json
 */
dentalRouter.post("/export/", checkPermissions("dental_view"), async (req: Request, res: Response) => {
    try {
        const { requests, status: status_request, dateFrom, dateTo, dateYear, isAllData, offset, limit } = req.body.params;
        let searchQuery = req.body.params.searchQuery;
        const archivedFlag = req.body.params?.archivedFlag ?? false;
        const idSubmissions: number[] = [];
        let dentalInternalFields = Object();

        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);
        let userId = req.user?.db_user.user.id || null;

        let query = db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_SUBMISSIONS_DETAILS`)
            .leftJoin(
                db.raw(`(
                    SELECT DISTINCT DENTAL_SERVICE_ID,
                        FIRST_VALUE(ID) OVER (PARTITION BY DENTAL_SERVICE_ID ORDER BY CREATED_AT ASC) AS ID,
                        FIRST_VALUE(PROGRAM_YEAR) OVER (PARTITION BY DENTAL_SERVICE_ID ORDER BY CREATED_AT ASC) AS PROGRAM_YEAR,
                        FIRST_VALUE(INCOME_AMOUNT) OVER (PARTITION BY DENTAL_SERVICE_ID ORDER BY CREATED_AT ASC) AS INCOME_AMOUNT,
                        FIRST_VALUE(DATE_ENROLLMENT) OVER (PARTITION BY DENTAL_SERVICE_ID ORDER BY CREATED_AT ASC) AS DATE_ENROLLMENT,
                        FIRST_VALUE(POLICY_NUMBER) OVER (PARTITION BY DENTAL_SERVICE_ID ORDER BY CREATED_AT ASC) AS POLICY_NUMBER,
                        FIRST_VALUE(CREATED_AT) OVER (PARTITION BY DENTAL_SERVICE_ID ORDER BY CREATED_AT ASC) AS CREATED_AT
                    FROM ${SCHEMA_DENTAL}.DENTAL_SERVICE_INTERNAL_FIELDS
                ) DENTAL_SERVICE_INTERNAL_FIELDS`),
                "DENTAL_SERVICE_SUBMISSIONS_DETAILS.ID",
                "DENTAL_SERVICE_INTERNAL_FIELDS.DENTAL_SERVICE_ID"
            )
            .select(
                "DENTAL_SERVICE_SUBMISSIONS_DETAILS.*",
                "DENTAL_SERVICE_INTERNAL_FIELDS.PROGRAM_YEAR as program_year",
                db.raw(`CASE
                        WHEN COALESCE(DENTAL_SERVICE_INTERNAL_FIELDS.INCOME_AMOUNT, 0) = TRUNC(COALESCE(DENTAL_SERVICE_INTERNAL_FIELDS.INCOME_AMOUNT, 0))
                        THEN TO_CHAR(COALESCE(DENTAL_SERVICE_INTERNAL_FIELDS.INCOME_AMOUNT, 0), 'FM9999999')
                        ELSE TO_CHAR(COALESCE(DENTAL_SERVICE_INTERNAL_FIELDS.INCOME_AMOUNT, 0), 'FM9999999.99')
                        END AS income_amount`),
                db.raw("COALESCE(TO_CHAR(DENTAL_SERVICE_INTERNAL_FIELDS.DATE_ENROLLMENT, 'YYYY-MM-DD'), '') AS date_enrollment"),
                "DENTAL_SERVICE_INTERNAL_FIELDS.POLICY_NUMBER as policy_number",
                db.raw("COALESCE(TO_CHAR(DENTAL_SERVICE_INTERNAL_FIELDS.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS'), '') AS created_at_if")
            )

        if (archivedFlag) {
            query.join(
                `${SCHEMA_DENTAL}.DENTAL_STATUS AS ds`,
                'DENTAL_SERVICE_SUBMISSIONS_DETAILS.STATUS',
                '=',
                'ds.ID'
            );

            query.select('ds.DESCRIPTION as STATUS_DESCRIPTION');

            query.whereNotIn("DENTAL_SERVICE_SUBMISSIONS_DETAILS.STATUS", [1,2,3,5]);
        } else {
            query.where("DENTAL_SERVICE_SUBMISSIONS_DETAILS.STATUS", "<>", 4);
        }

        if (requests.length > 0 && !isAllData) {
            query.whereIn("DENTAL_SERVICE_SUBMISSIONS_DETAILS.ID", requests);
        }

        if (dateYear) {
            query.whereRaw("EXTRACT(YEAR FROM TO_DATE(DENTAL_SERVICE_SUBMISSIONS_DETAILS.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS')) = ?", [dateYear]);
        }

        if (dateFrom && dateTo) {
            query.whereRaw(`TRUNC(TO_DATE(DENTAL_SERVICE_SUBMISSIONS_DETAILS.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS')) BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')`, [dateFrom, dateTo]);
        }

        if (status_request && status_request.length > 0) {
            query.whereIn("DENTAL_SERVICE_SUBMISSIONS_DETAILS.STATUS", status_request);
        }

        if (archivedFlag && searchQuery) {
            const lowerSearch = searchQuery.toLowerCase();

            query.where(function () {
                this.whereRaw(`LOWER(FIRST_NAME) LIKE ?`, [`%${lowerSearch}%`])
                .orWhereRaw(`LOWER(MIDDLE_NAME) LIKE ?`, [`%${lowerSearch}%`])
                .orWhereRaw(`LOWER(LAST_NAME) LIKE ?`, [`%${lowerSearch}%`])
                .orWhereRaw(`LOWER(HEALTH_CARD_NUMBER) LIKE ?`, [`%${lowerSearch}%`])
                .orWhereRaw(`LOWER(POSTAL_CODE) LIKE ?`, [`%${lowerSearch}%`])
                .orWhereRaw(`LOWER(EMAIL) LIKE ?`, [`%${lowerSearch}%`]);
            });
        }

        if (isAllData) {
            query.offset(offset).limit(limit);
        }

        query.orderBy('DENTAL_SERVICE_SUBMISSIONS_DETAILS.ID', 'ASC');

        const dentalService = await query;

        dentalService.forEach(value => {
            value.date_of_birth = value.date_of_birth || "N/A";
            delete value.rownum_;
            idSubmissions.push(value.id);
            ['id', 'status', 'are_you_eligible_for_the_pharmacare_and_extended_health_care_ben'].forEach(key => delete value[key]);
        });
        
        let queryDependents = db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`)
            .leftJoin(`${SCHEMA_DENTAL}.DENTAL_SERVICE`, 'DENTAL_SERVICE_DEPENDENTS.DENTAL_SERVICE_ID', 'DENTAL_SERVICE.ID')
            .select(
                db.raw("(DENTAL_SERVICE.FIRST_NAME ||' '|| DENTAL_SERVICE.LAST_NAME) AS APPLICANT_NAME"),
                'DENTAL_SERVICE_DEPENDENTS.C_FIRSTNAME',
                'DENTAL_SERVICE_DEPENDENTS.C_LASTNAME',
                'DENTAL_SERVICE_DEPENDENTS.C_DOB',
                'DENTAL_SERVICE_DEPENDENTS.C_HEALTHCARE',
                'DENTAL_SERVICE_DEPENDENTS.C_APPLY'
            )
            .where("DENTAL_SERVICE.STATUS", "<>", 4);

        if (!_.isEmpty(idSubmissions)) {
            queryDependents.whereIn('DENTAL_SERVICE_DEPENDENTS.DENTAL_SERVICE_ID', idSubmissions);
        }

        queryDependents.orderBy('DENTAL_SERVICE_DEPENDENTS.DENTAL_SERVICE_ID', 'ASC');
        const dentalServiceDependents = await queryDependents;

        dentalServiceDependents.forEach(valueDependents => {
            valueDependents.c_dob = valueDependents.c_dob || "N/A";

            valueDependents.c_apply = valueDependents.c_apply === "Yes" ? "Yes, they are applying" : "No, they already have coverage";
        });

        var bufferQuery = Object();
        let stringQuery = query.toString();

        // Verify the length of the serialized JSON
        const maxLengthInBytes = 1 * (1024 * 1024); // 1MB to bytes

        if (Buffer.byteLength(stringQuery, 'utf8') > maxLengthInBytes) {
            console.log('The object exceeds 1MB. It will be truncated.');
            stringQuery = stringQuery.substring(0, maxLengthInBytes);
        }

        if (!_.isEmpty(query)) {
            bufferQuery = Buffer.from(stringQuery);
        } else {
            bufferQuery = null;
        }

        var logFields = {
            ACTION_TYPE: 5,
            TITLE: "Export submission",
            SCHEMA_NAME: SCHEMA_DENTAL,
            TABLE_NAME: "DENTAL_SERVICE",
            SUBMISSION_ID: null,
            ACTION_DATA: bufferQuery,
            USER_ID: userId
        };

        let loggedAction = await helper.insertLog(logFields);

        if (!loggedAction) {
            console.log("Dental Export could not be logged");
        }
        res.json({ status: 200, dataDental: dentalService, dataDependents: dentalServiceDependents, dataInternalFields: dentalInternalFields });
    } catch (e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send({
            status: 400,
            message: 'Request could not be processed'
        });
    }
});



/**
 * Obtain data of duplicated warnings
 *
 * @return json
 */
dentalRouter.post("/duplicates", checkPermissions("dental_view"), async (req: Request, res: Response) => {
    try {
        var dentalOriginal = Object();
        var dentalDuplicate = Object();
        var dentalService = Array();
        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);

        dentalOriginal = await db(`${SCHEMA_DENTAL}.DENTAL_DUPLICATED_REQUESTS`)
            .join(`${SCHEMA_DENTAL}.DENTAL_SERVICE`, 'DENTAL_DUPLICATED_REQUESTS.ORIGINAL_ID', '=', 'DENTAL_SERVICE.ID')
            .join(`${SCHEMA_DENTAL}.DENTAL_STATUS`, 'DENTAL_SERVICE.STATUS', '=', 'DENTAL_STATUS.ID')
            .leftJoin(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`, 'DENTAL_SERVICE.ID', '=', 'DENTAL_SERVICE_DEPENDENTS.DENTAL_SERVICE_ID')
            .select('DENTAL_SERVICE.ID AS DENTAL_SERVICE_ID',
                    'DENTAL_SERVICE.FIRST_NAME',
                    'DENTAL_SERVICE.LAST_NAME',
                    'DENTAL_SERVICE.STATUS',
                    'DENTAL_DUPLICATED_REQUESTS.ORIGINAL_ID',
                    'DENTAL_DUPLICATED_REQUESTS.DUPLICATED_ID',
                    'DENTAL_STATUS.DESCRIPTION AS STATUS_DESCRIPTION',
                    db.raw("TO_CHAR(DENTAL_SERVICE.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,"+
                        "TO_CHAR(DENTAL_SERVICE.DATE_OF_BIRTH, 'YYYY-MM-DD') as DATE_OF_BIRTH,"+
                        "CASE WHEN COUNT(DENTAL_SERVICE_DEPENDENTS.ID) > 0 THEN 'YES' ELSE 'NO' END AS DEPENDENT")
            )
            .groupBy('DENTAL_SERVICE.ID',
                    'DENTAL_SERVICE.FIRST_NAME',
                    'DENTAL_SERVICE.LAST_NAME',
                    'DENTAL_SERVICE.STATUS',
                    'DENTAL_DUPLICATED_REQUESTS.ORIGINAL_ID',
                    'DENTAL_DUPLICATED_REQUESTS.DUPLICATED_ID',
                    'DENTAL_STATUS.DESCRIPTION',
                    db.raw("TO_CHAR(DENTAL_SERVICE.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS'),"+
                            "TO_CHAR(DENTAL_SERVICE.DATE_OF_BIRTH, 'YYYY-MM-DD')")
            ).then((rows: any) => {
                let arrayResult = Object();

                for (let row of rows) {
                    arrayResult[row['original_id']] = row;
                }

                return arrayResult;
            });

        dentalDuplicate = await db(`${SCHEMA_DENTAL}.DENTAL_DUPLICATED_REQUESTS`)
        .join(`${SCHEMA_DENTAL}.DENTAL_SERVICE`, 'DENTAL_DUPLICATED_REQUESTS.DUPLICATED_ID', '=', 'DENTAL_SERVICE.ID')
        .join(`${SCHEMA_DENTAL}.DENTAL_STATUS`, 'DENTAL_SERVICE.STATUS', '=', 'DENTAL_STATUS.ID')
        .leftJoin(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`, 'DENTAL_SERVICE.ID', '=', 'DENTAL_SERVICE_DEPENDENTS.DENTAL_SERVICE_ID')

        .select('DENTAL_DUPLICATED_REQUESTS.ID',
                'DENTAL_SERVICE.ID AS DENTAL_SERVICE_ID',
                'DENTAL_SERVICE.FIRST_NAME',
                'DENTAL_SERVICE.LAST_NAME',
                'DENTAL_SERVICE.STATUS',
                'DENTAL_DUPLICATED_REQUESTS.ORIGINAL_ID',
                'DENTAL_DUPLICATED_REQUESTS.DUPLICATED_ID',
                'DENTAL_STATUS.DESCRIPTION AS STATUS_DESCRIPTION',
                db.raw("TO_CHAR(DENTAL_SERVICE.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,"+
                    "TO_CHAR(DENTAL_SERVICE.DATE_OF_BIRTH, 'YYYY-MM-DD') as DATE_OF_BIRTH,"+
                    "CASE WHEN COUNT(DENTAL_SERVICE_DEPENDENTS.ID) > 0 THEN 'YES' ELSE 'NO' END AS DEPENDENT")
        )
        .groupBy('DENTAL_DUPLICATED_REQUESTS.ID',
                'DENTAL_SERVICE.ID',
                'DENTAL_SERVICE.FIRST_NAME',
                'DENTAL_SERVICE.LAST_NAME',
                'DENTAL_SERVICE.STATUS',
                'DENTAL_DUPLICATED_REQUESTS.ORIGINAL_ID',
                'DENTAL_DUPLICATED_REQUESTS.DUPLICATED_ID',
                'DENTAL_STATUS.DESCRIPTION',
                db.raw("TO_CHAR(DENTAL_SERVICE.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS'),"+
                        "TO_CHAR(DENTAL_SERVICE.DATE_OF_BIRTH, 'YYYY-MM-DD')")
        );

        let index = 0;

        dentalDuplicate.forEach(function (value: any) {
            if(value.status !== 4 && dentalOriginal[value.original_id].status !== 4){
                let url = "dentalWarnings/details/"+value.id;

                delete value.id;

                dentalService.push({
                    dental_service_id: null,
                    original_id: null,
                    duplicated_id: null,
                    first_name: 'Duplicated #'+(index+1),
                    last_name: null,
                    dependent: null,
                    date_of_birth: null,
                    status_description: null,
                    created_at: 'ACTIONS:',
                    showUrl: url
                });

                dentalService.push(dentalOriginal[value.original_id]);
                dentalService.push(value);
                index = index + 1;
            }
        });

        res.send({data: dentalService});

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
dentalRouter.get("/duplicates/details/:duplicate_id", checkPermissions("dental_view"), [param("duplicate_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        let duplicate_id = Number(req.params.duplicate_id);
        var dentalOriginal = Object();
        var dentalDuplicate = Object();
        var flagDependents = false;
        var flagDemographic = false;
        var flagFile = false;
        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);

        var duplicateEntry = await db(`${SCHEMA_DENTAL}.DENTAL_DUPLICATED_REQUESTS`)
            .where("ID", duplicate_id)
            .select('ORIGINAL_ID AS original', 'DUPLICATED_ID AS duplicated')
            .first();

        const [
                dentalEntries,
                dependentsOriginal,
                dependentsDuplicated,
                dentalFiles,
                dentalFilesDuplicated
            ] = await Promise.all([

                db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_SUBMISSIONS_DETAILS`)
                    .whereIn("ID", [duplicateEntry.original, duplicateEntry.duplicated])
                    .whereNot("STATUS", "4"),

                db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`)
                    .select(
                        "DENTAL_SERVICE_DEPENDENTS.ID",
                        "DENTAL_SERVICE_DEPENDENTS.DENTAL_SERVICE_ID",
                        "DENTAL_SERVICE_DEPENDENTS.C_FIRSTNAME",
                        "DENTAL_SERVICE_DEPENDENTS.C_LASTNAME",
                        db.raw("TO_CHAR(DENTAL_SERVICE_DEPENDENTS.C_DOB, 'YYYY-MM-DD') AS C_DOB"),
                        "DENTAL_SERVICE_DEPENDENTS.C_HEALTHCARE",
                        "DENTAL_SERVICE_DEPENDENTS.C_APPLY"
                    )
                    .where("DENTAL_SERVICE_DEPENDENTS.DENTAL_SERVICE_ID", duplicateEntry.original),

                db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`)
                    .select(
                        "DENTAL_SERVICE_DEPENDENTS.ID",
                        "DENTAL_SERVICE_DEPENDENTS.DENTAL_SERVICE_ID",
                        "DENTAL_SERVICE_DEPENDENTS.C_FIRSTNAME",
                        "DENTAL_SERVICE_DEPENDENTS.C_LASTNAME",
                        db.raw("TO_CHAR(DENTAL_SERVICE_DEPENDENTS.C_DOB, 'YYYY-MM-DD') AS C_DOB"),
                        "DENTAL_SERVICE_DEPENDENTS.C_HEALTHCARE",
                        "DENTAL_SERVICE_DEPENDENTS.C_APPLY"
                    )
                    .where("DENTAL_SERVICE_DEPENDENTS.DENTAL_SERVICE_ID", duplicateEntry.duplicated),

                db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_FILES`)
                    .where("DENTAL_SERVICE_ID", duplicateEntry.original)
                    .select()
                    .then((rows: any[]) => rows.length > 0 ? rows : null),

                db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_FILES`)
                    .where("DENTAL_SERVICE_ID", duplicateEntry.duplicated)
                    .select()
                    .then((rows: any[]) => rows.length > 0 ? rows : null),
        ]);

        if (dentalFiles && !_.isEmpty(dentalFiles)) {
            flagFile = true;

            dentalFiles.forEach(file => {
                file.file_fullName = file.file_name + "." + file.file_type;
            });
        }

        if (dentalFilesDuplicated && !_.isEmpty(dentalFilesDuplicated)) {
            flagFile = true;

            dentalFilesDuplicated.forEach(file => {
                file.file_fullName = file.file_name + "." + file.file_type;
            });
        }

        dentalEntries.forEach(function (value: any) {

            if(!_.isEmpty(value.ask_demographic)){
                let askDemographic = value.ask_demographic.split(",");

                if(askDemographic[0].toLowerCase() !== "no" && !flagDemographic){
                    flagDemographic = true;
                }
            }

            if(value.id == duplicateEntry.original){
                dentalOriginal = value;
            }else if(value.id == duplicateEntry.duplicated){
                dentalDuplicate = value;
            }

        });

        if(!_.isEmpty(dependentsOriginal) || !_.isEmpty(dependentsDuplicated)){
            flagDependents = true;

            _.forEach(dependentsOriginal, function(valueOriginal: any, key: any) {

                if(valueOriginal["c_dob"] == 0) {
                    valueOriginal["c_dob"] =  "N/A";
                }

                if(valueOriginal["c_apply"] == "Yes"){
                    valueOriginal["c_apply"] = "Yes, they are applying";
                }else if(valueOriginal["c_apply"] == "No"){
                    valueOriginal["c_apply"] = "No, they have coverage";
                }
            });

            _.forEach(dependentsDuplicated, function(valueDuplicated: any, key: any) {

                if(valueDuplicated["c_dob"] == 0) {
                    valueDuplicated["c_dob"] =  "N/A";
                }

                if(valueDuplicated["c_apply"] == "Yes"){
                    valueDuplicated["c_apply"] = "Yes, they are applying";
                }else if(valueDuplicated["c_apply"] == "No"){
                    valueDuplicated["c_apply"] = "No, they have coverage";
                }
            });
        }

        res.json({ dataDentalService: dentalOriginal, dataDentalDuplicate: dentalDuplicate, dentalFiles: dentalFiles,
                dentalFilesDuplicated: dentalFilesDuplicated, dataDependentsOriginal: dependentsOriginal,
                dataDependentsDuplicated: dependentsDuplicated, flagDependents: flagDependents, flagFile:flagFile, flagDemographic: flagDemographic
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
dentalRouter.get("/duplicates/validateWarning/:duplicate_id", checkPermissions("dental_view"), [param("duplicate_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        var duplicate_id = Number(req.params.duplicate_id);
        var warning = Object();
        var flagExists = true;
        var message = "";
        var type = "error";
        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);

        warning = await db(`${SCHEMA_DENTAL}.DENTAL_DUPLICATED_REQUESTS`)
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
dentalRouter.patch("/duplicates/primary", checkPermissions("dental_update"), async (req: Request, res: Response) => {
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
        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);

        if(!request){
            rejectWarning = await db(`${SCHEMA_DENTAL}.DENTAL_DUPLICATED_REQUESTS`).where("ID", warning).del();
            logTitle = "Duplicated Warning Rejected";
        }else{
            var warningRequest = await db(`${SCHEMA_DENTAL}.DENTAL_DUPLICATED_REQUESTS`).where("ID", warning).first();

            if(type == 'O'){
                updateRequest = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE`).update({STATUS: "4"}).where("ID", warningRequest.duplicated_id);
                primarySubmission = warningRequest.duplicated_id;
            }else if(type == 'D'){
                updateRequest = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE`).update({STATUS: "4"}).where("ID", warningRequest.original_id);
                primarySubmission = warningRequest.original_id;
            }

            logFields.push({
                ACTION_TYPE: 4,
                TITLE: "Submission updated to status Closed",
                SCHEMA_NAME: SCHEMA_DENTAL,
                TABLE_NAME: "DENTAL_SERVICE",
                SUBMISSION_ID: primarySubmission,
                USER_ID: req.user?.db_user.user.id
            });

            if(updateRequest){
                rejectWarning = await db(`${SCHEMA_DENTAL}.DENTAL_DUPLICATED_REQUESTS`).where("ID", warning).del();
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
                SCHEMA_NAME: SCHEMA_DENTAL,
                TABLE_NAME: "DENTAL_DUPLICATED_REQUESTS",
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
 * Download request file
 *
 * @param {dentalFile_id} id of request
 * @return json
 */
dentalRouter.get("/downloadFile/:dentalFile_id", checkPermissions("dental_view"), [param("dentalFile_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        var buffer;
        var dentalFile_id = Number(req.params.dentalFile_id);
        const userId = req.user?.db_user.user.id || null;

        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);

        var dentalFiles = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_FILES`).where("ID", dentalFile_id).select().first();

        if(!dentalFiles){
            return res.status(404).send({ status: 404, message: 'File not found' });
        }

        if(dentalFiles.is_base64){
            buffer = Buffer.from(dentalFiles.file_data.toString(), 'base64');
        }else{
            buffer = dentalFiles.file_data;
        }

        var sanitize = require("sanitize-filename");
        // Sanitize the stored name/type purely for the download filename — the
        // bytes are streamed from the DB, never written to the served web root
        // (see audit CRIT-05).
        let safeBase = sanitize(String(dentalFiles.file_name || "file")) || "file";
        let safeType = String(dentalFiles.file_type || "").replace(/[^a-zA-Z0-9]/g, "");
        let downloadName = safeType ? `${safeBase}.${safeType}` : safeBase;

        var logFields = {
            ACTION_TYPE: 9,
            TITLE: downloadName,
            SCHEMA_NAME: SCHEMA_DENTAL,
            TABLE_NAME: "DENTAL_SERVICE_FILES",
            SUBMISSION_ID: dentalFiles.dental_service_id,
            FIELD1: dentalFile_id,
            ACTION_DATA: null,
            USER_ID: userId
        };

        let loggedAction = await helper.insertLog(logFields);

        if(!loggedAction){
            logger.error("Dental file download could not be logged");
        }

        // Stream the attachment straight to the client.
        res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.send(buffer);

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Deletes downloaded file
 *
 * @param {file} name of file
 */
dentalRouter.post("/deleteFile", checkPermissions("dental_delete"), async (req: Request, res: Response) => {
    try {

        var sanitize = require("sanitize-filename");
        var fs = require("fs");
        var file = sanitize(req.body.params.file);
        let pathPublicFront = path.join(__dirname, "../../");
        var filePath = pathPublicFront+"dist/web/"+file;

        if(fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
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
 * Store Dental data
 *
 * @return json
 */
dentalRouter.post("/store", async (req: Request, res: Response) => {
    try {
        let data = Object();
        const dentalService = Object();
        let dentalServiceSaved = Object();
        var fileData = Object();
        let responseSent = false;

        data = req.body;

        let stringOriginalSubmission = JSON.stringify(data);

        // Verify the length of the serialized JSON
        const maxLengthInBytes = 1 * (1024 * 1024); // 1MB to  bytes

        if (Buffer.byteLength(stringOriginalSubmission, 'utf8') > maxLengthInBytes) {
            console.log('The object exceeds 1MB. It will be truncated.');
            stringOriginalSubmission = stringOriginalSubmission.substring(0, maxLengthInBytes);
        }

        let bufferOriginalSubmission = Buffer.from(stringOriginalSubmission);

        let logOriginalSubmission = {
            ACTION_TYPE: 2,
            TITLE: "Original submission request",
            SCHEMA_NAME: SCHEMA_DENTAL,
            TABLE_NAME: "DENTAL_SERVICE",
            ACTION_DATA: bufferOriginalSubmission
        };
        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);

        const logSaved = await helper.insertLogIdReturn(logOriginalSubmission);
        if(!logSaved){
            console.log('The action could not be logged: '+logOriginalSubmission.TABLE_NAME+' '+logOriginalSubmission.TITLE);
        }

        dentalService.FIRST_NAME = data.first_name;
        dentalService.MIDDLE_NAME = data.middle_name;
        dentalService.LAST_NAME = data.last_name;

        if(!_.isEmpty(data.date_of_birth)){
            data.date_of_birth = new Date(data.date_of_birth);
            let result: string =   data.date_of_birth.toISOString().split('T')[0];
            dentalService.DATE_OF_BIRTH  = db.raw("TO_DATE( ? ,'YYYY-MM-DD') ", result);
        }else{
            dentalService.DATE_OF_BIRTH = null;
        }

        dentalService.HEALTH_CARD_NUMBER = data.health_card_number;
        dentalService.MAILING_ADDRESS = data.mailing_address;
        dentalService.CITY_OR_TOWN = data.city_or_town;
        dentalService.POSTAL_CODE = data.postal_code;
        dentalService.PHONE = data.phone;
        dentalService.EMAIL = data.email;
        dentalService.EMAIL_INSTEAD = data.email_instead;
        dentalService.HAVE_CHILDREN = data.have_children;
        dentalService.ASK_DEMOGRAPHIC = data.ask_demographic;

        /**
         * Optional fields (as of July 2025 update)
         * These fields are no longer required but retained for legacy submission compatibility.
         */
        dentalService.OTHER_COVERAGE = data.other_coverage ?? null;
        dentalService.ARE_YOU_ELIGIBLE_FOR_THE_PHARMACARE_AND_EXTENDED_HEALTH_CARE_BEN = data.are_you_eligible_for_the_pharmacare_and_extended_health_care_ben ?? null;

        
        if(_.isEmpty(data.identify_groups) && !_.isArray(data.identify_groups)) {
            dentalService.IDENTIFY_GROUPS = null;
        }else{
            dentalService.IDENTIFY_GROUPS =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(data.identify_groups));
        }

        dentalService.GENDER = data.gender;
        dentalService.EDUCATION = data.education;
        dentalService.OFTEN_BRUSH = data.often_brush;
        dentalService.STATE_TEETH = data.state_teeth;
        dentalService.OFTEN_FLOSS = data.often_floss;
        dentalService.STATE_GUMS = data.state_gums;
        dentalService.LAST_SAW_DENTIST = data.last_saw_dentist;

        if(_.isEmpty(data.reason_for_dentist) && !_.isArray(data.reason_for_dentist)) {
            dentalService.REASON_FOR_DENTIST = null;
        }else{
            dentalService.REASON_FOR_DENTIST =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(data.reason_for_dentist));
        }

        dentalService.BUY_SUPPLIES = data.buy_supplies;
        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);

        if(_.isEmpty(data.pay_for_visit) && !_.isArray(data.pay_for_visit)) {
            dentalService.PAY_FOR_VISIT = null;
        }else{
            dentalService.PAY_FOR_VISIT =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(data.pay_for_visit));
        }

        if(_.isEmpty(data.barriers) && !_.isArray(data.barriers)) {
            dentalService.BARRIERS = null;
        }else{
            dentalService.BARRIERS =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(data.barriers));
        }

        if(_.isEmpty(data.check_all_coverage) && !_.isArray(data.check_all_coverage)) {
            dentalService.CHECK_ALL_COVERAGE = null;
        }else{
            dentalService.CHECK_ALL_COVERAGE =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(data.check_all_coverage));
        }

        if(_.isEmpty(data.problems) && !_.isArray(data.problems)) {
            dentalService.PROBLEMS = null;
        }else{
            dentalService.PROBLEMS =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(data.problems));
        }

        if(_.isEmpty(data.services_needed) && !_.isArray(data.services_needed)) {
            dentalService.SERVICES_NEEDED = null;
        }else{
            dentalService.SERVICES_NEEDED =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(data.services_needed));
        }

        if(!_.isEmpty(data._attach_proof)){

            fileData = saveFile('_attach_proof', data);

            if(parseFloat(fileData["file_size"]) > 10){
                fileData = null;
            }

        }
        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);
        dentalServiceSaved = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE`).insert(dentalService).into(`${SCHEMA_DENTAL}.DENTAL_SERVICE`).returning('ID');

        if(!dentalServiceSaved){
            if (!responseSent) {
                res.json({ status:400, message: 'Request could not be processed' });
            }else{
                console.log( 'Request could not be processed');
            }
            responseSent = true;
        }

        let dentalId = dentalServiceSaved.find((obj: any) => {return obj.id;});

        if(dentalServiceSaved){
            var updateSubmission = await db(`${SCHEMA_GENERAL}.ACTION_LOGS`).update('SUBMISSION_ID', dentalId.id).where("ID", logSaved);

            if(!updateSubmission){
                console.log('The action could not be logged: Update '+logOriginalSubmission.TABLE_NAME+' '+logOriginalSubmission.TITLE);
            }
        }

        if(!_.isEmpty(data.dependent_list)){
            let arrayDependents = await getDependents(dentalId.id, data.dependent_list);
            let dependentsSaved = false;

            if(!_.isEmpty(arrayDependents)){
                for (const dependent of await arrayDependents) {
                    try {
                        await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`).insert(dependent).into(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`);
                        dependentsSaved = true;
                    } catch (e) {
                        dependentsSaved = false;
                        logger.error("Unhandled error in request handler", e);
                        // Single guarded response (see audit HIGH-05).
                        if (!responseSent) {
                            res.json({ status: 400, message: 'Request could not be processed' });
                            responseSent = true;
                        }
                    }
                }
            }
        }

        if(!_.isEmpty(fileData)){
            var dentalFiles = Object();
            db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);
            dentalFiles.DENTAL_SERVICE_ID = dentalId.id;
            dentalFiles.DESCRIPTION = fileData.description;
            dentalFiles.FILE_NAME = fileData.file_name;
            dentalFiles.FILE_TYPE = fileData.file_type;
            dentalFiles.FILE_SIZE = fileData.file_size;
            
            const blobData = Buffer.from( fileData.file_data, 'base64');
       
            // Execute the stored procedure using Knex
            const filesSaved = await db.raw(`
                BEGIN
                DENTAL.INSERT_FILES(?,?,?,?,?,?);
                END;
            `, [parseInt(dentalId.id), fileData.description.toString(),fileData.file_name.toString(),fileData.file_type.toString() , fileData.file_size.toString(),blobData]
            ).catch(error => {
                console.error("Error when trying to insert a document:", error);
            });
    
            if(!filesSaved){
                if (!responseSent) {
                    res.json({ status:400, message: 'Request could not be processed: DENTAL SERVICE store attachment failed' });
                }else{
                    console.log( `ID: ${dentalId.id.toString()}: Request could not be processed: DENTAL SERVICE store attachment failed`);
                }
                responseSent = true;
            }

        }

        let logFields = {
            ACTION_TYPE: 2,
            TITLE: "Insert submission",
            SCHEMA_NAME: SCHEMA_DENTAL,
            TABLE_NAME: "DENTAL_SERVICE",
            SUBMISSION_ID: dentalId.id
        };

        let loggedAction = await helper.insertLog(logFields);

        if(!loggedAction){
            console.log('The action could not be logged: '+logFields.TABLE_NAME+' '+logFields.TITLE);
        }
        if (!responseSent) {
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
 * Save Internal fields information
 *
 * @param {data}
 */
dentalRouter.post("/storeInternalFields", checkPermissions("dental_update"), [body("params.idSubmission").isInt()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        let data = req.body.params;
        let internalFieldsSaved = Object();
        let dateEnrollment = Object();
        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);
        const userId = req.user?.db_user.user.id || null;

        if(!_.isEmpty(data.dateEnrollment)){
            data.dateEnrollment = new Date(data.dateEnrollment);
            let result: string =   data.dateEnrollment.toISOString().split('T')[0];
            dateEnrollment  = db.raw("TO_DATE( ? ,'YYYY-MM-DD') ", result);
        }else{
            dateEnrollment = null;
        }

        if(data.id == 0){

            const internalFields = Object();

            internalFields.DENTAL_SERVICE_ID = data.idSubmission;
            internalFields.PROGRAM_YEAR = data.programYear;
            internalFields.INCOME_AMOUNT = data.income;
            internalFields.DATE_ENROLLMENT = dateEnrollment;
            internalFields.POLICY_NUMBER = data.policy;

            internalFieldsSaved = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_INTERNAL_FIELDS`).insert(internalFields).into(`${SCHEMA_DENTAL}.DENTAL_SERVICE_INTERNAL_FIELDS`);

            let logFields = {
                ACTION_TYPE: 12,
                TITLE: "Create Internal Field for submission",
                SCHEMA_NAME: SCHEMA_DENTAL,
                TABLE_NAME: "DENTAL_SERVICE_INTERNAL_FIELDS",
                SUBMISSION_ID: data.idSubmission,
                USER_ID: userId
            };

            let loggedAction = await helper.insertLog(logFields);

            if(!loggedAction){
                console.log('The action could not be logged: '+logFields.TABLE_NAME+' '+logFields.TITLE);
            }

        }else{
            internalFieldsSaved = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_INTERNAL_FIELDS`)
            .update({PROGRAM_YEAR: data.programYear,
                    INCOME_AMOUNT: data.income,
                    DATE_ENROLLMENT: dateEnrollment,
                    POLICY_NUMBER: data.policy})
            .whereIn("ID", data.id);

            let logFields = {
                ACTION_TYPE: 13,
                TITLE: "Internal Field updated",
                SCHEMA_NAME: SCHEMA_DENTAL,
                TABLE_NAME: "DENTAL_SERVICE_INTERNAL_FIELDS",
                SUBMISSION_ID: data.idSubmission,
                USER_ID: userId
            };

            let loggedAction = await helper.insertLog(logFields);

            if(!loggedAction){
                console.log('The action could not be logged: '+logFields.TABLE_NAME+' '+logFields.TITLE);
            }
        }

        if(!internalFieldsSaved){
            res.json({ status:400, message: 'Request could not be processed', type: "error" });
        }else{
            res.json({ status:200, message: 'Internal Field saved', type: "success" });
        }

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed',
            type: "error"
        });
    }
});

/**
 * Save comments
 *
 * @param {data}
 */
dentalRouter.post("/storeComments", checkPermissions("dental_update"), [body("params.id").isInt(), body("params.comment").trim().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {

        let data = req.body.params;
        const comments = Object();
        let commentsSaved = Object();

        // Derive the acting user from the authenticated session, never from the
        // request body, so comments and the audit log cannot be attributed to
        // another user (see audit CRIT-04).
        const userId = req.user?.db_user.user.id || null;

        comments.DENTAL_SERVICE_ID = data.id;
        comments.USER_ID = userId;
        comments.COMMENT_DESCRIPTION = data.comment;
        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);

        commentsSaved = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_COMMENTS`).insert(comments).into(`${SCHEMA_DENTAL}.DENTAL_SERVICE_COMMENTS`);

        let logFields = {
            ACTION_TYPE: 14,
            TITLE: "Comment created for submission",
            SCHEMA_NAME: SCHEMA_DENTAL,
            TABLE_NAME: "DENTAL_SERVICE_COMMENTS",
            SUBMISSION_ID: data.id,
            USER_ID: userId
        };

        let loggedAction = await helper.insertLog(logFields);

        if(!loggedAction){
            console.log('The action could not be logged: '+logFields.TABLE_NAME+' '+logFields.TITLE);
        }

        if(!commentsSaved){
            res.json({ status:400, message: 'Request could not be processed', type: "error"  });
        }

        res.json({ status:200, message: 'Comment saved', type: "success" });
    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed 
        res.send( {
            status: 400,
            message: 'Request could not be processed',
            type: "error"
        });
    }
});

/**
 * Update Submission
 *
 * @param {idSubmission} id of submission
 * @param {data} submission fields
 * @return json
 */

dentalRouter.patch("/update", checkPermissions("dental_update"), [body("params.idSubmission").isInt()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {

        var idSubmission = req.body.params.idSubmission;
        var data = req.body.params.data;
        var dataFiles = req.body.params.dataFiles.attachmentFiles;
        var deletedFiles = req.body.params.dataFiles.deletedFiles;
        var dentalFiles = Object();
        var currentDependents = Object();
        var newDependents = req.body.params.dataDependents.newDependents;
        var updatedDependents = req.body.params.dataDependents.updatedDependents;
        var deletedDependents = req.body.params.dataDependents.deletedDependents;
        var have_children = req.body.params.dataDependents.haveChildren;
        var updatedFields = req.body.params.dataUpdatedFields;
        var fieldList = Object();
        let responseSent = false;
        const userId = req.user?.db_user.user.id || null;
        db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);
        if(!_.isEmpty(data.DATE_OF_BIRTH)){
            let dob = new Date(data.DATE_OF_BIRTH);
            let result: string =   dob.toISOString().split('T')[0];
            data.DATE_OF_BIRTH  = db.raw("TO_DATE( ? ,'YYYY-MM-DD') ", result);
        }else{
            data.DATE_OF_BIRTH = null;
        }

        if (Array.isArray(dataFiles) && dataFiles.length > 0) {
            for (const df of dataFiles) {

                if (
                    _.isNull(df.FILE_ID) &&
                    !_.isNull(df.FILE_NAME) &&
                    !df.PROOF_INCOME
                ) {
                    dentalFiles.DENTAL_SERVICE_ID = idSubmission;
                    dentalFiles.DESCRIPTION = df.DESCRIPTION;
                    dentalFiles.FILE_NAME = df.FILE_NAME;
                    dentalFiles.FILE_TYPE = df.FILE_TYPE;
                    dentalFiles.FILE_SIZE = df.FILE_SIZE ? df.FILE_SIZE.toString() : df.FILE_SIZE;

                    const blobData = Buffer.from(df.FILE_DATA, 'base64');

                    const filesSaved = await db.raw(`
                            BEGIN
                            DENTAL.INSERT_FILES(?,?,?,?,?,?);
                            END;
                            `,
                            [
                                parseInt(idSubmission),
                                df.DESCRIPTION,
                                df.FILE_NAME,
                                df.FILE_TYPE,
                                df.FILE_SIZE,
                                blobData
                            ]
                        )
                        .catch((error) => {
                            console.error("Error inserting a document:", error);
                        });

                    if(!filesSaved) {
                        if (!responseSent) {
                            res.json({ status:400, message: 'Request could not be processed', type: "error" });
                        } else {
                            console.log('Request could not be processed (insert file)');
                        }
                        responseSent = true;
                    }else{
                        let logFieldsAttachment = {
                            ACTION_TYPE: 10,
                            TITLE: df.FILE_NAME+"."+df.FILE_TYPE,
                            SCHEMA_NAME: SCHEMA_DENTAL,
                            TABLE_NAME: "DENTAL_SERVICE_FILES",
                            SUBMISSION_ID: idSubmission,
                            ACTION_DATA: null,
                            USER_ID: userId
                        };

                        let loggedAction = await helper.insertLog(logFieldsAttachment);

                        if(!loggedAction){
                            console.log("Dental submission detail could not be logged");
                        }
                    }

                }
                else if (
                    !_.isNull(df.FILE_ID) &&
                    !_.isNil(df.FILE_DATA) &&
                    !df.PROOF_INCOME
                ) {
                    dentalFiles.DENTAL_SERVICE_ID = idSubmission;
                    dentalFiles.DESCRIPTION = df.DESCRIPTION;
                    dentalFiles.FILE_NAME = df.FILE_NAME;
                    dentalFiles.FILE_TYPE = df.FILE_TYPE;
                    dentalFiles.FILE_SIZE = df.FILE_SIZE ? df.FILE_SIZE.toString() : df.FILE_SIZE;
                    dentalFiles.FILE_DATA = df.FILE_DATA;

                    const blobData = Buffer.from(dentalFiles.FILE_DATA, 'base64');

                    const updateFile = await db
                        .raw(
                            `
                            BEGIN
                            DENTAL.UPDATE_FILES(?,?,?,?,?,?);
                            END;
                            `,
                            [
                                parseInt(idSubmission),
                                dentalFiles.DESCRIPTION,
                                dentalFiles.FILE_NAME,
                                dentalFiles.FILE_TYPE,
                                dentalFiles.FILE_SIZE,
                                blobData
                            ]
                        )
                        .catch((error) => {
                            console.error("Error updating a document:", error);
                        });

                    if(!updateFile){
                        if (!responseSent) {
                            res.json({ status:400, message: 'Request could not be processed', type: "error" });
                        } else {
                            console.log('Error when updating file');
                        }
                        responseSent = true;
                    }
                }
            }
        }
        if (deletedFiles.length  > 0) {

            var deletedFilesData = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_FILES`)
                .select('ID', 'FILE_DATA', 'FILE_TYPE', 'FILE_NAME').whereIn('ID', deletedFiles)
                .then((rows: any[]) => {

                    const filesData: { [key: number]: any } = {};
                    for (const row of rows) {
                        if (!filesData[row.id]) {
                            filesData[row.id] = {}; // Initialize the object first
                        }
                        filesData[row.id]["FILE_DATA"] = row.file_data;
                        filesData[row.id]["FILE_NAME"] = row.file_name;
                        filesData[row.id]["FILE_TYPE"] = row.file_type;
                    }


                    return filesData;
                });

            var deleteFile = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_FILES`)
                .whereIn("ID", deletedFiles)
                .del();
            if(!deleteFile){
                if (!responseSent) {
                    res.json({ status:400, message: 'Request could not be processed', type: "error" });
                } else {
                    console.log('Error when deleting files');
                }
                responseSent = true;
            }else{

                for (const file of deletedFiles) {
                    let logFieldsAttachment = {
                        ACTION_TYPE: 11,
                        TITLE: deletedFilesData[file]["FILE_NAME"]+"."+deletedFilesData[file]["FILE_TYPE"],
                        SCHEMA_NAME: SCHEMA_DENTAL,
                        TABLE_NAME: "DENTAL_SERVICE_FILES",
                        SUBMISSION_ID: idSubmission,
                        ACTION_DATA: deletedFilesData[file]["FILE_DATA"],
                        USER_ID: userId,
                        FIELD1: file
                    };

                    let loggedAction = await helper.insertLog(logFieldsAttachment);

                    if(!loggedAction){
                        console.log("Dental submission detail could not be logged");
                    }

                }
            }
        }

        currentDependents = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`)
                                        .select('ID',
                                                'DENTAL_SERVICE_ID',
                                                'C_FIRSTNAME',
                                                'C_LASTNAME',
                                                'C_HEALTHCARE',
                                                'C_APPLY',
                                                'C_DOB'
                                        )
                                        .where('DENTAL_SERVICE_DEPENDENTS.DENTAL_SERVICE_ID', idSubmission);

        if(currentDependents.length > 0 && have_children.key == 2){
            var deleteDependets = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`).where("DENTAL_SERVICE_ID", idSubmission).del();

            if(!deleteDependets){
                if (!responseSent) {
                    res.json({ status:400, message: 'Request could not be processed', type: "error" });
                }else{
                    console.log( 'Error when delete dependents');
                }
                responseSent = true;
            }
        }

        if(newDependents.length > 0 && ( !_.isEmpty(newDependents[0].C_FIRSTNAME) || !_.isEmpty(newDependents[0].C_HEALTHCARE))  ){
            _.forEach(newDependents, function(value: any) {
                if(!_.isEmpty(value.C_DOB)){
                    let dob = new Date(value.C_DOB);
                    let result: string =   dob.toISOString().split('T')[0];
                    value.C_DOB  = db.raw("TO_DATE( ? ,'YYYY-MM-DD') ", result);
                }else{
                    value.C_DOB = null;
                }
            });

            let dependentCreation = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`)
                                    .insert(newDependents)
                                    .into(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`);

            if(!dependentCreation){
                if (!responseSent) {
                    res.json({ status:400, message: 'Request could not be processed', type: "error" });
                }else{
                    console.log( 'Error when create dependents');
                }
                responseSent = true;
            }

        }

        if(updatedDependents.length > 0){

            for (const row of updatedDependents) {

                if(!_.isEmpty(row.C_DOB)){
                    let dob = new Date(row.C_DOB);
                    let result: string = dob.toISOString().split('T')[0];
                    row.C_DOB  = db.raw("TO_DATE( ? ,'YYYY-MM-DD') ", result);
                }else{
                    row.C_DOB = null;
                }

                var dependentUpdate = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`)
                                        .update(row)
                                        .where("ID", row.ID);

                if(!dependentUpdate){
                    if (!responseSent) {
                        res.json({ status:400, message: 'Request could not be processed', type: "error" });
                    }else{
                        console.log( 'Error when update dependents');
                    }
                    responseSent = true;       
                }

            }
        }

        if(deletedDependents.length > 0){

            const idSubmission: number[] = [];

            _.forEach(deletedDependents, function(value: any) {
                idSubmission.push(value.ID);
            });

            var dependentDelete = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`).whereIn("ID", idSubmission).del();

            if(!dependentDelete){
                if (!responseSent) {
                    res.json({ status:400, message: 'Request could not be processed', type: "error" });
                }else{
                    console.log( 'Error when delete dependents');
                }
                responseSent = true;       
            }
        }

        if(data.ASK_DEMOGRAPHIC.key == 1){
            if(_.isEmpty(data.IDENTIFY_GROUPS) && !_.isArray(data.IDENTIFY_GROUPS)) {
                data.IDENTIFY_GROUPS = null;
            }else{
                data.IDENTIFY_GROUPS =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(data.IDENTIFY_GROUPS));
            }

            if(_.isEmpty(data.REASON_FOR_DENTIST) && !_.isArray(data.REASON_FOR_DENTIST)) {
                data.REASON_FOR_DENTIST = null;
            }else{
                data.REASON_FOR_DENTIST =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(data.REASON_FOR_DENTIST));
            }

            if(_.isEmpty(data.PAY_FOR_VISIT) && !_.isArray(data.PAY_FOR_VISIT)) {
                data.PAY_FOR_VISIT = null;
            }else{
                data.PAY_FOR_VISIT =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(data.PAY_FOR_VISIT));
            }

            if(_.isEmpty(data.BARRIERS) && !_.isArray(data.BARRIERS)) {
                data.BARRIERS = null;
            }else{
                data.BARRIERS =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(data.BARRIERS));
            }

            if(_.isEmpty(data.PROBLEMS) && !_.isArray(data.PROBLEMS)) {
                data.PROBLEMS = null;
            }else{
                data.PROBLEMS =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(data.PROBLEMS));
            }

            if(_.isEmpty(data.SERVICES_NEEDED) && !_.isArray(data.SERVICES_NEEDED)) {
                data.SERVICES_NEEDED = null;
            }else{
                data.SERVICES_NEEDED =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(data.SERVICES_NEEDED));
            }
        }

        if(_.isEmpty(data.CHECK_ALL_COVERAGE) && !_.isArray(data.CHECK_ALL_COVERAGE)) {
            data.CHECK_ALL_COVERAGE = null;
        }else{
            data.CHECK_ALL_COVERAGE =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(data.CHECK_ALL_COVERAGE));
        }

        data.HAVE_CHILDREN = have_children.text;
        data.ASK_DEMOGRAPHIC = data.ASK_DEMOGRAPHIC.text;

        // Allow-list writable columns so the client cannot overwrite ID/STATUS/
        // CREATED_AT etc. via mass-assignment (see audit CRIT-04). `data` is keyed
        // by UPPER_CASE column name; anything not listed here is dropped.
        const ALLOWED_UPDATE_COLUMNS = [
            "FIRST_NAME", "MIDDLE_NAME", "LAST_NAME", "DATE_OF_BIRTH", "HEALTH_CARD_NUMBER",
            "MAILING_ADDRESS", "CITY_OR_TOWN", "POSTAL_CODE", "PHONE", "EMAIL", "EMAIL_INSTEAD",
            "HAVE_CHILDREN", "ASK_DEMOGRAPHIC", "OTHER_COVERAGE",
            "ARE_YOU_ELIGIBLE_FOR_THE_PHARMACARE_AND_EXTENDED_HEALTH_CARE_BEN",
            "IDENTIFY_GROUPS", "GENDER", "EDUCATION", "OFTEN_BRUSH", "STATE_TEETH", "OFTEN_FLOSS",
            "STATE_GUMS", "LAST_SAW_DENTIST", "REASON_FOR_DENTIST", "BUY_SUPPLIES", "PAY_FOR_VISIT",
            "BARRIERS", "CHECK_ALL_COVERAGE", "PROBLEMS", "SERVICES_NEEDED"
        ];
        const updateData = _.pick(data, ALLOWED_UPDATE_COLUMNS);

        var updateSubmission = await db(`${SCHEMA_DENTAL}.DENTAL_SERVICE`).update(updateData).where("ID", idSubmission);

        if(updateSubmission) {
            let type = "success";
            let message = "Submission updated successfully.";

            if (!responseSent) {
                res.json({ status:200, message: message, type: type });
            }else{
                console.log( 'Success:Updated submission');
            }
            responseSent = true;  

           
        }

        if(!_.isEmpty(updatedFields)) {
            fieldList =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(updatedFields));
        }else{
            fieldList = null;
        }

        let logFields = {
            ACTION_TYPE: 3,
            TITLE: "Update submission",
            SCHEMA_NAME: SCHEMA_DENTAL,
            TABLE_NAME: "DENTAL_SERVICE",
            SUBMISSION_ID: idSubmission,
            USER_ID: userId,
            ACTION_DATA: fieldList
        };

        let loggedAction = await helper.insertLog(logFields);

        if(!loggedAction){
            res.send( {
                status: 400,
                message: 'The action could not be logged'
            });
        }

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed',
            type: "error"
        });
    }
});

/**
 * Obtains string of Blob field
 *
 * @param {idDentalService}
 * @return {result}
 */
interface Dependent {
    DENTAL_SERVICE_ID: number;
    C_FIRSTNAME: string | null;
    C_LASTNAME: string | null;
    C_DOB: any | null;
    C_HEALTHCARE: string | null;
    C_APPLY: string | null;
}

async function getDependents(idDentalService: number, arrayDependets: any[]): Promise<Dependent[]> {

    let dependents: Dependent[] = [];
    db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);

    _.forEach(arrayDependets, function(value: any, key: any) {
        let dataDependent = Object();

        if (!_.isEmpty(arrayDependets[key]['c_firstname']) ||
            !_.isEmpty(arrayDependets[key]['c_lastname']) ||
            !_.isEmpty(arrayDependets[key]['c_dob']) ||
            !_.isEmpty(arrayDependets[key]['c_healthcare']) ||
            !_.isEmpty(arrayDependets[key]['c_apply'])) {

            dataDependent.DENTAL_SERVICE_ID = idDentalService;
            dataDependent.C_FIRSTNAME = arrayDependets[key]['c_firstname'];
            dataDependent.C_LASTNAME = arrayDependets[key]['c_lastname'];

            if(!_.isEmpty(arrayDependets[key]['c_dob'])){
                arrayDependets[key]['c_dob'] = new Date(arrayDependets[key]['c_dob']);
                let result: string =   arrayDependets[key]['c_dob'].toISOString().split('T')[0];
                dataDependent.C_DOB  = db.raw("TO_DATE( ? ,'YYYY-MM-DD') ", result);
            }else{
                dataDependent.C_DOB = null;
            }

            dataDependent.C_HEALTHCARE = arrayDependets[key]['c_healthcare'];
            dataDependent.C_APPLY = arrayDependets[key]['c_apply'];

            dependents.push(dataDependent);
        }
    });

    return dependents;
}

async function getAllStatus(archivedFlag: boolean = false): Promise<any[]> {
    var dentalServiceStatus = Array();
    let statusNotAllowed = [4];
    db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);

    if(archivedFlag){
        statusNotAllowed = [1,2,3,5];
    }

    dentalServiceStatus = await db(`${SCHEMA_DENTAL}.DENTAL_STATUS`).select()
    .whereNotIn('ID', statusNotAllowed).orderBy('ID', 'ASC').then((rows: any) => {

        let arrayResult = Array();

        for (let row of rows) {
            arrayResult.push({text: row['description'], value: row['id']});
        }

        return arrayResult;
    });
    return dentalServiceStatus;
}

async function getCatalogSelect(table: any): Promise<any[]>{
    var arrayData = Array();
    db = await helper.getOracleClient(db, DB_CONFIG_DENTAL);

    arrayData = await db(`${SCHEMA_DENTAL}.${table}`).select().then((rows: any) => {
        let arrayResult = Array();

        for (let row of rows) {
            arrayResult.push({text: row['description'], value: row['id']});
        }

        return arrayResult;
    });

    return arrayData;
}

/**
 * Obtain file characteristics
 *
 * @param {field_name}
 * @param {data}
 * @return {fileData} array with file data
 */
function saveFile(field_name: any, data: any){
    var sanitize = require("sanitize-filename");
    const allowedExtensions = ["pdf", "doc", "docx", "jpg", "jpeg", "png"]

    if(data[field_name] !== 'undefined' && (data[field_name]) && data[field_name]['data'] !== 'undefined'){

        var fileData = Object();
        var buffer = Buffer.from(data[field_name]['data'], 'base64');
        let name = data[field_name]['name'];
        // Sanitize the client filename; never derive a disk path from it.
        let fileName = sanitize(String(name)).split(".");

        // Validate size from the in-memory buffer BEFORE persisting anything
        // (the previous code wrote to disk first, with no size cap). See audit MED-06.
        var fileSizeInMegabytes = buffer.length / (1024*1024);

        if(fileSizeInMegabytes > 10){
            return fileData;
        }

        // Reject (don't store) files whose extension is not allow-listed, instead
        // of falling back to the client-supplied extension (see audit MED-06).
        let fileExtension = (fileName.length > 1 ? fileName[fileName.length - 1] : "").toLowerCase();

        if(!allowedExtensions.includes(fileExtension)){
            return fileData;
        }

        fileData["description"] = field_name;
        fileData["file_name"] = fileName[0];
        fileData["file_type"] = fileExtension;
        fileData["file_size"] = fileSizeInMegabytes;
        fileData["file_data"] = data[field_name]['data'];
    }

    return fileData;
}

/**
 * Obtains string of Blob field
 *
 * @param {arrayData}
 * @return {stringData} string
 */
function getBlobField(arrayData: any){
    let stringData = "";
    const fieldList = helper.getJsonDataList(arrayData);

    _.forEach(fieldList, function(valueData: any, key: any) {
        stringData += valueData+", ";
    });

    return stringData.slice(0, -2);
}