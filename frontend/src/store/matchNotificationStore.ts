import { create } from 'zustand';

export interface MatchNotification {
  userId: number;
  username: string;
  matchType: 'RANKED' | 'NORMAL';
  rating: number;
  queuePosition: number;
}

interface MatchNotificationStore {
  notification: MatchNotification | null;
  setNotification: (notification: MatchNotification | null) => void;
}

export const useMatchNotificationStore = create<MatchNotificationStore>((set) => ({
  notification: null,
  setNotification: (notification) => set({ notification }),
}));

