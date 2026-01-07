"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

/**
 * AvatarImage Component
 * Displays fighter avatar images based on level with smooth transitions
 * Maps levels to image paths: Novice, Intermediate, Seasoned, Elite
 */
interface AvatarImageProps {
  level: "Novice" | "Intermediate" | "Seasoned" | "Elite";
  size?: "sm" | "md" | "lg";
  showGlow?: boolean;
  className?: string;
}

// Level-to-image mapping
const AVATAR_IMAGES: Record<AvatarImageProps["level"], string> = {
  Novice: "/avatars/fighter-novice.png",
  Intermediate: "/avatars/fighter-intermediate.png",
  Seasoned: "/avatars/fighter-seasoned.png",
  Elite: "/avatars/fighter-elite.png",
};

// Fallback placeholder if images don't exist
const FallbackAvatar = ({ level, size }: { level: string; size: string }) => {
  const sizeClasses = {
    sm: "w-24 h-24 sm:w-32 sm:h-32",
    md: "w-32 h-32 sm:w-40 sm:h-40",
    lg: "w-48 h-48 sm:w-64 sm:h-64",
  };

  return (
    <div
      className={`${sizeClasses[size as keyof typeof sizeClasses]} rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-2xl border-4 border-white/20 backdrop-blur-sm`}
    >
      {level.substring(0, 2).toUpperCase()}
    </div>
  );
};

export default function AvatarImage({
  level,
  size = "md",
  showGlow = true,
  className = "",
}: AvatarImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(AVATAR_IMAGES[level]);

  // Update image when level changes with smooth transition
  useEffect(() => {
    // Fade out current image
    setIsLoading(true);
    setImageError(false);
    
    // Small delay for fade-out effect
    const timer = setTimeout(() => {
      setCurrentImage(AVATAR_IMAGES[level]);
    }, 100);

    return () => clearTimeout(timer);
  }, [level]);

  const sizeClasses = {
    sm: "w-24 h-24 sm:w-32 sm:h-32",
    md: "w-32 h-32 sm:w-40 sm:h-40",
    lg: "w-48 h-48 sm:w-64 sm:h-64",
  };

  // Show fallback if image fails to load
  if (imageError) {
    return <FallbackAvatar level={level} size={size} />;
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Glow effect */}
      {showGlow && (
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-r ${
            level === "Novice"
              ? "from-gray-400 to-gray-600"
              : level === "Intermediate"
              ? "from-green-400 to-green-600"
              : level === "Seasoned"
              ? "from-blue-400 to-blue-600"
              : "from-purple-400 to-yellow-400"
          } blur-xl opacity-60 animate-pulse -z-10`}
        />
      )}

      {/* Avatar Image with smooth transition */}
      <div
        className={`relative w-full h-full rounded-full overflow-hidden border-4 border-white/20 shadow-2xl backdrop-blur-sm transition-all duration-200 ease-in-out ${
          isLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        <Image
          src={currentImage}
          alt={`Fighter avatar - ${level} level`}
          fill
          className="object-cover object-center"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setImageError(true);
            setIsLoading(false);
          }}
          priority={level === "Novice" || level === "Elite"}
        />
      </div>
    </div>
  );
}
