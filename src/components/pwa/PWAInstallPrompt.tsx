"use client";

import { useEffect, useState } from "react";
import { X, Download, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      // Don't show again for 3 days
      if (Date.now() - dismissedTime < 3 * 24 * 60 * 60 * 1000) return;
    }

    // iOS detection
    const ua = window.navigator.userAgent;
    const iosDevice = /iphone|ipad|ipod/i.test(ua);
    const notInStandalone = !("standalone" in window.navigator && (window.navigator as any).standalone);
    if (iosDevice && notInStandalone) {
      setIsIOS(true);
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Android / Chrome — listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", Date.now().toString());
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-3 animate-in slide-in-from-bottom duration-300">
      <div className="relative max-w-lg mx-auto rounded-2xl overflow-hidden shadow-2xl">
        {/* Background */}
        <div className="absolute inset-0 bg-[#0d0f1a] border border-white/10 rounded-2xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-pink-900/10 rounded-2xl" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-pink-500 to-red-500 rounded-t-2xl" />

        <div className="relative p-4 flex items-center gap-3">
          {/* Icon */}
          <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center shadow-lg">
            <Smartphone size={22} className="text-white" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Install Aniflix</p>
            {isIOS ? (
              <p className="text-gray-400 text-xs mt-0.5">
                Tap <span className="text-white font-medium">Share</span> then{" "}
                <span className="text-white font-medium">Add to Home Screen</span>
              </p>
            ) : (
              <p className="text-gray-400 text-xs mt-0.5">
                Add to your home screen for the best experience
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {!isIOS && (
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white text-xs font-semibold rounded-lg transition-all"
              >
                <Download size={13} />
                Install
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
