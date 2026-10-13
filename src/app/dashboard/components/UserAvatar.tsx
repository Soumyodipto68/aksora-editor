"use client";

import { useState } from "react";
import Image from "next/image";

type UserAvatarProps = {
  image?: string | null;
  name?: string | null;
};

export default function UserAvatar({ image, name }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = (name?.trim()[0] ?? "U").toUpperCase();

  if (image && !imageFailed) {
    return (
      <Image
        src={image}
        alt={`${name ?? "User"} profile`}
        width={32}
        height={32}
        unoptimized
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className="h-8 w-8 shrink-0 rounded-full bg-zinc-800 object-cover"
      />
    );
  }

  return (
    <div
      aria-label={`${name ?? "User"} profile`}
      role="img"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300"
    >
      {initials}
    </div>
  );
}
