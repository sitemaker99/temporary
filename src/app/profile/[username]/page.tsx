"use client";
import React, { useEffect } from "react";
import Container from "@/components/container";
import Avatar from "@/components/common/avatar";
import { useAuthHydrated, useAuthStore } from "@/store/auth-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AnimeLists from "./components/anime-lists";
import AnimeHeatmap from "./components/anime-heatmap";
import Loading from "@/app/loading";
import AnilistImport from "./components/anilist-import";
import { updateUserData } from "@/lib/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "@/lib/firebase";

function ProfilePage() {
  const { auth, setAuth } = useAuthStore();
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const hasHydrated = useAuthHydrated();

  useEffect(() => {
    if (hasHydrated && !auth) {
      router.replace("/");
    }
  }, [auth, hasHydrated, router]);

  if (!hasHydrated) return <Loading />;
  if (!auth) return null;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Upload to Firebase Storage
      const storage = getStorage();
      const storageRef = ref(storage, `avatars/${auth.id}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firestore
      await updateUserData(auth.id, { avatar: downloadURL });
      setAuth({ ...auth, avatar: downloadURL });
      toast.success("Avatar updated! 🎌");
    } catch (err) {
      toast.error("Failed to update avatar");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a10] pt-16">
      {/* Profile Banner */}
      <div className="w-full h-48 md:h-64 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-900/40 via-[#1a0a2e] to-pink-900/30" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a10] to-transparent" />
      </div>

      <Container className="min-h-[70vh] -mt-16 flex flex-col md:flex-row gap-8 md:gap-10">
        {/* Left: Avatar + info */}
        <div className="flex flex-col items-center gap-4 w-full md:w-64 shrink-0">
          <div className="relative group">
            <Avatar
              className="w-32 h-32 cursor-pointer ring-4 ring-[#0a0a10] shadow-xl"
              username={auth.username}
              url={auth.avatar}
              onClick={() => fileInputRef.current?.click()}
            />
            <div
              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="text-white text-xs font-medium">Change</span>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">@{auth.username}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{auth.email}</p>
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Import:</span>
              <AnilistImport />
            </div>
          </div>
          <Tabs defaultValue="watching" className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 bg-white/5 border border-white/10">
              <TabsTrigger value="watching" className="text-xs data-[state=active]:bg-red-600 data-[state=active]:text-white">Watching</TabsTrigger>
              <TabsTrigger value="plan-to-watch" className="text-xs data-[state=active]:bg-red-600 data-[state=active]:text-white">Plan To Watch</TabsTrigger>
              <TabsTrigger value="on-hold" className="text-xs data-[state=active]:bg-red-600 data-[state=active]:text-white">On Hold</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs data-[state=active]:bg-red-600 data-[state=active]:text-white">Completed</TabsTrigger>
              <TabsTrigger value="dropped" className="text-xs data-[state=active]:bg-red-600 data-[state=active]:text-white">Dropped</TabsTrigger>
            </TabsList>
            <TabsContent value="watching" className="mt-4"><AnimeLists status="watching" /></TabsContent>
            <TabsContent value="plan-to-watch" className="mt-4"><AnimeLists status="plan to watch" /></TabsContent>
            <TabsContent value="on-hold" className="mt-4"><AnimeLists status="on hold" /></TabsContent>
            <TabsContent value="completed" className="mt-4"><AnimeLists status="completed" /></TabsContent>
            <TabsContent value="dropped" className="mt-4"><AnimeLists status="dropped" /></TabsContent>
          </Tabs>

          <div className="my-16">
            <AnimeHeatmap />
          </div>
        </div>
      </Container>
    </div>
  );
}

export default ProfilePage;
