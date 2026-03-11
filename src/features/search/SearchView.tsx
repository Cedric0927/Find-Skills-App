import { RefreshCw, Search } from "lucide-react";
import { SkillCard } from "../../shared/components/SkillCard";
import { RECOMMENDED_CATEGORIES } from "../../shared/constants/recommendedCategories";
import type { AppI18n } from "../../shared/i18n/messages";
import type { Language, SkillResult } from "../../store/appStore";

type SearchViewProps = {
  t: AppI18n;
  language: Language;
  searchStatus: "idle" | "loading" | "error";
  searchResults: SkillResult[];
  history: string[];
  searchError?: string;
  onSelect: (skill: SkillResult) => void;
  onHistoryClick: (query: string) => void;
  onTagClick: (tag: string) => void;
};

export function SearchView({
  t,
  language,
  searchStatus,
  searchResults,
  history,
  searchError,
  onSelect,
  onHistoryClick,
  onTagClick,
}: SearchViewProps) {
  if (searchStatus === "error") {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 text-sm">
        <span>{searchError}</span>
      </div>
    );
  }

  if (searchResults.length > 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {searchResults.map((skill) => (
          <SkillCard key={skill.source} skill={skill} sourceLabel={t.source} onClick={() => onSelect(skill)} />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] py-8 flex flex-col items-center text-zinc-600 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10 overflow-y-auto">
      {searchStatus === "loading" ? (
        <RefreshCw className="animate-spin mb-4 text-zinc-500" size={32} />
      ) : (
        <>
          <div className="mb-12 flex flex-col items-center">
            <Search size={64} className="mb-4 text-primary/20" />
            <p className="text-zinc-500 text-lg font-medium">{t.searchEmpty}</p>
          </div>

          <div className="w-full max-w-5xl px-8 space-y-12">
            {history.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <RefreshCw size={16} />
                  <h3 className="text-sm font-semibold tracking-wider uppercase">{t.recentSearches}</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {history.map((item) => (
                    <button
                      key={item}
                      onClick={() => onHistoryClick(item)}
                      className="px-4 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800/50 text-sm text-zinc-400 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all duration-200 active:scale-95 group flex items-center gap-2"
                    >
                      <Search size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {RECOMMENDED_CATEGORIES.map((category) => (
                <div key={category.id} className="space-y-5">
                  <div className="flex items-center gap-3 text-primary/80">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <category.icon size={18} />
                    </div>
                    <h3 className="text-sm font-bold tracking-tight text-zinc-200">{category.label[language]}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {category.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => onTagClick(tag)}
                        className="px-3.5 py-2 rounded-xl bg-zinc-900/30 border border-zinc-800/60 text-xs text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/40 hover:text-zinc-200 transition-all duration-200 active:scale-95"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
