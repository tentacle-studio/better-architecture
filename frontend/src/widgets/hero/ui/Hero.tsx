export const Hero = () => {
  return (
    <section className="relative rounded-[2rem] overflow-hidden bg-surface-container-low min-h-[400px] flex items-center p-8 md:p-16">
      {/* Abstract Gradient Background Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[140%] bg-gradient-to-br from-primary/20 to-secondary-container/20 blur-3xl rounded-full" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[80%] bg-gradient-to-tr from-tertiary-fixed-dim/10 to-primary-container/10 blur-3xl rounded-full" />
      
      <div className="relative z-10 max-w-2xl space-y-6">
        <span className="inline-block px-4 py-1.5 bg-surface-container-highest text-primary font-label text-sm font-bold tracking-widest rounded-full uppercase">
          Featured Path
        </span>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-extrabold text-on-surface leading-tight tracking-tight">
          100 Days of DevOps Challenge
        </h1>
        <p className="text-lg text-on-surface-variant font-body max-w-xl leading-relaxed">
          Master continuous integration, infrastructure as code, and cloud deployment through daily hands-on labs and real-world scenarios.
        </p>
        <div className="pt-4 flex items-center gap-4">
          <button className="bg-primary text-on-primary px-8 py-4 rounded-lg font-headline font-bold hover:bg-primary-container transition-colors shadow-sm">
            Start Now
          </button>
          <button className="text-primary font-headline font-semibold hover:bg-surface-tint/10 px-6 py-4 rounded-lg transition-colors">
            View Curriculum
          </button>
        </div>
      </div>
    </section>
  );
};
