# zhistory

zustand middleware for managing history using immerjs patches.

## Example

```ts
import { type StateWithHistory, withHistory } from "zhistory";

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  incrementWithoutHistory: () => void;
  decrementWithoutHistory: () => void;
}

const useStore = create<StateWithHistory<CounterState>>()(
  withHistory((set, get) => ({
    count: 0,
    increment: () => set((draft) => { draft.count += 1; }),
    decrement: () => set((draft) => { draft.count -= 1; }),
    incrementWithoutHistory: () => set((state) => ({ count: state.count + 1 })),
    decrementWithoutHistory: () => set((state) => ({ count: state.count - 1 })),
  }))
);

const Counter: React.FC = () => {
  const {
    count, incrementWithoutHistory, decrementWithoutHistory, increment, decrement,
    undo, redo, _undoHistory, _redoHistory, canUndo, canRedo,
  } = useStore();

  return (
    <div>
      <div>Count: {count}</div>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
      <button onClick={incrementWithoutHistory}>incrementWithoutHistory</button>
      <button onClick={decrementWithoutHistory}>decrementWithoutHistory</button>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
      <div>Undo History: {canUndo ? "true" : "false"}, {JSON.stringify(_undoHistory)}</div>
      <div>Redo History: {canRedo ? "true" : "false"}, {JSON.stringify(_redoHistory)}</div>
    </div>
  );
};
```
