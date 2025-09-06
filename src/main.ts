import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	Menu,
	Notice,
	Editor,
	MarkdownView,
} from "obsidian";
import { PublishModal } from "./ui/PublishModal";
import { createRoot } from "react-dom/client";
import { PublisherView, VIEW_TYPE_PUBLISHER } from "./ui/PublisherView";
import { PublisherApiService } from "./services/PublisherApiService";
import { Note } from "./types";

interface PublisherPluginSettings {
	apiUrl: string;
	apiKey: string;
	author: string;
	publishedUrlBase: string;
}

const DEFAULT_SETTINGS: PublisherPluginSettings = {
	apiUrl: "http://localhost:8080",
	apiKey: "",
	author: "",
	publishedUrlBase: "",
};

export default class PublisherPlugin extends Plugin {
	settings: PublisherPluginSettings;
	apiService: PublisherApiService;

	async onload() {
		await this.loadSettings();

		this.apiService = new PublisherApiService(
			this.settings.apiUrl,
			this.settings.apiKey
		);

		this.registerView(
			VIEW_TYPE_PUBLISHER,
			(leaf) => new PublisherView(leaf, this)
		);

		this.addRibbonIcon("paper-plane", "Publisher", () => {
			this.activateView();
		});

		this.addCommand({
			id: "open-publisher",
			name: "Open Publisher",
			callback: () => {
				this.activateView();
			},
		});

		this.addCommand({
			id: "publish-current-note",
			name: "Publish Current Note",
			editorCallback: (editor, view) => {
				const content = editor.getValue();
				const file = view.file;

				if (file) {
					this.openPublishModal(file, content);
				}
			},
		});

		const statusBarItem = this.addStatusBarItem();
		statusBarItem.addClass("publisher-status-item");
		const publishButton = statusBarItem.createEl("span", {
			text: "Publish",
			cls: "publisher-status-button",
		});
		publishButton.insertAdjacentHTML(
			"afterbegin",
			'<span class="publisher-icon">📤</span> '
		);
		publishButton.addEventListener("click", () => {
			this.publishActiveNote();
		});

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFile && file.extension === "md") {
					menu.addItem((item) => {
						item
							.setTitle("Publish to API")
							.setIcon("paper-plane")
							.onClick(() => this.publishFileFromExplorer(file));
					});
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				if (view instanceof MarkdownView) {
					menu.addItem((item) => {
						item
							.setTitle("Publish to API")
							.setIcon("paper-plane")
							.onClick(() => {
								const mdView = view as MarkdownView;
								const file = mdView.file;
								if (file) {
									this.openPublishModal(file, editor.getValue());
								}
							});
					});
				}
			})
		);

		this.addSettingTab(new PublisherSettingTab(this.app, this));
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(VIEW_TYPE_PUBLISHER)[0];

		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				await leaf.setViewState({ type: VIEW_TYPE_PUBLISHER });
			} else {
				leaf = workspace.getLeaf("split", "vertical");
				await leaf.setViewState({ type: VIEW_TYPE_PUBLISHER });
			}
		}

		workspace.revealLeaf(leaf);
	}

	async publishFileFromExplorer(file: TFile) {
		try {
			const content = await this.app.vault.read(file);
			this.openPublishModal(file, content);
		} catch (error) {
			console.error(`Error publishing file ${file.path}:`, error);
			new Notice(`Failed to publish note: ${error.message}`);
		}
	}

	async publishActiveNote() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

		if (!activeView) {
			new Notice("No active markdown note to publish");
			return;
		}

		const file = activeView.file;
		const content = activeView.editor.getValue();

		if (file) {
			this.openPublishModal(file, content);
		}
	}

	openPublishModal(file: TFile, content: string) {
		const modal = new PublishModal(this.app, this, file, content);
		modal.open();
	}

	extractDescription(content: string): string {
		let contentWithoutFrontmatter = content;
		const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);
		if (frontmatterMatch) {
			contentWithoutFrontmatter = content.substring(frontmatterMatch[0].length);
		}

		const paragraphMatch = contentWithoutFrontmatter.match(
			/^(?:#{1,6}\s+.+\n+)?((?:[^\n]+\n?){1,2})/m
		);

		if (paragraphMatch && paragraphMatch[1]) {
			let description = paragraphMatch[1].replace(/\n/g, " ").trim();
			if (description.length > 180) {
				description = description.substring(0, 177) + "...";
			}
			return description;
		}
		return "";
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);

		if (this.apiService) {
			this.apiService.updateApiSettings(
				this.settings.apiUrl,
				this.settings.apiKey
			);
		}
	}
}

class PublisherSettingTab extends PluginSettingTab {
	plugin: PublisherPlugin;

	constructor(app: App, plugin: PublisherPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Publisher Plugin Settings" });

		new Setting(containerEl)
			.setName("API URL")
			.setDesc("Enter the base URL for the Markdown Publisher API")
			.addText((text) =>
				text
					.setPlaceholder("http://localhost:8080")
					.setValue(this.plugin.settings.apiUrl)
					.onChange(async (value) => {
						this.plugin.settings.apiUrl = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("API Key")
			.setDesc("Enter your API key for authentication")
			.addText((text) =>
				text
					.setPlaceholder("Enter your API key")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Author Name")
			.setDesc("Enter your name as the author of published notes")
			.addText((text) =>
				text
					.setPlaceholder("Enter your name")
					.setValue(this.plugin.settings.author)
					.onChange(async (value) => {
						this.plugin.settings.author = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Published URL Base")
			.setDesc(
				"Enter the base URL where notes are published (e.g., https://myblog.com/notes/)"
			)
			.addText((text) =>
				text
					.setPlaceholder("https://example.com/notes/")
					.setValue(this.plugin.settings.publishedUrlBase)
					.onChange(async (value) => {
						this.plugin.settings.publishedUrlBase = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
