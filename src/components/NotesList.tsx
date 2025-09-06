import * as React from "react";
import { useState } from "react";
import { Note } from "../types";
import PublisherPlugin from "../main";

interface NotesListProps {
	notes: Note[];
	onDelete: (noteId: string) => Promise<void>;
	plugin: PublisherPlugin;
}

export const NotesList: React.FC<NotesListProps> = ({
	notes,
	onDelete,
	plugin,
}) => {
	const [deletingNote, setDeletingNote] = useState<string | null>(null);

	const getPublishedUrl = (noteId: string): string => {
		const baseUrl = plugin.settings.publishedUrlBase;
		if (!baseUrl) return "";

		const formattedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
		return `${formattedBaseUrl}${noteId}`;
	};

	const openPublishedUrl = (noteId: string) => {
		const url = getPublishedUrl(noteId);
		if (url) {
			window.open(url, "_blank");
		}
	};

	const handleDeleteClick = async (noteId: string) => {
		if (window.confirm("Are you sure you want to unpublish this note?")) {
			setDeletingNote(noteId);
			try {
				await plugin.apiService.deleteNote(noteId);
				await onDelete(noteId);
			} catch (error) {
				console.error(`Error unpublishing note: ${error}`);
			} finally {
				setDeletingNote(null);
			}
		}
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return "Unknown date";
		return new Date(dateString).toLocaleString();
	};

	if (notes.length === 0) {
		return <div className="empty-notes">No published notes found.</div>;
	}

	return (
		<div className="notes-list">
			{notes.map((note) => (
				<div key={note.id} className="note-item">
					<div className="note-header">
						<h3 className="note-title">{note.metadata?.title || note.id}</h3>
						<div className="note-actions">
							{plugin.settings.publishedUrlBase && (
								<button
									className="note-view-button"
									onClick={() => openPublishedUrl(note.id)}
								>
									View Published
								</button>
							)}
							<button
								className="note-delete-button"
								onClick={() => handleDeleteClick(note.id)}
								disabled={deletingNote === note.id}
							>
								{deletingNote === note.id ? "Unpublishing..." : "Unpublish"}
							</button>
						</div>
					</div>

					<div className="note-meta">
						{note.metadata?.updated && (
							<span className="note-date">
								Updated: {formatDate(note.metadata.updated)}
							</span>
						)}
						{note.metadata?.tags && note.metadata.tags.length > 0 && (
							<div className="note-tags">
								{note.metadata.tags.map((tag) => (
									<span key={tag} className="note-tag">
										#{tag}
									</span>
								))}
							</div>
						)}
					</div>

					<div className="note-content">
						{note.metadata?.description && (
							<p className="note-description">{note.metadata.description}</p>
						)}
					</div>
				</div>
			))}
		</div>
	);
};
