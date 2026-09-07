import { combineSlices, configureStore } from "@reduxjs/toolkit";
import { communicationSlice } from "@/features/communication/slices/communicationSlice";

// RTK combineSlices allows clean slice combination and dynamic injection
const rootReducer = combineSlices(communicationSlice);

export const makeStore = () => {
  return configureStore({
    reducer: rootReducer,
    devTools: process.env.NODE_ENV !== "production",
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
