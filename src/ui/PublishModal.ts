import {
	App,
	Modal,
	Setting,
	TextComponent,
	ButtonComponent,
	TFile,
	Notice,
	Events,
} from "obsidian";
import PublisherPlugin from "../main";
import { Note } from "../types";

export interface PublishOptions {
	title: string;
	description: string;
}

export class PublishModal extends Modal {
	static events = new Events();
	private plugin: PublisherPlugin;
	private file: TFile;
	private content: string;
	private titleComponent: TextComponent;
	private descriptionComponent: TextComponent;
	private options: PublishOptions;

	constructor(app: App, plugin: PublisherPlugin, file: TFile, content: string) {
		super(app);
		this.plugin = plugin;
		this.file = file;
		this.content = content;

		this.options = {
			title: file.basename,
			description: this.plugin.extractDescription(content),
		};
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: "Publish Note" });

		new Setting(contentEl)
			.setName("Title")
			.setDesc("Enter a title for your published note")
			.addText((text) => {
				this.titleComponent = text;
				text.setValue(this.options.title).onChange((value) => {
					this.options.title = value;
				});
			});

		new Setting(contentEl)
			.setName("Description")
			.setDesc("Enter a brief description of your note")
			.addTextArea((text) => {
				text
					.setValue(this.options.description)
					.setPlaceholder("Brief description of your note")
					.onChange((value) => {
						this.options.description = value;
					});

				text.inputEl.rows = 4;
				text.inputEl.cols = 40;
			});

		const buttonContainer = contentEl.createDiv("publish-modal-buttons");

		new ButtonComponent(buttonContainer).setButtonText("Cancel").onClick(() => {
			this.close();
		});

		new ButtonComponent(buttonContainer)
			.setButtonText("Publish")
			.setCta()
			.onClick(() => {
				this.publish();
			});

		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.marginTop = "1rem";
		buttonContainer.style.gap = "0.5rem";
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	async publish() {
		try {
			const tagRegex = /#([\w-]+)/g;
			const tags: string[] = [];
			let match;
			while ((match = tagRegex.exec(this.content)) !== null) {
				tags.push(match[1]);
			}

			const note: Note = {
				id: this.options.title || this.file.basename,
				content: this.content,
				metadata: {
					title: this.options.title || this.file.basename,
					description: this.options.description,
					updated: new Date().toISOString(),
					tags: tags.length > 0 ? tags : undefined,
				},
			};

			this.close();

			const notice = new Notice("Publishing note...", 0);

			await this.plugin.apiService.publishNote(note);

			notice.hide();

			new Notice(
				`Note "${note.metadata?.title || note.id}" published successfully!`
			);

			PublishModal.events.trigger("note-published");
		} catch (error) {
			console.error("Error publishing note:", error);
			new Notice(`Failed to publish note: ${error.message}`, 5000);
		}
	}
}
