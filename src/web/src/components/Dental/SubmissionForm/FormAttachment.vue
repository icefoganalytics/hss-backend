<template>
	<v-expansion-panels multiple v-model="modelPanel">
		<v-expansion-panel class="mb-6">
			<v-expansion-panel-header>Proof of income</v-expansion-panel-header>
			<v-expansion-panel-content>
				<v-row no-gutters v-if="showFileRow" class="ma-5">
					<v-col
						cols="12"
						class="mb-5"
						v-if="existingFiles.length"
					>
						<div
							v-for="(file, index) in existingFiles"
							:key="file.fileId"
							class="d-flex align-center justify-space-between ma-2"
						>
							<div>
								<v-icon right light color="black">mdi-file</v-icon>
								{{ file.fileFullName }}
							</div>
							<div>
								<v-btn
									color="#F3A901"
									class="white--text ma-2"
									@click="downloadExistingFile(file)"
								>
									Download&nbsp;
									<v-icon right dark>mdi-cloud-download</v-icon>
								</v-btn>

								<v-btn
									color="red"
									class="white--text ma-2"
									@click="deleteExistingFile(file, index)"
								>
									Delete&nbsp;
									<v-icon right dark>mdi-delete</v-icon>
								</v-btn>
							</div>
						</div>
					</v-col>

					<v-col
						cols="12"
						class="mb-5"
						v-if="filesProofIncome.length"
					>
						<div
							v-for="(fileObj, i) in filesProofIncome"
							:key="i"
							class="d-flex align-center justify-space-between ma-2"
						>
							<div>
								<v-icon right light color="black">mdi-file</v-icon>
								{{ fileObj.file.name }}
							</div>

							<v-btn
								color="red"
								class="white--text ma-2"
								@click="deleteNewFile(i)"
							>
								Delete&nbsp;
								<v-icon right dark>mdi-delete</v-icon>
							</v-btn>
						</div>
					</v-col>

					<v-col cols="12" sm="6" md="6" lg="6">
						<v-file-input
							v-model="tempFilesProofIncome"
							ref="fileInput"
							label="Attach your proof of income"
							outlined
							show-size
							accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
							multiple
							clearable
							@change="handleFiles"
						>
						</v-file-input>

						<v-row class="red--text ma-3" v-if="showAttachmentSize">
							<v-icon right light color="red">mdi-alert</v-icon>
							&nbsp;The attachment must not be larger than 10MB
						</v-row>
						<v-row class="red--text ma-3" v-if="showAttachmentType">
							<v-icon right light color="red">mdi-alert</v-icon>
							&nbsp;Allowed attachment types: PDF, DOC, DOCX, JPG, JPEG, PNG
						</v-row>
					</v-col>
				</v-row>

				<v-row no-gutters class="ma-5">
					<v-checkbox
						v-model="checkProofIncome"
						label="I will submit my proof of income separately."
						@change="submitSeparately"
					/>
				</v-row>

			</v-expansion-panel-content>
		</v-expansion-panel>
	</v-expansion-panels>
</template>
<script>
const axios = require("axios");
import { DENTAL_DOWNLOAD_FILE_URL } from "../../../urls.js";

export default {
	name: "FormAttachment",
	props: ["dentalService", "panelModel", "cityTown", "dentalFiles"],
	data() {
		return {
			modelPanel: this.panelModel,
			menu: false,
			checkProofIncome: false,
			showFileRow: true,
			existingFiles: [],
			filesProofIncome: [],
			tempFilesProofIncome: [],
			deletedFiles: [],
			showAttachmentType: false,
			showAttachmentSize: false,
			maxFileSize: 10 * 1024 * 1024,
			allowedExtensions: ["pdf", "doc", "docx", "jpg", "jpeg", "png"],
			updatedFields: [],
		};
	},
	watch: {
		panelModel(newValue) {
			this.modelPanel = newValue;
		},
		dentalFiles(newValue) {
			this.cleanAttachment();

			if (Array.isArray(newValue) && newValue.length) {
				this.existingFiles = newValue.map(dbFile => ({
					fileId: dbFile.id,
					fileFullName: dbFile.file_fullName
				}));
			} else if (newValue.file_name) {
				this.existingFiles.push({
					fileId: newValue.file_id,
					fileFullName: newValue.file_name + '.' + newValue.file_type
				});
			}
		},
		checkProofIncome() {
			this.submitSeparately();
		}
	},
	methods: {
		async handleFiles() {
			if (!this.tempFilesProofIncome.length) return;

			let validFiles = [];

			for (const file of this.tempFilesProofIncome) {
				if (file.size > this.maxFileSize) {
					this.showAttachmentSize = true;
					continue;
				} else {
					this.showAttachmentSize = false;
				}

				const ext = file.name.split(".").pop().toLowerCase();

				if (!this.allowedExtensions.includes(ext)) {
					this.showAttachmentType = true;
					continue;
				} else {
					this.showAttachmentType = false;
				}

				const base64Data = await this.convertToBase64(file);

				validFiles.push({
					file,
					base64: base64Data
				});
			}

			if (validFiles.length) {
				this.filesProofIncome.push(...validFiles);

				if (!this.updatedFields.includes("PROOF_INCOME")) {
					this.updatedFields.push("PROOF_INCOME");
					this.$emit("addField", "PROOF_INCOME");
				}
			}

			this.$refs.fileInput.reset();
			this.tempFilesProofIncome = [];
		},
		convertToBase64(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = (e) => {
					resolve(e.target.result);
				};
				reader.onerror = (err) => reject(err);
				reader.readAsDataURL(file);
			});
		},
		submitSeparately() {
			this.showFileRow = !this.checkProofIncome;

			if (!this.updatedFields.includes("PROOF_INCOME")) {
				this.updatedFields.push("PROOF_INCOME");
				this.$emit("addField", "PROOF_INCOME");
			}

			if (this.checkProofIncome) {
				this.deletedFiles = [];
				this.deletedFiles = this.dentalFiles.map(file => file.id);
			} else {
				this.deletedFiles = [];

				this.restoreExistingFiles();
			}
		},
		downloadExistingFile(fileObj) {
			axios
			.get(DENTAL_DOWNLOAD_FILE_URL + fileObj.fileId, { responseType: "blob" })
			.then((resp) => {
				this.saveBlob(resp);
			})
			.catch((err) => console.error(err));
		},
		saveBlob(resp) {
			// The API streams the file directly; derive the filename from the
			// Content-Disposition header and save it — nothing to clean up.
			let fileName = "download";
			const disposition = resp.headers["content-disposition"];
			if (disposition) {
				const match = /filename="?([^"]+)"?/.exec(disposition);
				if (match && match[1]) {
					fileName = match[1];
				}
			}
			const href = URL.createObjectURL(resp.data);
			const link = document.createElement("a");
			link.href = href;
			link.setAttribute("download", fileName);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(href);
		},
		deleteExistingFile(fileObj, index) {
			if (!this.updatedFields.includes("PROOF_INCOME")) {
				this.updatedFields.push("PROOF_INCOME");
				this.$emit("addField", "PROOF_INCOME");
			}

			this.deletedFiles.push(fileObj.fileId);
			this.existingFiles.splice(index, 1);
		},
		deleteNewFile(index) {
			this.filesProofIncome.splice(index, 1);

			if (!this.updatedFields.includes("PROOF_INCOME")) {
				this.updatedFields.push("PROOF_INCOME");
				this.$emit("addField", "PROOF_INCOME");
			}
		},
		cleanAttachment() {
			this.checkProofIncome = false;
			this.showFileRow = true;
			this.existingFiles = [];
			this.filesProofIncome = [];
			this.tempFilesProofIncome = [];
			this.deletedFiles = [];
			this.showAttachmentSize = false;
			this.showAttachmentType = false;

			if (this.$refs.fileInput) {
				this.$refs.fileInput.reset();
			}
		},
		getAttachment() {

			const existing = this.existingFiles.map((fileObj) => ({
				FILE_ID: fileObj.fileId,
				FILE_FULL_NAME: fileObj.fileFullName,
				PROOF_INCOME: this.checkProofIncome,
			}));

			const newlyAdded = this.filesProofIncome.map((fileObj) => {

				const fileName = fileObj.file.name.split(".")[0];
				const fileType = fileObj.file.name.split(".").pop().toLowerCase();

				return {
					FILE_ID: null,
					DESCRIPTION: "_attach_proof",
					FILE_NAME: fileName,
					FILE_TYPE: fileType,
					FILE_SIZE: fileObj.file.size,
					FILE_DATA: fileObj.base64 ? fileObj.base64.split(",")[1] : null,
					PROOF_INCOME: this.checkProofIncome,
				};
			});

			return {
				attachmentFiles: [...existing, ...newlyAdded],
				deletedFiles: this.deletedFiles
			};
		},
		restoreExistingFiles() {
			if (Array.isArray(this.dentalFiles) && this.dentalFiles.length) {
				this.existingFiles = this.dentalFiles.map(dbFile => ({
					fileId: dbFile.id,
					fileFullName: dbFile.file_fullName
				}));
			} else if (this.dentalFiles.file_name) {
				this.existingFiles.push({
					fileId: this.dentalFiles.file_id,
					fileFullName: this.dentalFiles.file_name + '.' + this.dentalFiles.file_type
				});
			}
		},
	},
};
</script>