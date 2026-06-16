const skills = [
  { name: 'DevOps & Automation', progress: 85, color: 'bg-primary' },
  { name: 'Cloud Infrastructure (AWS)', progress: 60, color: 'bg-secondary' },
  { name: 'System Architecture', progress: 45, color: 'bg-tertiary-container' },
  { name: 'Security & Compliance', progress: 30, color: 'bg-outline' },
];

export function DomainMastery() {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 h-full">
      <h3 className="text-xl font-bold text-on-surface mb-6">Domain Mastery</h3>
      <div className="flex flex-col space-y-6">
        {skills.map((skill) => (
          <div key={skill.name}>
            <div className="flex justify-between font-label text-sm mb-2">
              <span className="text-on-surface font-semibold">{skill.name}</span>
              <span className="text-on-surface-variant font-medium">{skill.progress}%</span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-2">
              <div
                className={`${skill.color} h-2 rounded-full transition-all duration-1000`}
                style={{ width: `${skill.progress}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
