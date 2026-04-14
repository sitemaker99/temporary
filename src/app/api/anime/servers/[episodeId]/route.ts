export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { hianime } from "@/lib/hianime";

/**
 * Handles path-style server lookups:
 *   GET /api/anime/servers/[episodeId]?ep=161929
 * This matches the URL shape that useApi.ts builds when CF_BACKEND_URL
 * defaults to /api/anime/ (i.e. `${CF_BACKEND_URL}servers/${episodeId}?ep=XXX`).
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ episodeId: string }> },
) {
  try {
    const params = await props.params;
    const { searchParams } = new URL(req.url);
    const ep = searchParams.get("ep");

    const rawId = decodeURIComponent(params.episodeId);
    // Reconstruct the full episodeId hianime expects: "slug?ep=NUMBER"
    const fullId = ep ? `${rawId}?ep=${ep}` : rawId;

    const data = await hianime.getEpisodeServers(fullId);
    return Response.json({ data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "something went wrong" }, { status: 500 });
  }
}
