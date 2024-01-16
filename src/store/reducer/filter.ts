import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface State {
  tag?: string;
  text?: string;
  visibility?: Visibility;
}

export type Filter = State;

const filterSlice = createSlice({
  name: "filter",
  initialState: {} as State,
  reducers: {
    setFilter: (state, action: PayloadAction<Partial<State>>) => {
      if (JSON.stringify(action.payload) === state) {
        return state;
      }

      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { setFilter } = filterSlice.actions;

export default filterSlice.reducer;
