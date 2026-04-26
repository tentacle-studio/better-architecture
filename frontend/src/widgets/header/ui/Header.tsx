export const Header = () => {
  return (
    <header className="bg-white/70 backdrop-blur-xl text-indigo-700 font-body text-sm tracking-tight font-medium top-0 sticky z-50 shadow-[0_8px_30px_rgb(27,27,35,0.08)]">
      <div className="flex justify-between items-center w-full px-6 py-4 mx-auto">
        <div className="flex items-center gap-6">
          <span className="text-2xl font-black tracking-tighter text-indigo-800 md:hidden">Lumina Lab</span>
          <div className="hidden md:flex gap-8 items-center bg-surface-container px-6 py-2 rounded-full">
            <a className="text-indigo-700 font-bold border-b-2 border-indigo-600 pb-1" href="#">Explore</a>
            <a className="text-slate-500 font-medium hover:text-indigo-600 transition-colors active:scale-95 duration-200 ease-out" href="#">Challenges</a>
            <a className="text-slate-500 font-medium hover:text-indigo-600 transition-colors active:scale-95 duration-200 ease-out" href="#">My Path</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-slate-500 hover:text-indigo-600 transition-colors active:scale-95 duration-200 ease-out">
            <span className="material-symbols-outlined">search</span>
          </button>
          <button className="text-slate-500 hover:text-indigo-600 transition-colors active:scale-95 duration-200 ease-out">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="text-slate-500 hover:text-indigo-600 transition-colors active:scale-95 duration-200 ease-out">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <img 
            alt="Student Profile Avatar" 
            className="w-8 h-8 rounded-full md:hidden object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfJ5eIt-xK1UlTy4EQpcWQ_kkBnNclr--lDowORteyp_D7lb-Q7qrJunY2T2oMomm5hia0j2yxAW_WmGnG8LgBth_MvTfz0uW1A5TK46Shc1rYiRE9WRB9d4pwlqC9iKs4VujFY1S4Ejj_MeijcWnCTb54g5hiVDCLx-D1qaDKM8AMcDTu4fCiN_uAKBGzimbDHC94xX2SYQy8E1byohCJoxrkbRlBCILO4utl3kFZUfL2jNTYrFmN2L4YnBXdUbBVuxUIt5fAF1U"
          />
        </div>
      </div>
    </header>
  );
};
