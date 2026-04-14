"use client";

import React, { useState } from "react";
import { CirclePlay, X } from "lucide-react";
import Button from "./common/custom-button";
import { AnimatePresence, motion } from "framer-motion";

const WatchTrailer = ({ videoHref }: { videoHref: string }) => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  if (!videoHref) return <></>;

  return (
    <>
      <Button
        className="absolute md:flex hidden md:bottom-10 md:right-10 bottom-4 right-4 m-auto z-10"
        LeftIcon={CirclePlay}
        onClick={() => setIsVideoOpen((prev) => !prev)}
      >
        Watch Trailer
      </Button>
      <AnimatePresence>
        {isVideoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsVideoOpen(false)}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl aspect-video mx-4 md:mx-0"
            >
              <button
                onClick={() => setIsVideoOpen(false)}
                className="absolute -top-12 right-0 text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full p-2 transition-colors"
              >
                <X className="size-5" />
              </button>
              <div className="size-full border border-white/20 rounded-2xl overflow-hidden relative">
                <iframe
                  src={videoHref}
                  className="size-full rounded-2xl"
                  allowFullScreen
                  // Only the minimum permissions YouTube needs to play a video
                  // Removed: clipboard-write, gyroscope, accelerometer, web-share
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  // No popups, no top-navigation
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-fullscreen"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WatchTrailer;
