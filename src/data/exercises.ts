import { PractitionerLevel } from '@/types';
import i18n, { translatedRecord } from '@/i18n';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs';

export const MUSCLE_GROUP_LABELS = translatedRecord<MuscleGroup>(
  ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'],
  'muscleGroups',
);

/**
 * Groupes musculaires antagonistes pour les supersets.
 * Un superset associe deux muscles antagonistes (ex. pectoraux ↔ dos).
 */
export const ANTAGONIST_GROUPS: Record<MuscleGroup, MuscleGroup[]> = {
  chest:      ['back'],
  back:       ['chest'],
  biceps:     ['triceps'],
  triceps:    ['biceps'],
  quads:      ['hamstrings', 'glutes'],
  hamstrings: ['quads', 'glutes'],
  glutes:     ['quads', 'hamstrings', 'abs'],
  shoulders:  ['back'],
  abs:        ['back', 'glutes'],
  calves:     [],
};

/** Matériel requis pour réaliser l'exercice */
export type EquipmentType =
  | 'bodyweight'      // poids de corps, aucun matériel
  | 'dumbbells'       // haltères (+ banc supposé)
  | 'barbell'         // barre olympique + rack
  | 'pull_up_bar'     // barre de traction
  | 'resistance_band' // élastiques de résistance
  | 'cables'          // machine à câbles / poulies
  | 'machines';       // machines guidées (leg press, pec deck…)

export const EQUIPMENT_LABELS = translatedRecord<EquipmentType>(
  ['bodyweight', 'dumbbells', 'barbell', 'pull_up_bar', 'resistance_band', 'cables', 'machines'],
  'equipment',
);

export const EQUIPMENT_EMOJI: Record<EquipmentType, string> = {
  bodyweight:      '🤸',
  dumbbells:       '🏋️',
  barbell:         '⚖️',
  pull_up_bar:     '🔩',
  resistance_band: '🎗️',
  cables:          '🔌',
  machines:        '⚙️',
};

export const ALL_EQUIPMENT: EquipmentType[] = [
  'bodyweight', 'dumbbells', 'barbell', 'pull_up_bar', 'resistance_band', 'cables', 'machines',
];

export interface Exercise {
  id: string;
  /** Nom traduit (getter i18n : exercises.<id>.name) */
  readonly name: string;
  muscleGroup: MuscleGroup;
  isCompound: boolean;
  minLevel: PractitionerLevel;
  /** Famille de mouvement — deux exercices de la même famille ne doivent pas être dans la même séance */
  family: string;
  /** Conseil technique court, traduit (getter i18n : exercises.<id>.description) */
  readonly description: string;
  /** Matériel principal requis pour réaliser l'exercice */
  equipment: EquipmentType;
}

type RawExercise = Omit<Exercise, 'equipment' | 'name' | 'description'>;

const LEVEL_ORDER: Record<PractitionerLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

export function isAvailableForLevel(exercise: Exercise, level: PractitionerLevel): boolean {
  return LEVEL_ORDER[exercise.minLevel] <= LEVEL_ORDER[level];
}

const RAW_EXERCISES: RawExercise[] = [
  // ─── Pectoraux ───────────────────────────────────────────────────────────────
  { id: 'push_up',          muscleGroup: 'chest',      isCompound: true,  minLevel: 'beginner',     family: 'chest_press_flat' },
  { id: 'pec_deck',         muscleGroup: 'chest',      isCompound: false, minLevel: 'beginner',     family: 'chest_fly' },
  { id: 'cable_fly',        muscleGroup: 'chest',      isCompound: false, minLevel: 'beginner',     family: 'chest_fly' },
  { id: 'bench_press_db',   muscleGroup: 'chest',      isCompound: true,  minLevel: 'beginner',     family: 'chest_press_flat' },
  { id: 'bench_press',      muscleGroup: 'chest',      isCompound: true,  minLevel: 'intermediate', family: 'chest_press_flat' },
  { id: 'incline_press',    muscleGroup: 'chest',      isCompound: true,  minLevel: 'intermediate', family: 'chest_press_incline' },
  { id: 'incline_press_bb', muscleGroup: 'chest',      isCompound: true,  minLevel: 'intermediate', family: 'chest_press_incline' },
  { id: 'dips_chest',       muscleGroup: 'chest',      isCompound: true,  minLevel: 'intermediate', family: 'chest_dips' },
  { id: 'fly_dumbbell',     muscleGroup: 'chest',      isCompound: false, minLevel: 'intermediate', family: 'chest_fly' },
  { id: 'decline_press',    muscleGroup: 'chest',      isCompound: true,  minLevel: 'advanced',     family: 'chest_press_decline' },
  { id: 'guillotine_press', muscleGroup: 'chest',      isCompound: true,  minLevel: 'advanced',     family: 'chest_press_flat' },

  // ─── Dos ─────────────────────────────────────────────────────────────────────
  { id: 'lat_pulldown',     muscleGroup: 'back',       isCompound: true,  minLevel: 'beginner',     family: 'vertical_pull' },
  { id: 'seated_row',       muscleGroup: 'back',       isCompound: false, minLevel: 'beginner',     family: 'horizontal_row' },
  { id: 'face_pull',        muscleGroup: 'back',       isCompound: false, minLevel: 'beginner',     family: 'face_pull' },
  { id: 'pull_up',          muscleGroup: 'back',       isCompound: true,  minLevel: 'intermediate', family: 'vertical_pull' },
  { id: 'barbell_row',      muscleGroup: 'back',       isCompound: true,  minLevel: 'intermediate', family: 'horizontal_row' },
  { id: 'one_arm_row',      muscleGroup: 'back',       isCompound: false, minLevel: 'intermediate', family: 'horizontal_row' },
  { id: 'deadlift',         muscleGroup: 'back',       isCompound: true,  minLevel: 'intermediate', family: 'hip_hinge' },
  { id: 'chest_supported',  muscleGroup: 'back',       isCompound: false, minLevel: 'intermediate', family: 'horizontal_row' },
  { id: 'chin_up',          muscleGroup: 'back',       isCompound: true,  minLevel: 'intermediate', family: 'vertical_pull' },
  { id: 'tbar_row',         muscleGroup: 'back',       isCompound: true,  minLevel: 'intermediate', family: 'horizontal_row' },
  { id: 'pullover_db',      muscleGroup: 'back',       isCompound: false, minLevel: 'intermediate', family: 'pullover' },
  { id: 'pendlay_row',      muscleGroup: 'back',       isCompound: true,  minLevel: 'advanced',     family: 'horizontal_row' },
  { id: 'meadows_row',      muscleGroup: 'back',       isCompound: false, minLevel: 'advanced',     family: 'horizontal_row' },

  // ─── Épaules ─────────────────────────────────────────────────────────────────
  { id: 'lateral_raise',    muscleGroup: 'shoulders',  isCompound: false, minLevel: 'beginner',     family: 'lateral_raise' },
  { id: 'dumbbell_press',   muscleGroup: 'shoulders',  isCompound: true,  minLevel: 'beginner',     family: 'overhead_press' },
  { id: 'front_raise',      muscleGroup: 'shoulders',  isCompound: false, minLevel: 'beginner',     family: 'front_raise' },
  { id: 'ohp',              muscleGroup: 'shoulders',  isCompound: true,  minLevel: 'intermediate', family: 'overhead_press' },
  { id: 'arnold_press',     muscleGroup: 'shoulders',  isCompound: true,  minLevel: 'intermediate', family: 'overhead_press' },
  { id: 'rear_delt_fly',    muscleGroup: 'shoulders', isCompound: false, minLevel: 'beginner',     family: 'rear_delt' },
  { id: 'upright_row',      muscleGroup: 'shoulders',  isCompound: false, minLevel: 'intermediate', family: 'upright_row' },
  { id: 'machine_shoulder', muscleGroup: 'shoulders',  isCompound: true,  minLevel: 'beginner',     family: 'overhead_press' },
  { id: 'cable_lateral',    muscleGroup: 'shoulders',  isCompound: false, minLevel: 'intermediate', family: 'lateral_raise' },
  { id: 'behind_neck_press',muscleGroup: 'shoulders',  isCompound: true,  minLevel: 'advanced',     family: 'overhead_press' },

  // ─── Biceps ──────────────────────────────────────────────────────────────────
  { id: 'dumbbell_curl',    muscleGroup: 'biceps',     isCompound: false, minLevel: 'beginner',     family: 'supinated_curl' },
  { id: 'hammer_curl',      muscleGroup: 'biceps',     isCompound: false, minLevel: 'beginner',     family: 'neutral_curl' },
  { id: 'cable_curl',       muscleGroup: 'biceps',     isCompound: false, minLevel: 'beginner',     family: 'supinated_curl' },
  { id: 'barbell_curl',     muscleGroup: 'biceps',     isCompound: false, minLevel: 'intermediate', family: 'supinated_curl' },
  { id: 'incline_curl',     muscleGroup: 'biceps',     isCompound: false, minLevel: 'intermediate', family: 'incline_curl' },
  { id: 'preacher_curl',    muscleGroup: 'biceps',     isCompound: false, minLevel: 'intermediate', family: 'preacher_curl' },
  { id: 'concentration_curl',muscleGroup: 'biceps',     isCompound: false, minLevel: 'intermediate', family: 'concentration_curl' },
  { id: 'spider_curl',      muscleGroup: 'biceps',     isCompound: false, minLevel: 'advanced',     family: 'spider_curl' },
  { id: 'bayesian_curl',    muscleGroup: 'biceps',     isCompound: false, minLevel: 'advanced',     family: 'cable_curl_high' },

  // ─── Triceps ─────────────────────────────────────────────────────────────────
  { id: 'tricep_pushdown',  muscleGroup: 'triceps',    isCompound: false, minLevel: 'beginner',     family: 'tricep_pushdown' },
  { id: 'overhead_ext',     muscleGroup: 'triceps',    isCompound: false, minLevel: 'beginner',     family: 'overhead_tricep' },
  { id: 'dips_triceps',     muscleGroup: 'triceps',    isCompound: true,  minLevel: 'beginner',     family: 'tricep_dips' },
  { id: 'skull_crusher',    muscleGroup: 'triceps',    isCompound: false, minLevel: 'intermediate', family: 'overhead_tricep' },
  { id: 'close_grip_bench', muscleGroup: 'triceps',    isCompound: true,  minLevel: 'intermediate', family: 'close_grip_press' },
  { id: 'dips_parallel',    muscleGroup: 'triceps',    isCompound: true,  minLevel: 'intermediate', family: 'tricep_dips' },
  { id: 'tricep_kickback',  muscleGroup: 'triceps',    isCompound: false, minLevel: 'beginner',     family: 'tricep_kickback' },
  { id: 'cable_overhead_t', muscleGroup: 'triceps',   isCompound: false, minLevel: 'intermediate', family: 'overhead_tricep' },
  { id: 'tate_press',       muscleGroup: 'triceps',    isCompound: false, minLevel: 'advanced',     family: 'close_grip_press' },
  { id: 'jm_press',         muscleGroup: 'triceps',    isCompound: false, minLevel: 'advanced',     family: 'overhead_tricep' },

  // ─── Quadriceps ──────────────────────────────────────────────────────────────
  { id: 'leg_press',        muscleGroup: 'quads',      isCompound: true,  minLevel: 'beginner',     family: 'leg_press' },
  { id: 'leg_extension',    muscleGroup: 'quads',      isCompound: false, minLevel: 'beginner',     family: 'leg_extension' },
  { id: 'goblet_squat',     muscleGroup: 'quads',      isCompound: true,  minLevel: 'beginner',     family: 'machine_squat' },
  { id: 'lunge',            muscleGroup: 'quads',      isCompound: true,  minLevel: 'beginner',     family: 'lunge' },
  { id: 'walking_lunge',    muscleGroup: 'quads',      isCompound: true,  minLevel: 'intermediate', family: 'lunge' },
  { id: 'step_up',          muscleGroup: 'quads',      isCompound: true,  minLevel: 'beginner',     family: 'step_up' },
  { id: 'squat',            muscleGroup: 'quads',      isCompound: true,  minLevel: 'intermediate', family: 'back_squat' },
  { id: 'bulgarian_squat',  muscleGroup: 'quads',      isCompound: true,  minLevel: 'intermediate', family: 'lunge' },
  { id: 'hack_squat',       muscleGroup: 'quads',      isCompound: true,  minLevel: 'intermediate', family: 'machine_squat' },
  { id: 'front_squat',      muscleGroup: 'quads',      isCompound: true,  minLevel: 'advanced',     family: 'back_squat' },
  { id: 'sissy_squat',      muscleGroup: 'quads',      isCompound: false, minLevel: 'advanced',     family: 'leg_extension' },

  // ─── Ischio-jambiers ─────────────────────────────────────────────────────────
  { id: 'leg_curl',         muscleGroup: 'hamstrings', isCompound: false, minLevel: 'beginner',     family: 'leg_curl' },
  { id: 'rdl',              muscleGroup: 'hamstrings', isCompound: true,  minLevel: 'intermediate', family: 'hip_hinge_hamstring' },
  { id: 'good_morning',     muscleGroup: 'hamstrings', isCompound: true,  minLevel: 'intermediate', family: 'hip_hinge_hamstring' },
  { id: 'seated_leg_curl',  muscleGroup: 'hamstrings', isCompound: false, minLevel: 'intermediate', family: 'leg_curl' },
  { id: 'nordic_curl',      muscleGroup: 'hamstrings', isCompound: false, minLevel: 'advanced',     family: 'nordic_curl' },
  { id: 'lying_leg_curl',   muscleGroup: 'hamstrings', isCompound: false, minLevel: 'advanced',     family: 'leg_curl' },

  // ─── Fessiers ────────────────────────────────────────────────────────────────
  { id: 'glute_bridge',     muscleGroup: 'glutes',     isCompound: false, minLevel: 'beginner',     family: 'hip_thrust' },
  { id: 'sumo_squat',       muscleGroup: 'glutes',     isCompound: true,  minLevel: 'beginner',     family: 'sumo_squat' },
  { id: 'cable_kickback',   muscleGroup: 'glutes',     isCompound: false, minLevel: 'beginner',     family: 'glute_isolation' },
  { id: 'hip_thrust',       muscleGroup: 'glutes',     isCompound: true,  minLevel: 'intermediate', family: 'hip_thrust' },
  { id: 'rdl_glutes',       muscleGroup: 'glutes',     isCompound: true,  minLevel: 'intermediate', family: 'hip_hinge_glutes' },
  { id: 'banded_abduction', muscleGroup: 'glutes',     isCompound: false, minLevel: 'intermediate', family: 'glute_isolation' },
  { id: 'single_hip_thrust',muscleGroup: 'glutes',     isCompound: true,  minLevel: 'advanced',     family: 'hip_thrust' },

  // ─── Mollets ─────────────────────────────────────────────────────────────────
  { id: 'standing_calf',    muscleGroup: 'calves',     isCompound: false, minLevel: 'beginner',     family: 'calf_raise' },
  { id: 'seated_calf',      muscleGroup: 'calves',     isCompound: false, minLevel: 'beginner',     family: 'calf_raise' },
  { id: 'donkey_calf',      muscleGroup: 'calves',     isCompound: false, minLevel: 'advanced',     family: 'calf_raise' },

  // ─── Abdominaux ──────────────────────────────────────────────────────────────
  { id: 'plank',            muscleGroup: 'abs',        isCompound: false, minLevel: 'beginner',     family: 'plank' },
  { id: 'side_plank',       muscleGroup: 'abs',        isCompound: false, minLevel: 'beginner',     family: 'plank' },
  { id: 'bicycle_crunch',   muscleGroup: 'abs',        isCompound: false, minLevel: 'beginner',     family: 'crunch' },
  { id: 'crunch',           muscleGroup: 'abs',        isCompound: false, minLevel: 'beginner',     family: 'crunch' },
  { id: 'leg_raise',        muscleGroup: 'abs',        isCompound: false, minLevel: 'beginner',     family: 'leg_raise' },
  { id: 'cable_crunch',     muscleGroup: 'abs',        isCompound: false, minLevel: 'intermediate', family: 'crunch' },
  { id: 'russian_twist',    muscleGroup: 'abs',        isCompound: false, minLevel: 'intermediate', family: 'rotation' },
  { id: 'ab_wheel',         muscleGroup: 'abs',        isCompound: false, minLevel: 'intermediate', family: 'ab_wheel' },
  { id: 'dragon_flag',      muscleGroup: 'abs',        isCompound: false, minLevel: 'advanced',     family: 'dragon_flag' },
  { id: 'hanging_leg_raise',muscleGroup: 'abs',        isCompound: false, minLevel: 'advanced',     family: 'leg_raise' },

  // ─── Pectoraux (ajouts) ───────────────────────────────────────────────────
  { id: 'machine_chest_press',   muscleGroup: 'chest',      isCompound: true,  minLevel: 'beginner',     family: 'chest_press_flat' },
  { id: 'diamond_push_up',       muscleGroup: 'chest',      isCompound: true,  minLevel: 'intermediate', family: 'chest_press_narrow' },
  { id: 'push_up_feet_elevated', muscleGroup: 'chest',      isCompound: true,  minLevel: 'intermediate', family: 'chest_press_incline' },
  { id: 'low_cable_fly',         muscleGroup: 'chest',      isCompound: false, minLevel: 'intermediate', family: 'chest_fly' },
  { id: 'push_up_ring',          muscleGroup: 'chest',      isCompound: true,  minLevel: 'advanced',     family: 'chest_press_flat' },
  { id: 'landmine_press',        muscleGroup: 'chest',      isCompound: true,  minLevel: 'intermediate', family: 'chest_press_incline' },
  { id: 'cable_fly_mid',         muscleGroup: 'chest',      isCompound: false, minLevel: 'beginner',     family: 'chest_fly' },

  // ─── Dos (ajouts) ────────────────────────────────────────────────────────
  { id: 'narrow_lat_pulldown',   muscleGroup: 'back',       isCompound: true,  minLevel: 'beginner',     family: 'vertical_pull' },
  { id: 'machine_row',           muscleGroup: 'back',       isCompound: true,  minLevel: 'beginner',     family: 'horizontal_row' },
  { id: 'rack_pull',             muscleGroup: 'back',       isCompound: true,  minLevel: 'intermediate', family: 'hip_hinge' },
  { id: 'weighted_pull_up',      muscleGroup: 'back',       isCompound: true,  minLevel: 'advanced',     family: 'vertical_pull' },
  { id: 'seal_row',              muscleGroup: 'back',       isCompound: true,  minLevel: 'advanced',     family: 'horizontal_row' },
  { id: 'straight_arm_pulldown', muscleGroup: 'back',       isCompound: false, minLevel: 'intermediate', family: 'pullover' },
  { id: 'cable_row_single',      muscleGroup: 'back',       isCompound: false, minLevel: 'intermediate', family: 'horizontal_row' },
  { id: 'assisted_pull_up',      muscleGroup: 'back',       isCompound: true,  minLevel: 'beginner',     family: 'vertical_pull' },

  // ─── Épaules (ajouts) ────────────────────────────────────────────────────
  { id: 'machine_lateral_raise', muscleGroup: 'shoulders',  isCompound: false, minLevel: 'beginner',     family: 'lateral_raise' },
  { id: 'cable_rear_delt',       muscleGroup: 'shoulders',  isCompound: false, minLevel: 'beginner',     family: 'rear_delt' },
  { id: 'lu_raise',              muscleGroup: 'shoulders',  isCompound: false, minLevel: 'intermediate', family: 'front_raise' },
  { id: 'handstand_push_up',     muscleGroup: 'shoulders',  isCompound: true,  minLevel: 'advanced',     family: 'overhead_press' },
  { id: 'z_press',               muscleGroup: 'shoulders',  isCompound: true,  minLevel: 'intermediate', family: 'overhead_press' },

  // ─── Biceps (ajouts) ─────────────────────────────────────────────────────
  { id: 'reverse_curl',          muscleGroup: 'biceps',     isCompound: false, minLevel: 'intermediate', family: 'reverse_curl' },
  { id: 'zottman_curl',          muscleGroup: 'biceps',     isCompound: false, minLevel: 'intermediate', family: 'neutral_curl' },
  { id: 'drag_curl',             muscleGroup: 'biceps',     isCompound: false, minLevel: 'intermediate', family: 'supinated_curl' },
  { id: 'cross_body_cable_curl', muscleGroup: 'biceps',     isCompound: false, minLevel: 'advanced',     family: 'cable_curl_high' },
  { id: 'waiter_curl',           muscleGroup: 'biceps',     isCompound: false, minLevel: 'beginner',     family: 'supinated_curl' },

  // ─── Triceps (ajouts) ────────────────────────────────────────────────────
  { id: 'pushdown_bar',          muscleGroup: 'triceps',    isCompound: false, minLevel: 'beginner',     family: 'tricep_pushdown' },
  { id: 'single_arm_cable_ext',  muscleGroup: 'triceps',    isCompound: false, minLevel: 'intermediate', family: 'overhead_tricep' },
  { id: 'cable_kickback_tri',    muscleGroup: 'triceps',    isCompound: false, minLevel: 'intermediate', family: 'tricep_kickback' },
  { id: 'band_pushdown',         muscleGroup: 'triceps',    isCompound: false, minLevel: 'beginner',     family: 'tricep_pushdown' },
  { id: 'bench_dip_weighted',    muscleGroup: 'triceps',    isCompound: true,  minLevel: 'intermediate', family: 'tricep_dips' },

  // ─── Quadriceps (ajouts) ─────────────────────────────────────────────────
  { id: 'reverse_lunge',         muscleGroup: 'quads',      isCompound: true,  minLevel: 'beginner',     family: 'lunge' },
  { id: 'single_leg_press',      muscleGroup: 'quads',      isCompound: true,  minLevel: 'intermediate', family: 'leg_press' },
  { id: 'high_foot_leg_press',   muscleGroup: 'quads',      isCompound: true,  minLevel: 'intermediate', family: 'leg_press' },
  { id: 'belt_squat',            muscleGroup: 'quads',      isCompound: true,  minLevel: 'advanced',     family: 'back_squat' },
  { id: 'split_squat',           muscleGroup: 'quads',      isCompound: true,  minLevel: 'beginner',     family: 'lunge' },
  { id: 'leg_press_close',       muscleGroup: 'quads',      isCompound: true,  minLevel: 'intermediate', family: 'leg_press' },

  // ─── Ischio-jambiers (ajouts) ────────────────────────────────────────────
  { id: 'hyperextension',        muscleGroup: 'hamstrings', isCompound: true,  minLevel: 'beginner',     family: 'hip_hinge_hamstring' },
  { id: 'single_leg_rdl',        muscleGroup: 'hamstrings', isCompound: true,  minLevel: 'intermediate', family: 'hip_hinge_hamstring' },
  { id: 'glute_ham_raise',       muscleGroup: 'hamstrings', isCompound: false, minLevel: 'advanced',     family: 'nordic_curl' },
  { id: 'standing_leg_curl',     muscleGroup: 'hamstrings', isCompound: false, minLevel: 'beginner',     family: 'leg_curl' },
  { id: 'banded_good_morning',   muscleGroup: 'hamstrings', isCompound: true,  minLevel: 'beginner',     family: 'hip_hinge_hamstring' },

  // ─── Fessiers (ajouts) ───────────────────────────────────────────────────
  { id: 'clamshell',             muscleGroup: 'glutes',     isCompound: false, minLevel: 'beginner',     family: 'glute_isolation' },
  { id: 'fire_hydrant',          muscleGroup: 'glutes',     isCompound: false, minLevel: 'beginner',     family: 'glute_isolation' },
  { id: 'cable_pull_through',    muscleGroup: 'glutes',     isCompound: true,  minLevel: 'intermediate', family: 'hip_hinge_glutes' },
  { id: 'reverse_hyper',         muscleGroup: 'glutes',     isCompound: true,  minLevel: 'intermediate', family: 'hip_hinge_glutes' },
  { id: 'sumo_squat_bb',         muscleGroup: 'glutes',     isCompound: true,  minLevel: 'intermediate', family: 'sumo_squat' },
  { id: 'donkey_kick',           muscleGroup: 'glutes',     isCompound: false, minLevel: 'beginner',     family: 'glute_isolation' },

  // ─── Mollets (ajouts) ────────────────────────────────────────────────────
  { id: 'single_calf_raise',     muscleGroup: 'calves',     isCompound: false, minLevel: 'intermediate', family: 'calf_raise' },
  { id: 'barbell_calf_raise',    muscleGroup: 'calves',     isCompound: false, minLevel: 'intermediate', family: 'calf_raise' },
  { id: 'step_calf_raise',       muscleGroup: 'calves',     isCompound: false, minLevel: 'beginner',     family: 'calf_raise' },
  { id: 'tibia_raise',           muscleGroup: 'calves',     isCompound: false, minLevel: 'beginner',     family: 'calf_raise' },

  // ─── Abdominaux (ajouts) ─────────────────────────────────────────────────
  { id: 'hollow_body',           muscleGroup: 'abs',        isCompound: false, minLevel: 'intermediate', family: 'plank' },
  { id: 'toes_to_bar',           muscleGroup: 'abs',        isCompound: false, minLevel: 'advanced',     family: 'leg_raise' },
  { id: 'pallof_press',          muscleGroup: 'abs',        isCompound: false, minLevel: 'intermediate', family: 'rotation' },
  { id: 'wood_chop',             muscleGroup: 'abs',        isCompound: false, minLevel: 'intermediate', family: 'rotation' },
  { id: 'decline_crunch',        muscleGroup: 'abs',        isCompound: false, minLevel: 'intermediate', family: 'crunch' },
  { id: 'flutter_kicks',         muscleGroup: 'abs',        isCompound: false, minLevel: 'beginner',     family: 'leg_raise' },
  { id: 'mountain_climber',      muscleGroup: 'abs',        isCompound: true,  minLevel: 'beginner',     family: 'plank' },
  { id: 'l_sit',                 muscleGroup: 'abs',        isCompound: false, minLevel: 'advanced',     family: 'plank' },
  { id: 'dead_bug',              muscleGroup: 'abs',        isCompound: false, minLevel: 'beginner',     family: 'plank' },
  { id: 'v_up',                  muscleGroup: 'abs',        isCompound: false, minLevel: 'intermediate', family: 'crunch' },
];

// Matériel requis par exercice (défaut : 'machines' si absent)
const EXERCISE_EQUIPMENT: Record<string, EquipmentType> = {
  // ── Pectoraux ──
  push_up: 'bodyweight', pec_deck: 'machines', cable_fly: 'cables',
  bench_press_db: 'dumbbells', bench_press: 'barbell', incline_press: 'dumbbells',
  incline_press_bb: 'barbell', dips_chest: 'bodyweight', fly_dumbbell: 'dumbbells',
  decline_press: 'dumbbells', guillotine_press: 'barbell', machine_chest_press: 'machines',
  diamond_push_up: 'bodyweight', push_up_feet_elevated: 'bodyweight', low_cable_fly: 'cables',
  push_up_ring: 'bodyweight', landmine_press: 'barbell', cable_fly_mid: 'cables',
  // ── Dos ──
  lat_pulldown: 'cables', seated_row: 'cables', face_pull: 'cables',
  pull_up: 'pull_up_bar', barbell_row: 'barbell', one_arm_row: 'dumbbells',
  deadlift: 'barbell', chest_supported: 'dumbbells', chin_up: 'pull_up_bar',
  tbar_row: 'barbell', pullover_db: 'dumbbells', pendlay_row: 'barbell',
  meadows_row: 'barbell', narrow_lat_pulldown: 'cables', machine_row: 'machines',
  rack_pull: 'barbell', weighted_pull_up: 'pull_up_bar', seal_row: 'dumbbells',
  straight_arm_pulldown: 'cables', cable_row_single: 'cables', assisted_pull_up: 'machines',
  // ── Épaules ──
  lateral_raise: 'dumbbells', dumbbell_press: 'dumbbells', front_raise: 'dumbbells',
  ohp: 'barbell', arnold_press: 'dumbbells', rear_delt_fly: 'dumbbells',
  upright_row: 'dumbbells', machine_shoulder: 'machines', cable_lateral: 'cables',
  behind_neck_press: 'barbell', machine_lateral_raise: 'machines', cable_rear_delt: 'cables',
  lu_raise: 'dumbbells', handstand_push_up: 'bodyweight', z_press: 'dumbbells',
  // ── Biceps ──
  dumbbell_curl: 'dumbbells', hammer_curl: 'dumbbells', cable_curl: 'cables',
  barbell_curl: 'barbell', incline_curl: 'dumbbells', preacher_curl: 'machines',
  concentration_curl: 'dumbbells', spider_curl: 'dumbbells', bayesian_curl: 'cables',
  reverse_curl: 'dumbbells', zottman_curl: 'dumbbells', drag_curl: 'barbell',
  cross_body_cable_curl: 'cables', waiter_curl: 'dumbbells',
  // ── Triceps ──
  tricep_pushdown: 'cables', overhead_ext: 'dumbbells', dips_triceps: 'bodyweight',
  skull_crusher: 'barbell', close_grip_bench: 'barbell', dips_parallel: 'bodyweight',
  tricep_kickback: 'dumbbells', cable_overhead_t: 'cables', tate_press: 'dumbbells',
  jm_press: 'barbell', pushdown_bar: 'cables', single_arm_cable_ext: 'cables',
  cable_kickback_tri: 'cables', band_pushdown: 'resistance_band', bench_dip_weighted: 'bodyweight',
  // ── Quadriceps ──
  leg_press: 'machines', leg_extension: 'machines', goblet_squat: 'dumbbells',
  lunge: 'bodyweight', walking_lunge: 'bodyweight', step_up: 'bodyweight',
  squat: 'barbell', bulgarian_squat: 'dumbbells', hack_squat: 'machines',
  front_squat: 'barbell', sissy_squat: 'bodyweight', reverse_lunge: 'bodyweight',
  single_leg_press: 'machines', high_foot_leg_press: 'machines', belt_squat: 'machines',
  split_squat: 'bodyweight', leg_press_close: 'machines',
  // ── Ischio-jambiers ──
  leg_curl: 'machines', rdl: 'barbell', good_morning: 'barbell',
  seated_leg_curl: 'machines', nordic_curl: 'bodyweight', lying_leg_curl: 'cables',
  hyperextension: 'machines', single_leg_rdl: 'dumbbells', glute_ham_raise: 'machines',
  standing_leg_curl: 'machines', banded_good_morning: 'resistance_band',
  // ── Fessiers ──
  glute_bridge: 'bodyweight', sumo_squat: 'dumbbells', cable_kickback: 'cables',
  hip_thrust: 'barbell', rdl_glutes: 'dumbbells', banded_abduction: 'resistance_band',
  single_hip_thrust: 'bodyweight', clamshell: 'bodyweight', fire_hydrant: 'bodyweight',
  cable_pull_through: 'cables', reverse_hyper: 'machines', sumo_squat_bb: 'barbell',
  donkey_kick: 'bodyweight',
  // ── Mollets ──
  standing_calf: 'machines', seated_calf: 'machines', donkey_calf: 'machines',
  single_calf_raise: 'bodyweight', barbell_calf_raise: 'barbell',
  step_calf_raise: 'bodyweight', tibia_raise: 'bodyweight',
  // ── Abdominaux ──
  plank: 'bodyweight', side_plank: 'bodyweight', bicycle_crunch: 'bodyweight',
  crunch: 'bodyweight', leg_raise: 'bodyweight', cable_crunch: 'cables',
  russian_twist: 'bodyweight', ab_wheel: 'bodyweight', dragon_flag: 'bodyweight',
  hanging_leg_raise: 'pull_up_bar', hollow_body: 'bodyweight', toes_to_bar: 'pull_up_bar',
  pallof_press: 'cables', wood_chop: 'cables', decline_crunch: 'machines',
  flutter_kicks: 'bodyweight', mountain_climber: 'bodyweight', l_sit: 'bodyweight',
  dead_bug: 'bodyweight', v_up: 'bodyweight',
};

// Nom et description traduits à la lecture (fichiers src/i18n/locales/*.json, section exercises)
export const EXERCISES: Exercise[] = RAW_EXERCISES.map((e) =>
  Object.defineProperties(
    { ...e, equipment: EXERCISE_EQUIPMENT[e.id] ?? 'machines' },
    {
      name: { get: () => i18n.t(`exercises.${e.id}.name`), enumerable: true },
      description: { get: () => i18n.t(`exercises.${e.id}.description`), enumerable: true },
    },
  ) as Exercise
);

/**
 * Nom traduit d'un exercice enregistré (programme, historique de séances).
 * Les données sauvegardées gardent le nom au moment de l'enregistrement : on le retraduit
 * via l'id quand l'exercice est connu, sinon on garde le nom stocké.
 */
export function exerciseName(id: string, storedName: string): string {
  const key = `exercises.${id}.name`;
  return i18n.exists(key) ? i18n.t(key) : storedName;
}

/** Description traduite d'un exercice enregistré (même principe que `exerciseName`). */
export function exerciseDescription(id: string, storedDescription: string): string {
  const key = `exercises.${id}.description`;
  return i18n.exists(key) ? i18n.t(key) : storedDescription;
}

export function getAvailableExercises(group: MuscleGroup, level: PractitionerLevel, availableEquipment?: Set<EquipmentType>): Exercise[] {
  return EXERCISES.filter((e) =>
    e.muscleGroup === group &&
    isAvailableForLevel(e, level) &&
    (!availableEquipment || availableEquipment.has(e.equipment))
  );
}

export function getAvailableCompounds(group: MuscleGroup, level: PractitionerLevel, availableEquipment?: Set<EquipmentType>): Exercise[] {
  return EXERCISES.filter((e) =>
    e.muscleGroup === group &&
    e.isCompound &&
    isAvailableForLevel(e, level) &&
    (!availableEquipment || availableEquipment.has(e.equipment))
  );
}

export function getAvailableIsolations(group: MuscleGroup, level: PractitionerLevel, availableEquipment?: Set<EquipmentType>): Exercise[] {
  return EXERCISES.filter((e) =>
    e.muscleGroup === group &&
    !e.isCompound &&
    isAvailableForLevel(e, level) &&
    (!availableEquipment || availableEquipment.has(e.equipment))
  );
}
