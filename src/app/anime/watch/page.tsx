import React, { Suspense } from "react";
import VideoPlayerSection from "./video-player-section";
import Loading from "@/app/loading";

const page = () => {
  return (
    <Suspense fallback={<Loading />}>
      <VideoPlayerSection />
    </Suspense>
  );
};

export default page;
