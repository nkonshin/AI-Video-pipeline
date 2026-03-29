import { Loader } from 'lucide-react';
import { useT } from '../../lib/i18n';

interface CostEstimateProps {
  sceneCount: number;
  imageModel: string;
  videoModel: string;
  budgetRemaining: number | null;
  onGenerate: () => void;
  generating: boolean;
}

const IMAGE_PRICES: Record<string, number> = {
  'flux-pro': 0.04,
  'flux-dev': 0.025,
  'flux-schnell': 0.003,
  sdxl: 0.01,
};

const VIDEO_PRICES: Record<string, number> = {
  'hailuo-2.3': 0.3,
  'hailuo-fast': 0.12,
  'kling-v2.5': 0.5,
  'wan-fast': 0.09,
};

export default function CostEstimate({
  sceneCount,
  imageModel,
  videoModel,
  budgetRemaining,
  onGenerate,
  generating,
}: CostEstimateProps) {
  const t = useT();
  const imgPrice = IMAGE_PRICES[imageModel] ?? 0;
  const vidPrice = VIDEO_PRICES[videoModel] ?? 0;
  const perScene = imgPrice + vidPrice;
  const total = sceneCount * perScene;

  const overBudget =
    budgetRemaining !== null && total > budgetRemaining;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
      <h2 className="text-sm font-medium text-gray-400 mb-4">{t('create.estimatedCost')}</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-400">
          <span>Scenes</span>
          <span className="text-gray-300">{sceneCount}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Per scene</span>
          <span className="text-gray-300">
            ${imgPrice.toFixed(3)} + ${vidPrice.toFixed(2)} = $
            {perScene.toFixed(3)}
          </span>
        </div>
        <div className="border-t border-white/[0.06] my-2" />
        <div className="flex justify-between font-medium">
          <span className="text-gray-300">Estimated Total</span>
          <span className="text-indigo-300">${total.toFixed(2)}</span>
        </div>
        {budgetRemaining !== null && (
          <div className="flex justify-between text-gray-400">
            <span>Budget Remaining</span>
            <span
              className={
                overBudget ? 'text-red-400' : 'text-emerald-400'
              }
            >
              ${budgetRemaining.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {overBudget && (
        <p className="text-xs text-red-400 mt-3">
          Estimated cost exceeds your remaining budget.
        </p>
      )}

      <button
        type="button"
        onClick={onGenerate}
        disabled={generating || sceneCount === 0}
        className="mt-5 w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(99,102,241,0.3)]"
      >
        {generating ? (
          <span className="inline-flex items-center gap-2">
            <Loader className="h-4 w-4 animate-spin" />
            {t('create.generating')}
          </span>
        ) : (
          t('create.generateVideo')
        )}
      </button>
    </div>
  );
}
