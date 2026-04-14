import { useAuthStore } from "@/store/auth-store";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getDbInstance } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  limit,
} from "firebase/firestore";

type Props = {
  animeID?: string;
  status?: string;
  page?: number;
  per_page?: number;
  populate?: boolean;
};

export type Bookmark = {
  id: string;
  user: string;
  animeId: string;
  thumbnail: string;
  animeTitle: string;
  status: string;
  created: any;
  updated: any;
  expand: {
    watchHistory: WatchHistory[];
  };
};

export type WatchHistory = {
  id: string;
  current: number;
  timestamp: number;
  episodeId: string;
  episodeNumber: number;
  created: string;
};

function useBookMarks({ animeID, status, page = 1, per_page = 20, populate = true }: Props) {
  const { auth } = useAuthStore();
  const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!populate || !auth) {
      setIsLoading(false);
      return;
    }

    const getBookmarks = async () => {
      try {
        setIsLoading(true);
        const db = getDbInstance();

        const constraints: any[] = [where("user", "==", auth.id)];
        if (animeID) constraints.push(where("animeId", "==", animeID));
        if (status) constraints.push(where("status", "==", status));

        const q = query(collection(db, "bookmarks"), ...constraints);
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setBookmarks(null);
          setTotalPages(0);
        } else {
          const items: Bookmark[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Bookmark, "id">),
            expand: { watchHistory: [] },
          }));

          // Sort client-side newest first
          items.sort((a, b) => {
            const aTime = a.updated?.toMillis?.() ?? 0;
            const bTime = b.updated?.toMillis?.() ?? 0;
            return bTime - aTime;
          });

          setBookmarks(items);
          setTotalPages(Math.ceil(items.length / per_page));
        }
      } catch (error) {
        console.error("Bookmark fetch error:", error);
        setBookmarks(null);
      } finally {
        setIsLoading(false);
      }
    };

    getBookmarks();
  }, [animeID, status, page, per_page, auth, populate]);

  const createOrUpdateBookMark = async (
    animeID: string,
    animeTitle: string,
    animeThumbnail: string,
    status: string,
    showToast: boolean = true
  ): Promise<string | null> => {
    if (!auth) return null;

    try {
      const db = getDbInstance();
      const q = query(
        collection(db, "bookmarks"),
        where("user", "==", auth.id),
        where("animeId", "==", animeID),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const existing = snapshot.docs[0];
        if (existing.data().status === status) {
          if (showToast) toast.info("Already in this list");
          return existing.id;
        }
        await updateDoc(doc(db, "bookmarks", existing.id), {
          status,
          updated: serverTimestamp(),
        });
        if (showToast) toast.success("Status updated! 📚");
        return existing.id;
      } else {
        const ref = await addDoc(collection(db, "bookmarks"), {
          user: auth.id,
          animeId: animeID,
          animeTitle,
          thumbnail: animeThumbnail,
          status,
          created: serverTimestamp(),
          updated: serverTimestamp(),
        });
        if (showToast) toast.success("Added to list! 📚");
        return ref.id;
      }
    } catch (error) {
      console.error("Bookmark error:", error);
      return null;
    }
  };

  const syncWatchProgress = async (
    bookmarkId: string | null,
    watchedRecordId: string | null,
    episodeData: {
      episodeId: string;
      episodeNumber: number;
      current: number;
      duration: number;
    }
  ): Promise<string | null> => {
    if (!auth || !bookmarkId) return watchedRecordId;

    try {
      const db = getDbInstance();
      const dataToSave = {
        episodeId: episodeData.episodeId,
        episodeNumber: episodeData.episodeNumber,
        current: Math.round(episodeData.current),
        timestamp: Math.round(episodeData.duration),
        bookmarkId,
        user: auth.id,
        updated: serverTimestamp(),
      };

      if (watchedRecordId) {
        await updateDoc(doc(db, "watched", watchedRecordId), dataToSave);
        return watchedRecordId;
      } else {
        const ref = await addDoc(collection(db, "watched"), {
          ...dataToSave,
          created: serverTimestamp(),
        });
        await updateDoc(doc(db, "bookmarks", bookmarkId), {
          lastWatchedEpisode: episodeData.episodeNumber,
          updated: serverTimestamp(),
        });
        return ref.id;
      }
    } catch (error) {
      console.error("Watch progress sync error:", error);
      return watchedRecordId;
    }
  };

  return { bookmarks, syncWatchProgress, createOrUpdateBookMark, totalPages, isLoading };
}

export default useBookMarks;
