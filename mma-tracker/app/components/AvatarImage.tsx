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

const LEVEL_GRADIENT: Record<AvatarImageProps["level"], string> = {
  Novice: "from-gray-400 via-gray-500 to-gray-600",
  Intermediate: "from-green-400 via-green-500 to-green-600",
  Seasoned: "from-blue-400 via-blue-500 to-blue-600",
  Elite: "from-purple-400 via-yellow-400 to-orange-500",
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
}: AvatarImageProps) {
  const shapeClass = fullImage ? "rounded-xl" : "rounded-full";
  const gradient = LEVEL_GRADIENT[level];
  const initial = level.charAt(0).toUpperCase();

  return (
    <div className={`relative ${SIZE_CLASSES[size]} ${className}`}>
      {showGlow && (
        <div aria-hidden className={`absolute -inset-1 ${shapeClass} blur-xl opacity-50 -z-10 bg-gradient-to-r ${gradient}`} />
      )}

      <div className={`${shapeClass} w-full h-full overflow-hidden border-2 border-white/20 shadow-lg flex items-center justify-center bg-gradient-to-br ${gradient}`}>
        <span className={`text-white font-bold ${size === "sm" ? "text-2xl" : size === "md" ? "text-3xl" : size === "lg" ? "text-4xl" : "text-5xl"}`}>
          {initial}
        </span>
      </div>
    </div>
  );
}
