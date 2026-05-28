export const Hero = () => {
  return (
    <section className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 border-4 border-white shadow-[8px_8px_24px_rgba(79,70,229,0.12),-4px_-4px_16px_rgba(255,255,255,0.8)_inset] p-8 md:p-16">
      {/* Decorative floating shapes */}
      <div className="absolute top-8 right-12 w-16 h-16 bg-indigo-200/40 rounded-3xl rotate-12 shadow-[4px_4px_12px_rgba(79,70,229,0.15)]" />
      <div className="absolute top-20 right-28 w-10 h-10 bg-violet-300/40 rounded-2xl -rotate-12 shadow-[3px_3px_8px_rgba(139,92,246,0.15)]" />
      <div className="absolute bottom-12 left-8 w-12 h-12 bg-blue-200/40 rounded-full shadow-[4px_4px_12px_rgba(59,130,246,0.15)]" />

      {/* Badge */}
      <div className="relative z-10">
        <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-3 border-indigo-100 rounded-full text-indigo-700 font-bold text-sm shadow-[3px_3px_8px_rgba(79,70,229,0.12)]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Featured Learning Path
        </span>

        <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight">
          100 Days of{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            DevOps
          </span>{' '}
          Challenge
        </h1>

        <p className="mt-4 text-lg text-slate-600 max-w-xl leading-relaxed">
          Master continuous integration, infrastructure as code, and cloud deployment through
          daily hands-on labs and real-world scenarios.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button className="group relative px-8 py-4 bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-bold rounded-2xl shadow-[6px_6px_20px_rgba(79,70,229,0.3),-2px_-2px_8px_rgba(255,255,255,0.3)_inset] hover:shadow-[8px_8px_28px_rgba(79,70,229,0.4),-2px_-2px_8px_rgba(255,255,255,0.4)_inset] hover:translate-y-[-2px] active:translate-y-[1px] active:shadow-[2px_2px_8px_rgba(79,70,229,0.2),-2px_-2px_8px_rgba(255,255,255,0.2)_inset] transition-all duration-200">
            Start Now
            <span className="absolute -right-1 -top-1 w-3 h-3 bg-emerald-400 rounded-full shadow-lg" />
          </button>

          <button className="px-6 py-4 bg-white text-indigo-600 font-semibold rounded-2xl border-3 border-indigo-100 shadow-[4px_4px_16px_rgba(79,70,229,0.12)] hover:shadow-[6px_6px_20px_rgba(79,70,229,0.18)] hover:border-indigo-200 active:translate-y-[1px] transition-all duration-200">
            View Curriculum
          </button>
        </div>

        {/* Stats */}
        <div className="mt-10 flex items-center gap-8">
          <div className="text-center">
            <div className="text-3xl font-extrabold text-slate-900">50+</div>
            <div className="text-sm text-slate-500 font-medium">Labs</div>
          </div>
          <div className="w-px h-12 bg-slate-200" />
          <div className="text-center">
            <div className="text-3xl font-extrabold text-slate-900">10K+</div>
            <div className="text-sm text-slate-500 font-medium">Students</div>
          </div>
          <div className="w-px h-12 bg-slate-200" />
          <div className="text-center">
            <div className="text-3xl font-extrabold text-slate-900">4.8★</div>
            <div className="text-sm text-slate-500 font-medium">Rating</div>
          </div>
        </div>
      </div>
    </section>
  );
};
