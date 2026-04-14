"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

import Container from "./container";
import { Separator } from "./ui/separator";

import { nightTokyo } from "@/utils/fonts";
import { ROUTES } from "@/constants/routes";
import React, { ReactNode, useEffect, useState } from "react";

import SearchBar from "./search-bar";
import { MenuIcon, X, Home, Search, Calendar, Download } from "lucide-react";
import useScrollPosition from "@/hooks/use-scroll-position";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import LoginPopoverButton from "./login-popover-button";
import { useAuthStore } from "@/store/auth-store";
import NavbarAvatar from "./navbar-avatar";

const menuItems: Array<{ title: string; href?: string; icon?: React.ReactNode }> = [
  { title: "Home", href: ROUTES.HOME, icon: <Home size={16} /> },
  { title: "Search", href: ROUTES.SEARCH + '?q=""', icon: <Search size={16} /> },
  { title: "Schedule", href: ROUTES.SCHEDULE, icon: <Calendar size={16} /> },
  { title: "Install App", href: "/install", icon: <Download size={16} /> },
];

const NavBar = () => {
  const authStore = useAuthStore();
  const { y } = useScrollPosition();
  const isHeaderSticky = y > 0;
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <div
        className={cn([
          "h-fit w-full fixed top-0 z-[100] duration-300",
          isHeaderSticky
            ? "bg-clip-padding backdrop-filter backdrop-blur-xl bg-[#0a0a0f]/90 border-b border-white/5 shadow-[0_1px_20px_rgba(0,0,0,0.4)]"
            : "bg-gradient-to-b from-[#0a0a0f]/80 to-transparent",
        ])}
      >
        <Container className="flex items-center justify-between py-2.5 gap-3 lg:gap-8">
          {/* Logo */}
          <Link href={ROUTES.HOME} className="flex items-center gap-2 cursor-pointer shrink-0 group">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/30 rounded-full blur-md group-hover:bg-red-500/50 transition-all duration-300" />
              <Image src="/icon.png" alt="Aniflix logo" width={32} height={32} className="relative" />
            </div>
            <h1
              className={cn([
                nightTokyo.className,
                "text-lg lg:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-500 tracking-widest hidden xs:block",
              ])}
            >
              Aniflix
            </h1>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 ml-2">
            {menuItems.map((menu, idx) => (
              <Link
                href={menu.href || "#"}
                key={idx}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-all duration-200 font-medium whitespace-nowrap px-3 py-2 rounded-lg hover:bg-white/5"
              >
                {menu.icon}
                {menu.title}
              </Link>
            ))}
          </nav>

          {/* Desktop: Search + Auth */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <div className="w-60 xl:w-72">
              <SearchBar />
            </div>
            {authStore.auth ? (
              <NavbarAvatar auth={authStore} />
            ) : (
              <LoginPopoverButton />
            )}
          </div>

          {/* Mobile: search icon + hamburger + avatar */}
          <div className="lg:hidden flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-300"
              aria-label="Search"
            >
              <Search size={18} />
            </button>
            <MobileMenuSheet trigger={
              <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-300">
                <MenuIcon suppressHydrationWarning size={18} />
              </div>
            } />
            {authStore.auth ? (
              <NavbarAvatar auth={authStore} />
            ) : (
              <LoginPopoverButton />
            )}
          </div>
        </Container>
      </div>

      {/* Mobile search overlay */}
      <MobileSearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

const MobileSearchOverlay = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  useEffect(() => {
    if (open) {
      // Small delay so the animation starts before focus
      const t = setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>(".mobile-search-overlay input");
        input?.focus();
      }, 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="mobile-search-overlay fixed inset-0 z-[200] lg:hidden"
      style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", background: "rgba(8,8,14,0.96)" }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/8">
        <div className="flex-1">
          <SearchBar onAnimeClick={onClose} />
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-300 shrink-0"
          aria-label="Close search"
        >
          <X size={18} />
        </button>
      </div>
      {/* Hint text */}
      <div className="px-4 pt-5 text-xs text-gray-600 text-center">
        Type to search · Press Enter to see all results
      </div>
    </div>
  );
};

const MobileMenuSheet = ({ trigger }: { trigger: ReactNode }) => {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        className="flex flex-col w-[80vw] max-w-[300px] z-[150] bg-[#0d0f1a] border-white/8"
        hideCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <div className="w-full h-full relative flex flex-col">
          <div className="flex items-center justify-between pt-4 pb-2 px-0">
            <div className="flex items-center gap-2">
              <Image src="/icon.png" alt="logo" width={28} height={28} />
              <span className={cn(nightTokyo.className, "text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-500 tracking-widest")}>
                Aniflix
              </span>
            </div>
            <SheetClose className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              <X size={18} />
            </SheetClose>
          </div>
          
          <Separator className="bg-white/8 mb-4" />

          <div className="flex flex-col gap-1 flex-1">
            {menuItems.map((menu, idx) => (
              <Link
                href={menu.href || "#"}
                key={idx}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors px-2 py-3 rounded-lg"
              >
                <span className="text-gray-500">{menu.icon}</span>
                {menu.title}
              </Link>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NavBar;
