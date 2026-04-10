/** Keys accepted by `GET/PUT /api/content/:moduleKey` (see backend integration guide). */
export const MODULE_KEYS = [
  "blogs",
  "testimonials",
  "team",
  "faq",
  "features",
  "how_it_works",
  "sales_team",
  "hospitals_bundle",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  blogs: "Blogs",
  testimonials: "Testimonials",
  team: "Team",
  faq: "FAQ",
  features: "Features",
  how_it_works: "How it works",
  sales_team: "Sales team",
  hospitals_bundle: "Hospitals",
};

/** Primary collection id per module (for `/items/:collection` routes). */
export const COLLECTION_BY_MODULE: Record<ModuleKey, string | readonly string[]> =
  {
    blogs: "posts",
    testimonials: "items",
    team: "members",
    faq: "items",
    features: "items",
    how_it_works: "steps",
    sales_team: "reps",
    hospitals_bundle: ["categories", "hospitals"],
  };

export type NavId = "overview" | ModuleKey;

export function isModuleKey(s: string): s is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(s);
}
