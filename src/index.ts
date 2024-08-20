import { type Draft, type Patch, applyPatches, enablePatches, produceWithPatches } from 'immer';
import type { StateCreator, StoreApi } from 'zustand';

enablePatches();

export type StateWithHistory<T extends object> = T & {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    _undoHistory: { patches: Patch[]; inversePatches: Patch[]; }[];
    _redoHistory: { patches: Patch[]; inversePatches: Patch[]; }[];
};

type SetStateAction<T> = T | Partial<T> | ((state: T) => T | Partial<T>) | ((draft: Draft<T>) => void);

type ImmerStateCreator<T> = (
    set: (fn: SetStateAction<T>, replace?: boolean) => void,
    get: () => T,
    store: Omit<StoreApi<T>, 'setState'> & {
        setState: (fn: SetStateAction<T>, replace?: boolean) => void;
    }
) => T;

export const withHistory = <T extends object>(
    create: ImmerStateCreator<T>
): StateCreator<StateWithHistory<T>, [], []> => (set, get, originalStore) => {
    const isImmerProducer = (fn: ((state: T) => T | Partial<T>) | ((draft: Draft<T>) => void)): boolean => {
        try {
            // If we invoke it and it returns undefined, it's probably an Immer producer
            const testState = {} as T & Draft<T>;
            const result = fn(testState);
            return result === undefined;
        } catch (e) {
            return false;
        }
    };

    const immerSet = (fn: SetStateAction<T>, replace?: boolean): void => {
        if (typeof fn === 'function' && isImmerProducer(fn)) {
            const [nextState, patches, inversePatches] = produceWithPatches(get(), fn as (draft: Draft<T>) => void);
            set((state) => ({
                ...nextState,
                _undoHistory: [...state._undoHistory, { patches, inversePatches }],
                _redoHistory: [],
                canUndo: true,
                canRedo: false,
            }), replace);
        } else {
            set(fn as T, replace);
        }
    };

    const store = {
        ...originalStore,
        setState: immerSet
    };

    return {
        ...create(immerSet, get, store),
        undo: (): void => {
            set((state: StateWithHistory<T>) => {
                if (state._undoHistory.length === 0) {
                    return state;
                }
                const { patches, inversePatches } = state._undoHistory.at(-1)!;
                const nextState = applyPatches(state, inversePatches);

                return {
                    ...nextState,
                    _undoHistory: state._undoHistory.slice(0, -1),
                    _redoHistory: [...state._redoHistory, { patches, inversePatches }],
                    canUndo: state._undoHistory.length > 1,
                    canRedo: true,
                };
            });
        },
        redo: (): void => {
            set((state: StateWithHistory<T>) => {
                if (state._redoHistory.length === 0) {
                    return state;
                }
                const { patches, inversePatches } = state._redoHistory.at(-1)!;
                const nextState = applyPatches(state, patches);

                return {
                    ...nextState,
                    _undoHistory: [...state._undoHistory, { patches, inversePatches }],
                    _redoHistory: state._redoHistory.slice(0, -1),
                    canUndo: true,
                    canRedo: state._redoHistory.length > 1,
                };
            });
        },
        canUndo: false,
        canRedo: false,
        _undoHistory: [],
        _redoHistory: [],
    };
};

// Example usage
/*
interface CounterState {
    count: number;
    increment: () => void;
    decrement: () => void;
    resetWithoutHistory: () => void;
    incrementWithoutHistory: () => void;
    decrementWithoutHistory: () => void;
}

const useStore = create<StateWithHistory<CounterState>>()(
    withHistory((set, get) => ({
        count: 0,
        increment: () => set(draft => { draft.count += 1; }),
        decrement: () => set(draft => { draft.count -= 1; }),
        resetWithoutHistory: () => set({ count: 0 }),
        incrementWithoutHistory: () => set(state => ({ count: state.count + 1 })),
        decrementWithoutHistory: () => set(state => ({ count: state.count - 1 })),
    }))
);
*/