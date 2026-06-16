interface UserAvatarProps {
  name: string;
  level: string;
  avatarUrl: string;
  className?: string;
}

export const UserAvatar = ({ name, level, avatarUrl, className }: UserAvatarProps) => {
  return (
    <div className={`flex flex-col items-start gap-4 ${className}`}>
      <img
        alt={name}
        className="w-16 h-16 rounded-full object-cover shadow-sm border border-outline-variant/20"
        src={avatarUrl}
      />
      <div>
        <h2 className="text-on-surface font-headline font-bold text-lg">{name}</h2>
        <p className="text-on-surface-variant font-label text-xs tracking-widest uppercase">{level}</p>
      </div>
    </div>
  );
};
