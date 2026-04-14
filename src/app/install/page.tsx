"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Smartphone, Monitor, ArrowLeft, CheckCircle2, Share, MoreVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Platform = "android" | "ios" | "desktop" | null;

function detectPlatform(): Platform {
  if (typeof window === "undefined") return null;
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}

const steps = {
  android: [
    {
      icon: "1",
      title: "Open in Chrome",
      desc: "Make sure you're using Chrome browser on your Android device.",
    },
    {
      icon: "2",
      title: 'Tap the menu "⋮"',
      desc: 'Tap the three-dot menu in the top-right corner of Chrome.',
    },
    {
      icon: "3",
      title: '"Add to Home screen"',
      desc: 'Tap "Add to Home screen" from the dropdown menu.',
    },
    {
      icon: "4",
      title: "Tap Add",
      desc: 'Confirm by tapping "Add". Aniflix will appear on your home screen like a native app.',
    },
  ],
  ios: [
    {
      icon: "1",
      title: "Open in Safari",
      desc: "Make sure you're using Safari — Chrome on iOS doesn't support PWA install.",
    },
    {
      icon: "2",
      title: "Tap the Share button",
      desc: 'Tap the Share icon (square with arrow pointing up) at the bottom of your screen.',
    },
    {
      icon: "3",
      title: '"Add to Home Screen"',
      desc: 'Scroll down in the share sheet and tap "Add to Home Screen".',
    },
    {
      icon: "4",
      title: "Tap Add",
      desc: 'Tap "Add" in the top right. Aniflix will appear on your home screen.',
    },
  ],
  desktop: [
    {
      icon: "1",
      title: "Open in Chrome or Edge",
      desc: "Use Google Chrome or Microsoft Edge for the best install experience.",
    },
    {
      icon: "2",
      title: "Look for the install icon",
      desc: 'Click the install icon (⊕) in the address bar on the right side.',
    },
    {
      icon: "3",
      title: "Click Install",
      desc: 'Click "Install" in the popup. Aniflix will open as a standalone app.',
    },
  ],
};

const features = [
  "No browser bar — full screen experience",
  "Works offline for previously loaded pages",
  "Instant launch from home screen",
  "Looks and feels like a native app",
  "No app store needed — completely free",
];

export default function InstallPage() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }
  }, []);

  const currentSteps = steps[platform ?? "android"];

  return (
    <div className="min-h-screen bg-[#0a0a10] pt-20 pb-16 px-4">
      <div className="max-w-lg mx-auto">

        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Aniflix
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-red-500/30 rounded-full blur-xl" />
            <Image src="/icon.png" alt="Aniflix" width={72} height={72} className="relative rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Install{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-500">
              Aniflix
            </span>
          </h1>
          <p className="text-gray-400 text-sm">
            Add Aniflix to your home screen for the fastest, most app-like experience — no app store required.
          </p>
        </div>

        {/* Already installed */}
        {installed && (
          <div className="mb-6 p-4 rounded-xl bg-green-900/20 border border-green-500/30 flex items-center gap-3">
            <CheckCircle2 className="text-green-400 shrink-0" size={20} />
            <p className="text-green-300 text-sm font-medium">
              Aniflix is already installed on your device!
            </p>
          </div>
        )}

        {/* Platform selector */}
        <div className="flex gap-2 mb-6">
          {(["android", "ios", "desktop"] as Platform[]).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-xs font-semibold capitalize transition-all",
                platform === p
                  ? "bg-gradient-to-r from-red-600 to-pink-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
              )}
            >
              {p === "android" ? "📱 Android" : p === "ios" ? "🍎 iOS" : "💻 Desktop"}
            </button>
          ))}
        </div>

        {/* Steps */}
        <div className="relative mb-8">
          <div className="absolute left-5 top-8 bottom-8 w-px bg-gradient-to-b from-red-500/50 to-pink-500/10" />
          <div className="space-y-4">
            {currentSteps.map((step, idx) => (
              <div key={idx} className="flex gap-4 items-start">
                <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-red-900/30 z-10">
                  {step.icon}
                </div>
                <div className="flex-1 bg-white/3 border border-white/8 rounded-xl p-3.5 mt-1">
                  <p className="text-white font-semibold text-sm mb-0.5">{step.title}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* iOS share icon hint */}
        {platform === "ios" && (
          <div className="mb-6 p-3 rounded-xl bg-blue-900/20 border border-blue-500/20 flex items-center gap-3">
            <Share size={18} className="text-blue-400 shrink-0" />
            <p className="text-blue-300 text-xs">
              The Share button looks like a box with an upward arrow at the bottom centre of Safari.
            </p>
          </div>
        )}

        {/* Features */}
        <div className="relative rounded-2xl overflow-hidden p-5 mb-6">
          <div className="absolute inset-0 bg-white/3 border border-white/8 rounded-2xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 to-transparent rounded-2xl" />
          <div className="relative">
            <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Smartphone size={16} className="text-red-400" />
              Why install?
            </p>
            <ul className="space-y-2">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-300 text-xs">
                  <CheckCircle2 size={13} className="text-red-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/"
          className="block w-full py-3 text-center text-white font-semibold bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 rounded-xl transition-all text-sm"
        >
          Start Watching
        </Link>
      </div>
    </div>
  );
}
