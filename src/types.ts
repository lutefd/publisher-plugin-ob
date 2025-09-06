export interface Note {
  id: string;
  content: string;
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
    updated?: string;
  };
}
