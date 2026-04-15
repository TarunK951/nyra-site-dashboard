"use client";

import type { ContentModulePayload } from "@/lib/content-api";
import type { ModuleKey } from "@/lib/content-modules";
import type { EditorProps } from "@/components/cms/editor-types";
import { BlogsEditor } from "@/components/cms/editors/BlogsEditor";
import { FaqEditor } from "@/components/cms/editors/FaqEditor";
import { FeaturesEditor } from "@/components/cms/editors/FeaturesEditor";
import { HospitalsEditor } from "@/components/cms/editors/HospitalsEditor";
import { HowItWorksEditor } from "@/components/cms/editors/HowItWorksEditor";
import { SalesTeamEditor } from "@/components/cms/editors/SalesTeamEditor";
import { TeamEditor } from "@/components/cms/editors/TeamEditor";
import { TestimonialsEditor } from "@/components/cms/editors/TestimonialsEditor";

type Props = {
  moduleKey: ModuleKey;
  token: string;
  moduleData: ContentModulePayload;
  onModuleUpdated: (m: ContentModulePayload) => void;
  reloadModule: () => Promise<void>;
  onError: (message: string) => void;
};

export function ModuleWorkspace({
  moduleKey,
  token,
  moduleData,
  onModuleUpdated,
  reloadModule,
  onError,
}: Props) {
  const common: EditorProps = {
    token,
    moduleKey,
    moduleData,
    onModuleUpdated,
    reloadModule,
    onError,
  };

  switch (moduleKey) {
    case "blogs":
      return <BlogsEditor {...common} />;
    case "testimonials":
      return <TestimonialsEditor {...common} />;
    case "team":
      return <TeamEditor {...common} />;
    case "faq":
      return <FaqEditor {...common} />;
    case "features":
      return <FeaturesEditor {...common} />;
    case "how_it_works":
      return <HowItWorksEditor {...common} />;
    case "sales_team":
      return <SalesTeamEditor {...common} />;
    case "hospitals_bundle":
      return <HospitalsEditor {...common} />;
    default: {
      const _exhaustive: never = moduleKey;
      return _exhaustive;
    }
  }
}
