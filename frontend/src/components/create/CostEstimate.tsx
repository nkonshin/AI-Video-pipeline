import { Loader } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { IMAGE_MODELS, VIDEO_MODELS, TTS_MODELS } from './AdvancedSettings';

interface CostEstimateProps {
  sceneCount: number;
  imageModel: string;
  videoModel: string;
  ttsEngine: string;
  ttsModel: string;
  budgetRemaining: number | null;
  onGenerate: () => void;
  generating: boolean;
}

function findPrice(model: string, presets: { id: string; price: number }[]): number | null {
  const found = presets.find(m => m.id === model);
  return found ? found.price : null;
}

export default function CostEstimate({
  sceneCount,
  imageModel,
  videoModel,
  ttsEngine,
  ttsModel,
  budgetRemaining,
  onGenerate,
  generating,
}: CostEstimateProps) {
  const t = useT();

  const imgPrice = findPrice(imageModel, IMAGE_MODELS);
  const vidPrice = findPrice(videoModel, VIDEO_MODELS);
  const ttsPrice = ttsEngine === 'replicate' ? (findPrice(ttsModel, TTS_MODELS) ?? 0.03) : 0;

  const hasAllPrices = imgPrice !== null && vidPrice !== null;
  const perScene = (imgPrice ?? 0) + (vidPrice ?? 0) + ttsPrice;
  const total = sceneCount * perScene;

  const overBudget = budgetRemaining !== null && hasAllPrices && total > budgetRemaining;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
      <h2 className="text-sm font-medium text-gray-400 mb-4">{t('create.estimatedCost')}</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-400">
          <span>Scenes</span>
          <span className="text-gray-300">{sceneCount}</span>
        </div>

        {hasAllPrices ? (
          <>
            <div className="flex justify-between text-gray-400">
              <span>Image</span>
              <span className="text-gray-300">${imgPrice!.toFixed(3)}/scene</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Video</span>
              <span className="text-gray-300">${vidPrice!.toFixed(2)}/scene</span>
            </div>
            {ttsPrice > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>TTS</span>
                <span className="text-gray-300">${ttsPrice.toFixed(3)}/scene</span>
              </div>
            )}
            {ttsEngine === 'edge-tts' && (
              <div className="flex justify-between text-gray-400">
                <span>TTS</span>
                <span className="text-emerald-400">free</span>
              </div>
            )}
            <div className="border-t border-white/[0.06] my-2" />
            <div className="flex justify-between font-medium">
              <span className="text-gray-300">Total</span>
              <span className="text-indigo-300 text-lg">${total.toFixed(2)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="border-t border-white/[0.06] my-2" />
            <div className="text-[12px] text-gray-500">
              {imgPrice === null && <div>Image model price unknown (custom model)</div>}
              {vidPrice === null && <div>Video model price unknown (custom model)</div>}
              <div className="text-gray-600 mt-1">Actual cost will be shown in Replicate dashboard</div>
            </div>
          </>
        )}

        {budgetRemaining !== null && (
          <div className="flex justify-between text-gray-400">
            <span>Budget remaining</span>
            <span className={overBudget ? 'text-red-400' : 'text-emerald-400'}>
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
