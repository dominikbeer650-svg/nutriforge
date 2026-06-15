import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SetEntry {
  id: string
  weight: string
  reps: string
  done: boolean
  rpe?: number
}

export interface ActiveExercise {
  id: string
  exerciseId: string
  exerciseName: string
  muscle: string
  sets: SetEntry[]
}

export interface ActiveSession {
  id: string
  name: string
  startedAt: string
  exercises: ActiveExercise[]
  elapsedSeconds: number
}

interface WorkoutStore {
  session: ActiveSession | null
  startSession: (name: string) => void
  endSession: () => ActiveSession | null
  addExercise: (ex: Omit<ActiveExercise, 'sets'>) => void
  removeExercise: (exId: string) => void
  addSet: (exId: string) => void
  updateSet: (exId: string, setId: string, field: 'weight' | 'reps', value: string) => void
  toggleSet: (exId: string, setId: string) => void
  removeSet: (exId: string, setId: string) => void
  tick: () => void
  reset: () => void
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      session: null,

      startSession: (name) => set({
        session: {
          id: crypto.randomUUID(),
          name,
          startedAt: new Date().toISOString(),
          exercises: [],
          elapsedSeconds: 0,
        },
      }),

      endSession: () => {
        const s = get().session
        set({ session: null })
        return s
      },

      addExercise: (ex) => set((state) => ({
        session: state.session ? {
          ...state.session,
          exercises: [
            ...state.session.exercises,
            {
              ...ex,
              sets: [{ id: crypto.randomUUID(), weight: '', reps: '', done: false }],
            },
          ],
        } : null,
      })),

      removeExercise: (exId) => set((state) => ({
        session: state.session ? {
          ...state.session,
          exercises: state.session.exercises.filter(e => e.id !== exId),
        } : null,
      })),

      addSet: (exId) => set((state) => ({
        session: state.session ? {
          ...state.session,
          exercises: state.session.exercises.map(e => {
            if (e.id !== exId) return e
            const last = e.sets.at(-1)
            return {
              ...e,
              sets: [...e.sets, {
                id: crypto.randomUUID(),
                weight: last?.weight ?? '',
                reps: last?.reps ?? '',
                done: false,
              }],
            }
          }),
        } : null,
      })),

      updateSet: (exId, setId, field, value) => set((state) => ({
        session: state.session ? {
          ...state.session,
          exercises: state.session.exercises.map(e =>
            e.id !== exId ? e : {
              ...e,
              sets: e.sets.map(s => s.id !== setId ? s : { ...s, [field]: value }),
            }
          ),
        } : null,
      })),

      toggleSet: (exId, setId) => set((state) => ({
        session: state.session ? {
          ...state.session,
          exercises: state.session.exercises.map(e =>
            e.id !== exId ? e : {
              ...e,
              sets: e.sets.map(s => s.id !== setId ? s : { ...s, done: !s.done }),
            }
          ),
        } : null,
      })),

      removeSet: (exId, setId) => set((state) => ({
        session: state.session ? {
          ...state.session,
          exercises: state.session.exercises.map(e =>
            e.id !== exId ? e : { ...e, sets: e.sets.filter(s => s.id !== setId) }
          ),
        } : null,
      })),

      tick: () => set((state) => ({
        session: state.session
          ? { ...state.session, elapsedSeconds: state.session.elapsedSeconds + 1 }
          : null,
      })),

      reset: () => set({ session: null }),
    }),
    { name: 'liftoff-workout' }
  )
)
