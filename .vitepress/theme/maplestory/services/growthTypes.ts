export interface GrowthHistoryStatus {
  tracked: boolean;
  historyStartDate?: string | null;
  lastSyncedDate?: string | null;
  availableEndDate?: string | null;
  progress?: number;
  currentProcessingDate?: string | null;
  job?: {
    status?: 'pending' | 'running' | 'completed' | 'failed' | string;
    phase?: 'basic' | 'dojang';
    lastProcessedDate?: string | null;
    currentProcessingDate?: string | null;
    error?: string | null;
    nextRetryAt?: string | null;
  } | null;
}

export interface GrowthHistoryDay {
  date: string;
  level: number;
  exp: string;
  expRate: string;
  expGain: string;
  expPending?: boolean;
  growthPercent?: number | null;
  growthBucket: number;
  active: boolean;
  name?: string;
  world?: string;
  class?: string;
  guild?: string;
  liberationStatus?: string;
}

export interface GrowthHistoryEvent {
  date: string;
  type: 'level' | 'name' | 'class' | 'world' | 'guild' | 'liberation' | 'dojang' | string;
  title?: string;
  from: string;
  to: string;
}

export interface GrowthCharacterHistory {
  server: string;
  ocid: string;
  start: string;
  end: string;
  days: GrowthHistoryDay[];
  stats: {
    activeDays: number;
    longestStreak: number;
    levelGain: number;
    bestDay: { date: string; expGain: string } | null;
  };
  events: GrowthHistoryEvent[];
  historyStartDate?: string | null;
  lastSyncedDate?: string | null;
  availableEndDate?: string | null;
}
