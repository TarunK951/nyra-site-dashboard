import {
  fetchModule,
  type ContentModulePayload,
} from "@/lib/content-api";
import type { ModuleKey } from "@/lib/content-modules";

/**
 * After mutations, always reload the module from GET so tables reflect server state.
 * Mutation responses often omit full `content` or return alternate shapes; relying on
 * them leaves the UI stale until a full reload.
 */
export async function ensureModuleAfterMutation(
  token: string,
  moduleKey: ModuleKey,
  maybe: ContentModulePayload | null,
): Promise<ContentModulePayload> {
  try {
    return await fetchModule(token, moduleKey);
  } catch (e) {
    if (maybe) return maybe;
    throw e;
  }
}
