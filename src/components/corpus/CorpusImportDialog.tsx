'use client';

import { useMemo, useState } from 'react';
import { useCorpusStore } from '@/store/corpusStore';
import { parseImport, draftsToFragments, detectImportFormat, type ImportedFragment, type SplitMode } from '@/lib/corpus/import';
import { toast } from '@/store/toastStore';
import { Upload, FileText, X, Trash2, Check } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CorpusImportDialog({ open, onClose }: Props) {
  const importCorpusPack = useCorpusStore((s) => s.importCorpusPack);

  const [packName, setPackName] = useState('我的语料');
  const [source, setSource] = useState<'file' | 'text'>('file');
  const [fileName, setFileName] = useState('pasted.txt');
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<SplitMode>('line');
  const [drafts, setDrafts] = useState<ImportedFragment[]>([]);

  const format = useMemo(() => detectImportFormat(fileName), [fileName]);
  const isCsv = format === 'csv';

  if (!open) return null;

  const handleFile = async (file: File) => {
    const text = await file.text();
    setContent(text);
    setFileName(file.name);
    setPackName(file.name.replace(/\.[^.]+$/, ''));
    setDrafts(parseImport(file.name, text, { mode }));
  };

  const handleParse = () => {
    if (!content.trim()) {
      toast.error('请先选择文件或粘贴文本');
      return;
    }
    const parsed = parseImport(fileName, content, { mode });
    if (parsed.length === 0) {
      toast.error('没有解析出可用的碎片');
      return;
    }
    setDrafts(parsed);
    toast.success(`解析出 ${parsed.length} 条碎片`);
  };

  const handleSave = () => {
    if (drafts.length === 0) {
      toast.error('请先解析并确认碎片');
      return;
    }
    importCorpusPack(packName.trim() || '我的语料', draftsToFragments(drafts), '用户导入语料');
    toast.success(`已保存语料包「${packName}」`);
    setDrafts([]);
    setContent('');
    onClose();
  };

  const updateDraft = (id: string, text: string) => {
    setDrafts((list) => list.map((d) => (d.id === id ? { ...d, text } : d)));
  };

  const removeDraft = (id: string) => setDrafts((list) => list.filter((d) => d.id !== id));

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold">导入自定义语料</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">支持 TXT / Markdown / CSV，导入后可反复使用</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {/* 语料包名称 */}
          <label className="block space-y-1">
            <span className="text-[11px] text-muted-foreground">语料包名称</span>
            <input
              value={packName}
              onChange={(e) => setPackName(e.target.value)}
              className="h-8 w-full rounded-md border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          {/* 来源切换 */}
          <div className="flex gap-1 rounded-md bg-secondary p-0.5 text-xs">
            <button
              onClick={() => setSource('file')}
              className={`flex-1 rounded px-2 py-1 ${source === 'file' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              上传文件
            </button>
            <button
              onClick={() => setSource('text')}
              className={`flex-1 rounded px-2 py-1 ${source === 'text' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              粘贴文本
            </button>
          </div>

          {source === 'file' ? (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border py-6 text-sm text-muted-foreground hover:border-primary/50 hover:bg-primary/5">
              <Upload className="h-6 w-6" />
              <span>{fileName ? `已选择：${fileName}` : '点击选择 .txt / .md / .csv 文件'}</span>
              <input
                type="file"
                accept=".txt,.md,.markdown,.csv,text/plain,text/markdown,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </label>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <select
                  value={isCsv ? 'csv' : 'txt'}
                  onChange={(e) => setFileName(`pasted.${e.target.value}`)}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="txt">TXT</option>
                  <option value="md">Markdown</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  isCsv
                    ? '可直接粘贴 CSV，如：\ntext,author,tags\n春风又绿江南岸,王安石,春天|思乡'
                    : '粘贴文本，每行会自动成为一个碎片…'
                }
                className="min-h-[120px] w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {/* 切分方式 */}
          {!isCsv && source === 'file' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">切分方式</span>
              {(
                [
                  ['line', '按行'],
                  ['sentence', '按句'],
                  ['paragraph', '按段'],
                ] as [SplitMode, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-md border px-2 py-1 ${mode === m ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-secondary'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleParse}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            解析预览
          </button>

          {/* 预览 */}
          {drafts.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>预览（可编辑，删除不需要的） · {drafts.length} 条</span>
                <button onClick={() => setDrafts([])} className="hover:text-foreground">清空</button>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                {drafts.map((d) => (
                  <div key={d.id} className="group flex items-center gap-1">
                    <input
                      value={d.text}
                      onChange={(e) => updateDraft(d.id, e.target.value)}
                      className="h-7 flex-1 rounded border-none bg-secondary/50 px-2 text-xs outline-none focus:bg-secondary"
                    />
                    <button
                      onClick={() => removeDraft(d.id)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-secondary">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={drafts.length === 0}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            <Check className="h-4 w-4" />
            保存语料包
          </button>
        </div>
      </div>
    </div>
  );
}
