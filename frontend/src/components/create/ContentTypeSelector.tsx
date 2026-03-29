import { Check } from 'lucide-react';
import { useT } from '../../lib/i18n';

interface ContentType {
  id: string;
  labelKey: string;
  emoji: string;
  descKey: string;
}

const CONTENT_TYPES: ContentType[] = [
  {
    id: 'fruit-soap',
    labelKey: 'create.fruitSoap',
    emoji: '\u{1F353}',
    descKey: 'create.fruitSoapDesc',
  },
  {
    id: 'character-remix',
    labelKey: 'create.characterRemix',
    emoji: '\u{1F3AD}',
    descKey: 'create.characterRemixDesc',
  },
  {
    id: 'mascot',
    labelKey: 'create.mascot',
    emoji: '\u{1F3E2}',
    descKey: 'create.mascotDesc',
  },
  {
    id: 'cat-programmer',
    labelKey: 'create.catProgrammer',
    emoji: '\u{1F431}',
    descKey: 'create.catProgrammerDesc',
  },
  {
    id: 'custom',
    labelKey: 'create.custom',
    emoji: '\u{270F}\u{FE0F}',
    descKey: 'create.customDesc',
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
  const t = useT();

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-400 mb-3">{t('create.contentType')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
                {t(ct.labelKey)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{t(ct.descKey)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
