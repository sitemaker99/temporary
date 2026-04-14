"use client";

import React from "react";
import Avatar from "./common/avatar";
import { IAuthStore } from "@/store/auth-store";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import Link from "next/link";
import { User, LogOut } from "lucide-react";
import { logout } from "@/lib/firebase";
import { toast } from "sonner";

type Props = {
  auth: IAuthStore;
};

function NavbarAvatar({ auth }: Props) {
  const [open, setOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      auth.clearAuth();
      toast.success("Logged out. See you next time! 👋");
    } catch {
      toast.error("Logout failed");
    }
    setOpen(false);
  };

  return (
    auth.auth && (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full opacity-0 group-hover:opacity-70 transition-opacity blur-sm" />
            <Avatar
              username={auth.auth.username}
              url={auth.auth.avatar}
              className="relative ring-2 ring-white/10 group-hover:ring-red-500/50 transition-all"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="relative w-[220px] mt-3 mr-3 p-0 border-0 overflow-hidden rounded-xl shadow-2xl"
          style={{ background: "transparent" }}
        >
          <div className="absolute inset-0 bg-[#0d0f1a] rounded-xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-pink-500 to-red-500" />
          <div className="relative p-4">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
              <Avatar
                username={auth.auth.username}
                url={auth.auth.avatar}
                className="h-10 w-10"
              />
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">@{auth.auth.username}</p>
                <p className="text-gray-400 text-xs truncate">{auth.auth.email}</p>
              </div>
            </div>

            <div className="space-y-1">
              <Link
                href={`/profile/${auth.auth.username}`}
                className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-md px-2 py-2 text-sm transition-colors"
                onClick={() => setOpen(false)}
              >
                <User size={15} />
                <span>Profile</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md px-2 py-2 text-sm transition-colors"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  );
}

export default NavbarAvatar;
