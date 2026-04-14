import { GET_ANIME_DETAILS } from "@/constants/query-keys";
import { api } from "@/lib/api";
import { IAnimeDetails } from "@/types/anime-details";
import { useQuery } from "react-query";

const getAnimeDetails = async (animeId: string) => {
  const res = await api.get("/api/anime/" + animeId);
  return res.data.data as IAnimeDetails;
};

export const useGetAnimeDetails = (animeId: string) => {
  return useQuery({
    queryFn: () => getAnimeDetails(animeId),
    queryKey: [GET_ANIME_DETAILS, animeId],
    enabled: !!animeId && animeId.trim() !== "",
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 15, // 15 min — anime info rarely changes
    cacheTime: 1000 * 60 * 30,
  });
};
