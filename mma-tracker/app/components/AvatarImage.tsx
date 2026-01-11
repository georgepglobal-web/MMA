// Server-renderable gradient placeholder (no client-only hooks)

/**
 * AvatarImage (gradient placeholder)
 * - Pure synchronous rendering (no hooks, no Image)
 * - Uses CSS gradients per level and displays the level initial
 */
interface AvatarImageProps {
  level: "Novice" | "Intermediate" | "Seasoned" | "Elite";
  size?: "sm" | "md" | "lg" | "xl";
  showGlow?: boolean;
  className?: string;
  fullImage?: boolean;
  onLoad?: () => void;
}

const AVATAR_IMAGES: Record<AvatarImageProps["level"], string> = {
  Novice: "/avatars/fighter-novice.png",
  Intermediate: "/avatars/fighter-intermediate.png",
  Seasoned: "/avatars/fighter-seasoned.png",
  Elite: "/avatars/fighter-elite.png",
};

const SIZE_CLASSES: Record<string, string> = {
  sm: "w-24 h-32",
  md: "w-32 h-40",
  lg: "w-48 h-64",
  xl: "w-64 h-80",
};

export default function AvatarImage({
  level,
  size = "md",
  showGlow = true,
  className = "",
  fullImage = false,
  onLoad,
}: AvatarImageProps) {
  const shapeClass = fullImage ? "rounded-xl" : "rounded-full";
  const src = AVATAR_IMAGES[level];

  return (
    <div className={`relative ${SIZE_CLASSES[size]} ${className}`}>
      {showGlow && (
        <div aria-hidden className={`absolute -inset-1 ${shapeClass} blur-xl opacity-40 -z-10 bg-gradient-to-r ${
          level === "Novice"
            ? "from-gray-400 to-gray-600"
            : level === "Intermediate"
            ? "from-green-400 to-green-600"
            : level === "Seasoned"
            ? "from-blue-400 to-blue-600"
            : "from-purple-400 to-orange-500"
        }`} />
      )}

      <div className={`${shapeClass} w-full h-full overflow-hidden border-2 border-white/20 shadow-lg bg-slate-800`}>
        <img
          src={src}
          alt={`Fighter avatar - ${level}`}
          className="w-full h-full object-cover"
          loading="eager"
          decoding="sync"
          onLoad={onLoad}
        />
      </div>
    </div>
  );
}
