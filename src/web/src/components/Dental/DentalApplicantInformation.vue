<template>

	<v-expansion-panels
        multiple
		v-model="modelPanel"
    >
        <v-expansion-panel class="mb-6">
			<v-expansion-panel-header>Applicant Information</v-expansion-panel-header>
			<v-expansion-panel-content>
                <v-simple-table>
                    <template v-slot:default>
                        <thead class="table-details-header">
							<tr>
								<th>
									<b>Field</b>
								</th>
								<th>
									<b>Value<span v-if="dentalServiceDuplicated">&nbsp;(Original Request)</span></b>
								</th>
								<th v-if="dentalServiceDuplicated">
									<b>Value&nbsp;(Duplicated Request)</b>
								</th>
							</tr>
                        </thead>
						<tbody v-if="dentalServiceDuplicated" >
							<tr>
								<td>First name</td>
								<td>{{ dentalService.first_name }}</td>
								<td>{{ dentalServiceDuplicated.first_name }}</td>
							</tr>

							<tr>
								<td>Middle name</td>
								<td>{{ dentalService.middle_name }}</td>
								<td>{{ dentalServiceDuplicated.middle_name }}</td>
							</tr>

							<tr>
								<td>Last name</td>
								<td>{{ dentalService.last_name }}</td>
								<td>{{ dentalServiceDuplicated.last_name }}</td>
							</tr>

							<tr>
								<td>Date of birth</td>
								<td>{{ dentalService.date_of_birth }}</td>
								<td>{{ (dentalServiceDuplicated.date_of_birth) }}</td>
							</tr>

							<tr>
								<td>Yukon health care card number</td>
								<td>{{ dentalService.health_card_number }}</td>
								<td>{{ dentalServiceDuplicated.health_card_number }}</td>
							</tr>

							<tr>
								<td>Mailing address</td>
								<td>{{ dentalService.mailing_address }}</td>
								<td>{{ dentalServiceDuplicated.mailing_address }}</td>
							</tr>

							<tr>
								<td>City or town</td>
								<td>{{ dentalService.city_or_town }}</td>
								<td>{{ dentalServiceDuplicated.city_or_town }}</td>
							</tr>

							<tr>
								<td>Postal code</td>
								<td>{{ dentalService.postal_code }}</td>
								<td>{{ dentalServiceDuplicated.postal_code }}</td>
							</tr>

							<tr>
								<td>Phone number</td>
								<td>{{ dentalService.phone }}</td>
								<td>{{ (dentalServiceDuplicated.phone) }}</td>
							</tr>

							<tr>
								<td>Email address</td>
								<td>{{ dentalService.email }}</td>
								<td>{{ (dentalServiceDuplicated.email) }}</td>
							</tr>
							<tr  v-if="dentalService.check_all_coverage || dentalServiceDuplicated.check_all_coverage">
								<td>Do you have coverage for dental services under any other program, plan or insurance group?? Check all that apply.</td>
								<td>{{ dentalService.check_all_coverage }}</td>
								<td>{{ (dentalServiceDuplicated.check_all_coverage) }}</td>
							</tr>

							<tr v-if="dentalService.other_coverage || dentalServiceDuplicated.other_coverage">
								<td>Do you have coverage for dental services under any other program, plan or insurance group?</td>
								<td>{{ dentalService.other_coverage }}</td>
								<td>{{ (dentalServiceDuplicated.other_coverage) }}</td>
							</tr>
							
							<tr v-if="dentalService.other_coverage || dentalServiceDuplicated.other_coverage">
								<td>Are you eligible for the Pharmacare and Extended Health Care Benefits program?</td>
								<td>{{ dentalService.are_you_eligible_for_the_pharmacare_and_extended_health_care_ben }}</td>
								<td>{{ dentalServiceDuplicated.are_you_eligible_for_the_pharmacare_and_extended_health_care_ben }}</td>
							</tr>

							<tr>
								<td>I will submit my proof of income separately</td>
								<td>{{ dentalService.email_instead }}</td>
								<td>{{ dentalServiceDuplicated.email_instead }}</td>
							</tr>

							<tr>
								<td>Do you have children who are under 19 years of age AND listed on your Yukon Health Care Insurance Plan (YHCIP)?</td>
								<td>{{ dentalService.have_children }}</td>
								<td>{{ dentalServiceDuplicated.have_children }}</td>
							</tr>
                        </tbody>
                        <tbody v-else >
							<tr>
								<td>First name</td>
								<td>{{ dentalService.first_name }}</td>
							</tr>

							<tr v-if="dentalService.middle_name">
								<td>Middle name</td>
								<td>{{ dentalService.middle_name }}</td>
							</tr>

							<tr>
								<td>Last name</td>
								<td>{{ dentalService.last_name }}</td>
							</tr>

							<tr v-if="dentalService.date_of_birth">
								<td>Date of birth</td>
								<td>{{ (dentalService.date_of_birth) }}</td>
							</tr>

							<tr v-if="dentalService.health_card_number">
								<td>Yukon health care card number</td>
								<td>{{ dentalService.health_card_number }}</td>
							</tr>

							<tr v-if="dentalService.mailing_address">
								<td>Mailing address</td>
								<td>{{ dentalService.mailing_address }}</td>
							</tr>

							<tr v-if="dentalService.city_or_town">
								<td>City or town</td>
								<td>{{ dentalService.city_or_town }}</td>
							</tr>

							<tr v-if="dentalService.postal_code">
								<td>Postal code</td>
								<td>{{ dentalService.postal_code }}</td>
							</tr>

							<tr v-if="dentalService.phone">
								<td>Phone number</td>
								<td>{{ (dentalService.phone) }}</td>
							</tr>

							<tr v-if="dentalService.email">
								<td>Email address</td>
								<td>{{ (dentalService.email) }}</td>
							</tr>

							<tr v-if="dentalService.check_all_coverage">
								<td>Do you have coverage for dental services under any other program, plan or insurance group? Check all that apply. </td>
								<td>{{ (dentalService.check_all_coverage) }}</td>
							</tr>

							
							<tr v-if="dentalService.other_coverage">
								<td>Do you have coverage for dental services under any other program, plan or insurance group?</td>
								<td>{{ (dentalService.other_coverage) }}</td>
							</tr>

							<tr v-if="dentalService.eligible_pharmacare && dentalService.other_coverage !== null">
								<td>Are you eligible for the Pharmacare and Extended Health Care Benefits program?</td>
								<td>{{ dentalService.eligible_pharmacare }}</td>
							</tr>

							<tr v-if="dentalService.email_instead">
								<td>I will submit my proof of income separately</td>
								<td>{{ dentalService.email_instead }}</td>
							</tr>

							<tr v-if="dentalService.have_children">
								<td>Do you have children who are under 19 years of age AND listed on your Yukon Health Care Insurance Plan (YHCIP)?</td>
								<td>{{ dentalService.have_children }}</td>
							</tr>

                        </tbody>
                    </template>
				</v-simple-table>
			</v-expansion-panel-content>
        </v-expansion-panel>

	</v-expansion-panels>

</template>
<script>
export default {
    name: 'DentalApplicantInformation',
    props: ["dentalService", "dentalServiceDuplicated", "panelModel"],
	data() {
		return {
			modelPanel: this.panelModel,
		};
	},
	watch: {
		panelModel(newValue) {
			this.modelPanel = newValue;
		},
	},
}
</script>
