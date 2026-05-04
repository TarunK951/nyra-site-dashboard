import type { ContentModulePayload } from "@/lib/content-api";
import type { ModuleKey } from "@/lib/content-modules";

export type BlogSection =
  | { id: string; type: "text"; text: string }
  | {
      id: string;
      type: "image";
      image: string;
      caption?: string;
    };

export type BlogPost = {
  id: string;
  slug: string;
  category?: string;
  title: string;
  excerpt?: string;
  publishedAt?: string;
  heroImage?: string;
  /** Optional gallery; first entry mirrors `heroImage` for backwards compatibility. */
  heroImages?: string[];
  author?: { name?: string; avatar?: string };
  sections?: BlogSection[];
  status?: string;
  tags?: string[];
  visible?: boolean;
};

export type TestimonialItem = {
  id: string;
  /** API allows only `video` | `text`. */
  type?: "video" | "text";
  quote?: string;
  name?: string;
  role?: string;
  tag?: string;
  mediaUrl?: string;
  /** Optional thumbnail (from upload/register response `poster_url`). */
  posterUrl?: string;
  visible?: boolean;
};

export type TeamMember = {
  id: string;
  /** Display order when listing team members (lower first). Omitted values sort last. */
  index?: number;
  /** Card hashtag (e.g. #CEO). Normalized on save; when empty, UI derives from role. */
  hashtag?: string;
  name?: string;
  role?: string;
  tagline?: string;
  image?: string;
  email?: string;
  social?: {
    linkedin?: string;
    github?: string;
    instagram?: string;
    facebook?: string;
    [key: string]: unknown;
  };
  visible?: boolean;
};

export type FaqItem = {
  id: string;
  question?: string;
  answer?: string;
  visible?: boolean;
};

export type FeatureItem = {
  id: string;
  title?: string;
  description?: string;
  icon?: string;
  colSpan?: number;
  image?: string;
  visible?: boolean;
};

export type HowItWorksStep = {
  id: string;
  number?: number;
  title?: string;
  shortLabel?: string;
  description?: string;
  icon?: string;
  visible?: boolean;
};

export type SalesRep = {
  id: string;
  name?: string;
  designation?: string;
  image?: string;
  email?: string;
  phone?: string;
  regions?: string[];
  social?: { linkedin?: string; [key: string]: unknown };
  visible?: boolean;
};

export type ImpactStat = {
  id: string;
  value: string;
  label: string;
};

export type ImpactChartItem = {
  id: string;
  label: string;
  percentage: number;
};

export type ImpactQuote = {
  text: string;
  author: string;
  role: string;
};

export type ProvenImpactData = {
  stats: ImpactStat[];
  chartData: ImpactChartItem[];
  quote: ImpactQuote;
};

function asArray<T>(v: unknown): T[] {
  if (!Array.isArray(v)) return [];
  return v as T[];
}

export function getContentRecord(mod: ContentModulePayload): Record<string, unknown> {
  const c = mod.content;
  if (!c || typeof c !== "object") return {};
  return c as Record<string, unknown>;
}

export function getCollectionItems<T>(
  mod: ContentModulePayload,
  collectionKey: string,
): T[] {
  const o = getContentRecord(mod);
  return asArray<T>(o[collectionKey]);
}

export function blogsPosts(mod: ContentModulePayload): BlogPost[] {
  return getCollectionItems<BlogPost>(mod, "posts");
}

export function testimonialItems(mod: ContentModulePayload): TestimonialItem[] {
  return getCollectionItems<TestimonialItem>(mod, "items");
}

/** Normalize hashtag input for storage / display (leading #, A–Z, 0–9, _). */
export function normalizeTeamMemberHashtag(
  raw: string | undefined,
): string | undefined {
  const t = (raw ?? "").trim();
  if (!t) return undefined;
  const body = t
    .replace(/^#+/, "")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "");
  if (!body) return undefined;
  return `#${body.slice(0, 24)}`;
}

/** Hashtag shown on team marketing cards and dashboard cards. */
export function teamMemberHashtagLabel(m: TeamMember): string {
  const fromField = normalizeTeamMemberHashtag(m.hashtag);
  if (fromField) return fromField;
  const role = (m.role ?? "").trim();
  const r = role.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  if (!r) return "#TEAM";
  return `#${r.slice(0, 14)}`;
}

function sortKeyIndex(index: unknown): number {
  if (typeof index === "number" && Number.isFinite(index)) return index;
  return Number.POSITIVE_INFINITY;
}

export function teamMembers(mod: ContentModulePayload): TeamMember[] {
  const raw = getCollectionItems<TeamMember>(mod, "members");
  return [...raw].sort((a, b) => {
    const da = sortKeyIndex(a.index);
    const db = sortKeyIndex(b.index);
    if (da !== db) return da - db;
    return String(a.id ?? "").localeCompare(String(b.id ?? ""));
  });
}

export function faqItems(mod: ContentModulePayload): FaqItem[] {
  return getCollectionItems<FaqItem>(mod, "items");
}

export function featureItems(mod: ContentModulePayload): FeatureItem[] {
  return getCollectionItems<FeatureItem>(mod, "items");
}

export function howItWorksSteps(mod: ContentModulePayload): HowItWorksStep[] {
  return getCollectionItems<HowItWorksStep>(mod, "steps");
}

export function salesReps(mod: ContentModulePayload): SalesRep[] {
  return getCollectionItems<SalesRep>(mod, "reps");
}

export function getProvenImpactData(mod: ContentModulePayload): ProvenImpactData {
  const o = getContentRecord(mod);
  return {
    stats: asArray<ImpactStat>(o.stats),
    chartData: asArray<ImpactChartItem>(o.chartData),
    quote: (o.quote as ImpactQuote) || { text: "", author: "", role: "" },
  };
}

/** Count of primary content entries per module (posts, list entries, etc.). */
export function getModuleItemCount(
  mod: ContentModulePayload,
  key: ModuleKey,
): number {
  switch (key) {
    case "blogs":
      return blogsPosts(mod).length;
    case "testimonials":
      return testimonialItems(mod).length;
    case "team":
      return teamMembers(mod).length;
    case "faq":
      return faqItems(mod).length;
    case "features":
      return featureItems(mod).length;
    case "how_it_works":
      return howItWorksSteps(mod).length;
    case "sales_team":
      return salesReps(mod).length;
    case "proven_impact": {
      const pi = getProvenImpactData(mod);
      const q = pi.quote;
      const hasQuote =
        Boolean((q.text ?? "").trim()) ||
        Boolean((q.author ?? "").trim()) ||
        Boolean((q.role ?? "").trim());
      return (
        pi.stats.length +
        pi.chartData.length +
        (hasQuote ? 1 : 0)
      );
    }
    default:
      return 0;
  }
}

/** Collection route segment per module (first primary collection for multi-collection modules). */
export function primaryCollectionForModule(key: ModuleKey): string {
  switch (key) {
    case "blogs":
      return "posts";
    case "testimonials":
    case "faq":
    case "features":
      return "items";
    case "team":
      return "members";
    case "how_it_works":
      return "steps";
    case "sales_team":
      return "reps";
    case "proven_impact":
      return "stats";
    default:
      return "items";
  }
}

export function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
