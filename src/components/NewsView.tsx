import React, { useMemo, useState } from 'react';
import { ExternalLink, Newspaper, Search } from 'lucide-react';
import { NewsArticle } from '../types/crypto';

interface NewsViewProps {
  articles: NewsArticle[];
  isLoading: boolean;
}

const CATEGORIES = ['All', 'Markets', 'Bitcoin', 'Layer 2', 'DeFi', 'Regulation'] as const;

export const NewsView: React.FC<NewsViewProps> = ({ articles, isLoading }) => {
  const [category, setCategory] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (category !== 'All' && a.category !== category) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.relatedCoins.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [articles, category, query]);

  const formatRelTime = (iso: string) => {
    const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-5">
      {/* Header & Filters */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                category === cat
                  ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search news or ticker..."
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-60"
          />
        </div>
      </div>

      {/* Articles Grid */}
      {isLoading && articles.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-12 text-center text-xs text-slate-500 dark:text-slate-400">
          No news stories matched your current filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((article) => (
            <article
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] overflow-hidden flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer group"
            >
              <div className="aspect-[4/3] bg-slate-900 relative overflow-hidden">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{article.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{article.source}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{formatRelTime(article.publishedAt)}</span>
                  </div>

                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {article.summary}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    {article.relatedCoins.join(' / ')}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    Read Brief <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Article Reader Modal */}
      {selectedArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
          onClick={() => setSelectedArticle(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1422] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-[16/9] bg-slate-900 overflow-hidden">
              <img
                src={selectedArticle.imageUrl}
                alt={selectedArticle.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Newspaper className="w-3.5 h-3.5 text-emerald-500" />
                <span>{selectedArticle.category}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedArticle.source}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{formatRelTime(selectedArticle.publishedAt)}</span>
              </div>

              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 leading-snug">
                {selectedArticle.title}
              </h2>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedArticle.summary}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  Tickers: {selectedArticle.relatedCoins.join(', ')}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedArticle(null)}
                    className="px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Close
                  </button>
                  <a
                    href={selectedArticle.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950"
                  >
                    <span>Source Article</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
