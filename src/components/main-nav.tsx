
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ScanLine,
  Timer,
  Gem,
  Medal,
  Dice5,
  Trophy,
  BarChart3,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function MainNav() {
  const t = useTranslations("MainNav");
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const links = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutGrid },
    { href: "/scan", label: t("scanWod"), icon: ScanLine },
    { href: "/generate", label: t("generateWod"), icon: Dice5 },
    { href: "/hero-wods", label: t("heroWods"), icon: Medal },
    { href: "/timers", label: t("timers"), icon: Timer },
  ];

  const secondaryLinks = [
    { href: "/premium", label: t("goPremium"), icon: Gem, className: "text-primary hover:text-primary font-semibold" },
    { href: "/hall-of-fame", label: t("hallOfFame"), icon: Trophy, className: "text-yellow-400 hover:text-yellow-400 font-semibold" },
    { href: "/open-stats", label: t("openStats"), icon: BarChart3, className: "text-blue-400 hover:text-blue-400 font-bold" },
  ];

  const handleLinkClick = (isAlreadyActive: boolean) => {
    if (isAlreadyActive) {
      const mainContent = document.querySelector("#dashboard-main-content") || window;
      mainContent.scrollTo({ top: 0, behavior: "smooth" });
    }
    setOpenMobile(false);
  };

  return (
    <SidebarMenu className="gap-2">
      {links.map((link) => {
        const isCurrentPage = pathname.endsWith(link.href);
        const Comp = isCurrentPage ? "button" : Link;

        return (
          <SidebarMenuItem key={link.href}>
            <SidebarMenuButton
              asChild
              isActive={isCurrentPage}
              tooltip={{ children: link.label }}
              className={cn(
                "h-11 px-4 text-base transition-all duration-200",
                isCurrentPage && "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 shadow-sm"
              )}
            >
              <Comp
                href={isCurrentPage ? "#" : link.href}
                onClick={(e: React.MouseEvent) => {
                  if (isCurrentPage) e.preventDefault();
                  handleLinkClick(isCurrentPage);
                }}
              >
                <link.icon className={cn("h-5 w-5", isCurrentPage && "text-primary")} />
                <span>{link.label}</span>
              </Comp>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}

      <div className="my-4 px-4">
        <div className="h-px bg-white/10 w-full" />
      </div>

      {secondaryLinks.map((link) => {
        const isCurrentPage = pathname.endsWith(link.href);
        const Comp = isCurrentPage ? "button" : Link;

        return (
          <SidebarMenuItem key={link.href}>
            <SidebarMenuButton
              asChild
              isActive={isCurrentPage}
              tooltip={{ children: link.label }}
              className={cn(
                "h-11 px-4 text-base transition-all duration-200",
                link.className, 
                isCurrentPage && "bg-white/10 cursor-pointer hover:bg-white/20"
              )}
            >
              <Comp
                href={isCurrentPage ? "#" : link.href}
                onClick={(e: React.MouseEvent) => {
                  if (isCurrentPage) e.preventDefault();
                  handleLinkClick(isCurrentPage);
                }}
              >
                <link.icon className="h-5 w-5" />
                <span>{link.label}</span>
              </Comp>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
