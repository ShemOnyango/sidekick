import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import apiService from '../../services/api/ApiService';

// Async thunks
export const downloadSubdivisionData = createAsyncThunk(
  'offline/downloadSubdivision',
  async ({ agencyId, subdivisionId, subdivisionName }, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/offline/agency/${agencyId}/subdivision/${subdivisionId}`);
      const data = response.data;
      
      // Save to file system
      const fileName = `subdivision_${subdivisionId}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data));
      
      // Save metadata
      const metadata = {
        subdivisionId,
        subdivisionName,
        agencyId,
        fileName,
        fileUri,
        downloadedAt: new Date().toISOString(),
        size: JSON.stringify(data).length,
        milespostCount: data.mileposts?.length || 0,
        pinCount: data.pins?.length || 0,
      };
      
      // Update AsyncStorage with downloaded metadata
      const existingData = await AsyncStorage.getItem('offlineSubdivisions');
      const subdivisions = existingData ? JSON.parse(existingData) : [];
      subdivisions.push(metadata);
      await AsyncStorage.setItem('offlineSubdivisions', JSON.stringify(subdivisions));
      
      return metadata;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to download subdivision data');
    }
  }
);

export const deleteOfflineSubdivision = createAsyncThunk(
  'offline/deleteSubdivision',
  async (subdivisionId, { rejectWithValue }) => {
    try {
      // Get existing metadata
      const existingData = await AsyncStorage.getItem('offlineSubdivisions');
      const subdivisions = existingData ? JSON.parse(existingData) : [];
      
      const subdivision = subdivisions.find(s => s.subdivisionId === subdivisionId);
      if (!subdivision) {
        throw new Error('Subdivision not found');
      }
      
      // Delete file
      await FileSystem.deleteAsync(subdivision.fileUri, { idempotent: true });
      
      // Update metadata
      const updated = subdivisions.filter(s => s.subdivisionId !== subdivisionId);
      await AsyncStorage.setItem('offlineSubdivisions', JSON.stringify(updated));
      
      return subdivisionId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete subdivision data');
    }
  }
);

export const loadOfflineSubdivisions = createAsyncThunk(
  'offline/loadSubdivisions',
  async (_, { rejectWithValue }) => {
    try {
      const data = await AsyncStorage.getItem('offlineSubdivisions');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return rejectWithValue('Failed to load offline subdivisions');
    }
  }
);

export const getStorageInfo = createAsyncThunk(
  'offline/getStorageInfo',
  async (_, { rejectWithValue }) => {
    try {
      const info = await FileSystem.getInfoAsync(FileSystem.documentDirectory);
      const freeSpace = await FileSystem.getFreeDiskStorageAsync();
      const totalSpace = await FileSystem.getTotalDiskCapacityAsync();
      
      return {
        freeSpace,
        totalSpace,
        usedSpace: totalSpace - freeSpace,
      };
    } catch (error) {
      return rejectWithValue('Failed to get storage info');
    }
  }
);

const initialState = {
  isOfflineMode: false,
  downloadedSubdivisions: [],
  downloadProgress: {},
  storageInfo: {
    freeSpace: 0,
    totalSpace: 0,
    usedSpace: 0,
  },
  loading: false,
  error: null,
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOfflineMode: (state, action) => {
      state.isOfflineMode = action.payload;
    },
    setDownloadProgress: (state, action) => {
      const { subdivisionId, progress } = action.payload;
      state.downloadProgress[subdivisionId] = progress;
    },
    clearDownloadProgress: (state, action) => {
      delete state.downloadProgress[action.payload];
    },
    clearOfflineData: (state) => {
      state.downloadedSubdivisions = [];
      state.downloadProgress = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Download subdivision
      .addCase(downloadSubdivisionData.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.downloadProgress[action.meta.arg.subdivisionId] = 0;
      })
      .addCase(downloadSubdivisionData.fulfilled, (state, action) => {
        state.loading = false;
        state.downloadedSubdivisions.push(action.payload);
        delete state.downloadProgress[action.payload.subdivisionId];
      })
      .addCase(downloadSubdivisionData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        if (action.meta.arg) {
          delete state.downloadProgress[action.meta.arg.subdivisionId];
        }
      })
      // Delete subdivision
      .addCase(deleteOfflineSubdivision.fulfilled, (state, action) => {
        state.downloadedSubdivisions = state.downloadedSubdivisions.filter(
          s => s.subdivisionId !== action.payload
        );
      })
      // Load subdivisions
      .addCase(loadOfflineSubdivisions.fulfilled, (state, action) => {
        state.downloadedSubdivisions = action.payload;
      })
      // Get storage info
      .addCase(getStorageInfo.fulfilled, (state, action) => {
        state.storageInfo = action.payload;
      });
  },
});

export const {
  setOfflineMode,
  setDownloadProgress,
  clearDownloadProgress,
  clearOfflineData,
} = offlineSlice.actions;

export default offlineSlice.reducer;
