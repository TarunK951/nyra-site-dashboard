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
  author?: { name?: string; avatar?: string };
  sections?: BlogSection[];
  status?: string;
  tags?: string[];
  visible?: boolean;
};

export type TestimonialItem = {
  id: string;
  type?: string;
  quote?: string;
  name?: string;
  role?: string;
  tag?: string;
  visible?: boolean;
};

export type TeamMember = {
  id: string;
  name?: string;
  role?: string;
  tagline?: string;
  image?: string;
  social?: { linkedin?: string; [key: string]: unknown };
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

export type HospitalCategory = {
  id: string;
  label?: string;
  icon?: string;
  description?: string;
  visible?: boolean;
};

export type HospitalLocation = {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

export type HospitalContact = {
  phone?: string;
  email?: string;
  website?: string;
};

export type HospitalMeta = {
  rating?: number;
  reviewCount?: number;
  emergency?: boolean;
  [key: string]: unknown;
};

export type WorkingDay = {
  open?: string;
  close?: string;
  closed?: boolean;
};

export type Doctor = {
  id: string;
  name?: string;
  specialty?: string;
  qualification?: string;
  experience?: string;
  image?: string;
  bio?: string;
  languages?: string[];
  social?: { linkedin?: string; [key: string]: unknown };
  visible?: boolean;
};

export type Hospital = {
  id: string;
  slug?: string;
  name?: string;
  category?: string;
  tagline?: string;
  image?: string;
  location?: HospitalLocation;
  contact?: HospitalContact;
  meta?: HospitalMeta;
  workingHours?: Record<string, WorkingDay>;
  facilities?: string[];
  doctors?: Doctor[];
  visible?: boolean;
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

export function teamMembers(mod: ContentModulePayload): TeamMember[] {
  return getCollectionItems<TeamMember>(mod, "members");
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

export function hospitalCategories(mod: ContentModulePayload): HospitalCategory[] {
  return getCollectionItems<HospitalCategory>(mod, "categories");
}

export function hospitals(mod: ContentModulePayload): Hospital[] {
  return getCollectionItems<Hospital>(mod, "hospitals");
}

/** Count of primary content entries per module (posts, items, hospitals, etc.). */
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
    case "hospitals_bundle":
      return hospitals(mod).length;
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
    case "hospitals_bundle":
      return "categories";
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
