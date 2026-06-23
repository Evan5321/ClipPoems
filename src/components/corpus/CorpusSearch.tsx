'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useCorpusStore } from '@/store/corpusStore';
import { Search, X } from 'lucide-react';

export default function CorpusSearch() {
  const { searchQuery, setSearchQuery, searchResults } = useCorpusStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceId = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalQuery(value);

      if (debounceId.current) clearTimeout(debounceId.current);
      debounceId.current = setTimeout(() => {
        setSearchQuery(value);
      }, 300);
    },
    [setSearchQuery],
  );

  const handleClear = useCallback(() => {
    setLocalQuery('');
    setSearchQuery('');
    inputRef.current?.focus();
  }, [setSearchQuery]);

  useEffect(() => {
    return () => {
      if (debounceId.current) clearTimeout(debounceId.current);
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={handleChange}
          placeholder="搜索语料（关键词、作者、标签）..."
          className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-8 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {localQuery && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {searchQuery.trim() && (
        <div className="text-xs text-muted-foreground">
          找到 {searchResults.length} 个结果
          {searchResults.length > 0 && (
            <button
              onClick={handleClear}
              className="ml-2 text-primary hover:underline"
            >
              清除搜索
            </button>
          )}
        </div>
      )}
    </div>
  );
}
