import { Link, useLocation } from "wouter";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-brand-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <i className="fas fa-hard-hat text-white text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold">Adams & Grand Demolition</h1>
                <p className="text-green-100 text-sm">Weekly Progress Meetings</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/projects"
                className={`transition-colors ${
                  location === "/projects" || location === "/"
                    ? "text-white font-medium"
                    : "text-green-100 hover:text-white"
                }`}
                data-testid="nav-projects"
              >
                Projects
              </Link>
              <a href="#" className="text-green-100 hover:text-white transition-colors">
                Calendar
              </a>
              <div className="flex items-center space-x-2 ml-6">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <i className="fas fa-user text-sm"></i>
                </div>
                <span className="text-sm">John Smith</span>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {children}

      {/* Footer */}
      <footer className="bg-brand-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-green-100">© 2024 Adams & Grand Demolition. All rights reserved.</p>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-green-100">Last saved: 2 minutes ago</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-100">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
