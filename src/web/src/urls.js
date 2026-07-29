
import * as config from "./config";

export const AUTH_CHECK_URL = `${config.apiBaseUrl}/api/auth/isAuthenticated`;
export const LOGIN_EVENT_URL = `${config.apiBaseUrl}/api/auth/loginEvent`;
export const PROFILE_URL = `${config.apiBaseUrl}/api/user`;
export const ROLES_OPTIONS = `${PROFILE_URL}/roles/options`;

export const CONSTELLATION_URL = `${config.apiBaseUrl}/api/constellation`;
export const CONSTELLATION_CHANGE_STATUS_URL = `${CONSTELLATION_URL}/changeStatus/`;
export const CONSTELLATION_SHOW_URL = `${CONSTELLATION_URL}/show/`;
export const CONSTELLATION_VALIDATE_URL = `${CONSTELLATION_URL}/validateRecord/`;
export const CONSTELLATION_EXPORT_FILE_URL = `${CONSTELLATION_URL}/export`;
export const CONSTELLATION_SUBMISSIONS_URL = `${CONSTELLATION_URL}/submissions`
export const CONSTELLATION_STATUS_URL = `${CONSTELLATION_SUBMISSIONS_URL}/status`
export const CONSTELLATION_DUPLICATES = `${CONSTELLATION_URL}/duplicates`;
export const CONSTELLATION_DUPLICATES_DETAILS = `${CONSTELLATION_DUPLICATES}/details/`;
export const CONSTELLATION_DUPLICATES_PRIMARY = `${CONSTELLATION_DUPLICATES}/primary/`;
export const CONSTELLATION_VALIDATE_WARNING_URL = `${CONSTELLATION_DUPLICATES}/validateWarning/`;

export const HIPMA_URL = `${config.apiBaseUrl}/api/hipma`;
export const HIPMA_SHOW_URL = `${HIPMA_URL}/show/`;
export const HIPMA_VALIDATE_URL = `${HIPMA_URL}/validateRecord/`;
export const HIPMA_DOWNLOAD_FILE_URL = `${HIPMA_URL}/downloadFile/`;
export const HIPMA_CHANGE_STATUS_URL = `${HIPMA_URL}/changeStatus/`;
export const HIPMA_EXPORT_FILE_URL = `${HIPMA_URL}/export`;
export const HIPMA_SUBMISSIONS_URL = `${HIPMA_URL}/submissions`
export const HIPMA_STATUS_URL = `${HIPMA_SUBMISSIONS_URL}/status`
export const HIPMA_DELETE_FILE = `${HIPMA_URL}/deleteFile/`;
export const HIPMA_DUPLICATES = `${HIPMA_URL}/duplicates`;
export const HIPMA_DUPLICATES_DETAILS = `${HIPMA_DUPLICATES}/details/`;
export const HIPMA_DUPLICATES_PRIMARY = `${HIPMA_DUPLICATES}/primary/`;
export const HIPMA_VALIDATE_WARNING_URL = `${HIPMA_DUPLICATES}/validateWarning/`;

export const GENERAL_URL = `${config.apiBaseUrl}/api/general`;
export const SUBMISSION_URL = `${GENERAL_URL}/submissions`;
export const SUBMISSION_STATUS_URL = `${SUBMISSION_URL}/status`;
export const SUBMISSION_AGE_URL = `${SUBMISSION_URL}/age`;
export const SUBMISSION_GENDER_URL = `${SUBMISSION_URL}/gender`;
export const AUDIT_URL = `${GENERAL_URL}/audit`;
export const AUDIT_DATA_URL = `${AUDIT_URL}/data`;
export const AUDIT_TIMELINE_URL = `${AUDIT_URL}/timeline`;
export const GENERAL_LOGS =  `${GENERAL_URL}/logs`;
export const GENERAL_LOGS_EXPORT = `${GENERAL_URL}/export`;

export const MIDWIFERY_URL = `${config.apiBaseUrl}/api/midwifery`;
export const MIDWIFERY_SHOW_URL = `${MIDWIFERY_URL}/show/`;
export const MIDWIFERY_VALIDATE_URL = `${MIDWIFERY_URL}/validateRecord/`;
export const MIDWIFERY_DOWNLOAD_FILE_URL = `${MIDWIFERY_URL}/downloadFile/`;
export const MIDWIFERY_CHANGE_STATUS_URL = `${MIDWIFERY_URL}/changeStatus/`;
export const MIDWIFERY_EXPORT_FILE_URL = `${MIDWIFERY_URL}/export`;
export const MIDWIFERY_SUBMISSIONS_URL = `${MIDWIFERY_URL}/submissions`
export const MIDWIFERY_STATUS_URL = `${MIDWIFERY_SUBMISSIONS_URL}/status`
export const MIDWIFERY_DUPLICATES = `${MIDWIFERY_URL}/duplicates`;
export const MIDWIFERY_DUPLICATES_DETAILS = `${MIDWIFERY_DUPLICATES}/details/`;
export const MIDWIFERY_DUPLICATES_PRIMARY = `${MIDWIFERY_DUPLICATES}/primary/`;
export const MIDWIFERY_VALIDATE_WARNING_URL = `${MIDWIFERY_DUPLICATES}/validateWarning/`;

export const DENTAL_URL = `${config.apiBaseUrl}/api/dental`;
export const DENTAL_CHANGE_STATUS_URL = `${DENTAL_URL}/changeStatus/`;
export const DENTAL_SHOW_URL = `${DENTAL_URL}/show/`;
export const DENTAL_VALIDATE_URL = `${DENTAL_URL}/validateRecord/`;
export const DENTAL_DOWNLOAD_FILE_URL = `${DENTAL_URL}/downloadFile/`;
export const DENTAL_STORE_INTERNAL_FIELDS_URL = `${DENTAL_URL}/storeInternalFields/`;
export const DENTAL_STORE_COMMENTS_URL = `${DENTAL_URL}/storeComments/`;
export const DENTAL_EXPORT_FILE_URL = `${DENTAL_URL}/export`;
export const DENTAL_SUBMISSIONS_URL = `${DENTAL_URL}/submissions`
export const DENTAL_STATUS_URL = `${DENTAL_SUBMISSIONS_URL}/status`
export const DENTAL_DELETE_FILE = `${DENTAL_URL}/deleteFile/`;
export const DENTAL_DUPLICATES = `${DENTAL_URL}/duplicates`;
export const DENTAL_DUPLICATES_DETAILS = `${DENTAL_DUPLICATES}/details/`;
export const DENTAL_DUPLICATES_PRIMARY = `${DENTAL_DUPLICATES}/primary/`;
export const DENTAL_VALIDATE_WARNING_URL = `${DENTAL_DUPLICATES}/validateWarning/`;
export const DENTAL_UPDATE_URL = `${DENTAL_URL}/update`;