import { PractitionerLevel } from '@/types';

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

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest:      'Pectoraux',
  back:       'Dos',
  shoulders:  'Épaules',
  biceps:     'Biceps',
  triceps:    'Triceps',
  quads:      'Quadriceps',
  hamstrings: 'Ischio-jambiers',
  glutes:     'Fessiers',
  calves:     'Mollets',
  abs:        'Abdominaux',
};

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isCompound: boolean;
  minLevel: PractitionerLevel;
  /** Famille de mouvement — deux exercices de la même famille ne doivent pas être dans la même séance */
  family: string;
  /** Conseil technique court en français */
  description: string;
}

const LEVEL_ORDER: Record<PractitionerLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

export function isAvailableForLevel(exercise: Exercise, level: PractitionerLevel): boolean {
  return LEVEL_ORDER[exercise.minLevel] <= LEVEL_ORDER[level];
}

export const EXERCISES: Exercise[] = [
  // ─── Pectoraux ───────────────────────────────────────────────────────────────
  { id: 'push_up',          name: 'Pompes',                       muscleGroup: 'chest',      isCompound: true,  minLevel: 'beginner',     family: 'chest_press_flat',    description: "Corps aligné de la tête aux talons, coudes à 45° du buste. Descends jusqu'à ce que la poitrine frôle le sol puis pousse explosif." },
  { id: 'pec_deck',         name: 'Pec deck (machine)',           muscleGroup: 'chest',      isCompound: false, minLevel: 'beginner',     family: 'chest_fly',           description: "Assis sur la machine, referme les bras en arc de cercle devant toi. Contrôle lentement le retour pour étirer les pectoraux." },
  { id: 'cable_fly',        name: 'Croisé poulie',                muscleGroup: 'chest',      isCompound: false, minLevel: 'beginner',     family: 'chest_fly',           description: "Debout entre deux poulies, ramène les câbles devant toi en arc de cercle. Garde une légère flexion des coudes tout le long." },
  { id: 'bench_press',      name: 'Développé couché barre',       muscleGroup: 'chest',      isCompound: true,  minLevel: 'intermediate', family: 'chest_press_flat',    description: "Omoplates serrées sur le banc, barre descendue vers le bas des pectoraux. Coudes à 75°, pousse verticalement sans décoller les fesses." },
  { id: 'incline_press',    name: 'Développé incliné haltères',   muscleGroup: 'chest',      isCompound: true,  minLevel: 'intermediate', family: 'chest_press_incline', description: "Banc incliné à 30-45°, haltères au niveau de la poitrine haute. Pousse vers le haut en concentrant le travail sur le haut des pectoraux." },
  { id: 'dips_chest',       name: 'Dips (pectoraux)',             muscleGroup: 'chest',      isCompound: true,  minLevel: 'intermediate', family: 'chest_dips',          description: "Incline le buste vers l'avant (30-45°) pour cibler les pectoraux. Descends jusqu'à 90° de flexion du coude, pousse en contractant la poitrine." },
  { id: 'fly_dumbbell',     name: 'Écarté haltères',              muscleGroup: 'chest',      isCompound: false, minLevel: 'intermediate', family: 'chest_fly',           description: "Allongé, descends les haltères en arc de cercle jusqu'à sentir l'étirement des pectoraux. Remonte sans verrouiller les coudes." },
  { id: 'decline_press',    name: 'Développé décliné haltères',   muscleGroup: 'chest',      isCompound: true,  minLevel: 'advanced',     family: 'chest_press_decline', description: "Banc décliné, cible le bas des pectoraux. Garde les coudes à 75° du buste et pousse en direction du plafond." },
  { id: 'guillotine_press', name: 'Développé couché cou',         muscleGroup: 'chest',      isCompound: true,  minLevel: 'advanced',     family: 'chest_press_flat',    description: "Barre descendue vers la gorge, prise large. Maximise l'étirement pectoral mais exige des épaules saines. Utilise une parade." },

  // ─── Dos ─────────────────────────────────────────────────────────────────────
  { id: 'lat_pulldown',     name: 'Tirage poulie haute',          muscleGroup: 'back',       isCompound: true,  minLevel: 'beginner',     family: 'vertical_pull',       description: "Prise large, tire la barre vers le haut de la poitrine en ramenant les coudes vers le bas et l'arrière. Initie le mouvement avec les dorsaux." },
  { id: 'seated_row',       name: 'Rowing poulie basse',          muscleGroup: 'back',       isCompound: false, minLevel: 'beginner',     family: 'horizontal_row',      description: "Assis, dos droit, tire la poignée vers le nombril. Serre les omoplates ensemble en fin de mouvement, contrôle le retour." },
  { id: 'face_pull',        name: 'Face pull',                    muscleGroup: 'back',       isCompound: false, minLevel: 'beginner',     family: 'face_pull',           description: "Poulie haute, tire la corde vers le visage en écartant les mains de chaque côté de la tête. Excellent pour la santé des épaules." },
  { id: 'pull_up',          name: 'Tractions',                    muscleGroup: 'back',       isCompound: true,  minLevel: 'intermediate', family: 'vertical_pull',       description: "Prise pronation légèrement plus large que les épaules. Initie avec les dorsaux, tire jusqu'au menton au-dessus de la barre. Corps gainé." },
  { id: 'barbell_row',      name: 'Rowing barre',                 muscleGroup: 'back',       isCompound: true,  minLevel: 'intermediate', family: 'horizontal_row',      description: "Buste incliné à 45°, genoux légèrement fléchis. Tire la barre vers le bas du sternum en gardant le dos plat et les coudes proches du corps." },
  { id: 'one_arm_row',      name: 'Rowing haltère unilatéral',    muscleGroup: 'back',       isCompound: false, minLevel: 'intermediate', family: 'horizontal_row',      description: "Un genou et une main sur le banc. Tire l'haltère vers la hanche avec une légère rotation du buste. Coude haut en fin de mouvement." },
  { id: 'deadlift',         name: 'Soulevé de terre',             muscleGroup: 'back',       isCompound: true,  minLevel: 'intermediate', family: 'hip_hinge',           description: "Pieds largeur de hanches, barre sur les tibias. Pousse le sol sans arrondir le dos, garde la barre très proche du corps tout le long." },
  { id: 'chest_supported',  name: 'Rowing prise neutre incliné',  muscleGroup: 'back',       isCompound: false, minLevel: 'intermediate', family: 'horizontal_row',      description: "Poitrine appuyée sur un banc incliné, tire les haltères vers les hanches. Élimine la compensation lombaire pour isoler le dos." },
  { id: 'pendlay_row',      name: 'Pendlay Row',                  muscleGroup: 'back',       isCompound: true,  minLevel: 'advanced',     family: 'horizontal_row',      description: "Barre au sol, buste horizontal. Tire de façon explosive vers le bas du sternum et repose la barre au sol à chaque répétition." },
  { id: 'meadows_row',      name: 'Meadows Row',                  muscleGroup: 'back',       isCompound: false, minLevel: 'advanced',     family: 'horizontal_row',      description: "Barre dans un landmine, position perpendiculaire. Tire vers la hanche avec rotation du buste. Grande amplitude de mouvement." },

  // ─── Épaules ─────────────────────────────────────────────────────────────────
  { id: 'lateral_raise',    name: 'Élévations latérales',         muscleGroup: 'shoulders',  isCompound: false, minLevel: 'beginner',     family: 'lateral_raise',       description: "Haltères en prise neutre, lève les bras sur les côtés jusqu'à l'horizontale. Légère flexion du coude, pouce légèrement baissé." },
  { id: 'dumbbell_press',   name: 'Développé épaules haltères',   muscleGroup: 'shoulders',  isCompound: true,  minLevel: 'beginner',     family: 'overhead_press',      description: "Assis ou debout, coudes à 90° en bas. Pousse les haltères au-dessus de la tête sans verrouiller les coudes. Gainage serré." },
  { id: 'front_raise',      name: 'Élévations frontales',         muscleGroup: 'shoulders',  isCompound: false, minLevel: 'beginner',     family: 'front_raise',         description: "Lève un bras (ou les deux) devant toi jusqu'à l'horizontale. Garde le buste droit et évite de balancer." },
  { id: 'ohp',              name: 'Développé militaire barre',    muscleGroup: 'shoulders',  isCompound: true,  minLevel: 'intermediate', family: 'overhead_press',      description: "Barre au niveau des clavicules, serre les fessiers et le gainage. Pousse verticalement au-dessus de la tête, barre dans l'axe." },
  { id: 'arnold_press',     name: 'Arnold Press',                 muscleGroup: 'shoulders',  isCompound: true,  minLevel: 'intermediate', family: 'overhead_press',      description: "Haltères devant le visage prise supination. En montant, ouvre les coudes et tourne les poignets vers l'extérieur. Travaille les 3 faisceaux." },
  { id: 'upright_row',      name: 'Rowing menton',                muscleGroup: 'shoulders',  isCompound: false, minLevel: 'intermediate', family: 'upright_row',         description: "Barre ou haltères le long du corps, tire vers le menton en gardant les coudes hauts. Attention si tu as des antécédents d'épaules." },
  { id: 'cable_lateral',    name: 'Élévations latérales poulie',  muscleGroup: 'shoulders',  isCompound: false, minLevel: 'intermediate', family: 'lateral_raise',       description: "Poulie basse sur le côté, lève le bras en arc jusqu'à l'horizontale. La tension constante de la poulie cible mieux le deltoïde médian." },
  { id: 'behind_neck_press',name: 'Développé nuque',              muscleGroup: 'shoulders',  isCompound: true,  minLevel: 'advanced',     family: 'overhead_press',      description: "Barre derrière la nuque, pousse vers le haut. Réservé aux pratiquants avec une excellente mobilité et sans fragilité aux épaules." },

  // ─── Biceps ──────────────────────────────────────────────────────────────────
  { id: 'dumbbell_curl',    name: 'Curl haltères alterné',        muscleGroup: 'biceps',     isCompound: false, minLevel: 'beginner',     family: 'supinated_curl',      description: "En alternant, amène l'haltère jusqu'à l'épaule avec supination du poignet en haut. Coude fixe contre le corps, contrôle la descente." },
  { id: 'hammer_curl',      name: 'Curl marteau',                 muscleGroup: 'biceps',     isCompound: false, minLevel: 'beginner',     family: 'neutral_curl',        description: "Prise neutre (pouces vers le haut), amène l'haltère à l'épaule. Travaille le brachial et le brachioradial en plus du biceps." },
  { id: 'cable_curl',       name: 'Curl poulie basse',            muscleGroup: 'biceps',     isCompound: false, minLevel: 'beginner',     family: 'supinated_curl',      description: "Poulie basse, curl avec barre droite ou EZ. La tension constante de la poulie maximise le travail du biceps en bas du mouvement." },
  { id: 'barbell_curl',     name: 'Curl barre',                   muscleGroup: 'biceps',     isCompound: false, minLevel: 'intermediate', family: 'supinated_curl',      description: "Barre droite ou EZ, flex les deux bras en gardant les coudes fixes contre le corps. Contrôle lentement la descente." },
  { id: 'incline_curl',     name: 'Curl incliné haltères',        muscleGroup: 'biceps',     isCompound: false, minLevel: 'intermediate', family: 'incline_curl',        description: "Allongé sur banc incliné, les bras pendent derrière. L'étirement de la longue portion du biceps en position basse est maximal." },
  { id: 'spider_curl',      name: 'Spider curl',                  muscleGroup: 'biceps',     isCompound: false, minLevel: 'advanced',     family: 'spider_curl',         description: "Poitrine appuyée sur un banc incliné, bras tombant verticalement. Isole parfaitement le biceps sans compensation des épaules." },
  { id: 'bayesian_curl',    name: 'Bayesian curl (poulie haute)', muscleGroup: 'biceps',     isCompound: false, minLevel: 'advanced',     family: 'cable_curl_high',     description: "Poulie haute dans le dos, flex le coude vers l'avant. La tension maximale se produit en position d'étirement, très efficace." },

  // ─── Triceps ─────────────────────────────────────────────────────────────────
  { id: 'tricep_pushdown',  name: 'Pushdown poulie (corde)',       muscleGroup: 'triceps',    isCompound: false, minLevel: 'beginner',     family: 'tricep_pushdown',     description: "Poulie haute avec corde, coudes fixes aux flancs. Pousse vers le bas jusqu'à extension complète, écarte la corde en bas." },
  { id: 'overhead_ext',     name: 'Extension triceps haltère',    muscleGroup: 'triceps',    isCompound: false, minLevel: 'beginner',     family: 'overhead_tricep',     description: "Haltère au-dessus de la tête, fléchis les coudes derrière la tête. Cible la longue portion. Garde les coudes pointés vers le plafond." },
  { id: 'dips_triceps',     name: 'Dips banc (triceps)',          muscleGroup: 'triceps',    isCompound: true,  minLevel: 'beginner',     family: 'tricep_dips',         description: "Mains sur le banc derrière, buste vertical et proche du banc. Fléchis les coudes à 90° et remonte sans verrouiller." },
  { id: 'skull_crusher',    name: 'Barre au front (EZ)',          muscleGroup: 'triceps',    isCompound: false, minLevel: 'intermediate', family: 'overhead_tricep',     description: "Allongé, barre EZ descend vers le front ou derrière la tête. Coudes fixes pointés vers le plafond, extension complète en haut." },
  { id: 'close_grip_bench', name: 'Développé serré',              muscleGroup: 'triceps',    isCompound: true,  minLevel: 'intermediate', family: 'close_grip_press',    description: "Développé couché prise serrée (largeur d'épaules). Garde les coudes proches du corps. Excellent pour le volume des triceps." },
  { id: 'dips_parallel',    name: 'Dips barres parallèles',       muscleGroup: 'triceps',    isCompound: true,  minLevel: 'intermediate', family: 'tricep_dips',         description: "Entre les barres, buste vertical pour cibler les triceps. Extension complète en haut, 90° de flexion en bas. Ajoute du poids si trop facile." },
  { id: 'tate_press',       name: 'Tate Press',                   muscleGroup: 'triceps',    isCompound: false, minLevel: 'advanced',     family: 'close_grip_press',    description: "Haltères sur la poitrine, coudes pointés vers le haut et vers l'extérieur. Étends les coudes vers le plafond en pivotant les poignets." },
  { id: 'jm_press',         name: 'JM Press',                     muscleGroup: 'triceps',    isCompound: false, minLevel: 'advanced',     family: 'overhead_tricep',     description: "Hybride entre skull crusher et développé serré. La barre descend vers la gorge, coudes à 45°. Technique avancée à fort volume triceps." },

  // ─── Quadriceps ──────────────────────────────────────────────────────────────
  { id: 'leg_press',        name: 'Presse à cuisses',             muscleGroup: 'quads',      isCompound: true,  minLevel: 'beginner',     family: 'leg_press',           description: "Pieds largeur de hanches sur la plateforme. Descends jusqu'à 90° et pousse sans verrouiller les genoux en haut. Dos plaqué au dossier." },
  { id: 'leg_extension',    name: 'Leg extension',                muscleGroup: 'quads',      isCompound: false, minLevel: 'beginner',     family: 'leg_extension',       description: "Assis sur la machine, étends les jambes jusqu'à la position haute en contractant les quadriceps. Contrôle lentement la descente." },
  { id: 'lunge',            name: 'Fentes haltères',              muscleGroup: 'quads',      isCompound: true,  minLevel: 'beginner',     family: 'lunge',               description: "Pas en avant, genou arrière à 2 cm du sol. Genou avant dans l'axe du pied, buste droit. Pousse sur le pied avant pour revenir." },
  { id: 'squat',            name: 'Squat barre',                  muscleGroup: 'quads',      isCompound: true,  minLevel: 'intermediate', family: 'back_squat',          description: "Barre sur les trapèzes, pieds largeur d'épaules. Descends jusqu'à la parallèle en gardant le buste droit et les genoux dans l'axe des pieds." },
  { id: 'bulgarian_squat',  name: 'Squat bulgare',                muscleGroup: 'quads',      isCompound: true,  minLevel: 'intermediate', family: 'lunge',               description: "Pied arrière sur le banc, pied avant avancé. Descends en gardant le buste droit. Excellent pour corriger les déséquilibres." },
  { id: 'hack_squat',       name: 'Hack squat (machine)',         muscleGroup: 'quads',      isCompound: true,  minLevel: 'intermediate', family: 'machine_squat',       description: "Dos calé sur la machine, pieds légèrement en avant. Descends à 90° minimum. Plus sûr pour le dos que le squat barre." },
  { id: 'front_squat',      name: 'Squat avant',                  muscleGroup: 'quads',      isCompound: true,  minLevel: 'advanced',     family: 'back_squat',          description: "Barre sur les clavicules, buste très vertical. Exige une bonne mobilité des chevilles et des épaules. Cible intensément les quadriceps." },
  { id: 'sissy_squat',      name: 'Sissy squat',                  muscleGroup: 'quads',      isCompound: false, minLevel: 'advanced',     family: 'leg_extension',       description: "Talons surélevés, incline le buste en arrière en fléchissant les genoux vers l'avant. Isolation intense des quadriceps." },

  // ─── Ischio-jambiers ─────────────────────────────────────────────────────────
  { id: 'leg_curl',         name: 'Leg curl couché',              muscleGroup: 'hamstrings', isCompound: false, minLevel: 'beginner',     family: 'leg_curl',            description: "Couché sur la machine, ramène les talons vers les fessiers. Hanche plaquée contre le banc. Contrôle lentement la descente." },
  { id: 'rdl',              name: 'Soulevé de terre roumain',     muscleGroup: 'hamstrings', isCompound: true,  minLevel: 'intermediate', family: 'hip_hinge_hamstring', description: "Barre le long des jambes, penche le buste en gardant les genoux légèrement fléchis. Descends jusqu'à l'étirement des ischio, puis remonte." },
  { id: 'good_morning',     name: 'Good morning',                 muscleGroup: 'hamstrings', isCompound: true,  minLevel: 'intermediate', family: 'hip_hinge_hamstring', description: "Barre sur les trapèzes, penche le buste en avant jusqu'à l'horizontale. Dos plat, genoux légèrement fléchis. Remonte en poussant les hanches en avant." },
  { id: 'seated_leg_curl',  name: 'Leg curl assis',               muscleGroup: 'hamstrings', isCompound: false, minLevel: 'intermediate', family: 'leg_curl',            description: "Assis sur la machine, jambes fléchies sous le siège. La position assise allonge les ischio en haut pour un étirement plus complet." },
  { id: 'nordic_curl',      name: 'Curl nordique',                muscleGroup: 'hamstrings', isCompound: false, minLevel: 'advanced',     family: 'nordic_curl',         description: "Genoux au sol, pieds retenus. Incline le buste vers l'avant en résistant avec les ischio. Exercice excentrique très intense." },
  { id: 'lying_leg_curl',   name: 'Leg curl poulie basse',        muscleGroup: 'hamstrings', isCompound: false, minLevel: 'advanced',     family: 'leg_curl',            description: "Couché à plat, poulie basse attachée aux chevilles. La tension constante de la poulie optimise le travail des ischio sur tout l'arc." },

  // ─── Fessiers ────────────────────────────────────────────────────────────────
  { id: 'glute_bridge',     name: 'Pont fessier',                 muscleGroup: 'glutes',     isCompound: false, minLevel: 'beginner',     family: 'hip_thrust',          description: "Allongé sur le dos, pieds à plat. Soulève les hanches en contractant fort les fessiers en haut. Maintiens 1 seconde en haut." },
  { id: 'sumo_squat',       name: 'Squat sumo haltère',           muscleGroup: 'glutes',     isCompound: true,  minLevel: 'beginner',     family: 'sumo_squat',          description: "Écartement large, pieds en canard, haltère entre les jambes. Le large écartement sollicite davantage les fessiers et les adducteurs." },
  { id: 'cable_kickback',   name: 'Kickback poulie',              muscleGroup: 'glutes',     isCompound: false, minLevel: 'beginner',     family: 'glute_isolation',     description: "Poulie basse attachée à la cheville, buste légèrement incliné. Kick la jambe vers l'arrière-haut en contractant le fessier." },
  { id: 'hip_thrust',       name: 'Hip thrust barre',             muscleGroup: 'glutes',     isCompound: true,  minLevel: 'intermediate', family: 'hip_thrust',          description: "Épaules sur le banc, barre sur les hanches. Pousse les hanches vers le plafond en contractant fort les fessiers. Maintiens 1 seconde en haut." },
  { id: 'rdl_glutes',       name: 'SDT roumain focus fessiers',   muscleGroup: 'glutes',     isCompound: true,  minLevel: 'intermediate', family: 'hip_hinge_glutes',    description: "RDL classique mais avec intention de contraction des fessiers en haut du mouvement. Pousse les hanches en avant en serrant les fessiers." },
  { id: 'banded_abduction', name: 'Abduction élastique',          muscleGroup: 'glutes',     isCompound: false, minLevel: 'intermediate', family: 'glute_isolation',     description: "Élastique autour des genoux, écarte les jambes contre la résistance. Active les fessiers moyens, souvent négligés." },
  { id: 'single_hip_thrust',name: 'Hip thrust unilatéral',        muscleGroup: 'glutes',     isCompound: true,  minLevel: 'advanced',     family: 'hip_thrust',          description: "Hip thrust sur une seule jambe pour corriger les déséquilibres gauche/droite. Double la résistance sur le fessier travaillé." },

  // ─── Mollets ─────────────────────────────────────────────────────────────────
  { id: 'standing_calf',    name: 'Mollets debout (machine)',      muscleGroup: 'calves',     isCompound: false, minLevel: 'beginner',     family: 'calf_raise',          description: "Debout sur la machine, monte sur la pointe des pieds en contractant les mollets. Descends en étirement complet et remonte explosif." },
  { id: 'seated_calf',      name: 'Mollets assis',                 muscleGroup: 'calves',     isCompound: false, minLevel: 'beginner',     family: 'calf_raise',          description: "Assis, genoux à 90°, charge sur les genoux. Cible le soléaire (profond). Étirement complet en bas et contraction en haut." },
  { id: 'donkey_calf',      name: 'Mollets âne',                   muscleGroup: 'calves',     isCompound: false, minLevel: 'advanced',     family: 'calf_raise',          description: "Buste horizontal appuyé, monte sur la pointe des pieds. La position penchée allonge le gastrocnémien pour un étirement maximal." },

  // ─── Abdominaux ──────────────────────────────────────────────────────────────
  { id: 'plank',            name: 'Gainage planche',              muscleGroup: 'abs',        isCompound: false, minLevel: 'beginner',     family: 'plank',               description: "Corps aligné, appui sur les avant-bras et les orteils. Contracte abdos, fessiers et épaules. Respire normalement sans creuser le dos." },
  { id: 'crunch',           name: 'Crunch',                       muscleGroup: 'abs',        isCompound: false, minLevel: 'beginner',     family: 'crunch',              description: "Allongé sur le dos, soulève les épaules vers les genoux. Lombaires au sol, pas de tirage sur la nuque. Expire en contractant." },
  { id: 'leg_raise',        name: 'Relevé de jambes',             muscleGroup: 'abs',        isCompound: false, minLevel: 'beginner',     family: 'leg_raise',           description: "Allongé ou suspendu, lève les jambes tendues jusqu'à 90°. Plaque les lombaires au sol (ou gainage si suspendu). Contrôle la descente." },
  { id: 'cable_crunch',     name: 'Crunch poulie',                muscleGroup: 'abs',        isCompound: false, minLevel: 'intermediate', family: 'crunch',              description: "À genoux, poulie haute, flex le buste vers le sol en amenant les coudes vers les genoux. Garde les hanches fixes, tout le mouvement vient des abdos." },
  { id: 'russian_twist',    name: 'Russian twist',                muscleGroup: 'abs',        isCompound: false, minLevel: 'intermediate', family: 'rotation',            description: "Assis en V (dos incliné), tourne le buste de droite à gauche. Ajoute un disque ou un haltère pour augmenter l'intensité." },
  { id: 'ab_wheel',         name: 'Roulette abdominale',          muscleGroup: 'abs',        isCompound: false, minLevel: 'intermediate', family: 'ab_wheel',            description: "À genoux, roule la roulette vers l'avant sans creuser le dos. Reviens en contractant fort les abdos. Ne va pas plus loin que tu peux contrôler." },
  { id: 'dragon_flag',      name: 'Dragon flag',                  muscleGroup: 'abs',        isCompound: false, minLevel: 'advanced',     family: 'dragon_flag',         description: "Sur un banc, corps rigide appuyé sur les épaules. Descends les jambes tendues vers le sol et remonte. Exercice de Bruce Lee, très intense." },
  { id: 'hanging_leg_raise',name: 'Relevé de jambes suspendu',    muscleGroup: 'abs',        isCompound: false, minLevel: 'advanced',     family: 'leg_raise',           description: "Suspendu à une barre, lève les jambes tendues jusqu'à l'horizontale (ou plus). Évite le balancement, contrôle la descente." },
];

export function getAvailableExercises(group: MuscleGroup, level: PractitionerLevel): Exercise[] {
  return EXERCISES.filter((e) => e.muscleGroup === group && isAvailableForLevel(e, level));
}

export function getAvailableCompounds(group: MuscleGroup, level: PractitionerLevel): Exercise[] {
  return EXERCISES.filter((e) => e.muscleGroup === group && e.isCompound && isAvailableForLevel(e, level));
}

export function getAvailableIsolations(group: MuscleGroup, level: PractitionerLevel): Exercise[] {
  return EXERCISES.filter((e) => e.muscleGroup === group && !e.isCompound && isAvailableForLevel(e, level));
}
