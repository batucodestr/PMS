import { SidebarHeader } from "@/components/ui/sidebar";
import { Link } from "react-router";

function LogoMark() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-500 text-sm font-bold text-white shadow-theme-xs">
      P
    </span>
  );
}

interface AppSidebarHeaderProps {
  showContent: boolean;
}

export default function AppSidebarHeader({
  showContent,
}: AppSidebarHeaderProps) {
  return (
    <SidebarHeader className="px-5 py-6">
      <Link to="/dashboard" className="flex items-center gap-3" aria-label="PMS home">
        <LogoMark />
        {showContent && (
          <span className="flex flex-col leading-tight">
            <span className="text-base font-semibold text-gray-900 dark:text-white">
              PMS Console
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Property anagement
            </span>
          </span>
        )}
      </Link>
    </SidebarHeader>
  );
}
