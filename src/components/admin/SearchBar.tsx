"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import Icon from "@/components/shared/Icon";

type SearchResult = {
  type: "note" | "file" | "vault" | "idea";
  id: string;
  title: string;
  content: string;
  url: string;
  highlightedTitle: string;
  highlightedContent: string;
};

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Горячая клавиша Ctrl+K для фокуса на поиск
  useKeyboardShortcuts([
    {
      key: "k",
      ctrl: true,
      action: () => {
        inputRef.current?.focus();
      },
    },
  ]);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setQuery("");
    router.push(result.url);
  };

  const typeLabels: Record<string, string> = {
    note: "Заметка",
    file: "Файл",
    vault: "Vault",
    idea: "Идея",
  };

  const typeColors: Record<string, string> = {
    note: "bg-blue-500/20 text-blue-400",
    file: "bg-purple-500/20 text-purple-400",
    vault: "bg-amber-500/20 text-amber-400",
    idea: "bg-green-500/20 text-green-400",
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder="Поиск по всем модулям... (Ctrl+K)"
          className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 pl-10 pr-4 text-white placeholder-[#cccccc]/50 transition-all duration-300 focus:border-[#4CAF50] focus:outline-none focus:ring-2 focus:ring-[#4CAF50]/20"
        />
        <Icon name="search" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#cccccc]" />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#4CAF50] border-t-transparent" />
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] shadow-xl max-h-96 overflow-y-auto">
          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleResultClick(result)}
              className="w-full border-b border-[#4CAF50]/20 px-4 py-3 text-left transition-all duration-200 hover:bg-[#444] first:rounded-t-xl last:rounded-b-xl last:border-b-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${typeColors[result.type] || ""}`}
                    >
                      {typeLabels[result.type] || result.type}
                    </span>
                  </div>
                  <h4
                    className="text-sm font-semibold text-white mb-1"
                    dangerouslySetInnerHTML={{ __html: result.highlightedTitle }}
                  />
                  <p
                    className="text-xs text-[#cccccc] line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-8 text-center text-[#cccccc]">
          Ничего не найдено
        </div>
      )}
    </div>
  );
}

