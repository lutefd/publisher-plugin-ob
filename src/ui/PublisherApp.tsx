import * as React from "react";
import { useState, useEffect } from "react";
import PublisherPlugin from "../main";
import { NotesList } from "../components/NotesList";
import { Note } from "../types";
import { PublishModal } from "./PublishModal";

interface PublisherAppProps {
	plugin: PublisherPlugin;
}

export const PublisherApp: React.FC<PublisherAppProps> = ({ plugin }) => {
	const [notes, setNotes] = useState<Note[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchNotes();

		const refreshHandler = () => {
			fetchNotes();
		};

		PublishModal.events.on("note-published", refreshHandler);

		return () => {
			PublishModal.events.off("note-published", refreshHandler);
		};
	}, []);

	const fetchNotes = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch(`${plugin.settings.apiUrl}/notes`, {
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch notes: ${response.statusText}`);
			}

			const data = await response.json();

			const sortedNotes = [...data].sort((a, b) => {
				const dateA = a.metadata?.updated
					? new Date(a.metadata.updated).getTime()
					: 0;
				const dateB = b.metadata?.updated
					? new Date(b.metadata.updated).getTime()
					: 0;
				return dateB - dateA;
			});

			setNotes(sortedNotes);
		} catch (err) {
			console.error("Error fetching notes:", err);
			setError(
				"Failed to load published notes. Please check your API settings."
			);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (noteId: string) => {
		try {
			setNotes(notes.filter((note) => note.id !== noteId));
		} catch (err) {
			console.error("Error updating UI after note deletion:", err);
			setError("Failed to update UI after note deletion.");
		}
	};

	const handleRefresh = () => {
		fetchNotes();
	};

	return (
		<div className="publisher-app">
			<div className="publisher-header">
				<h2>Published Notes</h2>
				<button className="refresh-button" onClick={handleRefresh}>
					Refresh
				</button>
			</div>

			{error && (
				<div className="publisher-error">
					<p>{error}</p>
				</div>
			)}

			{loading ? (
				<div className="publisher-loading">Loading notes...</div>
			) : (
				<NotesList notes={notes} onDelete={handleDelete} plugin={plugin} />
			)}

			<div className="publisher-footer">
				<p>Total notes: {notes.length}</p>
			</div>
		</div>
	);
};
