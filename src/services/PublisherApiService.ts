import { Note } from "../types";
import { requestUrl, RequestUrlResponse } from "obsidian";

export class PublisherApiService {
	private apiUrl: string;
	private apiKey: string;

	constructor(apiUrl: string, apiKey: string) {
		this.apiUrl = apiUrl;
		this.apiKey = apiKey;
	}

	async fetchNotes(): Promise<Note[]> {
		try {
			const response = await requestUrl({
				url: `${this.apiUrl}/notes`,
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (response.status !== 200) {
				throw new Error(`Failed to fetch notes: ${response.status}`);
			}

			return response.json;
		} catch (error) {
			console.error("Error fetching notes:", error);
			throw error;
		}
	}

	async fetchNote(noteId: string): Promise<Note> {
		try {
			const response = await requestUrl({
				url: `${this.apiUrl}/note/${noteId}`,
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (response.status !== 200) {
				throw new Error(`Failed to fetch note: ${response.status}`);
			}

			return response.json;
		} catch (error) {
			console.error(`Error fetching note ${noteId}:`, error);
			throw error;
		}
	}

	async publishNote(note: Note): Promise<any> {
		try {
			const response = await requestUrl({
				url: `${this.apiUrl}/publish`,
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-API-Key": this.apiKey,
				},
				body: JSON.stringify(note),
			});

			if (response.status !== 200) {
				throw new Error(`Failed to publish note: ${response.status}`);
			}

			return response.json;
		} catch (error) {
			console.error("Error publishing note:", error);
			throw error;
		}
	}

	async deleteNote(noteId: string): Promise<any> {
		try {
			const response = await requestUrl({
				url: `${this.apiUrl}/note/${noteId}`,
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					"X-API-Key": this.apiKey,
				},
			});

			if (response.status !== 200) {
				throw new Error(`Failed to delete note: ${response.status}`);
			}

			return response.json;
		} catch (error) {
			console.error(`Error deleting note ${noteId}:`, error);
			throw error;
		}
	}

	updateApiSettings(apiUrl: string, apiKey: string): void {
		this.apiUrl = apiUrl;
		this.apiKey = apiKey;
	}
}
