import { Link, useLocation } from "wouter";
import Logo from "@/components/Logo";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="block">
              <Logo size="lg" variant="full" />
            </Link>
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
                  <i className="fas fa-user text-sm text-gray-600"></i>
                </div>
                <span className="text-sm text-gray-700">John Smith</span>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {children}

      {/* Footer */}
      <footer className="bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-300">© 2024 MeetBud. All rights reserved.</p>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-300">Last saved: 2 minutes ago</span>
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
