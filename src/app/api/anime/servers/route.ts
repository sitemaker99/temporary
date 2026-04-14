export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { hianime } from "@/lib/hianime";

/**
 * Anveshna-compatible /api/anime/servers endpoint.
 * Accepts ?episodeId= and returns server list in anveshna's shape.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const episodeId = searchParams.get("episodeId") as string;
    const ep = searchParams.get("ep");

    if (!episodeId) {
      return Response.json({ error: "episodeId is required" }, { status: 400 });
    }

    const fullId = ep ? `${episodeId}?ep=${ep}` : episodeId;
    const data = await hianime.getEpisodeServers(decodeURIComponent(fullId));

    return Response.json({ data });
  } catch (err) {
    console.log(err);
    return Response.json({ error: "something went wrong" }, { status: 500 });
  }
}
