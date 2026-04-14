import React from "react";
import {
  Avatar as AvatarCN,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

type Props = {
  url?: string;
  username?: string;
  className?: string;
  onClick?: () => void;
};

function Avatar({ url, username, className, onClick }: Props) {
  return (
    <AvatarCN className={className} onClick={onClick}>
      {url && <AvatarImage src={url} alt={username} />}
      <AvatarFallback className="bg-gradient-to-br from-red-600 to-pink-600 text-white font-bold text-sm">
        {username?.charAt(0).toUpperCase()}
        {username?.charAt(1)?.toLowerCase()}
      </AvatarFallback>
    </AvatarCN>
  );
}

export default Avatar;
