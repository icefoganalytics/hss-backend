<template>

	<v-expansion-panels
        multiple
		v-model="modelPanel"
    >
        <v-expansion-panel class="mb-6">
			<v-expansion-panel-header>Attachments</v-expansion-panel-header>
			<v-expansion-panel-content>
                <v-simple-table>
                    <template v-slot:default>
						<thead class="table-details-header">
							<tr>
								<th>
									<b>Field</b>
								</th>
								<th>
									<b>Value<span v-if="hipmaDuplicated">&nbsp;(Original Request)</span></b>
								</th>
								<th v-if="hipmaDuplicated">
									<b>Value&nbsp;(Duplicated Request)</b>
								</th>
								<th v-else></th>
							</tr>
                        </thead>
						<tbody v-if="hipmaDuplicated">
							<tr>
								<td>Declaration of Parental or Guardianship Status</td>
								<td class="text-left">
									<span v-if="hipmaFiles._statutory_declaration_of_parental_or_guardianship_status">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._statutory_declaration_of_parental_or_guardianship_status.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn btn-download-duplicate"
										@click="downloadFile(hipmaFiles._statutory_declaration_of_parental_or_guardianship_status.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
								<td class="text-left">
									<span v-if="hipmaFilesDuplicated._statutory_declaration_of_parental_or_guardianship_status">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFilesDuplicated._statutory_declaration_of_parental_or_guardianship_status.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn btn-download-duplicate"
										@click="downloadFile(hipmaFilesDuplicated._statutory_declaration_of_parental_or_guardianship_status.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
							</tr>

							<tr>
								<td>Minor's Consent to Release of Information</td>
								<td class="text-left">
									<span v-if="hipmaFiles._minor_s_consent_to_release_of_information_if_applicable_">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._minor_s_consent_to_release_of_information_if_applicable_.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn btn-download-duplicate"
										@click="downloadFile(hipmaFiles._minor_s_consent_to_release_of_information_if_applicable_.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
								<td class="text-left">
									<span v-if="hipmaFilesDuplicated._minor_s_consent_to_release_of_information_if_applicable_">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFilesDuplicated._minor_s_consent_to_release_of_information_if_applicable_.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn btn-download-duplicate"
										@click="downloadFile(hipmaFilesDuplicated._minor_s_consent_to_release_of_information_if_applicable_.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
							</tr>

							<tr>
								<td>Court order identifying custody of the Minor</td>
								<td class="text-left">
									<span v-if="hipmaFiles._court_order_identifying_custody_of_the_minor">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._court_order_identifying_custody_of_the_minor.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn btn-download-duplicate"
										@click="downloadFile(hipmaFiles._court_order_identifying_custody_of_the_minor.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
								<td class="text-left">
									<span v-if="hipmaFilesDuplicated._court_order_identifying_custody_of_the_minor">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFilesDuplicated._court_order_identifying_custody_of_the_minor.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn btn-download-duplicate"
										@click="downloadFile(hipmaFilesDuplicated._court_order_identifying_custody_of_the_minor.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
							</tr>

							<tr>
								<td>Declaration of Substitute Decision Maker Status</td>
								<td class="text-left">
									<span v-if="hipmaFiles._statutory_declaration_of_substitute_decision_maker_status">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._statutory_declaration_of_substitute_decision_maker_status.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn btn-download-duplicate"
										@click="downloadFile(hipmaFiles._statutory_declaration_of_substitute_decision_maker_status.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
								<td class="text-left">
									<span v-if="hipmaFilesDuplicated._statutory_declaration_of_substitute_decision_maker_status">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFilesDuplicated._statutory_declaration_of_substitute_decision_maker_status.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn btn-download-duplicate"
										@click="downloadFile(hipmaFilesDuplicated._statutory_declaration_of_substitute_decision_maker_status.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
							</tr>

							<tr>
								<td>
									Physician Affirmation of Capacity under HIPMA or Confirmation of authority
									to act as Substitute Decision Maker
								</td>
								<td class="text-left">
									<span v-if="hipmaFiles._physician_affirmation_confirm_auth">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._physician_affirmation_confirm_auth.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn btn-download-duplicate"
										@click="downloadFile(hipmaFiles._physician_affirmation_confirm_auth.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
								<td class="text-left">
									<span v-if="hipmaFilesDuplicated._physician_affirmation_confirm_auth">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFilesDuplicated._physician_affirmation_confirm_auth.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn btn-download-duplicate"
										@click="downloadFile(hipmaFilesDuplicated._physician_affirmation_confirm_auth.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
							</tr>

							<tr>
								<td>
									Confirmation of Authority to Exercise Rights or Powers of a Deceased Person
								</td>
								<td class="text-left">
									<span v-if="hipmaFiles._confirmation_of_authority_to_exercise_rights_or_powers_of_a_dece">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._confirmation_of_authority_to_exercise_rights_or_powers_of_a_dece.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn btn-download-duplicate"
										@click=
										"downloadFile(hipmaFiles._confirmation_of_authority_to_exercise_rights_or_powers_of_a_dece.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
								<td class="text-left">
									<span v-if="hipmaFilesDuplicated._confirmation_of_authority_to_exercise_rights_or_powers_of_a_dece">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFilesDuplicated._confirmation_of_authority_to_exercise_rights_or_powers_of_a_dece.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn btn-download-duplicate"
										@click=
										"downloadFile(hipmaFilesDuplicated._confirmation_of_authority_to_exercise_rights_or_powers_of_a_dece.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
							</tr>

							<tr>
								<td>
									Letters of Administration or Grant of Probate
								</td>
								<td class="text-left">
									<span v-if="hipmaFiles._letters_of_administration_or_grant_of_probate">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._letters_of_administration_or_grant_of_probate.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn btn-download-duplicate"
										@click="downloadFile(hipmaFiles._letters_of_administration_or_grant_of_probate.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
								<td class="text-left">
									<span v-if="hipmaFilesDuplicated._letters_of_administration_or_grant_of_probate">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFilesDuplicated._letters_of_administration_or_grant_of_probate.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn btn-download-duplicate"
										@click="downloadFile(hipmaFilesDuplicated._letters_of_administration_or_grant_of_probate.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
							</tr>

							<tr>
								<td>
									Consent to Release Information
								</td>
								<td class="text-left">
									<span v-if="hipmaFiles._consent_to_release_of_information">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._consent_to_release_of_information.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="ma-2 white--text apply-btn btn-download-duplicate"
										@click="downloadFile(hipmaFiles._consent_to_release_of_information.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
								<td class="text-left">
									<span v-if="hipmaFilesDuplicated._consent_to_release_of_information">
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFilesDuplicated._consent_to_release_of_information.file_fullName}}
									<br>
									<v-btn
										color="#F3A901"
										class="ma-2 white--text apply-btn btn-download-duplicate"
										@click="downloadFile(hipmaFilesDuplicated._consent_to_release_of_information.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
									</span>
								</td>
							</tr>
                        </tbody>

                        <tbody v-else >
							<tr v-if="hipmaFiles._statutory_declaration_of_parental_or_guardianship_status">
								<td>Declaration of Parental or Guardianship Status</td>
								<td>
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._statutory_declaration_of_parental_or_guardianship_status.file_fullName}}
								</td>
								<td>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn"
										@click="downloadFile(hipmaFiles._statutory_declaration_of_parental_or_guardianship_status.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
								</td>
							</tr>

							<tr v-if="hipmaFiles._minor_s_consent_to_release_of_information_if_applicable_">
								<td>Minor's Consent to Release of Information</td>
								<td>
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._minor_s_consent_to_release_of_information_if_applicable_.file_fullName}}
								</td>
								<td>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn"
										@click="downloadFile(hipmaFiles._minor_s_consent_to_release_of_information_if_applicable_.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
								</td>
							</tr>

							<tr v-if="hipmaFiles._court_order_identifying_custody_of_the_minor">
								<td>Court order identifying custody of the Minor</td>
								<td>
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._court_order_identifying_custody_of_the_minor.file_fullName}}
								</td>
								<td>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn"
										@click="downloadFile(hipmaFiles._court_order_identifying_custody_of_the_minor.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
								</td>
							</tr>

							<tr v-if="hipmaFiles._statutory_declaration_of_substitute_decision_maker_status">
								<td>Declaration of Substitute Decision Maker Status</td>
								<td>
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._statutory_declaration_of_substitute_decision_maker_status.file_fullName}}
								</td>
								<td>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn"
										@click="downloadFile(hipmaFiles._statutory_declaration_of_substitute_decision_maker_status.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
								</td>
							</tr>

							<tr v-if="hipmaFiles._physician_affirmation_confirm_auth">
								<td>
									Physician Affirmation of Capacity under HIPMA or Confirmation of authority
									to act as Substitute Decision Maker
								</td>
								<td>
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._physician_affirmation_confirm_auth.file_fullName}}
								</td>

								<td>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn"
										@click="downloadFile(hipmaFiles._physician_affirmation_confirm_auth.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
								</td>
							</tr>

							<tr v-if="hipmaFiles._confirmation_of_authority_to_exercise_rights_or_powers_of_a_dece">
								<td>
									Confirmation of Authority to Exercise Rights or Powers of a Deceased Person
								</td>
								<td>
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._confirmation_of_authority_to_exercise_rights_or_powers_of_a_dece.file_fullName}}
								</td>
								<td>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn"
										@click=
										"downloadFile(hipmaFiles._confirmation_of_authority_to_exercise_rights_or_powers_of_a_dece.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
								</td>
							</tr>

							<tr v-if="hipmaFiles._letters_of_administration_or_grant_of_probate">
								<td>
									Letters of Administration or Grant of Probate
								</td>
								<td>
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._letters_of_administration_or_grant_of_probate.file_fullName}}
								</td>

								<td>
									<v-btn
										color="#F3A901"
										class="pull-right ma-2 white--text apply-btn"
										@click="downloadFile(hipmaFiles._letters_of_administration_or_grant_of_probate.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
								</td>
							</tr>

							<tr v-if="hipmaFiles._consent_to_release_of_information">
								<td>
									Consent to Release Information
								</td>
								<td>
									<v-icon
										right
										light
										color="black"
									>
									mdi-file
									</v-icon>
									{{hipmaFiles._consent_to_release_of_information.file_fullName}}
								</td>

								<td>
									<v-btn
										color="#F3A901"
										class="ma-2 white--text apply-btn"
										@click="downloadFile(hipmaFiles._consent_to_release_of_information.id)"
									>
										Download &nbsp;
										<v-icon
											right
											dark
										>
										mdi-cloud-download
										</v-icon>
									</v-btn>
								</td>
							</tr>
                        </tbody>
                    </template>
				</v-simple-table>
			</v-expansion-panel-content>
        </v-expansion-panel>

	</v-expansion-panels>

</template>
<script>
const axios = require("axios");
import { HIPMA_DOWNLOAD_FILE_URL } from "../../urls.js";

export default {
    name: 'HipmaAttachments',
    props: ['hipma', 'hipmaDuplicated', 'hipmaFiles', 'hipmaFilesDuplicated', 'panelModel'],
	data () {
		return {
			modelPanel: this.panelModel
		}
	},
	methods: {
		saveBlob(resp){
			// The API streams the file directly, so derive the filename from the
			// Content-Disposition header and save the blob — nothing to clean up.
			let fileName = 'download';
			const disposition = resp.headers['content-disposition'];
			if (disposition) {
				const match = /filename="?([^"]+)"?/.exec(disposition);
				if (match && match[1]) {
					fileName = match[1];
				}
			}
			const href = URL.createObjectURL(resp.data);
			const link = document.createElement('a');
			link.href = href;
			link.setAttribute('download', fileName);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(href);
		},
		downloadFile (idDownload) {
			axios
			.get(HIPMA_DOWNLOAD_FILE_URL+idDownload, { responseType: 'blob' })
			.then((resp) => {
				this.saveBlob(resp);
			})
			.catch((err) => console.error(err))
			.finally(() => {
				this.loading = false;
			});

		}
	},

}
</script>