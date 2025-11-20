"use client";

interface TechnologyBadgeProps {
  technology: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "filled";
}

const technologyColors: Record<string, string> = {
  // Frontend
  "React": "bg-blue-500/20 text-blue-400 border-blue-500/40",
  "Next.js": "bg-black/20 text-black border-black/40 dark:bg-white/20 dark:text-white dark:border-white/40",
  "TypeScript": "bg-blue-600/20 text-blue-500 border-blue-600/40",
  "JavaScript": "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  "Tailwind CSS": "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
  "CSS": "bg-blue-400/20 text-blue-300 border-blue-400/40",
  "HTML": "bg-orange-500/20 text-orange-400 border-orange-500/40",
  
  // Backend
  "Node.js": "bg-green-600/20 text-green-500 border-green-600/40",
  "Python": "bg-yellow-600/20 text-yellow-500 border-yellow-600/40",
  "SQLite": "bg-blue-500/20 text-blue-400 border-blue-500/40",
  "PostgreSQL": "bg-blue-700/20 text-blue-600 border-blue-700/40",
  "Prisma": "bg-teal-500/20 text-teal-400 border-teal-500/40",
  
  // Tools
  "Docker": "bg-blue-600/20 text-blue-500 border-blue-600/40",
  "Git": "bg-orange-600/20 text-orange-500 border-orange-600/40",
  "GitHub": "bg-gray-800/20 text-gray-700 border-gray-800/40 dark:bg-gray-200/20 dark:text-gray-300 dark:border-gray-200/40",
  
  // Default
  "default": "bg-[#4CAF50]/20 text-[#4CAF50] border-[#4CAF50]/40",
};

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

const variantClasses = {
  default: "border",
  outline: "border bg-transparent",
  filled: "border-0",
};

export default function TechnologyBadge({
  technology,
  size = "md",
  variant = "default",
}: TechnologyBadgeProps) {
  const colorClass =
    technologyColors[technology] || technologyColors.default;
  const sizeClass = sizeClasses[size];
  const variantClass = variantClasses[variant];

  return (
    <span
      className={`inline-flex items-center rounded-lg font-medium transition-all ${colorClass} ${sizeClass} ${variantClass}`}
    >
      {technology}
    </span>
  );
}

