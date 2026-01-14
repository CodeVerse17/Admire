
export type ProficiencyLevel = 'Beginner' | 'Elementary' | 'Intermediate' | 'Upper-Intermediate' | 'Advanced';

export interface Language {
  id: string;
  name: string;
  nativeName: string;
  flag: string;
  code: string;
}

export interface MistakeRecord {
  type: 'pronunciation' | 'grammar' | 'vocabulary';
  content: string;
  count: number;
  lastSeen: number;
}

export interface UserPerformance {
  confidence: number;
  pronunciation: number;
  vocabUsage: number;
  accuracy: number;
  fluency: number;
  sessionCount: number;
  mistakes: MistakeRecord[];
}

export enum AppRoute {
  LEARN = 'learn',
  SPEAK_ZONE = 'speak-zone',
  PROFILE = 'profile',
  SHOP = 'shop'
}
