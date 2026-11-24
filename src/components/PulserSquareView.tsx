import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  ExternalLink,
  Flame,
  Hash,
  Heart,
  Image as ImageIcon,
  LineChart,
  Link2,
  MessageCircle,
  Repeat2,
  Send,
  Share2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { useUserAccount } from '../context/UserAccountContext';
import {
  Coin,
  CurrencyCode,
  FxRates,
  SquareFilterTab,
  SquarePost,
  SquareSentiment,
} from '../types/crypto';
import { formatPercent, formatPrice } from '../utils/formatters';
import { UserAvatar } from './UserAvatar';

interface PulserSquareViewProps {
  coins: Coin[];
  currency: CurrencyCode;
  fxRates: FxRates;
  posts: SquarePost[];
  onCreatePost: (post: SquarePost) => void;
  onToggleLike: (postId: string) => void;
  onToggleRepost: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onSelectCoin: (coin: Coin) => void;
  onNotifyShare: (msg: string) => void;
}

const FILTER_TABS: SquareFilterTab[] = [
  'For You',
  'Following',
  'Bullish Ideas',
  'Whale Alerts',
  'News',
];

const QUICK_TAGS = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'SUI', 'ARB'];

const TRENDING_HASHTAGS = [
  { tag: '#Bitcoin', count: '14.2K posts' },
  { tag: '#Altseason', count: '9.8K posts' },
  { tag: '#CMC1000', count: '6.4K posts' },
  { tag: '#WhaleSonar', count: '5.1K posts' },
  { tag: '#Layer2', count: '4.3K posts' },
  { tag: '#InstitutionalFlow', count: '3.7K posts' },
];

export const PulserSquareView: React.FC<PulserSquareViewProps> = ({
  coins,
  currency,
  fxRates,
  posts,
  onCreatePost,
  onToggleLike,
  onToggleRepost,
  onAddComment,
  onSelectCoin,
  onNotifyShare,
}) => {
  const { incognitoMode, wipeVersion } = usePrivacy();
  const { currentUser, setAuthModalOpen, setProfileDrawerOpen } = useUserAccount();
  const [filterTab, setFilterTab] = useState<SquareFilterTab>('For You');
  const [hashtagFilter, setHashtagFilter] = useState<string | null>(null);

  // Create Post Box state (persisted locally unless Incognito is active)
  const [draftText, setDraftText] = useState(() => {
    try {
      return localStorage.getItem('cp_square_draft') || '';
    } catch {
      return '';
    }
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(['BTC']);
  const [sentiment, setSentiment] = useState<SquareSentiment>('bullish');
  const [attachChart, setAttachChart] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  // Comment drawers
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (wipeVersion === 0) return;
    setDraftText('');
    setAttachChart(false);
    setAttachedImage(null);
    setCommentDrafts({});
  }, [wipeVersion]);

  useEffect(() => {
    if (incognitoMode) return;
    try {
      if (draftText) localStorage.setItem('cp_square_draft', draftText);
      else localStorage.removeItem('cp_square_draft');
    } catch {
      // Ignore
    }
  }, [draftText, incognitoMode]);

  const toggleTag = (sym: string) => {
    setSelectedTags((prev) =>
      prev.includes(sym) ? (prev.length > 1 ? prev.filter((t) => t !== sym) : prev) : [...prev, sym]
    );
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draftText.trim();
    if (!body) return;

    const extractedHashtags = body.match(/#[A-Za-z0-9_]+/g) || [];
    const primaryCoin = coins.find((c) => c.symbol === selectedTags[0]) || coins[0];

    const authorName = currentUser?.displayName || 'CryptoPulser Trader';
    const authorHandle = currentUser?.username || '@pulser_member';
    const initials =
      authorName
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || '')
        .join('') || 'CP';

    const newPost: SquarePost = {
      id: `sq-${Date.now()}`,
      authorId: currentUser?.id,
      author: authorName,
      handle: authorHandle,
      roleLabel: currentUser ? 'Verified Profile' : 'Community Analyst',
      avatarInitials: initials,
      avatarColor: '#22D3EE',
      authorAvatarUrl: currentUser?.avatarUrl || undefined,
      authorWebsite: currentUser?.websiteUrl || undefined,
      verified: true,
      following: true,
      timestamp: new Date().toISOString(),
      coinTags: selectedTags,
      hashtags:
        extractedHashtags.length > 0
          ? extractedHashtags
          : [`#${selectedTags[0]}`, '#CMC1000'],
      sentiment,
      category: 'Ideas',
      content: body,
      attachmentLabel: attachChart && primaryCoin
        ? `${primaryCoin.name} ($${primaryCoin.symbol}) Live 7D Trend · ${formatPrice(
            primaryCoin.priceUsd,
            currency,
            fxRates
          )}`
        : undefined,
      attachmentImage: attachedImage || undefined,
      likes: 1,
      likedByMe: false,
      reposts: 0,
      comments: [],
    };

    onCreatePost(newPost);
    setDraftText('');
    setAttachChart(false);
    setAttachedImage(null);
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (hashtagFilter && !p.hashtags.some((h) => h.toLowerCase() === hashtagFilter.toLowerCase())) {
        return false;
      }
      if (filterTab === 'Following') return p.following;
      if (filterTab === 'Bullish Ideas') return p.sentiment === 'bullish' && p.category === 'Ideas';
      if (filterTab === 'Whale Alerts') return p.category === 'Whale Alerts';
      if (filterTab === 'News') return p.category === 'News';
      return true;
    });
  }, [posts, filterTab, hashtagFilter]);

  const formatRelTime = (iso: string) => {
    const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 60) return `${mins}m`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.round(hrs / 24)}d`;
  };

  const primaryDraftCoin = coins.find((c) => c.symbol === selectedTags[0]) || coins[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Feed Column */}
      <div className="lg:col-span-8 space-y-5">
        {/* 1. Create Post Box (Top of Feed) */}
        <form
          onSubmit={handlePublish}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => setProfileDrawerOpen(true)}
                  className="inline-flex items-center gap-2 hover:opacity-85 cursor-pointer"
                >
                  <UserAvatar
                    displayName={currentUser.displayName}
                    avatarUrl={currentUser.avatarUrl}
                    avatarPresetId={currentUser.avatarPresetId}
                    size="sm"
                  />
                  <div className="text-left">
                    <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                      Pulser Square · {currentUser.displayName}
                    </h2>
                    <div className="text-[11px] font-mono text-cyan-500">{currentUser.username}</div>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Pulser Square · Share Market Thesis
                  </h2>
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(true)}
                    className="text-[11px] font-mono text-cyan-500 hover:underline cursor-pointer"
                  >
                    (Sign in to link profile)
                  </button>
                </div>
              )}
            </div>
            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSentiment('bullish')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                  sentiment === 'bullish'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Bullish</span>
              </button>
              <button
                type="button"
                onClick={() => setSentiment('bearish')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                  sentiment === 'bearish'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Bearish</span>
              </button>
            </div>
          </div>

          <textarea
            rows={3}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Share a trade setup, whale observation, or macro note with $BTC, $ETH, #Altseason..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />

          {/* Coin Tag Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1">Tag coins:</span>
            {QUICK_TAGS.map((sym) => {
              const active = selectedTags.includes(sym);
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => toggleTag(sym)}
                  className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-cyan-500 dark:text-slate-950 dark:border-cyan-500'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  ${sym}
                </button>
              );
            })}
          </div>

          {/* Optional Chart / Image Attachment Preview */}
          {(attachChart || attachedImage) && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B101C] p-3 relative">
              <button
                type="button"
                onClick={() => {
                  setAttachChart(false);
                  setAttachedImage(null);
                }}
                aria-label="Remove attachment"
                className="absolute top-2 right-2 p-1 rounded-md bg-slate-900/80 text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {attachChart && primaryDraftCoin && (
                <div className="flex items-center justify-between text-xs pr-8">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      ${primaryDraftCoin.symbol} Live Chart Snapshot
                    </div>
                    <div className="font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatPrice(primaryDraftCoin.priceUsd, currency, fxRates)} ·{' '}
                      {formatPercent(primaryDraftCoin.change24h)} (24h)
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-500">Attached</span>
                </div>
              )}
              {attachedImage && (
                <img
                  src={attachedImage}
                  alt="Post attachment preview"
                  className="mt-2 max-h-48 rounded-lg object-cover"
                />
              )}
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAttachChart((a) => !a)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                  attachChart
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>Attach Live Chart</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImagePick}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={!draftText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Post</span>
            </button>
          </div>
        </form>

        {/* 3. Feed Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filterTab === tab
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {hashtagFilter && (
            <button
              type="button"
              onClick={() => setHashtagFilter(null)}
              className="inline-flex items-center gap-1 text-xs font-mono text-cyan-500 hover:underline cursor-pointer"
            >
              <span>Filter: {hashtagFilter}</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 2. Interactive Community Feed Cards */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-10 text-center text-xs text-slate-500 dark:text-slate-400">
              No community posts matched this filter yet. Be the first to publish an idea above!
            </div>
          ) : (
            filteredPosts.map((post) => {
              const commentsExpanded = Boolean(openComments[post.id]);
              const isOwnPost = Boolean(currentUser && post.authorId === currentUser.id);
              const displayAuthor = isOwnPost && currentUser ? currentUser.displayName : post.author;
              const displayHandle = isOwnPost && currentUser ? currentUser.username : post.handle;
              const displayAvatarUrl = isOwnPost && currentUser ? currentUser.avatarUrl : post.authorAvatarUrl;
              const displayPresetId = isOwnPost && currentUser ? currentUser.avatarPresetId : undefined;
              const displayWebsite = isOwnPost && currentUser ? currentUser.websiteUrl : post.authorWebsite;

              return (
                <article
                  key={post.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-5 space-y-3.5"
                >
                  {/* Author Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {displayAvatarUrl || displayPresetId ? (
                        <UserAvatar
                          displayName={displayAuthor}
                          avatarUrl={displayAvatarUrl}
                          avatarPresetId={displayPresetId}
                          size="md"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-display text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: post.avatarColor }}
                        >
                          {post.avatarInitials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                            {displayAuthor}
                          </span>
                          {post.verified && (
                            <BadgeCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                          )}
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            {displayHandle}
                          </span>
                          <span className="text-slate-400" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatRelTime(post.timestamp)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                          <span>{post.roleLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-semibold ${
                              post.sentiment === 'bullish'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {post.sentiment === 'bullish' ? 'Bullish View' : 'Bearish View'}
                          </span>
                          {displayWebsite && (
                            <>
                              <span aria-hidden="true">·</span>
                              <a
                                href={displayWebsite}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-cyan-600 dark:text-cyan-400 hover:underline"
                              >
                                <Link2 className="w-3 h-3" />
                                <span className="truncate max-w-[180px]">
                                  {displayWebsite.replace(/^https?:\/\//i, '')}
                                </span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Post Text */}
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* Live Coin Tag Chips + Hashtags */}
                  <div className="flex flex-wrap items-center gap-2">
                    {post.coinTags.map((sym) => {
                      const matched = coins.find(
                        (c) => c.symbol.toUpperCase() === sym.toUpperCase()
                      );
                      return (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => matched && onSelectCoin(matched)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-cyan-400/60 text-xs font-mono cursor-pointer transition-colors"
                        >
                          <span className="font-bold text-slate-900 dark:text-white">${sym}</span>
                          {matched && (
                            <>
                              <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                                {formatPrice(matched.priceUsd, currency, fxRates)}
                              </span>
                              <span
                                className={`tabular-nums font-semibold ${
                                  matched.change24h >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {formatPercent(matched.change24h)}
                              </span>
                            </>
                          )}
                        </button>
                      );
                    })}

                    {post.hashtags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setHashtagFilter(tag)}
                        className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  {/* Optional Attachment */}
                  {(post.attachmentImage || post.attachmentLabel) && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-[#0B101C]">
                      {post.attachmentImage && (
                        <img
                          src={post.attachmentImage}
                          alt={post.attachmentLabel || 'Post media'}
                          referrerPolicy="no-referrer"
                          className="w-full max-h-64 object-cover"
                        />
                      )}
                      {post.attachmentLabel && (
                        <div className="px-3.5 py-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>{post.attachmentLabel}</span>
                          <LineChart className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Interactive Action Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <button
                      type="button"
                      onClick={() => onToggleLike(post.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors ${
                        post.likedByMe ? 'text-rose-500 font-semibold' : ''
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.likedByMe ? 'fill-rose-500' : ''}`} />
                      <span className="font-mono tabular-nums">{post.likes}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="font-mono tabular-nums">{post.comments.length}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleRepost(post.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors ${
                        post.repostedByMe ? 'text-emerald-500 font-semibold' : ''
                      }`}
                    >
                      <Repeat2 className="w-4 h-4" />
                      <span className="font-mono tabular-nums">{post.reposts}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(
                          `${post.author} (${post.handle}): ${post.content}`
                        );
                        onNotifyShare(`Copied post by ${post.handle} to clipboard.`);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>

                  {/* Expandable Comment Drawer */}
                  {commentsExpanded && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      {post.comments.map((cm) => (
                        <div
                          key={cm.id}
                          className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B101C] text-xs space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {cm.author}
                            </span>
                            <span className="font-mono text-slate-400">{cm.handle}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-400">{formatRelTime(cm.timestamp)}</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">{cm.content}</p>
                        </div>
                      ))}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = (commentDrafts[post.id] || '').trim();
                          if (!val) return;
                          onAddComment(post.id, val);
                          setCommentDrafts((prev) => ({ ...prev, [post.id]: '' }));
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={commentDrafts[post.id] || ''}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          placeholder="Write a reply..."
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="submit"
                          className="px-3 py-2 rounded-lg bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 text-xs font-semibold cursor-pointer"
                        >
                          Reply
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Right Sidebar: Trending Hashtags & Community Movers */}
      <aside className="lg:col-span-4 space-y-5">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Trending Hashtags</span>
            </h3>
            <Hash className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {TRENDING_HASHTAGS.map((item) => (
              <button
                key={item.tag}
                type="button"
                onClick={() =>
                  setHashtagFilter((cur) => (cur === item.tag ? null : item.tag))
                }
                className={`w-full py-2.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-colors cursor-pointer ${
                  hashtagFilter === item.tag ? 'bg-cyan-500/10' : ''
                }`}
              >
                <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                  {item.tag}
                </span>
                <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {item.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101624] p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            Most Discussed Assets
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {coins.slice(0, 5).map((coin) => (
              <button
                key={coin.id}
                type="button"
                onClick={() => onSelectCoin(coin)}
                className="w-full py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer"
              >
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  ${coin.symbol}{' '}
                  <span className="font-normal text-slate-500 dark:text-slate-400">
                    {coin.name}
                  </span>
                </span>
                <span
                  className={`font-mono tabular-nums font-semibold ${
                    coin.change24h >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatPercent(coin.change24h)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};
