import { GET_ALL_EPISODES } from "@/constants/query-keys";
import { api } from "@/lib/api";
import { IEpisodes } from "@/types/episodes";
import { useQuery } from "react-query";

const getAllEpisodes = async (animeId: string) => {
  const res = await api.get(`/api/anime/${animeId}/episodes`);
  return res.data.data as IEpisodes;
};

export const useGetAllEpisodes = (animeId: string | undefined | null) => {
  return useQuery({
    queryFn: () => getAllEpisodes(animeId as string),
    queryKey: [GET_ALL_EPISODES, animeId],
    enabled: !!animeId && animeId !== "undefined",
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });
};
