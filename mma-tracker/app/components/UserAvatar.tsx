"use client";

export interface UserAvatarProps {
  userId: string;
  username?: string | null;
  avatarStyle?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const AVATAR_STYLES = ["adventurer", "avataaars", "pixel-art", "identicon"];

export function getAvatarUrl(
  userId: string,
  username: string | null | undefined,
  avatarStyle: string = "adventurer"
): string {
  const seed = username || userId;
  const style = AVATAR_STYLES.includes(avatarStyle) ? avatarStyle : "adventurer";
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&scale=80`;
}

export default function UserAvatar({
  userId,
  username,
  avatarStyle = "adventurer",
  size = "md",
  className = "",
}: UserAvatarProps) {
  const sizeClass = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  }[size];

  const avatarUrl = getAvatarUrl(userId, username, avatarStyle);

  return (
    <img
      src={avatarUrl}
      alt={username || "User avatar"}
      className={`rounded-full bg-white/10 border border-white/20 ${sizeClass} ${className}`}
      loading="lazy"
    />
  );
}
