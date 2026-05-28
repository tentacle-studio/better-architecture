import { Search, Bell, Settings } from 'lucide-react';

export const Header = () => {
  return (
    <header className="sticky top-4 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-white/90 backdrop-blur-xl border-3 border-white rounded-3xl shadow-[8px_8px_24px_rgba(79,70,229,0.12),-4px_-4px_16px_rgba(255,255,255,0.8)_inset] px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-[4px_4px_12px_rgba(79,70,229,0.25)]">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <span className="hidden md:block text-xl font-extrabold text-slate-900">
                Lumina Labs
              </span>
            </div>

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-2xl p-1.5 shadow-[inset_2px_2px_8px_rgba(79,70,229,0.08)]">
              <a
                href="#"
                className="px-5 py-2.5 bg-white text-indigo-600 font-bold rounded-xl shadow-[3px_3px_8px_rgba(79,70,229,0.12)] transition-all duration-200"
              >
                Explore
              </a>
              <a
                href="#"
                className="px-5 py-2.5 text-slate-600 font-semibold hover:text-indigo-600 hover:bg-white rounded-xl transition-all duration-200"
              >
                Challenges
              </a>
              <a
                href="#"
                className="px-5 py-2.5 text-slate-600 font-semibold hover:text-indigo-600 hover:bg-white rounded-xl transition-all duration-200"
              >
                My Path
              </a>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl flex items-center justify-center transition-all duration-200 shadow-[3px_3px_8px_rgba(79,70,229,0.08)] hover:shadow-[4px_4px_12px_rgba(79,70,229,0.15)]">
                <Search className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl flex items-center justify-center transition-all duration-200 shadow-[3px_3px_8px_rgba(79,70,229,0.08)] hover:shadow-[4px_4px_12px_rgba(79,70,229,0.15)]">
                <Bell className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl flex items-center justify-center transition-all duration-200 shadow-[3px_3px_8px_rgba(79,70,229,0.08)] hover:shadow-[4px_4px_12px_rgba(79,70,229,0.15)]">
                <Settings className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-violet-400 rounded-full shadow-[4px_4px_12px_rgba(79,70,229,0.25)] overflow-hidden ml-2">
                <img
                  src="https://ui-avatars.com/api/?name=The+Scholar&background=6366f1&color=fff"
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
