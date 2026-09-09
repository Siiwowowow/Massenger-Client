import { combineSlices, configureStore } from "@reduxjs/toolkit";
import { communicationSlice } from "@/features/communication/slices/communicationSlice";
import { callSlice } from "@/features/communication/call/slices/callSlice";

// RTK combineSlices allows clean slice combination and dynamic injection
const rootReducer = combineSlices(communicationSlice, callSlice);

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
