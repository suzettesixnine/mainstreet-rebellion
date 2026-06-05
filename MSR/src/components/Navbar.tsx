import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, MessageSquare, LayoutDashboard, User, LogOut, Menu, Search, Flame, Calendar, MessageCircle, Sun, Moon, MapPin, Crown } from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";

export default function Navbar() {
  const { user, profile, sellerTier, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <nav className="sticky top-0 z-50 border-b border-foreground/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          <span className="font-display text-base font-bold uppercase tracking-wider text-foreground">MSR</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm" className="uppercase tracking-wider text-xs font-display" asChild>
            <Link to="/neighborhood"><MapPin className="mr-1 h-4 w-4" />My Street</Link>
          </Button>
          <Button variant="ghost" size="sm" className="uppercase tracking-wider text-xs font-display" asChild>
            <Link to="/browse"><Search className="mr-1 h-4 w-4" />Browse</Link>
          </Button>
          <Button variant="ghost" size="sm" className="uppercase tracking-wider text-xs font-display" asChild>
            <Link to="/events"><Calendar className="mr-1 h-4 w-4" />Events</Link>
          </Button>
          <Button variant="ghost" size="sm" className="uppercase tracking-wider text-xs font-display" asChild>
            <Link to="/discussions"><MessageCircle className="mr-1 h-4 w-4" />Board</Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="sm" className="uppercase tracking-wider text-xs font-display" asChild>
                <Link to="/messages"><MessageSquare className="mr-1 h-4 w-4" />Messages</Link>
              </Button>
              <Button variant="ghost" size="sm" className="uppercase tracking-wider text-xs font-display" asChild>
                <Link to="/dashboard"><LayoutDashboard className="mr-1 h-4 w-4" />Dashboard</Link>
              </Button>
              <Button size="sm" className="uppercase tracking-wider text-xs font-display" asChild>
                <Link to="/listings/new"><Plus className="mr-1 h-4 w-4" />Sell</Link>
              </Button>
              {sellerTier === "free" && (
                <Button variant="outline" size="sm" className="uppercase tracking-wider text-xs font-display border-primary text-primary hover:bg-primary hover:text-primary-foreground" asChild>
                  <Link to="/pricing"><Crown className="mr-1 h-4 w-4" />Upgrade</Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-foreground text-background text-xs font-display">{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="uppercase tracking-wider text-xs font-display" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button size="sm" className="uppercase tracking-wider text-xs font-display" asChild>
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Dark mode + Mobile menu */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-none"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-1 animate-fade-in">
          <Button variant="ghost" className="w-full justify-start uppercase tracking-wider text-xs font-display" asChild onClick={() => setMobileOpen(false)}>
            <Link to="/neighborhood"><MapPin className="mr-2 h-4 w-4" />My Street</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start uppercase tracking-wider text-xs font-display" asChild onClick={() => setMobileOpen(false)}>
            <Link to="/browse"><Search className="mr-2 h-4 w-4" />Browse</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start uppercase tracking-wider text-xs font-display" asChild onClick={() => setMobileOpen(false)}>
            <Link to="/events"><Calendar className="mr-2 h-4 w-4" />Events</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start uppercase tracking-wider text-xs font-display" asChild onClick={() => setMobileOpen(false)}>
            <Link to="/discussions"><MessageCircle className="mr-2 h-4 w-4" />Community Board</Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" className="w-full justify-start uppercase tracking-wider text-xs font-display" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/messages"><MessageSquare className="mr-2 h-4 w-4" />Messages</Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start uppercase tracking-wider text-xs font-display" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
              </Button>
              <Button className="w-full justify-start uppercase tracking-wider text-xs font-display" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/listings/new"><Plus className="mr-2 h-4 w-4" />Sell something</Link>
              </Button>
              {sellerTier === "free" && (
                <Button variant="outline" className="w-full justify-start uppercase tracking-wider text-xs font-display border-primary text-primary" asChild onClick={() => setMobileOpen(false)}>
                  <Link to="/pricing"><Crown className="mr-2 h-4 w-4" />Upgrade plan</Link>
                </Button>
              )}
              <Button variant="ghost" className="w-full justify-start uppercase tracking-wider text-xs font-display" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/profile"><User className="mr-2 h-4 w-4" />Profile</Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-destructive uppercase tracking-wider text-xs font-display" onClick={() => { signOut(); setMobileOpen(false); }}>
                <LogOut className="mr-2 h-4 w-4" />Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="w-full justify-start uppercase tracking-wider text-xs font-display" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/login">Log in</Link>
              </Button>
              <Button className="w-full justify-start uppercase tracking-wider text-xs font-display" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
