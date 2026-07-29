import { AuditRepository } from './../repository/oracle/AuditRepository';
import { groupBy } from '../utils/groupBy';
import { helper, logger } from "../utils";
import express, { Request, Response } from "express";
import { param } from "express-validator";
import { SubmissionStatusRepository } from "../repository/oracle/SubmissionStatusRepository";
import knex from "knex";
import { DB_CONFIG_DENTAL, SCHEMA_DENTAL, SCHEMA_GENERAL, DB_CONFIG_GENERAL } from "../config";
import { checkPermissions } from "../middleware/permissions";
import { ReturnValidationErrors } from "../middleware";
var _ = require('lodash');
let db = knex(DB_CONFIG_GENERAL);
var RateLimit = require('express-rate-limit');
const submissionStatusRepo = new SubmissionStatusRepository();
const auditRepo = new AuditRepository();

export const generalRouter = express.Router();
generalRouter.use(RateLimit({
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
generalRouter.get("/submissions/status/:action_id/:action_value", checkPermissions("dashboard_view"), [
    param("action_id").notEmpty(), 
    param("action_value").notEmpty()
], ReturnValidationErrors, async (req: Request, res: Response) => {

    try {

        const actionId = req.params.action_id;
        const actionVal = req.params.action_value;
        const permissions = req.user?.db_user.permissions ?? [];
        const result = await submissionStatusRepo.getSubmissionsStatus(actionId, actionVal, permissions);
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
 * @param { action_id } action id.
 * @param { action_value } action value.
 * @return json
 */
generalRouter.get("/submissions/:action_id/:action_value", checkPermissions("dashboard_view"), [
    param("action_id").notEmpty(), 
    param("action_value").notEmpty()
], ReturnValidationErrors, async (req: Request, res: Response) => {

    try {

        const actionId = req.params.action_id;
        const actionVal = req.params.action_value;
        const permissions = req.user?.db_user.permissions ?? [];
        const result = await submissionStatusRepo.getSubmissions(actionId, actionVal, permissions);
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
 * @param { event_type } event type.
 * @return json
 */
generalRouter.get("/audit/data/:event_type", checkPermissions("dashboard_view"), [
    param("event_type").notEmpty()
], ReturnValidationErrors, async (req: Request, res: Response) => {

    try {

        const event_type = parseInt(req.params.event_type);
        const result = await auditRepo.getAudit(event_type);
        res.send({ data: result });

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Obtain data to show the audit timeline data.
 *
 * @return json
 */
generalRouter.get("/audit/timeline", checkPermissions("dashboard_view"), async (req: Request, res: Response) => {

    try {
        const permissions = req.user?.db_user.permissions ?? [];
        const result = await auditRepo.getAuditTimeline(permissions);
        res.send({ data: result });

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});

/**
 * Obtain age from Dental Service data to show in the index view
 *
 * @param { action_id } action id.
 * @param { action_value } action value.
 * @return json
 */
generalRouter.get("/submissions/age/:action_id/:action_value", checkPermissions("dashboard_view"), [
    param("action_id").notEmpty(),
    param("action_value").notEmpty()
], ReturnValidationErrors, async (req: Request, res: Response) => {

    try {

        const actionId = req.params.action_id;
        const actionVal = req.params.action_value;
        const permissions = req.user?.db_user.permissions ?? [];
        const result = await submissionStatusRepo.getAgeSubmissions(actionId, actionVal, permissions);
        const labels = groupBy(result, i => i.age_range);
        res.send(
            {
                data: result,
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
 * Obtain gender from Dental Service data to show in the index view
 *
 * @param { action_id } action id.
 * @param { action_value } action value.
 * @return json
 */
generalRouter.get("/submissions/gender/:action_id/:action_value", checkPermissions("dashboard_view"), [
    param("action_id").notEmpty(),
    param("action_value").notEmpty()
], ReturnValidationErrors, async (req: Request, res: Response) => {

    try {

        const actionId = req.params.action_id;
        const actionVal = req.params.action_value;
        const permissions = req.user?.db_user.permissions ?? [];
        const result = await submissionStatusRepo.getGenderSubmissions(actionId, actionVal, permissions);
        const groupedId = groupBy(result, i => i.id);
        const labels = groupBy(result, i => i.gender_name);
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
 * @return json
 */
generalRouter.post("/logs", checkPermissions("dental_logs"), async (req: Request, res: Response) => {
    try {
        let moduleName = req.body.params.moduleName;
        let userId = req.body.params.userName;
        let dateFrom = req.body.params.dateFrom;
        let dateTo = req.body.params.dateTo;
        let firstName = req.body.params.firstName;
        let lastName = req.body.params.lastName;

        db = await helper.getOracleClient(db, DB_CONFIG_GENERAL);

        const dentalLogUsers = await db(`${SCHEMA_GENERAL}.USER_ROLES as ur`)
            .join(`${SCHEMA_GENERAL}.ROLES_DATA as rd`, 'ur.ROLE_ID', 'rd.ID')
            .join(`${SCHEMA_GENERAL}.USER_DATA as ud`, 'ur.USER_ID', 'ud.ID')
            .whereIn('rd.ID', [7, 8])
            .distinct('ur.USER_ID', 'ud.USER_EMAIL')
            .select('ur.USER_ID', 'ud.USER_EMAIL');

        const userEmailMap = dentalLogUsers.reduce((acc, { user_id, user_email }) => {
            acc[user_id] = user_email;
            return acc;
            }, {});

        const dentalLogUserIds = dentalLogUsers.map(row => row.user_id);

        let query = db(`${SCHEMA_GENERAL}.SUBMISSIONS_LOGS`)
            .whereIn('SCHEMA_NAME', moduleName)
            .orderBy('ID', 'DESC');

        if (userId) {
            const userEmail = userEmailMap[userId];

            if (userEmail) {
                const rows = await db(`${SCHEMA_GENERAL}.USER_DATA`)
                    .select('ID')
                    .whereRaw('LOWER("USER_EMAIL") = ?', [userEmail.toLowerCase()]);

                const matchedUserIds = rows.map(r => Number(r.id));

                if (matchedUserIds.length === 1 && matchedUserIds[0] === userId) {
                    query.where("USER_ID", userId);
                }else if (matchedUserIds.length > 0) {
                    query.whereIn("USER_ID", matchedUserIds);
                }
            }
        }else{
            query.whereIn('USER_ID', dentalLogUserIds);
        }

        if(dateFrom && dateTo) {
            query.where(db.raw("TO_CHAR(TO_DATE(ACTION_DATE, 'YYYY-MM-DD HH24:MI:SS'), 'YYYY-MM-DD') >=  ? "+
                                "AND TO_CHAR(TO_DATE(ACTION_DATE, 'YYYY-MM-DD HH24:MI:SS'), 'YYYY-MM-DD') <= ?",
                [dateFrom, dateTo]));
        }

        if (firstName && firstName.trim() !== '') {
            const lowerSearchFn = firstName.trim().toLowerCase();

            query.where(function () {
                this.whereRaw(`LOWER(FIRST_NAME_CLIENT) LIKE ?`, [`%${lowerSearchFn}%`]);
            });
        }

        if (lastName && lastName.trim() !== '') {
            const lowerSearchLn = lastName.trim().toLowerCase();

            query.where(function () {
                this.whereRaw(`LOWER(LAST_NAME_CLIENT) LIKE ?`, [`%${lowerSearchLn}%`]);
            });
        }

        const queryUsers = dentalLogUsers.map(item => ({
            text: item.user_email.toLowerCase(),
            value: item.user_id
        }));

        const moduleLogs = await query;

        res.send({data: moduleLogs, users: queryUsers});

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Dashboard logs could not be processed'
        });
    }
});

/**
 * Obtain data to show in export file
 *
 * @param {status} status of request
 * @return json
 */
generalRouter.post("/export/", checkPermissions("dental_logs"), async (req: Request, res: Response) => {
    try {
        var requests = req.body.params.requests;
        let moduleName = req.body.params.moduleName;
        var dateFrom = req.body.params.dateFrom;
        var dateTo = req.body.params.dateTo;
        let firstName = req.body.params.firstName;
        let lastName = req.body.params.lastName;
        db = await helper.getOracleClient(db, DB_CONFIG_GENERAL);
        let userId = req.body.params.userName;

        let query = db(`${SCHEMA_GENERAL}.SUBMISSIONS_LOGS`)
                    .select('SCHEMA_NAME',
                            'TITLE',
                            'ACTION_TYPE_DESCRIPTION',
                            'SUBMISSION_ID',
                            'FIRST_NAME_CLIENT',
                            'LAST_NAME_CLIENT',
                            'USER_NAME',
                            'USER_EMAIL',
                            'ACTION_DATE'
                    )
                    .whereIn('SCHEMA_NAME', moduleName);

        const dentalLogUsers = await db(`${SCHEMA_GENERAL}.USER_ROLES as ur`)
            .join(`${SCHEMA_GENERAL}.ROLES_DATA as rd`, 'ur.ROLE_ID', 'rd.ID')
            .join(`${SCHEMA_GENERAL}.USER_DATA as ud`, 'ur.USER_ID', 'ud.ID')
            .whereIn('rd.ID', [7, 8])
            .distinct('ur.USER_ID', 'ud.USER_EMAIL')
            .select('ur.USER_ID', 'ud.USER_EMAIL');

        const userEmailMap = dentalLogUsers.reduce((acc, { user_id, user_email }) => {
            acc[user_id] = user_email;
            return acc;
            }, {});

        const dentalLogUserIds = dentalLogUsers.map(row => row.user_id);

        if(requests.length > 0){
            query.whereIn("ID", requests);
        }

        if (userId) {
            const userEmail = userEmailMap[userId];

            if (userEmail) {
                const rows = await db(`${SCHEMA_GENERAL}.USER_DATA`)
                    .select('ID')
                    .whereRaw('LOWER("USER_EMAIL") = ?', [userEmail.toLowerCase()]);

                const matchedUserIds = rows.map(r => Number(r.id));

                if (matchedUserIds.length === 1 && matchedUserIds[0] === userId) {
                    query.where("USER_ID", userId);
                }else if (matchedUserIds.length > 0) {
                    query.whereIn("USER_ID", matchedUserIds);
                }
            }
        }else{
            query.whereIn('USER_ID', dentalLogUserIds);
        }

        if(dateFrom && dateTo) {
            query.where(db.raw("TO_CHAR(TO_DATE(ACTION_DATE, 'YYYY-MM-DD HH24:MI:SS'), 'YYYY-MM-DD') >=  ? "+
                                "AND TO_CHAR(TO_DATE(ACTION_DATE, 'YYYY-MM-DD HH24:MI:SS'), 'YYYY-MM-DD') <= ?",
                [dateFrom, dateTo]));
        }

        if (firstName) {
            const lowerSearchFn = firstName.trim().toLowerCase();

            query.where(function () {
                this.whereRaw(`LOWER(FIRST_NAME_CLIENT) LIKE ?`, [`%${lowerSearchFn}%`]);
            });
        }

        if (lastName) {
            const lowerSearchLn = lastName.trim().toLowerCase();

            query.where(function () {
                this.whereRaw(`LOWER(LAST_NAME_CLIENT) LIKE ?`, [`%${lowerSearchLn}%`]);
            });
        }

        query.orderBy('ID', 'ASC');

        const moduleLogs = await query;

        res.json({ status: 200, dataLogs: moduleLogs});

    } catch(e) {
        logger.error("Unhandled error in request handler", e);  // debug if needed
        res.send( {
            status: 400,
            message: 'Request could not be processed'
        });
    }
});