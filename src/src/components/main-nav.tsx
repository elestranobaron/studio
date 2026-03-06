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
    { href: "/premium", label: t("goPremium"), icon: Gem, className: "text-primary hover:text-primary" },
    { href: "/hall-of-fame", label: t("hallOfFame"), icon: Trophy, className: "text-yellow-400 hover:text-yellow-400" },
    { href: "/open-stats", label: t("openStats"), icon: BarChart3, className: "text-blue-400 hover:text-blue-400" },
  ];

  const handleLinkClick = (isAlreadyActive: boolean) => {
    if (isAlreadyActive) {
      const mainContent = document.querySelector("#dashboard-main-content") || window;
      mainContent.scrollTo({ top: 0, behavior: "smooth" });
    }
    setOpenMobile(false);
  };

  return (
    <SidebarMenu>
      {links.map((link) => {
        const isCurrentPage = pathname.endsWith(link.href);
        const Comp = isCurrentPage ? "button" : Link;

        return (
          <SidebarMenuItem key={link.href}>
            <SidebarMenuButton
              asChild
              isActive={isCurrentPage}
              tooltip={{ children: link.label }}
              className={cn(isCurrentPage && "cursor-pointer hover:bg-sidebar-accent/80")}
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

      {secondaryLinks.map((link) => {
        const isCurrentPage = pathname.endsWith(link.href);
        const Comp = isCurrentPage ? "button" : Link;

        return (
          <SidebarMenuItem key={link.href}>
            <SidebarMenuButton
              asChild
              isActive={isCurrentPage}
              tooltip={{ children: link.label }}
              className={cn(link.className, isCurrentPage && "cursor-pointer hover:bg-sidebar-accent/80")}
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
