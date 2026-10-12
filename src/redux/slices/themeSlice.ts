/**
 * HINCH MART — Theme Redux Slice
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThemeMode } from '../../theme/ThemeProvider';

interface ThemeState {
  mode: ThemeMode;
  language: string;
  currency: string;
  measurementUnit: 'metric' | 'imperial';
}

const initialState: ThemeState = {
  mode: 'auto',
  language: 'en',
  currency: 'INR',
  measurementUnit: 'metric',
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setCurrency: (state, action: PayloadAction<string>) => {
      state.currency = action.payload;
    },
    setMeasurementUnit: (state, action: PayloadAction<'metric' | 'imperial'>) => {
      state.measurementUnit = action.payload;
    },
  },
});

export const { setThemeMode, setLanguage, setCurrency, setMeasurementUnit } = themeSlice.actions;
export default themeSlice.reducer;
