/** Keys accepted by `GET/PUT /api/content/:moduleKey` (see backend integration guide). */
export const MODULE_KEYS = [
  "blogs",
  "testimonials",
  "team",
  "faq",
  "features",
  "how_it_works",
  "sales_team",
  "proven_impact",
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
  proven_impact: "Proven Impact",
};

export const OVERVIEW_MODULE_LABELS: Record<ModuleKey, string> = MODULE_LABELS;

/** Short subtitle shown under the module title when the simplified CMS chrome is used. */
export const MODULE_SUBTITLES: Record<ModuleKey, string> = {
  blogs: "Create posts and manage published blog content.",
  testimonials: "Add and manage customer testimonials.",
  team: "Manage team member profiles and links.",
  faq: "Manage frequently asked questions.",
  features: "Manage product features and highlights.",
  how_it_works: "Manage how-it-works steps.",
  sales_team: "Manage sales representatives and regions.",
  proven_impact: "Impact statistics, adoption by industry, and testimonial.",
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
    proven_impact: ["stats", "chartData"],
  };

export type NavId = "overview" | ModuleKey;

export function isModuleKey(s: string): s is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(s);
}
