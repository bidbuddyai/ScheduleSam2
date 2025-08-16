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
      {/* Logo Icon - Gantt chart with critical path */}
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
          <linearGradient id="scheduleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#10b981", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#059669", stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="criticalPathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#ef4444", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#dc2626", stopOpacity: 1 }} />
          </linearGradient>
        </defs>

        {/* Background chart */}
        <rect x="4" y="8" width="40" height="32" rx="2" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1"/>
        
        {/* Grid lines */}
        <line x1="4" y1="16" x2="44" y2="16" stroke="#e5e7eb" strokeWidth="1"/>
        <line x1="4" y1="24" x2="44" y2="24" stroke="#e5e7eb" strokeWidth="1"/>
        <line x1="4" y1="32" x2="44" y2="32" stroke="#e5e7eb" strokeWidth="1"/>
        
        {/* Regular tasks */}
        <rect x="8" y="12" width="12" height="6" fill="url(#scheduleGradient)" rx="1"/>
        <rect x="16" y="20" width="16" height="6" fill="url(#scheduleGradient)" rx="1"/>
        <rect x="28" y="28" width="10" height="6" fill="url(#scheduleGradient)" rx="1"/>
        
        {/* Critical path */}
        <rect x="22" y="12" width="14" height="6" fill="url(#criticalPathGradient)" rx="1"/>
        <rect x="36" y="20" width="8" height="6" fill="url(#criticalPathGradient)" rx="1"/>
        
        {/* Connection lines showing dependencies */}
        <path d="M20 15L22 15" stroke="#dc2626" strokeWidth="2"/>
        <path d="M36 15L36 20" stroke="#dc2626" strokeWidth="2"/>
        
        {/* Clock icon overlay for scheduling */}
        <circle cx="38" cy="38" r="7" fill="white" stroke="#10b981" strokeWidth="2"/>
        <path d="M38 35V38L40 40" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
      </svg>

      {/* Logo Text */}
      {variant === "full" && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-bold tracking-tight", currentSize.text)}>
            <span className="text-green-600">Schedule</span>
            <span className="text-emerald-600">Sam</span>
          </span>
          <span className="text-xs text-gray-500 mt-0.5">CPM Scheduling Platform</span>
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
          <stop offset="0%" style={{ stopColor: "#10b981", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#059669", stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="markGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#ef4444", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#dc2626", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      <circle cx="24" cy="24" r="20" fill="#f3f4f6" />
      
      {/* Simplified Gantt bars */}
      <rect
        x="12"
        y="14"
        width="14"
        height="4"
        rx="1"
        fill="url(#markGradient1)"
      />
      
      {/* Critical path bar */}
      <rect
        x="20"
        y="20"
        width="16"
        height="4"
        rx="1"
        fill="url(#markGradient2)"
      />
      
      {/* Another task */}
      <rect
        x="16"
        y="26"
        width="12"
        height="4"
        rx="1"
        fill="url(#markGradient1)"
      />
      
      {/* Small clock icon */}
      <circle cx="32" cy="32" r="4" fill="white" stroke="#10b981" strokeWidth="1.5"/>
      <path d="M32 30V32L33 33" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}