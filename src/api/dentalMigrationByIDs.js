require('dotenv').config();
const knex = require('knex');

let path;
switch (process.env.NODE_ENV) {
	case "test":
		path = `.env.test`;
    break;
	case "production":
		path = `.env`;
    break;
	default:
		path = `.env.development`;
}

require('dotenv').config({ path: path });

const DB_USER = process.env.DB_USER || '';
const DB_PASS = process.env.DB_PASS || '';
const DB_HOST = process.env.DB_HOST || '';
const DB_PORT = process.env.DB_PORT || '';
const DB_NAME = process.env.DB_NAME || '';
const DB_SERVICE = process.env.DB_SERVICE || '';
const SCHEMA_DENTAL = process.env.SCHEMA_DENTAL || '';
const SCHEMA_GENERAL = process.env.SCHEMA_GENERAL || '';

const DB_USER_EDMS = process.env.DB_USER_EDMS || '';
const DB_PASS_EDMS = process.env.DB_PASS_EDMS || '';
const DB_HOST_EDMS = process.env.DB_HOST_EDMS || '';
const DB_PORT_EDMS = process.env.DB_PORT_EDMS || '';
const DB_NAME_EDMS = process.env.DB_NAME_EDMS || '';

const DENTAL_IDS = process.env.DENTAL_IDS || '';

const emdsConfig = {
	client: 'mysql',
	connection: {
		host: DB_HOST_EDMS,
		port: DB_PORT_EDMS,
		user: DB_USER_EDMS,
		password: DB_PASS_EDMS,
		database: DB_NAME_EDMS,
		requestTimeout: 10000
	}
};

const DB_CONFIG_DENTAL = {
	client: 'oracledb',
	connection: {
		host: `${DB_HOST}:${DB_PORT}`,
		user: DB_USER,
		password: DB_PASS,
		database: DB_NAME,
		requestTimeout: 100,
		instanceName: DB_SERVICE,
		connectString: `(DESCRIPTION=
			(ADDRESS_LIST=
			(ADDRESS=(PROTOCOL=TCP)
			(HOST=${DB_HOST})(PORT=${DB_PORT}) ) )
			(CONNECT_DATA=(SERVICE_NAME=${DB_SERVICE}) ) )`
	}
};

async function main() {
	try {
		console.log('Verifying IDS...');
		if( typeof DENTAL_IDS === "string" && DENTAL_IDS.trim().length > 0){
			const dbHss = knex(DB_CONFIG_DENTAL);
			const dbEdms = knex(emdsConfig);

			console.log('Processing data migration...');
			
			const submissionsID = DENTAL_IDS.split(/\s*,\s*/);
			if (submissionsID && submissionsID.length > 0) {
				console.log(submissionsID);

				var dentalService = await dbEdms(`dental_service`).select().whereIn('id', submissionsID);

				var dentalStatus = await dbHss(`${SCHEMA_DENTAL}.DENTAL_STATUS`).select().then((rows) => {
					let arrayResult = Object();

					for (let row of rows) {
						arrayResult[row['DESCRIPTION']] = row['ID'];
					}

					return arrayResult;
				});

				let arraySubmissions = Array();
				let arraySubmissionsAux = Array();
				let dentalServiceSaved = Object();
				let dentalId = Object();
				let idSubmissions = [];

				dentalService.forEach(function (value) {

					let dataSubmission = Object();
					let dataSubmissionAux = Object();

					idSubmissions.push(value.id);

					switch (value.status) {
						case "open":
							dataSubmission.STATUS = dentalStatus.New;
							break;
						case "pending":
							dataSubmission.STATUS = dentalStatus.Pending;
							break;
						case "accepted":
							dataSubmission.STATUS = dentalStatus.Enrolled;
							break;
						case "denied":
							dataSubmission.STATUS = dentalStatus.Declined;
							break;
						case "closed":
							dataSubmission.STATUS = dentalStatus.Closed;
							break;
					}

					dataSubmission.FIRST_NAME = value.first_name;
					dataSubmission.MIDDLE_NAME = value.middle_name;
					dataSubmission.LAST_NAME = value.last_name;

					dataSubmissionAux.ID_OLD = value.id;
					dataSubmissionAux.FIRST_NAME = value.first_name;
					dataSubmissionAux.MIDDLE_NAME = value.middle_name;
					dataSubmissionAux.LAST_NAME = value.last_name;

					if(value.date_of_birth !== null || value.date_of_birth !== ''){
						value.date_of_birth = value.date_of_birth.toISOString();
						let result = value.date_of_birth.split('T')[0];
						result = result.replace(/\.000Z$/, '');
						dataSubmission.DATE_OF_BIRTH  = dbHss.raw("TO_DATE( ? ,'YYYY-MM-DD') ", result);
					}else{
						dataSubmission.DATE_OF_BIRTH = null;
					}

					dataSubmission.HEALTH_CARD_NUMBER = value.health_card_number;
					dataSubmission.MAILING_ADDRESS = value.mailing_address;
					dataSubmission.CITY_OR_TOWN = value.city_or_town;
					dataSubmission.POSTAL_CODE = value.postal_code;
					dataSubmission.PHONE = value.phone;
					dataSubmission.EMAIL = value.email;
					dataSubmission.OTHER_COVERAGE = value.other_coverage;
					dataSubmission.ARE_YOU_ELIGIBLE_FOR_THE_PHARMACARE_AND_EXTENDED_HEALTH_CARE_BEN = value.are_you_eligible_for_the_pharmacare_and_extended_health_care_ben;
					dataSubmission.EMAIL_INSTEAD = value.email_instead;

					if(value.have_children.includes("Yes,") || value.have_children.includes("yes,") || value.have_children.includes("YES,")){
						dataSubmission.HAVE_CHILDREN = "Yes, I have children listed on my YHCIP.";
					}else if(value.have_children.includes("No,") || value.have_children.includes("no,") || value.have_children.includes("NO,")){
						dataSubmission.HAVE_CHILDREN = "No, I don't have children listed on my YHCIP.";
					}

					dataSubmission.ASK_DEMOGRAPHIC = value.ask_demographic;

					if(value.identify_groups == null && !Array.isArray(value.identify_groups)) {
						dataSubmission.IDENTIFY_GROUPS = null;
					}else{
						dataSubmission.IDENTIFY_GROUPS =  dbHss.raw("utl_raw.cast_to_raw(?) ", value.identify_groups);
					}

					dataSubmission.GENDER = value.gender;
					dataSubmission.EDUCATION = value.education;
					dataSubmission.OFTEN_BRUSH = value.often_brush;
					dataSubmission.STATE_TEETH = value.state_teeth;
					dataSubmission.OFTEN_FLOSS = value.often_floss;
					dataSubmission.STATE_GUMS = value.state_gums;
					dataSubmission.LAST_SAW_DENTIST = value.last_saw_dentist;
					dataSubmission.BUY_SUPPLIES = value.buy_supplies;

					if(value.reason_for_dentist == null && !Array.isArray(value.reason_for_dentist)) {
						dataSubmission.REASON_FOR_DENTIST = null;
					}else{
						dataSubmission.REASON_FOR_DENTIST = dbHss.raw("utl_raw.cast_to_raw(?) ", value.reason_for_dentist);
					}

					if(value.pay_for_visit == null && !Array.isArray(value.pay_for_visit)) {
						dataSubmission.PAY_FOR_VISIT = null;
					}else{
						dataSubmission.PAY_FOR_VISIT = dbHss.raw("utl_raw.cast_to_raw(?) ", value.pay_for_visit);
					}

					if(value.barriers == null && !Array.isArray(value.barriers)) {
						dataSubmission.BARRIERS = null;
					}else{
						dataSubmission.BARRIERS = dbHss.raw("utl_raw.cast_to_raw(?) ", value.barriers);
					}

					if(value.problems == null && !Array.isArray(value.problems)) {
						dataSubmission.PROBLEMS = null;
					}else{
						dataSubmission.PROBLEMS = dbHss.raw("utl_raw.cast_to_raw(?) ", value.problems);
					}

					if(value.services_needed == null && !Array.isArray(value.services_needed)) {
						dataSubmission.SERVICES_NEEDED = null;
					}else{
						dataSubmission.SERVICES_NEEDED = dbHss.raw("utl_raw.cast_to_raw(?) ", value.services_needed);
					}

					let createdDate = new Date(value.created_at);
					value.created_at = createdDate.toISOString();
					dataSubmission.CREATED_AT = dbHss.raw(
						"TO_TIMESTAMP_TZ(?, 'YYYY-MM-DD\"T\"HH24:MI:SS.FF3\"Z\"')",
						value.created_at
					);

					let updatedDate = new Date(value.updated_at);
					value.updated_at = updatedDate.toISOString();
					dataSubmission.UPDATED_AT = dbHss.raw(
						"TO_TIMESTAMP_TZ(?, 'YYYY-MM-DD\"T\"HH24:MI:SS.FF3\"Z\"')",
						value.updated_at
					);

					arraySubmissions.push(dataSubmission);
					arraySubmissionsAux.push(dataSubmissionAux);
				});

				var dentalFiles = await dbEdms(`dental_service_files`).select().whereIn('dental_service_id', idSubmissions);

				var dentalDependents = await dbEdms(`dental_service_dependents`).select().whereIn('dental_service_id', idSubmissions);

				for (const [key, valueSubmission] of arraySubmissions.entries()) {

					dentalServiceSaved = await dbHss(`${SCHEMA_DENTAL}.DENTAL_SERVICE`).insert(valueSubmission).into(`${SCHEMA_DENTAL}.DENTAL_SERVICE`).returning('ID');

					if(dentalServiceSaved){
						dentalId = dentalServiceSaved.find((obj) => {return obj.ID;});

						let logSaved = Object();
						let logFields = {
							ACTION_TYPE: 2,
							TITLE: "Insert submission",
							SCHEMA_NAME: SCHEMA_DENTAL,
							TABLE_NAME: "DENTAL_SERVICE",
							SUBMISSION_ID: dentalId.ID
						};

						logSaved = await dbHss(`${SCHEMA_GENERAL}.ACTION_LOGS`).insert(logFields).into(`${SCHEMA_GENERAL}.ACTION_LOGS`);

						if(!logSaved){
							console.log("Error while inserting Log");
						}

						var dependentsInsert = Array();

						dentalDependents.forEach(function (valueDependent) {
							if (arraySubmissionsAux[key].ID_OLD == valueDependent.dental_service_id) {

								let dataDependent = Object();

								dataDependent.DENTAL_SERVICE_ID = dentalId.ID;
								dataDependent.C_FIRSTNAME = valueDependent.c_firstname;
								dataDependent.C_LASTNAME = valueDependent.c_lastname;




								if(valueDependent.c_dob == null || !valueDependent.c_dob || valueDependent.c_dob == '0000-00-00'){
									dataDependent.C_DOB = null;
								}else if (valueDependent.c_dob instanceof Date){
									valueDependent.c_dob = valueDependent.c_dob.toISOString();
									let result = valueDependent.c_dob.split('T')[0];
									result = result.replace(/\.000Z$/, '');
									dataDependent.C_DOB  = dbHss.raw("TO_DATE( ? ,'YYYY-MM-DD') ", result);
								}else if (typeof valueDependent.c_dob === 'string') {
									const dateParts = valueDependent.c_dob.split('-');
									// Validate that there are three parts in the date (year, month, day)
									if (dateParts.length === 3) {
										const year = parseInt(dateParts[0], 10);
										const month = parseInt(dateParts[1], 10) - 1;  // Subtract 1 because months in JavaScript are 0-indexed
										const day = parseInt(dateParts[2], 10);

										// Create a Date object with the date parts
										const dateObject = new Date(year, month, day);

										// Validate that the date is valid
										if (!isNaN(dateObject.getTime())) {
											// The date is valid, you can use it as needed
											valueDependent.c_dob = dateObject.toISOString();
											let result = valueDependent.c_dob.split('T')[0];
											result = result.replace(/\.000Z$/, '');
											dataDependent.C_DOB  = dbHss.raw("TO_DATE( ? ,'YYYY-MM-DD') ", result);
											
										} else {
											dataDependent.C_DOB = null;
										}
									} else {
										dataDependent.C_DOB = null;
									}
								} 

								dataDependent.C_HEALTHCARE = valueDependent.c_healthcare;

								if(valueDependent.c_apply == 1 || valueDependent.c_apply == '1' ||  valueDependent.c_apply == "Yes"){
									dataDependent.C_APPLY = "Yes";
								}else if(valueDependent.c_apply == 0 || valueDependent.c_apply == '0' ||  valueDependent.c_apply == "No"){
									dataDependent.C_APPLY = "No";
								}else{
									dataDependent.C_APPLY = null;
								}

								dependentsInsert.push(dataDependent);

							}
						});

						if (dependentsInsert.length > 0) {
							for (const fileData of dependentsInsert) {

								let dependentsSaved = await dbHss(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`).insert(fileData).into(`${SCHEMA_DENTAL}.DENTAL_SERVICE_DEPENDENTS`);

								if(!dependentsSaved){
									console.log("Error while inserting Dental Service Dependents");
								}
							}
						}

						if (Object.keys(dentalFiles).length !== 0) {

							const fileDataArray = Array();

							dentalFiles.forEach(async function (valueFile) {
								if (arraySubmissionsAux[key].ID_OLD == valueFile.dental_service_id) {
									var dataFiles = Object();

									const bufferData = Buffer.from(valueFile.file_data, 'binary');
									const dataValue = bufferData.toString('utf8');

									let array_file = dataValue.match(/.{1,4000}/g);
									let query = '';
									if (array_file && array_file.length > 0) {
										array_file.forEach((element) => {
											// Bind each chunk as a parameter instead of concatenating file data into the PL/SQL text (audit CRIT-02).
											query = query + " DBMS_LOB.APPEND(v_long_text, to_blob(utl_raw.cast_to_raw(?))); ";
										});

										dataFiles.DENTAL_SERVICE_ID = dentalId.ID;
										dataFiles.DESCRIPTION = valueFile.description;
										dataFiles.FILE_NAME = valueFile.file_name;
										dataFiles.FILE_TYPE = valueFile.file_type;
										dataFiles.FILE_SIZE = valueFile.file_size;
										dataFiles.query = query;
										dataFiles.chunks = array_file;

										fileDataArray.push(dataFiles);
									}
								}
							});
							if (fileDataArray && fileDataArray.length > 0) {
								for (const fileData of fileDataArray) {
									await dbHss.raw(`
										DECLARE
											v_long_text BLOB;
										BEGIN
											DBMS_LOB.CREATETEMPORARY(v_long_text, true);
											` +
											fileData.query +
											`
											INSERT INTO ${SCHEMA_DENTAL}.DENTAL_SERVICE_FILES (DENTAL_SERVICE_ID, DESCRIPTION, FILE_NAME, FILE_TYPE, FILE_SIZE, FILE_DATA) VALUES (?,?,?,?,?,v_long_text);
										END;
									`, [...fileData.chunks, fileData.DENTAL_SERVICE_ID, fileData.DESCRIPTION, fileData.FILE_NAME, fileData.FILE_TYPE, fileData.FILE_SIZE]);
								}
							}
						}

						console.log('Submission migration successful! ID:'+dentalId.ID);

					}else{
						console.log('Error while inserting Dental Service ID:'+dentalId.ID);
					}

				}

				console.log('Migration process finished');

			}else{
				console.log("There are no ids to migrate");
			}
		}else{
			console.log("There are no ids to migrate");
		}
		process.exit(0);
	} catch (error) {
		console.error('Error:', error);
		console.error('Error:', error);
	}
}

main();
