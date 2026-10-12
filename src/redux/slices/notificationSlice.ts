/**
 * HINCH MART — Notifications Redux Slice
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NotificationState {
  unreadCount: number;
  pushToken: string | null;
  pushEnabled: boolean;
}

const initialState: NotificationState = {
  unreadCount: 0,
  pushToken: null,
  pushEnabled: true,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    decrementUnread: (state) => {
      if (state.unreadCount > 0) {
        state.unreadCount -= 1;
      }
    },
    clearUnread: (state) => {
      state.unreadCount = 0;
    },
    setPushToken: (state, action: PayloadAction<string>) => {
      state.pushToken = action.payload;
    },
    setPushEnabled: (state, action: PayloadAction<boolean>) => {
      state.pushEnabled = action.payload;
    },
  },
});

export const {
  setUnreadCount,
  decrementUnread,
  clearUnread,
  setPushToken,
  setPushEnabled,
} = notificationSlice.actions;

export default notificationSlice.reducer;
