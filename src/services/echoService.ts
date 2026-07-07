import { supabase } from '../lib/supabase';

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
  'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there',
  'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get',
  'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no',
  'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
  'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
  'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
  'give', 'day', 'most', 'us', 'is', 'are', 'was', 'were', 'been',
  'has', 'had', 'did', 'does', 'am', 'being', 'very', 'much', 'too',
  'really', 'here', 'more', 'still', 'own', 'such', 'should', 'may',
  'might', 'must', 'need', 'through', 'while', 'where', 'before',
  'between', 'each', 'under', 'again', 'why', 'few', 'both', 'those',
  'thing', 'things', 'dont', "don't", 'im', "i'm", 'got', 'let',
  'yes', 'yeah', 'gonna', 'gotta', 'maybe', 'right', 'going',
  'been', 'doing', 'having', 'down', 'off', 'every', 'never',
  'always', 'already', 'yet', 'else', 'many', 'much', 'little',
  'big', 'long', 'great', 'old', 'different', 'same', 'another',
  'last', 'since', 'around', 'however', 'still', 'though', 'might',
  'something', 'nothing', 'everything', 'anything', 'someone',
]);

export type EchoTier = 'weak' | 'strong' | 'resonance';

export interface EchoMatch {
  post: any;
  matchedKeywords: string[];
  keywordCount: number;
  similarityScore: number;
  tier: EchoTier;
}

export function extractKeywords(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s\u00C0-\u024F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(' ').filter(
    (w) => w.length > 2 && !STOP_WORDS.has(w)
  );

  const frequency = new Map<string, number>();
  for (const word of words) {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  }

  return Array.from(frequency.keys());
}

function extractBigrams(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const bigrams = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.add(`${words[i]} ${words[i + 1]}`);
  }
  return bigrams;
}

function computeSimilarity(textA: string, textB: string): number {
  const keywordsA = new Set(extractKeywords(textA));
  const keywordsB = new Set(extractKeywords(textB));

  if (keywordsA.size === 0 || keywordsB.size === 0) return 0;

  let keywordOverlap = 0;
  for (const kw of keywordsA) {
    if (keywordsB.has(kw)) keywordOverlap++;
  }
  const keywordSim =
    keywordOverlap / Math.min(keywordsA.size, keywordsB.size);

  const bigramsA = extractBigrams(textA);
  const bigramsB = extractBigrams(textB);

  if (bigramsA.size === 0 || bigramsB.size === 0) return keywordSim * 100;

  let bigramOverlap = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) bigramOverlap++;
  }
  const bigramSim =
    (2 * bigramOverlap) / (bigramsA.size + bigramsB.size);

  return (keywordSim * 0.6 + bigramSim * 0.4) * 100;
}

export function getMinKeywordsForTier(
  contentLength: number,
  tier: EchoTier
): number {
  const isShort = contentLength <= 100;

  switch (tier) {
    case 'weak':
      return isShort ? 2 : 3;
    case 'strong':
      return isShort ? 3 : 5;
    case 'resonance':
      return isShort ? 2 : 4;
  }
}

function classifyEcho(
  matchedCount: number,
  contentLength: number,
  similarity: number
): EchoTier | null {
  const isShort = contentLength <= 100;

  if (similarity >= 70 && matchedCount >= (isShort ? 2 : 4)) {
    return 'resonance';
  }
  if (matchedCount >= (isShort ? 3 : 5)) {
    return 'strong';
  }
  if (matchedCount >= (isShort ? 2 : 3)) {
    return 'weak';
  }
  return null;
}

export async function loadEchoPosts(
  userId: string,
  tier: EchoTier
): Promise<EchoMatch[]> {
  const { data: userPosts, error: userErr } = await supabase
    .from('posts')
    .select('content')
    .eq('author_id', userId)
    .eq('moderation_reason', 'NONE')
    .order('created_at', { ascending: false })
    .limit(30);

  if (userErr || !userPosts || userPosts.length === 0) return [];

  const userKeywordPool = new Set<string>();
  const userTexts: string[] = [];

  for (const p of userPosts) {
    if (!p.content) continue;
    userTexts.push(p.content);
    for (const kw of extractKeywords(p.content)) {
      userKeywordPool.add(kw);
    }
  }

  if (userKeywordPool.size === 0) return [];

  const combinedUserText = userTexts.join(' ');

  const { data: allPosts, error: postsErr } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey (
        id, name, username, profile_pic_url,
        is_verified, verification_type, verification_reason, profile_type
      )
    `
    )
    .neq('author_id', userId)
    .eq('moderation_reason', 'NONE')
    .order('created_at', { ascending: false })
    .limit(200);

  if (postsErr || !allPosts) return [];

  const matches: EchoMatch[] = [];

  for (const post of allPosts) {
    if (!post.content) continue;

    const postKeywords = extractKeywords(post.content);
    const matched = postKeywords.filter((kw) => userKeywordPool.has(kw));

    const similarity = computeSimilarity(combinedUserText, post.content);
    const echoTier = classifyEcho(
      matched.length,
      post.content.length,
      similarity
    );

    if (!echoTier) continue;

    const meetsFilter =
      tier === 'weak'
        ? echoTier === 'weak' || echoTier === 'strong' || echoTier === 'resonance'
        : tier === 'strong'
          ? echoTier === 'strong' || echoTier === 'resonance'
          : echoTier === 'resonance';

    if (!meetsFilter) continue;

    matches.push({
      post,
      matchedKeywords: matched,
      keywordCount: matched.length,
      similarityScore: Math.round(similarity),
      tier: echoTier,
    });
  }

  matches.sort((a, b) => {
    const tierOrder = { resonance: 3, strong: 2, weak: 1 };
    const tierDiff = tierOrder[b.tier] - tierOrder[a.tier];
    if (tierDiff !== 0) return tierDiff;
    return b.keywordCount - a.keywordCount;
  });

  return matches;
}

export async function enrichEchoPosts(
  matches: EchoMatch[],
  userId: string
): Promise<EchoMatch[]> {
  if (matches.length === 0) return [];

  const postIds = matches.map((m) => m.post.id);

  const [savedRes, reactionsRes] = await Promise.all([
    supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds),
    supabase
      .from('post_reactions')
      .select('post_id, reaction_type')
      .eq('user_id', userId)
      .in('post_id', postIds),
  ]);

  const savedIds = new Set(
    savedRes.data?.map((s) => s.post_id) || []
  );
  const reactionMap = new Map(
    reactionsRes.data?.map((r) => [r.post_id, r.reaction_type]) || []
  );

  return matches.map((m) => ({
    ...m,
    post: {
      ...m.post,
      is_saved: savedIds.has(m.post.id),
      is_reposted: false,
      user_reaction: reactionMap.get(m.post.id) || null,
    },
  }));
}
