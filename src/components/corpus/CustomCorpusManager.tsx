'use client';

import { useCorpusStore } from '@/store/corpusStore';
import { FolderOpen, Pencil, Trash2, Upload } from 'lucide-react';
import { toast } from '@/store/toastStore';

interface Props {
  onImport: () => void;
}

/** 自定义语料包管理（仅在「自定义语料」分类下显示） */
export default function CustomCorpusManager({ onImport }: Props) {
  const customPacks = useCorpusStore((s) => s.customPacks);
  const renameCorpusPack = useCorpusStore((s) => s.renameCorpusPack);
  const deleteCorpusPack = useCorpusStore((s) => s.deleteCorpusPack);

  return (
    <div className="mb-4 rounded-md border bg-secondary/20 p-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">我的语料包 · {customPacks.length}</span>
        <button
          onClick={onImport}
          className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] hover:border-primary/50 hover:text-primary"
        >
          <Upload className="h-3 w-3" />
          导入
        </button>
      </div>
      {customPacks.length === 0 ? (
        <p className="px-1 py-2 text-[11px] text-muted-foreground">
          还没有自定义语料。支持导入 TXT / Markdown / CSV，导入后可在本分类浏览和使用。
        </p>
      ) : (
        <div className="space-y-1">
          {customPacks.map((pack) => (
            <div key={pack.id} className="group flex items-center gap-2 rounded px-1 py-1 text-xs hover:bg-background">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 truncate">{pack.name}</span>
              <span className="text-[10px] text-muted-foreground">{pack.fragments.length} 条</span>
              <button
                onClick={() => {
                  const next = prompt('重命名语料包', pack.name);
                  if (next && next.trim()) renameCorpusPack(pack.id, next.trim());
                }}
                className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                title="重命名"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`确定删除语料包「${pack.name}」吗？`)) {
                    deleteCorpusPack(pack.id);
                    toast.success('已删除语料包');
                  }
                }}
                className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                title="删除"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
