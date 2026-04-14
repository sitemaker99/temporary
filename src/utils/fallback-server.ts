import { IEpisodeServers } from "@/types/episodes";

type Preference = {
  server: string;
  key: "sub" | "dub" | "raw";
};

export function getFallbackServer(serversData: IEpisodeServers | undefined): {
  serverName: string;
  key: string;
} {
  // Guard against SSR — localStorage is only available in the browser
  if (typeof window !== "undefined") {
    try {
      const preference = localStorage.getItem("serverPreference");
      if (preference) {
        const parsedPreference = JSON.parse(preference) as Preference;
        if (parsedPreference?.key) {
          const serverList = serversData?.[parsedPreference.key];
          if (serverList && serverList[0]?.serverName) {
            return {
              serverName: serverList[0].serverName,
              key: parsedPreference.key,
            };
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  if (serversData) {
    const keys: Array<"sub" | "dub" | "raw"> = ["sub", "dub", "raw"];
    for (const key of keys) {
      const serverList = serversData[key];
      if (serverList && serverList[0]?.serverName) {
        return {
          serverName: serverList[0].serverName,
          key,
        };
      }
    }
  }

  return { serverName: "", key: "" };
}
