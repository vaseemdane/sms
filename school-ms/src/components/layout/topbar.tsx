"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Search,
  Shield,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Menu,
} from "lucide-react";
import { UserRole, User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/services/auth-context";
import { useSMSStore } from "@/context/sms-store";

interface TopbarProps {
  currentUser: User;
  title?: string;
  onToggleMobileMenu?: () => void;
}

export function Topbar({ currentUser, title, onToggleMobileMenu }: TopbarProps) {
  const { logout, role } = useAuth();
  const { notifications } = useSMSStore();
  const displayRole = role || currentUser.userType;

  const unreadCount = React.useMemo(() => {
    return notifications.filter((n) => !n.read && (!n.studentId || n.studentId === currentUser.id)).length;
  }, [notifications, currentUser.id]);

  return (
    <header className="h-16 px-3 sm:px-6 border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between gap-2 sm:gap-4">
      {/* Left: Mobile Hamburger Menu + Title / Search */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-md">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMobileMenu}
          className="lg:hidden h-9 w-9 text-text-secondary hover:text-foreground shrink-0 rounded-lg"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {title ? (
          <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">
            {title}
          </h1>
        ) : (
          <div className="relative w-full max-w-[160px] sm:max-w-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              placeholder="Search portal..."
              className="pl-9 h-9 bg-background/50 border-border text-xs focus-visible:ring-1"
            />
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

        {/* Authenticated Role Badge */}
        <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-warm-ivory border border-border/80 text-xs font-semibold text-foreground">
          <Shield className="h-3.5 w-3.5 text-purple-primary" />
          <span className="capitalize">{displayRole.replace("_", " ")}</span>
        </div>

        {/* Notifications */}
        <Button asChild variant="ghost" size="icon" className="h-9 w-9 relative text-text-secondary">
          <Link href={displayRole === "student" ? "/student/notifications" : "#"}>
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-purple-primary text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-surface">
                {unreadCount}
              </span>
            ) : (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-muted text-transparent ring-2 ring-surface" />
            )}
          </Link>
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 px-2 gap-2 hover:bg-muted/70 rounded-full"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentUser.photo || currentUser.photo_url} />
                <AvatarFallback className="bg-purple-tint text-purple-primary text-xs font-bold">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-text-secondary capitalize">
                  {displayRole.replace("_", " ")}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-bold text-foreground">{currentUser.name}</p>
                <p className="text-[10px] text-text-secondary truncate">{currentUser.email}</p>
                <Badge variant="secondary" className="w-fit text-[9px] capitalize mt-1">
                  Role: {displayRole.replace("_", " ")}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile" className="cursor-pointer text-xs flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5 text-text-secondary" />
                Profile Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer text-xs text-destructive flex items-center gap-2 hover:bg-destructive/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
