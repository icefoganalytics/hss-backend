import express, { Request, Response } from "express";
import { EnsureAuthenticated } from "./auth"
import { body, param } from "express-validator";
import { SubmissionStatusRepository } from "../repository/oracle/SubmissionStatusRepository";
import knex from "knex";
import { DB_CONFIG_HIPMA, SCHEMA_HIPMA, SCHEMA_GENERAL } from "../config";
import { groupBy , helper, logger } from "../utils";
import { checkPermissions } from "../middleware/permissions";
import { ReturnValidationErrors } from "../middleware";
var RateLimit = require('express-rate-limit');
var _ = require('lodash');

let db = knex(DB_CONFIG_HIPMA)

const submissionStatusRepo = new SubmissionStatusRepository();
const path = require('path');
export const hipmaRouter = express.Router();
hipmaRouter.use(RateLimit({
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
hipmaRouter.get("/submissions/:action_id/:action_value", checkPermissions("hipma_view"), [
    param("action_id").notEmpty(), 
    param("action_value").notEmpty()
], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {

        const actionId = req.params.action_id;
        const actionVal = req.params.action_value;
        const permissions = req.user?.db_user.permissions ?? [];
        const result = await submissionStatusRepo.getModuleSubmissions(SCHEMA_HIPMA, actionId, actionVal, permissions);
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
hipmaRouter.get("/submissions/status/:action_id/:action_value", checkPermissions("hipma_view"), [
    param("action_id").notEmpty(), 
    param("action_value").notEmpty()
], ReturnValidationErrors, async (req: Request, res: Response) => {

    try {

        const actionId = req.params.action_id;
        const actionVal = req.params.action_value;
        const permissions = req.user?.db_user.permissions ?? [];
        const result = await submissionStatusRepo.getModuleSubmissionsStatus(SCHEMA_HIPMA, actionId, actionVal, permissions);
                        
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
 * Obtain data to show in the dashboard view
 *
 * @return json
 */
hipmaRouter.post("/", checkPermissions("hipma_view"), async (req: Request, res: Response) => {
    try {
        var dateFrom = req.body.params.dateFrom;
        var dateTo = req.body.params.dateTo;
        db = await helper.getOracleClient(db, DB_CONFIG_HIPMA);

        const page = parseInt(req.body.params.page as string) || 1;
        const pageSize = parseInt(req.body.params.pageSize as string) || 10;
        const offset = (page - 1) * pageSize;
        const sortBy = req.body.params.sortBy;
        const sortOrder = req.body.params.sortOrder;
        // Allow-list direction and the default-case column (see audit MED-05).
        const allowedSortOrders = ["ASC", "DESC"];
        const allowedSortFields = ["ID", "CONFIRMATION_NUMBER", "FIRST_NAME", "LAST_NAME", "CREATED_AT", "STATUS"];
        const safeSortOrder = allowedSortOrders.includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : "ASC";
        const initialFetch = req.body.params.initialFetch;

        let query = db(`${SCHEMA_HIPMA}.HEALTH_INFORMATION`)
            .leftJoin(`${SCHEMA_HIPMA}.HIPMA_REQUEST_TYPE`, 'HEALTH_INFORMATION.WHAT_TYPE_OF_REQUEST_DO_YOU_WANT_TO_MAKE_', '=', 'HIPMA_REQUEST_TYPE.ID')
            .leftJoin(`${SCHEMA_HIPMA}.HIPMA_REQUEST_ACCESS_PERSONAL_HEALTH_INFORMATION`, 'HEALTH_INFORMATION.ARE_YOU_REQUESTING_ACCESS_TO_YOUR_OWN_PERSONAL_HEALTH_INFORMATI', '=', 'HIPMA_REQUEST_ACCESS_PERSONAL_HEALTH_INFORMATION.ID')
            .leftJoin(`${SCHEMA_HIPMA}.HIPMA_COPY_HEALTH_INFORMATION`, 'HEALTH_INFORMATION.GET_A_COPY_OF_YOUR_HEALTH_INFORMATION_', '=', 'HIPMA_COPY_HEALTH_INFORMATION.ID')
            .leftJoin(`${SCHEMA_HIPMA}.HIPMA_SITUATIONS`, 'HEALTH_INFORMATION.SELECT_THE_SITUATION_THAT_APPLIES_', '=', 'HIPMA_SITUATIONS.ID')
            .select('HEALTH_INFORMATION.ID','HEALTH_INFORMATION.CONFIRMATION_NUMBER',
                    'HIPMA_REQUEST_TYPE.DESCRIPTION AS HIPMA_REQUEST_TYPE_DESC',
                    'HIPMA_REQUEST_ACCESS_PERSONAL_HEALTH_INFORMATION.DESCRIPTION AS ACCESS_PERSONAL_HEALTH_INFORMATION',
                    'HIPMA_COPY_HEALTH_INFORMATION.DESCRIPTION AS CP_HEALTH_INFO',
                    'HIPMA_SITUATIONS.DESCRIPTION AS HIPMA_SITUATIONS_DESC',
                    db.raw("(HEALTH_INFORMATION.FIRST_NAME ||  ' '||  HEALTH_INFORMATION.LAST_NAME) AS APPLICANT_FULL_NAME, "+
                        "TO_CHAR(HEALTH_INFORMATION.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT")
            )
            .where('HEALTH_INFORMATION.STATUS', '=', 1);

        const countAllQuery = query.clone().clearSelect().clearOrder().count('* as count').first();

        if(dateFrom && dateTo) {
            query.where(db.raw("TO_CHAR(HEALTH_INFORMATION.CREATED_AT, 'YYYY-MM-DD') >=  ? AND TO_CHAR(HEALTH_INFORMATION.CREATED_AT, 'YYYY-MM-DD') <= ?",
                [dateFrom, dateTo]));
        }

        if (sortBy) {
            switch (sortBy) {
                case "hipma_request_type_desc":
                    query = query.orderBy(`HEALTH_INFORMATION.WHAT_TYPE_OF_REQUEST_DO_YOU_WANT_TO_MAKE_`, safeSortOrder);
                    break;
                case "access_personal_health_information":
                    query = query.orderBy(`HEALTH_INFORMATION.ARE_YOU_REQUESTING_ACCESS_TO_YOUR_OWN_PERSONAL_HEALTH_INFORMATI`, safeSortOrder);
                    break;
                case "applicant_full_name":
                    query = query.orderBy(`HEALTH_INFORMATION.FIRST_NAME`, safeSortOrder);
                    break;
                default:
                    if (allowedSortFields.includes(sortBy.toUpperCase())) {
                        query = query.orderBy(`HEALTH_INFORMATION.${sortBy.toUpperCase()}`, safeSortOrder);
                    } else {
                        query = query.orderBy('HEALTH_INFORMATION.CREATED_AT', safeSortOrder);
                    }
                    break;
            }
        } else {
            query = query.orderBy('HEALTH_INFORMATION.CREATED_AT', 'ASC');
        }

        const countQuery = query.clone().clearSelect().clearOrder().count('* as count').first();

        if(pageSize !== -1 && initialFetch == 0){
            query = query.offset(offset).limit(pageSize);
        }else if(initialFetch == 1){
            query = query.offset(offset).limit(100);
        }

        const [hipma, countResult, countResultAll] = await Promise.all([
            query,
            countQuery,
            countAllQuery
        ]);

        const countSubmissions = countResult ? countResult.count : 0;
        const countAll = countResultAll ? countResultAll.count : 0;

        hipma.forEach(function (value: any) {
            value.showUrl = "hipma/show/"+value.id;
        });

        res.send({data: hipma, total: countSubmissions, all: countAll});

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
 * @param {hipma_id} id of request
 * @return json
 */
hipmaRouter.get("/validateRecord/:hipma_id", checkPermissions("hipma_view"), [param("hipma_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        var hipma_id = Number(req.params.hipma_id);
        var hipma = Object();
        var flagExists = true;
        var message = "";
        var type = "error";
        db = await helper.getOracleClient(db, DB_CONFIG_HIPMA);
        hipma = await db(`${SCHEMA_HIPMA}.HEALTH_INFORMATION`)
            .where('HEALTH_INFORMATION.ID', hipma_id)
            .select(`${SCHEMA_HIPMA}.HEALTH_INFORMATION.*`)
            .then((data:any) => {
                return data[0];
            });


        if(!hipma || hipma.status == 2){
            flagExists = false;
            message = "The request you are consulting is closed or non existant, please choose a valid request.";
        }

        res.json({ status: 200, flagHipma: flagExists, message: message, type: type});

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
 * @param {hipma_id} id of request
 * @return json
 */
hipmaRouter.get("/show/:hipma_id", checkPermissions("hipma_view"), [param("hipma_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        let hipma_id = Number(req.params.hipma_id);
        db = await helper.getOracleClient(db, DB_CONFIG_HIPMA);
        var hipma = await db(`${SCHEMA_HIPMA}.HEALTH_INFORMATION`)
        .leftJoin(`${SCHEMA_HIPMA}.HIPMA_REQUEST_TYPE`, 'HEALTH_INFORMATION.WHAT_TYPE_OF_REQUEST_DO_YOU_WANT_TO_MAKE_', '=', 'HIPMA_REQUEST_TYPE.ID')
        .leftJoin(`${SCHEMA_HIPMA}.HIPMA_REQUEST_ACCESS_PERSONAL_HEALTH_INFORMATION`, 'HEALTH_INFORMATION.ARE_YOU_REQUESTING_ACCESS_TO_YOUR_OWN_PERSONAL_HEALTH_INFORMATI', '=', 'HIPMA_REQUEST_ACCESS_PERSONAL_HEALTH_INFORMATION.ID')
        .leftJoin(`${SCHEMA_HIPMA}.HIPMA_COPY_HEALTH_INFORMATION`, 'HEALTH_INFORMATION.GET_A_COPY_OF_YOUR_HEALTH_INFORMATION_', '=', 'HIPMA_COPY_HEALTH_INFORMATION.ID')
        .leftJoin(`${SCHEMA_HIPMA}.HIPMA_SITUATIONS`, 'HEALTH_INFORMATION.SELECT_THE_SITUATION_THAT_APPLIES_', '=', 'HIPMA_SITUATIONS.ID')
        .leftJoin(`${SCHEMA_HIPMA}.HIPMA_COPY_ACTIVITY_REQUEST`, 'HEALTH_INFORMATION.GET_A_COPY_OF_YOUR_ACTIVITY_REQUEST', '=', 'HIPMA_COPY_ACTIVITY_REQUEST.ID')
        .select(`HEALTH_INFORMATION.ID`, `HEALTH_INFORMATION.CONFIRMATION_NUMBER`, `HEALTH_INFORMATION.STATUS`,
                `HEALTH_INFORMATION.WHAT_TYPE_OF_REQUEST_DO_YOU_WANT_TO_MAKE_`,
                `HEALTH_INFORMATION.ARE_YOU_REQUESTING_ACCESS_TO_YOUR_OWN_PERSONAL_HEALTH_INFORMATI`,
                `HEALTH_INFORMATION.SELECT_THE_SITUATION_THAT_APPLIES_`,
                `HEALTH_INFORMATION.FIRST_NAME_BEHALF`,
                `HEALTH_INFORMATION.LAST_NAME_BEHALF`,
                `HEALTH_INFORMATION.COMPANY_OR_ORGANIZATION_OPTIONAL_BEHALF`,
                `HEALTH_INFORMATION.ADDRESS_BEHALF`, `HEALTH_INFORMATION.CITY_OR_TOWN_BEHALF`,
                `HEALTH_INFORMATION.POSTAL_CODE_BEHALF`, `HEALTH_INFORMATION.EMAIL_ADDRESS_BEHALF`,
                `HEALTH_INFORMATION.PHONE_NUMBER_BEHALF`, `HEALTH_INFORMATION.FIRST_NAME`, `HEALTH_INFORMATION.LAST_NAME`,
                db.raw(`TO_CHAR(HEALTH_INFORMATION.DATE_OF_BIRTH, 'yyyy-mm-dd')  AS DATE_OF_BIRTH,
                        TO_CHAR(HEALTH_INFORMATION.DATE_FROM_, 'yyyy-mm-dd')  AS DATE_FROM_,
                        TO_CHAR(HEALTH_INFORMATION.DATE_TO_, 'yyyy-mm-dd')  AS DATE_TO_,
                        CASE WHEN HEALTH_INFORMATION.DATE_RANGE_IS_UNKNOWN_OR_I_NEED_HELP_IDENTIFYING_THE_DATE_RANGE = 1 THEN 'Yes' ELSE 'No' END AS DATE_RANGE_IS_UNKNOWN_OR_I_NEED_HELP_IDENTIFYING_THE_DATE_RANGE,
                        CASE WHEN HEALTH_INFORMATION.I_AFFIRM_THE_INFORMATION_ABOVE_TO_BE_TRUE_AND_ACCURATE_ = 1 THEN 'Yes' ELSE 'No' END AS I_AFFIRM_THE_INFORMATION_ABOVE_TO_BE_TRUE_AND_ACCURATE_`
                    ),
                `HEALTH_INFORMATION.ADDRESS`, `HEALTH_INFORMATION.CITY_OR_TOWN`,
                `HEALTH_INFORMATION.POSTAL_CODE`, `HEALTH_INFORMATION.EMAIL_ADDRESS`, `HEALTH_INFORMATION.PHONE_NUMBER`,
                `HEALTH_INFORMATION.GET_A_COPY_OF_YOUR_HEALTH_INFORMATION_`,
                `HEALTH_INFORMATION.GET_A_COPY_OF_YOUR_ACTIVITY_REQUEST`,
                db.raw(`GENERAL.process_blob_value_format(HEALTH_INFORMATION.INDICATE_THE_HSS_SYSTEM_S_YOU_WOULD_LIKE_A_RECORD_OF_USER_ACTIV, '${SCHEMA_HIPMA}.HIPMA_HSS_SYSTEMS') AS INDICATE_THE_HSS_SYSTEM_S_YOU_WOULD_LIKE_A_RECORD_OF_USER_ACTIV,
                        GENERAL.process_blob_value_format(HEALTH_INFORMATION.NAME_OF_HEALTH_AND_SOCIAL_SERVICES_PROGRAM_AREA_OPTIONAL_, '${SCHEMA_HIPMA}.HIPMA_HEALTH_SOCIAL_SERVICES_PROGRAM') AS NAME_OF_HEALTH_AND_SOCIAL_SERVICES_PROGRAM_AREA_OPTIONAL_`),
                `HEALTH_INFORMATION.PROVIDE_DETAILS_ABOUT_YOUR_REQUEST_`,
                `HEALTH_INFORMATION.CREATED_AT`, `HEALTH_INFORMATION.UPDATED_AT`,
                `HIPMA_REQUEST_TYPE.DESCRIPTION AS HIPMA_REQUEST_TYPE_DESC`,
                `HIPMA_REQUEST_ACCESS_PERSONAL_HEALTH_INFORMATION.DESCRIPTION AS ACCESS_PERSONAL_HEALTH_INFORMATION`,
                `HIPMA_COPY_HEALTH_INFORMATION.DESCRIPTION AS CP_HEALTH_INFO`,
                `HIPMA_SITUATIONS.DESCRIPTION AS HIPMA_SITUATIONS_DESC`,
                `HIPMA_COPY_ACTIVITY_REQUEST.DESCRIPTION AS CP_ACT_REQ`)
        .where("HEALTH_INFORMATION.ID", hipma_id)
        .first();

        var hipmaFiles = await db(`${SCHEMA_HIPMA}.HIPMA_FILES`).where("HIPMA_ID", hipma_id)
            .select('ID',
                    'HIPMA_ID',
                    'DESCRIPTION',
                    'FILE_NAME',
                    'FILE_TYPE',
                    'FILE_SIZE'
            );
        var files = Object();

        if(!_.isEmpty(hipmaFiles)){

            _.forEach(hipmaFiles, function(value: any) {

                files[value.description] = { id: value.id,
                                            file_name: value.file_name,
                                            file_type: value.file_type,
                                            file_size: value.file_size,
                                            file_fullName: value.file_name+"."+value.file_type,
                                            file_data: value.file_data
                                        };

            });
        }

        let today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0');
        let yyyy = today.getFullYear();
        let todayDate = mm+'_'+dd+'_'+yyyy;
        let fileName = 'hipma_request_details_'+todayDate+".pdf";

        res.json({ hipma: hipma, hipmaFiles: files, fileName:fileName });

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Store Hipma data
 *
 * @return json
 */
hipmaRouter.post("/store", async (req: Request, res: Response) => {

    try {
        var data = Object();
        var hipma = Object();
        let HipmaSaved = Object();
        var files = Object();

        data = req.body;

        let stringOriginalData = JSON.stringify(data);

        // Verify the length of the serialized JSON
        const maxLengthInBytes = 5 * (1024 * 1024); // 5MB to  bytes

        if (Buffer.byteLength(stringOriginalData, 'utf8') > maxLengthInBytes) {
            console.log('The object exceeds 5MB. It will be truncated.');
            stringOriginalData = stringOriginalData.substring(0, maxLengthInBytes);
        }

        let bufferOriginalData = Buffer.from(stringOriginalData);

        let logOriginalSubmission = {
            ACTION_TYPE: 2,
            TITLE: "Original submission request",
            SCHEMA_NAME: SCHEMA_HIPMA,
            TABLE_NAME: "HEALTH_INFORMATION",
            ACTION_DATA: bufferOriginalData
        };
        db = await helper.getOracleClient(db, DB_CONFIG_HIPMA);
        const logSaved = await helper.insertLogIdReturn(logOriginalSubmission);

        if(!logSaved){
            console.log('The action could not be logged: '+logOriginalSubmission.TABLE_NAME+' '+logOriginalSubmission.TITLE);
        }

        hipma.CONFIRMATION_NUMBER = getConfirmationNumber();

        if(_.isEmpty(data.what_type_of_request_do_you_want_to_make_)) {
            hipma.WHAT_TYPE_OF_REQUEST_DO_YOU_WANT_TO_MAKE_ = null;
        }else{
            hipma.WHAT_TYPE_OF_REQUEST_DO_YOU_WANT_TO_MAKE_ =+data.what_type_of_request_do_you_want_to_make_;
        }
        if(_.isEmpty(data.are_you_requesting_access_to_your_own_personal_health_informatio)) {
            hipma.ARE_YOU_REQUESTING_ACCESS_TO_YOUR_OWN_PERSONAL_HEALTH_INFORMATI = null;
        }else{
            hipma.ARE_YOU_REQUESTING_ACCESS_TO_YOUR_OWN_PERSONAL_HEALTH_INFORMATI = +data.are_you_requesting_access_to_your_own_personal_health_informatio;
        }
        if(_.isEmpty(data.select_the_situation_that_applies_)) {
            hipma.SELECT_THE_SITUATION_THAT_APPLIES_ = null;
        }else{
            hipma.SELECT_THE_SITUATION_THAT_APPLIES_ = +data.select_the_situation_that_applies_;
        }

        hipma.FIRST_NAME_BEHALF = data.first_name_behalf;
        hipma.LAST_NAME_BEHALF = data.last_name_behalf;
        hipma.COMPANY_OR_ORGANIZATION_OPTIONAL_BEHALF = data.company_or_organization_optional_behalf;
        hipma.ADDRESS_BEHALF = data.address_behalf;
        hipma.CITY_OR_TOWN_BEHALF = data.city_or_town_behalf;
        hipma.POSTAL_CODE_BEHALF = data.postal_code_behalf;
        hipma.EMAIL_ADDRESS_BEHALF = data.email_address_behalf;
        hipma.PHONE_NUMBER_BEHALF = data.phone_number_behalf;

        if(!_.isEmpty(data._statutory_declaration_of_parental_or_guardianship_status)) {
            files._statutory_declaration_of_parental_or_guardianship_status = saveFile('_statutory_declaration_of_parental_or_guardianship_status', data);
        }

        if(!_.isEmpty(data._minor_s_consent_to_release_of_information_if_applicable_)) {
            files._minor_s_consent_to_release_of_information_if_applicable_ = saveFile('_minor_s_consent_to_release_of_information_if_applicable_', data);
        }

        if(!_.isEmpty(data._court_order_identifying_custody_of_the_minor)){
            files._court_order_identifying_custody_of_the_minor = saveFile('_court_order_identifying_custody_of_the_minor', data);
        }

        if(!_.isEmpty(data._statutory_declaration_of_substitute_decision_maker_status)) {
            files._statutory_declaration_of_substitute_decision_maker_status = saveFile('_statutory_declaration_of_substitute_decision_maker_status', data);
        }

        if(!_.isEmpty(data._physician_affirmation_confirm_auth)){
            files._physician_affirmation_confirm_auth = saveFile('_physician_affirmation_confirm_auth', data);
        }

        if(!_.isEmpty(data._confirmation_of_authority_to_exercise_rights_or_powers_of_a_dece)){
            files._confirmation_of_authority_to_exercise_rights_or_powers_of_a_dece = saveFile('_confirmation_of_authority_to_exercise_rights_or_powers_of_a_dece', data);
        }

        if(!_.isEmpty(data._letters_of_administration_or_grant_of_probate)){
            files._letters_of_administration_or_grant_of_probate = saveFile('_letters_of_administration_or_grant_of_probate', data);
        }

        if(!_.isEmpty(data._consent_to_release_of_information)){
            files._consent_to_release_of_information = saveFile('_consent_to_release_of_information', data);
        }

        hipma.FIRST_NAME = data.first_name;
        hipma.LAST_NAME = data.last_name;

        if(!_.isEmpty(data.date_of_birth)){
            data.date_of_birth = new Date(data.date_of_birth);

            let result: string =   data.date_of_birth.toISOString().split('T')[0];
            hipma.DATE_OF_BIRTH  = db.raw("TO_DATE('"+result+"','YYYY-MM-DD') ");
        }else{
            hipma.DATE_OF_BIRTH = null;
        }

        hipma.ADDRESS = data.address;
        hipma.CITY_OR_TOWN = data.city_or_town;
        hipma.POSTAL_CODE = data.postal_code;
        hipma.EMAIL_ADDRESS = data.email_address;
        hipma.PHONE_NUMBER = data.phone_number;

        if(_.isEmpty(data.get_a_copy_of_your_health_information_)) {
            hipma.GET_A_COPY_OF_YOUR_HEALTH_INFORMATION_ = null;
        }else{
            hipma.GET_A_COPY_OF_YOUR_HEALTH_INFORMATION_ = +data.get_a_copy_of_your_health_information_;
        }

        if(_.isEmpty(data.get_a_copy_of_your_activity_request)) {
            hipma.GET_A_COPY_OF_YOUR_ACTIVITY_REQUEST = null;
        }else{
            hipma.GET_A_COPY_OF_YOUR_ACTIVITY_REQUEST = +data.get_a_copy_of_your_activity_request;
        }

        if(_.isEmpty(data.name_of_health_and_social_services_program_area_optional_) && !_.isArray(data.name_of_health_and_social_services_program_area_optional_)) {
            hipma.NAME_OF_HEALTH_AND_SOCIAL_SERVICES_PROGRAM_AREA_OPTIONAL_ = null;
        }else{
            hipma.NAME_OF_HEALTH_AND_SOCIAL_SERVICES_PROGRAM_AREA_OPTIONAL_ =  db.raw("utl_raw.cast_to_raw(?) ", JSON.stringify(data.name_of_health_and_social_services_program_area_optional_));

        }
        if(_.isEmpty(data.indicate_the_hss_system_s_you_would_like_a_record_of_user_activi) && !_.isArray(data.indicate_the_hss_system_s_you_would_like_a_record_of_user_activi)) {
            hipma.INDICATE_THE_HSS_SYSTEM_S_YOU_WOULD_LIKE_A_RECORD_OF_USER_ACTIV = null;
        }else{
            hipma.INDICATE_THE_HSS_SYSTEM_S_YOU_WOULD_LIKE_A_RECORD_OF_USER_ACTIV = db.raw("utl_raw.cast_to_raw(?)", JSON.stringify(data.indicate_the_hss_system_s_you_would_like_a_record_of_user_activi));
        }
        if(_.isEmpty(data.date_from_)) {
            hipma.DATE_FROM_ = null;
        }else{
            data.date_from_ = new Date(data.date_from_);
            let result: string =   data.date_from_.toISOString().split('T')[0];
            hipma.DATE_FROM_  = db.raw("TO_DATE('"+result+"','YYYY-MM-DD') ");
        }

        if(_.isEmpty(data.date_to_)) {
            hipma.DATE_TO_ = null;
        }else{
            data.date_to_ = new Date(data.date_to_);
            let result: string =   data.date_to_.toISOString().split('T')[0];
            hipma.DATE_TO_  = db.raw("TO_DATE('"+result+"','YYYY-MM-DD') ");
        }

        hipma.PROVIDE_DETAILS_ABOUT_YOUR_REQUEST_ = data.provide_details_about_your_request_;
        hipma.DATE_RANGE_IS_UNKNOWN_OR_I_NEED_HELP_IDENTIFYING_THE_DATE_RANGE = data.date_range_is_unknown_or_i_need_help_identifying_the_date_range;
        hipma.I_AFFIRM_THE_INFORMATION_ABOVE_TO_BE_TRUE_AND_ACCURATE_ = data.i_affirm_the_information_above_to_be_true_and_accurate_;

        HipmaSaved = await db(`${SCHEMA_HIPMA}.HEALTH_INFORMATION`).insert(hipma).into(`${SCHEMA_HIPMA}.HEALTH_INFORMATION`).returning('ID');
        let hipma_id = HipmaSaved.find((obj: any) => {return obj.id;});

        if(HipmaSaved){
            var updateSubmission = await db(`${SCHEMA_GENERAL}.ACTION_LOGS`).update('SUBMISSION_ID', hipma_id.id).where("ID", logSaved);

            if(!updateSubmission){
                console.log('The action could not be logged: Update '+logOriginalSubmission.TABLE_NAME+' '+logOriginalSubmission.TITLE);
            }
        }

        let logFields = {
            ACTION_TYPE: 2,
            TITLE: "Insert submission",
            SCHEMA_NAME: SCHEMA_HIPMA,
            TABLE_NAME: "HEALTH_INFORMATION",
            SUBMISSION_ID: hipma_id.id
        };

        let loggedAction = await helper.insertLog(logFields);

        if(!loggedAction){
            console.log('The action could not be logged: '+logFields.TABLE_NAME+' '+logFields.TITLE);
        }

        if(!_.isEmpty(files)){
            var filesInsert = Array();
            var filesSaved =  true;
            for (const value of Object.values(files) as any[]) {
                var hipmaFiles = Object();

                if(!_.isEmpty(value)){
                    hipmaFiles.HIPMA_ID = hipma_id.id
                    hipmaFiles.DESCRIPTION = value.description;
                    hipmaFiles.FILE_NAME = value.file_name;
                    hipmaFiles.FILE_TYPE = value.file_type;
                    hipmaFiles.FILE_SIZE = value.file_size;
                    let array_file = value.file_data.match(/.{1,4000}/g) || [];
                    // Bind each base64 chunk as a parameter instead of concatenating
                    // user-supplied file data into the PL/SQL text. Concatenation here
                    // was an injectable single-quoted literal (see audit CRIT-02).
                    let appendStatements = '';
                    array_file.forEach(() => {
                        appendStatements += " DBMS_LOB.APPEND(v_long_text, to_blob(utl_raw.cast_to_raw(?))); ";
                    });

                    filesInsert.push(hipmaFiles);
                    const inserted = await db.raw(`
                        DECLARE
                            v_long_text BLOB;
                        BEGIN
                            DBMS_LOB.CREATETEMPORARY(v_long_text,true);`
                            + appendStatements +
                        `
                            INSERT INTO ${SCHEMA_HIPMA}.HIPMA_FILES (HIPMA_ID, DESCRIPTION, FILE_NAME, FILE_TYPE, FILE_SIZE, FILE_DATA) VALUES (?,?,?,?, ?,v_long_text);
                        END;
                        `, [...array_file, hipma_id.id, value.description, value.file_name, value.file_type, value.file_size]);
                    if(!inserted){
                        filesSaved = false;
                    }
                }
            }

            if(HipmaSaved && filesSaved){
                res.json({ status:200, message: 'Request saved' });
            } else {
                res.json({ status:400, message: 'Request could not be processed: HEALTH INFORMATION store attachment failed' });
            }
        }else if(HipmaSaved){
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
 * Change the status request to "closed"
 *
 * @param {hipma_id} id of request
 * @return json
 */
hipmaRouter.patch("/changeStatus", checkPermissions("hipma_update"), [body("params.requests").isArray({ min: 1 })], ReturnValidationErrors, async (req: Request, res: Response) => {

    try {
        var hipma = req.body.params.requests;
        db = await helper.getOracleClient(db, DB_CONFIG_HIPMA);

        var updateStatus = await db(`${SCHEMA_HIPMA}.HEALTH_INFORMATION`).update({STATUS: "2"}).whereIn("ID", hipma);
        var statusData = await db(`${SCHEMA_HIPMA}.HIPMA_STATUS`).where('ID', 2).first();
        var logFields = Array();

        if(updateStatus) {
            let type = "success";
            let message = "Request status changed successfully.";

            if(hipma instanceof Array){
                _.forEach(hipma, function(value: any) {
                    logFields.push({
                        ACTION_TYPE: 4,
                        TITLE: "Submission updated to status "+statusData.description,
                        SCHEMA_NAME: SCHEMA_HIPMA,
                        TABLE_NAME: "HEALTH_INFORMATION",
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
            message: 'Request could not be processed'
        });
    }
});

/**
 * Download request file
 *
 * @param {hipmaFile_id} id of request
 * @return json
 */
hipmaRouter.get("/downloadFile/:hipmaFile_id", checkPermissions("hipma_view"), [param("hipmaFile_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {

    try {
        db = await helper.getOracleClient(db, DB_CONFIG_HIPMA);
        var hipmaFile_id = Number(req.params.hipmaFile_id);
        var sanitize = require("sanitize-filename");
        var hipmaFiles = await db(`${SCHEMA_HIPMA}.HIPMA_FILES`).where("ID", hipmaFile_id).select().first();

        if(!hipmaFiles){
            return res.status(404).send({ status: 404, message: 'File not found' });
        }

        var buffer = Buffer.from(hipmaFiles.file_data.toString(), 'base64');
        // Sanitize the stored name/type purely for the download filename — the
        // bytes are streamed from the DB, never written to the served web root
        // (see audit CRIT-05).
        let safeBase = sanitize(String(hipmaFiles.file_name || "file")) || "file";
        let safeType = String(hipmaFiles.file_type || "").replace(/[^a-zA-Z0-9]/g, "");
        let downloadName = safeType ? `${safeBase}.${safeType}` : safeBase;

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
 * Export file
 *
 * @param {request}
 * @return file
 */
hipmaRouter.post("/export", checkPermissions("hipma_view"), async (req: Request, res: Response) => {
    try {
        var requests = req.body.params.requests;
        var dateFrom = req.body.params.dateFrom;
        var dateTo = req.body.params.dateTo;
        db = await helper.getOracleClient(db, DB_CONFIG_HIPMA);
        let userId = req.user?.db_user.user.id || null;
        var offset = req.body.params.offset;
        var limit = req.body.params.limit;
        var isAllData = req.body.params.isAllData;

        let query = db(`${SCHEMA_HIPMA}.HEALTH_INFORMATION`)
                .leftJoin(`${SCHEMA_HIPMA}.HIPMA_REQUEST_TYPE`, 'HEALTH_INFORMATION.WHAT_TYPE_OF_REQUEST_DO_YOU_WANT_TO_MAKE_', '=', 'HIPMA_REQUEST_TYPE.ID')
                .leftJoin(`${SCHEMA_HIPMA}.HIPMA_REQUEST_ACCESS_PERSONAL_HEALTH_INFORMATION`, 'HEALTH_INFORMATION.ARE_YOU_REQUESTING_ACCESS_TO_YOUR_OWN_PERSONAL_HEALTH_INFORMATI', '=', 'HIPMA_REQUEST_ACCESS_PERSONAL_HEALTH_INFORMATION.ID')
                .leftJoin(`${SCHEMA_HIPMA}.HIPMA_COPY_HEALTH_INFORMATION`, 'HEALTH_INFORMATION.GET_A_COPY_OF_YOUR_HEALTH_INFORMATION_', '=', 'HIPMA_COPY_HEALTH_INFORMATION.ID')
                .leftJoin(`${SCHEMA_HIPMA}.HIPMA_SITUATIONS`, 'HEALTH_INFORMATION.SELECT_THE_SITUATION_THAT_APPLIES_', '=', 'HIPMA_SITUATIONS.ID')
                .leftJoin(`${SCHEMA_HIPMA}.HIPMA_COPY_ACTIVITY_REQUEST`, 'HEALTH_INFORMATION.GET_A_COPY_OF_YOUR_ACTIVITY_REQUEST', '=', 'HIPMA_COPY_ACTIVITY_REQUEST.ID')
                .select( `HEALTH_INFORMATION.CONFIRMATION_NUMBER`, `HEALTH_INFORMATION.FIRST_NAME_BEHALF`,
                    `HEALTH_INFORMATION.LAST_NAME_BEHALF`, `HEALTH_INFORMATION.COMPANY_OR_ORGANIZATION_OPTIONAL_BEHALF`,
                    `HEALTH_INFORMATION.ADDRESS_BEHALF`, `HEALTH_INFORMATION.CITY_OR_TOWN_BEHALF`,
                    `HEALTH_INFORMATION.POSTAL_CODE_BEHALF`, `HEALTH_INFORMATION.EMAIL_ADDRESS_BEHALF`,
                    `HEALTH_INFORMATION.PHONE_NUMBER_BEHALF`, `HEALTH_INFORMATION.FIRST_NAME`, `HEALTH_INFORMATION.LAST_NAME`,
                    db.raw(`TO_CHAR(HEALTH_INFORMATION.DATE_OF_BIRTH, 'YYYY-MM-DD')  AS DATE_OF_BIRTH`),
                    `HEALTH_INFORMATION.ADDRESS`, `HEALTH_INFORMATION.CITY_OR_TOWN`,
                    `HEALTH_INFORMATION.POSTAL_CODE`, `HEALTH_INFORMATION.EMAIL_ADDRESS`, `HEALTH_INFORMATION.PHONE_NUMBER`, 
                    `HEALTH_INFORMATION.PROVIDE_DETAILS_ABOUT_YOUR_REQUEST_`,
                    db.raw(`GENERAL.process_blob_value_format(HEALTH_INFORMATION.INDICATE_THE_HSS_SYSTEM_S_YOU_WOULD_LIKE_A_RECORD_OF_USER_ACTIV, '${SCHEMA_HIPMA}.HIPMA_HSS_SYSTEMS') AS INDICATE_THE_HSS_SYSTEM_S_YOU_WOULD_LIKE_A_RECORD_OF_USER_ACTIV,
                    GENERAL.process_blob_value_format(HEALTH_INFORMATION.NAME_OF_HEALTH_AND_SOCIAL_SERVICES_PROGRAM_AREA_OPTIONAL_, '${SCHEMA_HIPMA}.HIPMA_HEALTH_SOCIAL_SERVICES_PROGRAM') AS NAME_OF_HEALTH_AND_SOCIAL_SERVICES_PROGRAM_AREA_OPTIONAL_,
                    TO_CHAR(HEALTH_INFORMATION.DATE_FROM_, 'YYYY-MM-DD')  AS DATE_FROM_,
                    TO_CHAR(HEALTH_INFORMATION.DATE_TO_, 'YYYY-MM-DD')  AS DATE_TO_,
                    TO_CHAR(HEALTH_INFORMATION.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,
                    TO_CHAR(HEALTH_INFORMATION.UPDATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS UPDATED_AT`),
                    `HIPMA_REQUEST_TYPE.DESCRIPTION AS HIPMA_REQUEST_TYPE_DESC`,
                    `HIPMA_REQUEST_ACCESS_PERSONAL_HEALTH_INFORMATION.DESCRIPTION AS ACCESS_PERSONAL_HEALTH_INFORMATION`,
                    `HIPMA_COPY_HEALTH_INFORMATION.DESCRIPTION AS CP_HEALTH_INFO`,
                    `HIPMA_SITUATIONS.DESCRIPTION AS HIPMA_SITUATIONS_DESC`, `HIPMA_COPY_ACTIVITY_REQUEST.DESCRIPTION AS CP_ACT_REQ`,
                    db.raw( `CASE WHEN HEALTH_INFORMATION.DATE_RANGE_IS_UNKNOWN_OR_I_NEED_HELP_IDENTIFYING_THE_DATE_RANGE = 1 THEN 'Yes' ELSE 'No' END AS DATE_RANGE_IS_UNKNOWN_OR_I_NEED_HELP_IDENTIFYING_THE_DATE_RANGE,
                            CASE WHEN HEALTH_INFORMATION.I_AFFIRM_THE_INFORMATION_ABOVE_TO_BE_TRUE_AND_ACCURATE_ = 1 THEN 'Yes' ELSE 'No' END AS I_AFFIRM_THE_INFORMATION_ABOVE_TO_BE_TRUE_AND_ACCURATE_ `
                        )
                    )
                    .where('HEALTH_INFORMATION.STATUS', '=', 1);

        if(requests.length > 0){
            query.whereIn("HEALTH_INFORMATION.ID", requests);
        }

        if(dateFrom && dateTo) {
            query.where(db.raw("TO_CHAR(HEALTH_INFORMATION.CREATED_AT, 'YYYY-MM-DD') >=  ? AND TO_CHAR(HEALTH_INFORMATION.CREATED_AT, 'YYYY-MM-DD') <= ?",
                [dateFrom, dateTo]));
        }

        if (isAllData) {
            query.offset(offset).limit(limit);
        }

        const hipma = await query;

        let today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0');
        let yyyy = today.getFullYear();
        let todayDate = mm+'-'+dd+'-'+yyyy;
        let random = (Math.random() + 1).toString(36).substring(7);
        let fileName = 'hipma_'+random+'_requests_'+todayDate+".xlsx";

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
            SCHEMA_NAME: SCHEMA_HIPMA,
            TABLE_NAME: "HEALTH_INFORMATION",
            SUBMISSION_ID: null,
            ACTION_DATA: bufferQuery,
            USER_ID: userId
        };

        let loggedAction = await helper.insertLog(logFields);

        if(!loggedAction){
            console.log("Hipma Export could not be logged");
        }

        res.json({ data:hipma, fileName:fileName });

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
hipmaRouter.post("/deleteFile", checkPermissions("hipma_delete"), async (req: Request, res: Response) => {
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

hipmaRouter.post("/duplicates", checkPermissions("hipma_view"), async (req: Request, res: Response) => {
    try {
        var hipmaOriginal = Object();
        var hipmaDuplicate = Object();
        var hipma = Array();
        db = await helper.getOracleClient(db, DB_CONFIG_HIPMA);

        hipmaOriginal = await db(`${SCHEMA_HIPMA}.HIPMA_DUPLICATED_REQUESTS`)
            .join(`${SCHEMA_HIPMA}.HEALTH_INFORMATION`, 'HIPMA_DUPLICATED_REQUESTS.ORIGINAL_ID', '=', 'HEALTH_INFORMATION.ID')
            .leftJoin(`${SCHEMA_HIPMA}.HIPMA_REQUEST_TYPE`, 'HEALTH_INFORMATION.WHAT_TYPE_OF_REQUEST_DO_YOU_WANT_TO_MAKE_', '=', 'HIPMA_REQUEST_TYPE.ID')
            .where('HEALTH_INFORMATION.STATUS', '=', 1)
            .select('HEALTH_INFORMATION.ID AS HEALTH_INFORMATION_ID',
                    'HIPMA_DUPLICATED_REQUESTS.ORIGINAL_ID',
                    'HIPMA_DUPLICATED_REQUESTS.DUPLICATED_ID',
                    'HEALTH_INFORMATION.CONFIRMATION_NUMBER',
                    'HIPMA_REQUEST_TYPE.DESCRIPTION AS HIPMA_REQUEST_TYPE_DESC',
                    db.raw("(HEALTH_INFORMATION.FIRST_NAME|| ' '|| HEALTH_INFORMATION.LAST_NAME) AS APPLICANT_FULL_NAME, "+
                    "(HIPMA_DUPLICATED_REQUESTS.ID|| '-'|| HEALTH_INFORMATION.ID) AS UNIQUE_ID, "+
                    "TO_CHAR(HEALTH_INFORMATION.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT, "+
                    "TO_CHAR(HEALTH_INFORMATION.DATE_OF_BIRTH, 'YYYY-MM-DD') AS DATE_OF_BIRTH")
            ).orderBy("HEALTH_INFORMATION.CREATED_AT").then((rows: any) => {
                let arrayResult = Object();
                for (let row of rows) {
                    arrayResult[row['original_id']] = row;
                }

                return arrayResult;
            });

        hipmaDuplicate = await db(`${SCHEMA_HIPMA}.HIPMA_DUPLICATED_REQUESTS`)
            .join(`${SCHEMA_HIPMA}.HEALTH_INFORMATION`, 'HIPMA_DUPLICATED_REQUESTS.DUPLICATED_ID', '=', 'HEALTH_INFORMATION.ID')
            .leftJoin(`${SCHEMA_HIPMA}.HIPMA_REQUEST_TYPE`, 'HEALTH_INFORMATION.WHAT_TYPE_OF_REQUEST_DO_YOU_WANT_TO_MAKE_', '=', 'HIPMA_REQUEST_TYPE.ID')
            .where('HEALTH_INFORMATION.STATUS', '=', 1)
            .select('HEALTH_INFORMATION.ID AS HEALTH_INFORMATION_ID',
                    'HIPMA_DUPLICATED_REQUESTS.ID',
                    'HIPMA_DUPLICATED_REQUESTS.ORIGINAL_ID',
                    'HIPMA_DUPLICATED_REQUESTS.DUPLICATED_ID',
                    'HEALTH_INFORMATION.CONFIRMATION_NUMBER AS CONFIRMATION_NUMBER',
                    'HIPMA_REQUEST_TYPE.DESCRIPTION AS HIPMA_REQUEST_TYPE_DESC',
                    db.raw("(HEALTH_INFORMATION.FIRST_NAME || ' ' || HEALTH_INFORMATION.LAST_NAME) AS APPLICANT_FULL_NAME, "+
                    "(HIPMA_DUPLICATED_REQUESTS.ID|| '-'|| HEALTH_INFORMATION.ID) AS UNIQUE_ID, "+
                    "TO_CHAR(HEALTH_INFORMATION.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT, "+
                    "TO_CHAR(HEALTH_INFORMATION.DATE_OF_BIRTH, 'YYYY-MM-DD') AS DATE_OF_BIRTH")
            ).orderBy("HEALTH_INFORMATION.CREATED_AT");

        let index = 0;
        hipmaDuplicate.forEach(function (value: any) {
            let url = "hipmaWarnings/details/"+value.id;
            delete value.id;

            hipma.push({
                health_information_id: null,
                id: null,
                original_id: null,
                duplicated_id: null,
                confirmation_number: null,
                hipma_request_type_desc: null,
                applicant_full_name: 'Duplicated #'+(index+1),
                created_at: 'ACTIONS:',
                date_of_birth: null,
                showUrl: url,
            });
            hipma.push(hipmaOriginal[value.original_id]);
            hipma.push(value);
            index = index + 1;
        });

        res.send({data: hipma});

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
 * @param {hipma_id} id of request
 * @return json
 */
hipmaRouter.get("/duplicates/details/:duplicate_id", checkPermissions("hipma_view"), [param("duplicate_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        db = await helper.getOracleClient(db, DB_CONFIG_HIPMA);
        let duplicate_id = Number(req.params.duplicate_id);
        var hipma = Object();
        var hipmaDuplicate = Object();
        var hipmaEntries = Object();
        var duplicateEntry = await db(`${SCHEMA_HIPMA}.HIPMA_DUPLICATED_REQUESTS`)
        .where("ID", Number(duplicate_id)).then((rows: any) => {
            let arrayResult = Object();
            for (let row of rows) {
                arrayResult.original = row['original_id'];
                arrayResult.duplicated = row['duplicated_id'];
            }
            return arrayResult;
        });
 
        hipmaEntries = await db(`${SCHEMA_HIPMA}.HEALTH_INFORMATION`)
        .leftJoin(`${SCHEMA_HIPMA}.HIPMA_REQUEST_TYPE`, 'HEALTH_INFORMATION.WHAT_TYPE_OF_REQUEST_DO_YOU_WANT_TO_MAKE_', '=', 'HIPMA_REQUEST_TYPE.ID')
        .leftJoin(`${SCHEMA_HIPMA}.HIPMA_REQUEST_ACCESS_PERSONAL_HEALTH_INFORMATION`, 'HEALTH_INFORMATION.ARE_YOU_REQUESTING_ACCESS_TO_YOUR_OWN_PERSONAL_HEALTH_INFORMATI', '=', 'HIPMA_REQUEST_ACCESS_PERSONAL_HEALTH_INFORMATION.ID')
        .leftJoin(`${SCHEMA_HIPMA}.HIPMA_COPY_HEALTH_INFORMATION`, 'HEALTH_INFORMATION.GET_A_COPY_OF_YOUR_HEALTH_INFORMATION_', '=', 'HIPMA_COPY_HEALTH_INFORMATION.ID')
        .leftJoin(`${SCHEMA_HIPMA}.HIPMA_SITUATIONS`, 'HEALTH_INFORMATION.SELECT_THE_SITUATION_THAT_APPLIES_', '=', 'HIPMA_SITUATIONS.ID')
        .leftJoin(`${SCHEMA_HIPMA}.HIPMA_COPY_ACTIVITY_REQUEST`, 'HEALTH_INFORMATION.GET_A_COPY_OF_YOUR_ACTIVITY_REQUEST', '=', 'HIPMA_COPY_ACTIVITY_REQUEST.ID')
        .select(`HEALTH_INFORMATION.ID`, `HEALTH_INFORMATION.CONFIRMATION_NUMBER`, `HEALTH_INFORMATION.STATUS`,
                `HEALTH_INFORMATION.WHAT_TYPE_OF_REQUEST_DO_YOU_WANT_TO_MAKE_`,
                `HEALTH_INFORMATION.ARE_YOU_REQUESTING_ACCESS_TO_YOUR_OWN_PERSONAL_HEALTH_INFORMATI`,
                `HEALTH_INFORMATION.SELECT_THE_SITUATION_THAT_APPLIES_`,
                `HEALTH_INFORMATION.FIRST_NAME_BEHALF`,
                `HEALTH_INFORMATION.LAST_NAME_BEHALF`,
                `HEALTH_INFORMATION.COMPANY_OR_ORGANIZATION_OPTIONAL_BEHALF`,
                `HEALTH_INFORMATION.ADDRESS_BEHALF`, `HEALTH_INFORMATION.CITY_OR_TOWN_BEHALF`,
                `HEALTH_INFORMATION.POSTAL_CODE_BEHALF`, `HEALTH_INFORMATION.EMAIL_ADDRESS_BEHALF`,
                `HEALTH_INFORMATION.PHONE_NUMBER_BEHALF`, `HEALTH_INFORMATION.FIRST_NAME`, `HEALTH_INFORMATION.LAST_NAME`,
                db.raw(`TO_CHAR(HEALTH_INFORMATION.DATE_OF_BIRTH, 'yyyy-mm-dd')  AS DATE_OF_BIRTH,
                        TO_CHAR(HEALTH_INFORMATION.DATE_FROM_, 'yyyy-mm-dd')  AS DATE_FROM_,
                        TO_CHAR(HEALTH_INFORMATION.DATE_TO_, 'yyyy-mm-dd')  AS DATE_TO_,
                         CASE WHEN HEALTH_INFORMATION.DATE_RANGE_IS_UNKNOWN_OR_I_NEED_HELP_IDENTIFYING_THE_DATE_RANGE = 1 THEN 'Yes' ELSE 'No' END AS DATE_RANGE_IS_UNKNOWN_OR_I_NEED_HELP_IDENTIFYING_THE_DATE_RANGE,
                        CASE WHEN HEALTH_INFORMATION.I_AFFIRM_THE_INFORMATION_ABOVE_TO_BE_TRUE_AND_ACCURATE_ = 1 THEN 'Yes' ELSE 'No' END AS I_AFFIRM_THE_INFORMATION_ABOVE_TO_BE_TRUE_AND_ACCURATE_`
                    ),
                `HEALTH_INFORMATION.ADDRESS`, `HEALTH_INFORMATION.CITY_OR_TOWN`,
                `HEALTH_INFORMATION.POSTAL_CODE`, `HEALTH_INFORMATION.EMAIL_ADDRESS`, `HEALTH_INFORMATION.PHONE_NUMBER`,
                `HEALTH_INFORMATION.GET_A_COPY_OF_YOUR_HEALTH_INFORMATION_`, `HEALTH_INFORMATION.GET_A_COPY_OF_YOUR_ACTIVITY_REQUEST`,
                `HEALTH_INFORMATION.NAME_OF_HEALTH_AND_SOCIAL_SERVICES_PROGRAM_AREA_OPTIONAL_`,
                `HEALTH_INFORMATION.INDICATE_THE_HSS_SYSTEM_S_YOU_WOULD_LIKE_A_RECORD_OF_USER_ACTIV`,
                `HEALTH_INFORMATION.PROVIDE_DETAILS_ABOUT_YOUR_REQUEST_`,
                `HEALTH_INFORMATION.CREATED_AT`, `HEALTH_INFORMATION.UPDATED_AT`,
                `HIPMA_REQUEST_TYPE.DESCRIPTION AS HIPMA_REQUEST_TYPE_DESC`,
                `HIPMA_REQUEST_ACCESS_PERSONAL_HEALTH_INFORMATION.DESCRIPTION AS ACCESS_PERSONAL_HEALTH_INFORMATION`,
                `HIPMA_COPY_HEALTH_INFORMATION.DESCRIPTION AS CP_HEALTH_INFO`,
                `HIPMA_SITUATIONS.DESCRIPTION AS HIPMA_SITUATIONS_DESC`,
                `HIPMA_COPY_ACTIVITY_REQUEST.DESCRIPTION AS CP_ACT_REQ`)
        .whereIn("HEALTH_INFORMATION.ID", [duplicateEntry.original, duplicateEntry.duplicated])
        .where("HEALTH_INFORMATION.STATUS", "1");

        var socialServices = Object();
        var hssSystems = Object();

        socialServices = await db(`${SCHEMA_HIPMA}.HIPMA_HEALTH_SOCIAL_SERVICES_PROGRAM`).select().then((rows: any) => {
            let arrayResult = Object();

            for (let row of rows) {
                arrayResult[row['id']] = row['description'];
            }

            return arrayResult;
        });

        hssSystems = await db(`${SCHEMA_HIPMA}.HIPMA_HSS_SYSTEMS`).select().then((rows: any) => {
            let arrayResult = Object();

            for (let row of rows) {
                arrayResult[row['id']] = row['description'];
            }

            return arrayResult;
        });

        if(hipmaEntries){
            hipmaEntries.forEach(function (value: any) {
                if(!_.isEmpty(value.name_of_health_and_social_services_program_area_optional_)) {
                    var dataString = "";
                    value.name_of_health_and_social_services_program_area_optional_ = JSON.parse(value.name_of_health_and_social_services_program_area_optional_.toString());
                    _.forEach(value.name_of_health_and_social_services_program_area_optional_, function(value: any, key: any) {
                        if(socialServices.hasOwnProperty(value)) {
                            dataString += socialServices[value]+",";
                        }else{
                            dataString += value+",";
                        }
                    });

                    if(dataString.substr(-1) == ",") {
                        dataString = dataString.slice(0, -1);
                    }

                    value.name_of_health_and_social_services_program_area_optional_ = dataString.replace(/,/g, ', ');
                }

                if(!_.isEmpty(value.indicate_the_hss_system_s_you_would_like_a_record_of_user_activ)) {
                    var dataString = "";
                    value.indicate_the_hss_system_s_you_would_like_a_record_of_user_activ = JSON.parse(value.indicate_the_hss_system_s_you_would_like_a_record_of_user_activ.toString());
                    _.forEach(value.indicate_the_hss_system_s_you_would_like_a_record_of_user_activ, function(value: any, key: any) {
                        if(hssSystems.hasOwnProperty(value)) {
                            dataString += hssSystems[value]+",";
                        }else{
                            dataString += value+",";
                        }
                    });

                    if(dataString.substr(-1) == ",") {
                        dataString = dataString.slice(0, -1);
                    }

                    value.indicate_the_hss_system_s_you_would_like_a_record_of_user_activ = dataString.replace(/,/g, ', ');
                }

                if(value.id == duplicateEntry.original){
                    hipma = value;
                }else if(value.id == duplicateEntry.duplicated){
                    hipmaDuplicate = value;
                }

            });
        }

        var hipmaFiles = await db(`${SCHEMA_HIPMA}.HIPMA_FILES`).where("HIPMA_ID", duplicateEntry.original).select();
        var hipmaFilesDuplicated = await db(`${SCHEMA_HIPMA}.HIPMA_FILES`).where("HIPMA_ID", duplicateEntry.duplicated).select();
        var files = Object();
        var filesDuplicated = Object();

        if(!_.isEmpty(hipmaFiles)){

            _.forEach(hipmaFiles, function(valueFiles: any) {

                files[valueFiles.description] = { id: valueFiles.id,
                                            file_name: valueFiles.file_name,
                                            file_type: valueFiles.file_type,
                                            file_size: valueFiles.file_size,
                                            file_fullName: valueFiles.file_name+"."+valueFiles.file_type,
                                            file_data: valueFiles.file_data
                                        };

            });
        }

        if(!_.isEmpty(hipmaFilesDuplicated)){

            _.forEach(hipmaFilesDuplicated, function(valueFilesDup: any) {

                filesDuplicated[valueFilesDup.description] = { id: valueFilesDup.id,
                                            file_name: valueFilesDup.file_name,
                                            file_type: valueFilesDup.file_type,
                                            file_size: valueFilesDup.file_size,
                                            file_fullName: valueFilesDup.file_name+"."+valueFilesDup.file_type,
                                            file_data: valueFilesDup.file_data
                                        };

            });
        }
        res.json({ hipma: hipma, hipmaDuplicate: hipmaDuplicate, hipmaFiles: files, hipmaFilesDuplicated: filesDuplicated});

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
 * @param {duplicate_id} id of request
 * @return json
 */
hipmaRouter.patch("/duplicates/primary", checkPermissions("hipma_update"), async (req: Request, res: Response) => {
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
        db = await helper.getOracleClient(db, DB_CONFIG_HIPMA);

        if(!request){
            rejectWarning = await db(`${SCHEMA_HIPMA}.HIPMA_DUPLICATED_REQUESTS`).where("ID", warning).del();
            logTitle = "Duplicated Warning Rejected";
        }else{
            var warningRequest = await db(`${SCHEMA_HIPMA}.HIPMA_DUPLICATED_REQUESTS`).where("ID", warning).first();

            if(type == 'O'){
                updateRequest = await db(`${SCHEMA_HIPMA}.HEALTH_INFORMATION`).update({STATUS: "2"}).where("ID", Number(warningRequest.duplicated_id));
                primarySubmission = warningRequest.duplicated_id;
            }else if(type == 'D'){
                updateRequest = await db(`${SCHEMA_HIPMA}.HEALTH_INFORMATION`).update({STATUS: "2"}).where("ID", Number(warningRequest.original_id));
                primarySubmission = warningRequest.original_id;
            }

            logFields.push({
                ACTION_TYPE: 4,
                TITLE: "Submission updated to status Closed",
                SCHEMA_NAME: SCHEMA_HIPMA,
                TABLE_NAME: "HEALTH_INFORMATION",
                SUBMISSION_ID: primarySubmission,
                USER_ID: req.user?.db_user.user.id
            });

            if(updateRequest){
                rejectWarning = await db(`${SCHEMA_HIPMA}.HIPMA_DUPLICATED_REQUESTS`).where("ID", warning).del();
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
                SCHEMA_NAME: SCHEMA_HIPMA,
                TABLE_NAME: "HIPMA_DUPLICATED_REQUESTS",
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
 * Validate if warning is non existant
 *
 * @param {hipma_id} id of warning
 * @return json
 */
hipmaRouter.get("/duplicates/validateWarning/:duplicate_id", checkPermissions("hipma_view"), [param("duplicate_id").isInt().notEmpty()], ReturnValidationErrors, async (req: Request, res: Response) => {
    try {
        var duplicate_id = Number(req.params.duplicate_id);
        var warning = Object();
        var flagExists = true;
        var message = "";
        var type = "error";
        db = await helper.getOracleClient(db, DB_CONFIG_HIPMA);

        warning = await db(`${SCHEMA_HIPMA}.HIPMA_DUPLICATED_REQUESTS`)
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
 * Obtain file characteristics
 *
 * @param {field_name}
 * @param {data}
 * @return {filesHipma} array with file data
 */
function saveFile(field_name: any, data: any){
    var sanitize = require("sanitize-filename");
    const allowedExtensions = ["pdf", "doc", "docx", "jpg", "jpeg", "png"]

    if(data[field_name] !== 'undefined' && (data[field_name]) && data[field_name]['data'] !== 'undefined'){

        var filesHipma = Object();
        var buffer = Buffer.from(data[field_name]['data'], 'base64');
        let name = data[field_name]['name'];
        // Sanitize the client filename; never derive a disk path from it.
        let fileName = sanitize(String(name)).split(".");

        // Validate size from the in-memory buffer BEFORE persisting anything
        // (the previous code wrote to disk first, then checked). See audit MED-06.
        var fileSizeInMegabytes = buffer.length / (1024*1024);

        if(fileSizeInMegabytes > 10){
            return filesHipma;
        }

        // Reject (don't store) files whose extension is not allow-listed, instead
        // of falling back to the client-supplied extension (see audit MED-06).
        let fileExtension = (fileName.length > 1 ? fileName[fileName.length - 1] : "").toLowerCase();

        if(!allowedExtensions.includes(fileExtension)){
            return filesHipma;
        }

        filesHipma["description"] = field_name;
        filesHipma["file_name"] = fileName[0];
        filesHipma["file_type"] = fileExtension;
        filesHipma["file_size"] = fileSizeInMegabytes;
        filesHipma["file_data"] = data[field_name]['data'];
    }

    return filesHipma;
}
