import { useState, useEffect } from 'react';
import { Progress } from '@shared/ui/progress';
import { httpClient } from '@shared/api';

interface ProgressData {
  level: number
  levelTitle: string
  xp: number
  xpForNextLevel: number
  nextLevelTitle: string
}

export function ProgressHero() {
  const [data, setData] = useState<ProgressData | null>(null);

  useEffect(() => {
    httpClient.get<ProgressData>('/progress').then(({ data: d, error }) => {
      if (!error) setData(d);
    });
  }, []);

  const level      = data?.level          ?? 12;
  const levelTitle = data?.levelTitle      ?? 'Architect';
  const xp         = data?.xp             ?? 14_250;
  const xpForNext  = data?.xpForNextLevel ?? 15_000;
  const nextTitle  = data?.nextLevelTitle ?? 'Senior Architect';
  const xpPct      = Math.min(100, Math.round((xp / xpForNext) * 100));
  const xpRemaining = xpForNext - xp;

  return (
    <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-8 relative overflow-hidden flex flex-col justify-between">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-fixed-dim opacity-20 rounded-full blur-3xl -mr-20 -mt-20"></div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="font-label text-sm uppercase tracking-widest text-on-surface-variant mb-1">
              Current Standing
            </p>
            <h2 className="text-4xl font-extrabold text-on-surface tracking-tight">
              Level {level} <span className="text-primary">{levelTitle}</span>
            </h2>
          </div>
          <div className="bg-tertiary-container rounded-lg p-3 backdrop-blur-xl">
            <span className="material-symbols-outlined text-on-tertiary-fixed text-2xl">
              military_tech
            </span>
          </div>
        </div>
        <div className="mt-8">
          <div className="flex justify-between font-label text-sm mb-2">
            <span className="text-on-surface-variant">XP Progress</span>
            <span className="text-primary font-bold">
              {xp.toLocaleString()} / {xpForNext.toLocaleString()} XP
            </span>
          </div>
          <Progress value={xpPct} className="h-3 bg-surface-container-highest" />
          <p className="text-xs text-on-surface-variant mt-3">
            {xpRemaining.toLocaleString()} XP to Next Level: {nextTitle}
          </p>
        </div>
      </div>
    </div>
  );
}
