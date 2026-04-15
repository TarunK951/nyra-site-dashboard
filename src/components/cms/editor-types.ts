import type { ContentModulePayload } from "@/lib/content-api";
import type { ModuleKey } from "@/lib/content-modules";

export type EditorProps = {
  token: string;
  moduleKey: ModuleKey;
  moduleData: ContentModulePayload;
  onModuleUpdated: (m: ContentModulePayload) => void;
  reloadModule: () => Promise<void>;
  onError: (message: string) => void;
};
