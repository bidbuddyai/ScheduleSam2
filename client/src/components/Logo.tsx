import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon";
}

export default function Logo({ className, size = "md", variant = "full" }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: "text-lg", container: "h-8" },
    md: { icon: 32, text: "text-xl", container: "h-10" },
    lg: { icon: 40, text: "text-2xl", container: "h-12" },
    xl: { icon: 48, text: "text-3xl", container: "h-14" }
  };

  const currentSize = sizes[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Logo Icon - Construction helmet with calendar */}
      <svg
        width={currentSize.icon}
        height={currentSize.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="helmetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#f97316", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#ea580c", stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="calendarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#2563eb", stopOpacity: 1 }} />
          </linearGradient>
        </defs>

        {/* Construction Helmet */}
        <path
          d="M24 4C16 4 10 8 10 14V20C10 22 11 23 13 23H35C37 23 38 22 38 20V14C38 8 32 4 24 4Z"
          fill="url(#helmetGradient)"
        />
        <path
          d="M14 14H34V16H14V14Z"
          fill="#fbbf24"
        />
        <path
          d="M20 10H28V14H20V10Z"
          fill="#fff"
          opacity="0.9"
        />

        {/* Calendar */}
        <rect
          x="16"
          y="26"
          width="16"
          height="16"
          rx="2"
          fill="url(#calendarGradient)"
        />
        <rect
          x="18"
          y="30"
          width="12"
          height="10"
          fill="#fff"
        />
        
        {/* Calendar grid */}
        <rect x="20" y="32" width="2" height="2" fill="#3b82f6" />
        <rect x="23" y="32" width="2" height="2" fill="#3b82f6" />
        <rect x="26" y="32" width="2" height="2" fill="#3b82f6" />
        <rect x="20" y="35" width="2" height="2" fill="#3b82f6" />
        <rect x="23" y="35" width="2" height="2" fill="#f97316" />
        <rect x="26" y="35" width="2" height="2" fill="#3b82f6" />
        
        {/* Calendar clips */}
        <rect x="19" y="26" width="2" height="4" fill="#1f2937" />
        <rect x="27" y="26" width="2" height="4" fill="#1f2937" />
      </svg>

      {/* Logo Text */}
      {variant === "full" && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-bold tracking-tight", currentSize.text)}>
            <span className="text-orange-600">Meet</span>
            <span className="text-blue-600">Bud</span>
          </span>
          <span className="text-xs text-gray-500 mt-0.5">Construction Meetings</span>
        </div>
      )}
    </div>
  );
}

// Logo Mark Component (for favicon, small spaces)
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="markGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#f97316", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#ea580c", stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="markGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#2563eb", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      <circle cx="24" cy="24" r="20" fill="#f3f4f6" />
      
      {/* Simplified helmet */}
      <path
        d="M24 10C18 10 14 13 14 17V21C14 22 15 23 16 23H32C33 23 34 22 34 21V17C34 13 30 10 24 10Z"
        fill="url(#markGradient1)"
      />
      
      {/* Simplified calendar */}
      <rect
        x="18"
        y="25"
        width="12"
        height="10"
        rx="1"
        fill="url(#markGradient2)"
      />
      <rect
        x="19"
        y="28"
        width="10"
        height="6"
        fill="#fff"
      />
    </svg>
  );
}