import { WorkoutType } from '@/types';
import i18n from '@/i18n';

// ─── METs par type de sport ──────────────────────────────────────────────────
// Source : Compendium of Physical Activities (Ainsworth et al.)

interface WorkoutMeta {
  /** Nom traduit (getter i18n : workout.types.<type>) */
  readonly label: string;
  emoji: string;
  met: number;
  color: string;
}

const BASE_META: Record<WorkoutType, Omit<WorkoutMeta, 'label'>> = {
  marche:       { emoji: '🚶', met: 3.5,  color: '#34D399' },
  course:       { emoji: '🏃', met: 9.0,  color: '#F97316' },
  velo:         { emoji: '🚴', met: 7.5,  color: '#60A5FA' },
  natation:     { emoji: '🏊', met: 7.0,  color: '#38BDF8' },
  musculation:  { emoji: '🏋️', met: 4.0,  color: '#A78BFA' },
  hiit:         { emoji: '⚡', met: 10.0, color: '#FBBF24' },
  yoga:         { emoji: '🧘', met: 2.5,  color: '#86EFAC' },
  football:     { emoji: '⚽', met: 8.0,  color: '#4ADE80' },
  basketball:   { emoji: '🏀', met: 6.5,  color: '#FB923C' },
  tennis:       { emoji: '🎾', met: 7.0,  color: '#FCD34D' },
  elliptique:   { emoji: '🔄', met: 5.0,  color: '#C084FC' },
  randonnee:    { emoji: '🥾', met: 5.5,  color: '#6EE7B7' },
  danse:        { emoji: '💃', met: 5.0,  color: '#F472B6' },
  escaliers:    { emoji: '🪜', met: 4.0, color: '#FCA5A5' },
  autre:        { emoji: '🏃', met: 4.0,  color: '#9CA3AF' },
};

export const WORKOUT_TYPES = Object.keys(BASE_META) as WorkoutType[];

export const WORKOUT_META = {} as Record<WorkoutType, WorkoutMeta>;
for (const type of WORKOUT_TYPES) {
  WORKOUT_META[type] = Object.defineProperty({ ...BASE_META[type] }, 'label', {
    get: () => i18n.t(`workout.types.${type}`),
    enumerable: true,
  }) as WorkoutMeta;
}

/**
 * Calcule les calories brûlées.
 * Formule : MET × poids_kg × durée_heures
 * Poids par défaut : 70 kg si non renseigné.
 */
export function computeWorkoutCalories(
  type: WorkoutType,
  durationMinutes: number,
  weightKg = 70
): number {
  const { met } = WORKOUT_META[type];
  return Math.round(met * weightKg * (durationMinutes / 60));
}
