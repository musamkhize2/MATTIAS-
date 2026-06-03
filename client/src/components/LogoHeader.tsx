import React from "react";

interface LogoHeaderProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

/**
 * LogoHeader Component
 * Reusable MATTIAS logo with optional text for consistent branding
 */
export const LogoHeader: React.FC<LogoHeaderProps> = ({
  size = "md",
  showText = true,
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/manus-storage/mattias-logo_4d21aff9.png"
        alt="MATTIAS Logo"
        className={`${sizeClasses[size]} opacity-90 hover:opacity-100 transition-opacity`}
      />
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold text-white ${textSizeClasses[size]}`}>
            MATTIAS
          </span>
          <span className="text-xs text-amber-400 opacity-75">
            AI Operating System
          </span>
        </div>
      )}
    </div>
  );
};

export default LogoHeader;
