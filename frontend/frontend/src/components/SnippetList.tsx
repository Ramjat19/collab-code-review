import type { Snippet } from "../types/models";
import SnippetCard from "./SnippetCard";

interface Props {
  snippets: Snippet[];
  onSnippetUpdate: (updatedSnippet: Snippet) => void;
}

export default function SnippetList({ snippets, onSnippetUpdate }: Props) {
  if (snippets.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-lg">No code snippets yet</p>
        <p className="text-gray-400 text-sm mt-1">Create your first snippet above to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {snippets.map((snippet) => (
        <SnippetCard 
          key={snippet._id} 
          snippet={snippet} 
          onSnippetUpdate={onSnippetUpdate}
        />
      ))}
    </div>
  );
}