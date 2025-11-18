import { create } from 'zustand';

interface OnlineStore {
  onlineUsers: number;
  setOnlineUsers: (count: number) => void;
}

export const useOnlineStore = create<OnlineStore>((set) => ({
  onlineUsers: 0,
  setOnlineUsers: (count) => set({ onlineUsers: count }),
}));
