import { useState } from "react";
import { Link, useLocation } from "wouter";
import Logo from "@/components/Logo";
import { Menu, X, Calendar, User, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <Link href="/" className="block">
              <Logo size="md" variant="full" className="sm:hidden" />
              <Logo size="lg" variant="full" className="hidden sm:block" />
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/projects"
                className={`transition-colors ${
                  location === "/projects" || location === "/"
                    ? "text-orange-600 font-medium"
                    : "text-gray-600 hover:text-orange-600"
                }`}
                data-testid="nav-projects"
              >
                Projects
              </Link>
              <a href="#" className="text-gray-600 hover:text-orange-600 transition-colors">
                Calendar
              </a>
              <div className="flex items-center space-x-2 ml-6">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <span className="text-sm text-gray-700 hidden lg:block">John Smith</span>
              </div>
            </nav>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px] p-0">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b">
                    <Logo size="md" variant="full" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <nav className="flex-1 px-4 py-6 space-y-2">
                    <Link
                      href="/projects"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        location === "/projects" || location === "/"
                          ? "bg-orange-50 text-orange-600 font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Home className="h-5 w-5" />
                      <span>Projects</span>
                    </Link>
                    <a
                      href="#"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Calendar className="h-5 w-5" />
                      <span>Calendar</span>
                    </a>
                  </nav>
                  
                  <div className="border-t p-4">
                    <div className="flex items-center gap-3 px-3 py-2">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">John Smith</p>
                        <p className="text-xs text-gray-500">john.smith@company.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {children}

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <p className="text-xs sm:text-sm text-gray-300">© 2024 MeetBud. All rights reserved.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="text-gray-300 hidden sm:inline">Last saved: 2 minutes ago</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-300">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
