'use client';

import { useMemo, useState } from 'react';
import { useCorpusStore } from '@/store/corpusStore';
import { THEME_PACKS, themeWordsToFragments } from '@/lib/corpus/themes';
import { Sparkles, Plus, Check, X } from 'lucide-react';

/** 主题词包：一键把某一主题的词加入已选碎片 */
export default function ThemePacks() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const selectedFragments = useCorpusStore((s) => s.selectedFragments);
  const addFragment = useCorpusStore((s) => s.addFragment);
  const addFragments = useCorpusStore((s) => s.addFragments);
  const removeFragment = useCorpusStore((s) => s.removeFragment);

  const activePack = THEME_PACKS.find((p) => p.id === activeId) || null;
  const words = useMemo(() => (activePack ? themeWordsToFragments(activePack) : []), [activePack]);

  const selectedIds = useMemo(() => new Set(selectedFragments.map((f) => f.id)), [selectedFragments]);

  return (
    <div className="mb-3 rounded-lg border bg-card/50 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          主题词包
        </span>
        {THEME_PACKS.map((pack) => (
          <button
            key={pack.id}
            onClick={() => setActiveId(activeId === pack.id ? null : pack.id)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
              activeId === pack.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'hover:border-primary/50 hover:bg-primary/5'
            }`}
            title={pack.description}
          >
            <span>{pack.icon}</span>
            {pack.name}
          </button>
        ))}
      </div>

      {activePack && (
        <div className="mt-2 rounded-md border bg-background p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {activePack.icon} {activePack.name} · {words.length} 个词 · {activePack.description}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => addFragments(words)}
                className="inline-flex items-center gap-0.5 rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/10"
              >
                <Plus className="h-3 w-3" /> 全部添加
              </button>
              <button
                onClick={() => setActiveId(null)}
                className="rounded p-0.5 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {words.map((word) => {
              const isSelected = selectedIds.has(word.id);
              return (
                <button
                  key={word.id}
                  onClick={() => (isSelected ? removeFragment(word.id) : addFragment(word))}
                  className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                    isSelected ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-secondary'
                  }`}
                >
                  {isSelected ? <Check className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5 opacity-50" />}
                  {word.text}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
