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
  equipment?: string
  notes?: string
  sets: SetEntry[]
}

export interface ActiveSession {
  id: string
  name: string
  routineId?: string
  startedAt: string   // ISO timestamp — used for real elapsed time
  exercises: ActiveExercise[]
}

export interface RoutineExercise {
  exerciseId: string
  exerciseName: string
  muscle: string
  equipment?: string
  defaultSets: number
  defaultReps: string
  defaultWeight?: string
  restSeconds: number
  notes?: string
  order: number
}

export interface Routine {
  id: string
  name: string
  exercises: RoutineExercise[]
  lastUsed?: string
  timesUsed: number
  createdAt: string
}

interface WorkoutStore {
  session: ActiveSession | null
  routines: Routine[]

  startSession: (name: string, routineId?: string, exercises?: ActiveExercise[]) => void
  endSession: () => ActiveSession | null
  addExercise: (ex: Omit<ActiveExercise, 'sets'>) => void
  removeExercise: (exId: string) => void
  addSet: (exId: string) => void
  updateSet: (exId: string, setId: string, field: 'weight' | 'reps', value: string) => void
  toggleSet: (exId: string, setId: string) => void
  removeSet: (exId: string, setId: string) => void
  updateExerciseNotes: (exId: string, notes: string) => void
  reset: () => void

  saveRoutine: (routine: Omit<Routine, 'id' | 'createdAt' | 'timesUsed'>) => string
  updateRoutine: (id: string, updates: Partial<Omit<Routine, 'id' | 'createdAt'>>) => void
  deleteRoutine: (id: string) => void
  incrementRoutineUse: (id: string) => void
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      session: null,
      routines: [],

      startSession: (name, routineId, exercises) => set({
        session: {
          id: crypto.randomUUID(),
          name,
          routineId,
          startedAt: new Date().toISOString(),
          exercises: exercises ?? [],
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
            { ...ex, sets: [{ id: crypto.randomUUID(), weight: '', reps: '', done: false }] },
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

      updateExerciseNotes: (exId, notes) => set((state) => ({
        session: state.session ? {
          ...state.session,
          exercises: state.session.exercises.map(e =>
            e.id !== exId ? e : { ...e, notes }
          ),
        } : null,
      })),

      reset: () => set({ session: null }),

      saveRoutine: (routine) => {
        const id = crypto.randomUUID()
        set((state) => ({
          routines: [
            ...state.routines,
            { ...routine, id, timesUsed: 0, createdAt: new Date().toISOString() },
          ],
        }))
        return id
      },

      updateRoutine: (id, updates) => set((state) => ({
        routines: state.routines.map(r => r.id === id ? { ...r, ...updates } : r),
      })),

      deleteRoutine: (id) => set((state) => ({
        routines: state.routines.filter(r => r.id !== id),
      })),

      incrementRoutineUse: (id) => set((state) => ({
        routines: state.routines.map(r =>
          r.id !== id ? r : { ...r, timesUsed: r.timesUsed + 1, lastUsed: new Date().toISOString() }
        ),
      })),
    }),
    { name: 'liftoff-workout-v2' }
  )
)

export function getElapsedSeconds(startedAt: string): number {
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function calcVolume(exercises: ActiveExercise[]): number {
  return exercises.reduce((total, ex) =>
    total + ex.sets
      .filter(s => s.done)
      .reduce((t, s) => t + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0)
    , 0)
}
