import { ItemView, WorkspaceLeaf } from "obsidian";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import PublisherPlugin from "../main";
import { PublisherApp } from "./PublisherApp";

export const VIEW_TYPE_PUBLISHER = "publisher-view";

export class PublisherView extends ItemView {
	private root: Root | null = null;
	private plugin: PublisherPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: PublisherPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_PUBLISHER;
	}

	getDisplayText(): string {
		return "Publisher";
	}

	getIcon(): string {
		return "paper-plane";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass("publisher-container");

		this.root = createRoot(container);
		this.root.render(
			<React.StrictMode>
				<PublisherApp plugin={this.plugin} />
			</React.StrictMode>
		);
	}

	async onClose(): Promise<void> {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
	}
}
