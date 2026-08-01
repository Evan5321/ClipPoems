'use client';

import { useState, useCallback } from 'react';
import { useCorpusStore } from '@/store/corpusStore';
import { generateId } from '@/lib/utils/id';
import type { PosTag } from '@/types/corpus';
import { tokenizeText, fetchRecommendedWords } from '@/lib/corpus/tokenizer';
import { Loader2, Sparkles, Plus, Check } from 'lucide-react';

interface TokenWord {
  word: string;
  pos: string;
  pos_label: string;
  weight?: number;
}

const POS_GROUP_LABELS: Record<string, string> = {
  n: '名词', nr: '人名', ns: '地名', nt: '机构',
  v: '动词', vd: '副动词', vn: '名动词',
  a: '形容词', ad: '副形词', d: '副词',
  m: '数词', q: '量词', p: '介词',
  r: '代词', c: '连词', u: '助词', e: '叹词',
  eng: '英文', x: '其他',
};

export default function RecommendedWords() {
  const { addFragment, selectedFragments } = useCorpusStore();
  const [inputText, setInputText] = useState('');
  const [words, setWords] = useState<TokenWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  const selectedWords = new Set(selectedFragments.map((f) => f.text));

  // 自定义输入分词
  const handleTokenize = useCallback(async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const result = await tokenizeText(inputText, { withWeight: true });
      setWords(
        (result.words as TokenWord[]).filter(
          (w) => w.pos !== 'w' && w.pos !== 'x',
        ),
      );
    } catch {
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, [inputText]);

  // 基于已选词获取推荐
  const handleRecommend = useCallback(async () => {
    if (selectedFragments.length === 0) return;
    setRecLoading(true);
    try {
      const seeds = selectedFragments
        .slice(0, 5)
        .map((f) => f.text);
      const recs = await fetchRecommendedWords(seeds);
      setRecommendations(recs);
    } finally {
      setRecLoading(false);
    }
  }, [selectedFragments]);

  // 添加词为碎片
  const handleAddWord = useCallback(
    (word: string, posLabel?: string) => {
      if (selectedWords.has(word)) return;
      addFragment({
        id: generateId(),
        text: word,
        source: '分词推荐',
        posTag: mapPosLabel(posLabel),
        wordCount: word.length,
        tags: posLabel ? [posLabel] : [],
        corpusId: 'recommended',
      });
    },
    [addFragment, selectedWords],
  );

  // 按词性分组
  const groupedWords = groupByPos(words);

  return (
    <div className="space-y-6">
      {/* 输入区 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">输入文本进行分词</label>
        <div className="flex gap-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="粘贴一段文本，系统会自动分词并按词性分组展示..."
            className="min-h-[80px] flex-1 rounded-md border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={handleTokenize}
          disabled={loading || !inputText.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          开始分词
        </button>
      </div>

      {/* 分词结果 */}
      {words.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            分词结果 · 共 {words.length} 个词
          </h3>

          {Object.entries(groupedWords).map(([posGroup, groupWords]) => (
            <div key={posGroup}>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                {POS_GROUP_LABELS[posGroup] || posGroup}
                <span className="ml-1 text-muted-foreground/60">
                  ({groupWords.length})
                </span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {groupWords.map((w, i) => {
                  const isSelected = selectedWords.has(w.word);
                  return (
                    <button
                      key={`${w.word}-${i}`}
                      onClick={() => handleAddWord(w.word, w.pos_label)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      {w.word}
                      {w.weight && w.weight > 0.01 && (
                        <span className="opacity-60">
                          {w.weight.toFixed(2)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 推荐区 */}
      {selectedFragments.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={handleRecommend}
            disabled={recLoading}
            className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
          >
            {recLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            基于已选词推荐更多
          </button>

          {recommendations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {recommendations.map((rec, i) => {
                const isSelected = selectedWords.has(rec);
                return (
                  <button
                    key={`rec-${i}`}
                    onClick={() => handleAddWord(rec)}
                    disabled={isSelected}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary/20 text-primary'
                        : 'border border-dashed border-primary/40 text-primary hover:bg-primary/10'
                    }`}
                  >
                    {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    {rec}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 空状态 */}
      {!loading && words.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Sparkles className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            在上方输入文本，点击「开始分词」
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            分词结果将按名词、动词、形容词等分组展示
          </p>
        </div>
      )}
    </div>
  );
}

/** 按词性分组 */
function groupByPos(words: TokenWord[]): Record<string, TokenWord[]> {
  const groups: Record<string, TokenWord[]> = {};
  for (const w of words) {
    // 取主词性（如 nr → n）
    const mainPos = w.pos.charAt(0);
    const key = POS_GROUP_LABELS[mainPos] ? mainPos : w.pos;
    if (!groups[key]) groups[key] = [];
    groups[key].push(w);
  }
  return groups;
}

/** 词性标签 → posTag */
function mapPosLabel(label?: string): PosTag {
  if (!label) return 'other';
  const map: Record<string, PosTag> = {
    '名词': 'noun', '人名': 'name', '地名': 'location', '动词': 'verb',
    '形容词': 'adj', '副词': 'adv', '数词': 'number',
  };
  return map[label] || 'other';
}
