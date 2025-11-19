import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationSettings {
  matchResults: boolean;
  guildActivities: boolean;
  missionCompleted: boolean;
  tradeOffers: boolean;
}

interface SettingsStore {
  notifications: NotificationSettings;
  updateNotification: (key: keyof NotificationSettings, value: boolean) => void;
  resetNotifications: () => void;
}

const defaultNotifications: NotificationSettings = {
  matchResults: true,
  guildActivities: true,
  missionCompleted: false, // Default to false (disabled)
  tradeOffers: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      notifications: defaultNotifications,
      updateNotification: (key, value) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            [key]: value,
          },
        })),
      resetNotifications: () => set({ notifications: defaultNotifications }),
    }),
    {
      name: 'settings-storage',
    }
  )
);
