export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { hianime } from "@/lib/hianime";

type SupportedServer = "hd-1" | "hd-2" | "megacloud" | "streamsb" | "streamtape";
type SupportedCategory = "sub" | "dub" | "raw";

// Servers that hianime can actually scrape HLS from
const HLS_SERVERS: SupportedServer[] = ["hd-1", "hd-2", "megacloud"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const episodeId = searchParams.get("episodeId");
  const server = (searchParams.get("server") ?? "hd-1") as SupportedServer;
  const category = (searchParams.get("category") ?? "sub") as SupportedCategory;

  if (!episodeId) {
    return Response.json({ error: "episodeId is required" }, { status: 400 });
  }

  const decoded = decodeURIComponent(episodeId);

  // For streamsb/streamtape: hianime can't return HLS but we can signal iframe mode
  if (!HLS_SERVERS.includes(server)) {
    return Response.json({
      success: false,
      iframe: true,
      server,
      data: null,
      message: `${server} is iframe-only`,
    });
  }

  try {
    const data = await hianime.getEpisodeSources(decoded, server, category);

    const sources = data?.sources ?? [];
    const firstSource = sources[0];
    const streamLink = firstSource?.url ?? firstSource?.file ?? null;

    return Response.json({
      success: !!streamLink,
      data: {
        id: episodeId,
        type: category,
        link: streamLink ? { file: streamLink } : null,
        linkType: firstSource?.isM3U8 ? "hls" : null,
        headers: data?.headers ?? {},
        sources,
        subtitles: data?.subtitles ?? [],
        tracks: data?.subtitles ?? [],
        intro: data?.intro ?? null,
        outro: data?.outro ?? null,
        server,
      },
    });
  } catch (err) {
    console.error("[sources] hianime error:", err);
    return Response.json(
      { success: false, data: null, error: "scraper error" },
      { status: 500 },
    );
  }
}
