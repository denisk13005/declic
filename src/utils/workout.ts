import { WorkoutType } from '@/types';

// ─── METs par type de sport ──────────────────────────────────────────────────
// Source : Compendium of Physical Activities (Ainsworth et al.)

export const WORKOUT_META: Record<
  WorkoutType,
  { label: string; emoji: string; met: number; color: string }
> = {
  marche:       { label: 'Marche',          emoji: '🚶', met: 3.5,  color: '#34D399' },
  course:       { label: 'Course à pied',   emoji: '🏃', met: 9.0,  color: '#F97316' },
  velo:         { label: 'Vélo',            emoji: '🚴', met: 7.5,  color: '#60A5FA' },
  natation:     { label: 'Natation',        emoji: '🏊', met: 7.0,  color: '#38BDF8' },
  musculation:  { label: 'Musculation',     emoji: '🏋️', met: 4.0,  color: '#A78BFA' },
  hiit:         { label: 'HIIT',            emoji: '⚡', met: 10.0, color: '#FBBF24' },
  yoga:         { label: 'Yoga',            emoji: '🧘', met: 2.5,  color: '#86EFAC' },
  football:     { label: 'Football',        emoji: '⚽', met: 8.0,  color: '#4ADE80' },
  basketball:   { label: 'Basketball',      emoji: '🏀', met: 6.5,  color: '#FB923C' },
  tennis:       { label: 'Tennis',          emoji: '🎾', met: 7.0,  color: '#FCD34D' },
  elliptique:   { label: 'Elliptique',      emoji: '🔄', met: 5.0,  color: '#C084FC' },
  randonnee:    { label: 'Randonnée',       emoji: '🥾', met: 5.5,  color: '#6EE7B7' },
  danse:        { label: 'Danse',           emoji: '💃', met: 5.0,  color: '#F472B6' },
  escaliers:    { label: 'Montée d\'escaliers', emoji: '🪜', met: 4.0, color: '#FCA5A5' },
  autre:        { label: 'Autre activité',  emoji: '🏃', met: 4.0,  color: '#9CA3AF' },
};

export const WORKOUT_TYPES = Object.keys(WORKOUT_META) as WorkoutType[];

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
