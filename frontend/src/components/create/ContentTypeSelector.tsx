import { Check } from 'lucide-react';

interface ContentType {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

const CONTENT_TYPES: ContentType[] = [
  {
    id: 'fruit-soap',
    label: 'Fruit Soap',
    emoji: '\u{1F353}',
    description: 'Satisfying soap-cutting videos with fruit themes',
  },
  {
    id: 'character-remix',
    label: 'Character Remix',
    emoji: '\u{1F3AD}',
    description: 'Popular characters in unexpected scenarios',
  },
  {
    id: 'mascot',
    label: 'Business Mascot',
    emoji: '\u{1F3E2}',
    description: 'Animated mascot videos for brands',
  },
  {
    id: 'custom',
    label: 'Custom',
    emoji: '\u{270F}\u{FE0F}',
    description: 'Build your own scenario from scratch',
  },
];

interface ContentTypeSelectorProps {
  selected: string;
  onSelect: (id: string) => void;
}

export default function ContentTypeSelector({
  selected,
  onSelect,
}: ContentTypeSelectorProps) {
  return (
    <div>
      <h2 className="text-sm font-medium text-gray-400 mb-3">Content Type</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CONTENT_TYPES.map((ct) => {
          const isSelected = selected === ct.id;
          return (
            <button
              key={ct.id}
              type="button"
              onClick={() => onSelect(ct.id)}
              className={`relative text-left p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-500/[0.06]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <span className="text-2xl">{ct.emoji}</span>
              <p className="text-sm font-medium text-gray-200 mt-2">
                {ct.label}
              </p>
              <p className="text-xs text-gray-500 mt-1">{ct.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
