export const exerciseDB = {
  // ── BACK ──────────────────────────────────────────────────────────────────
  'lat-pulldown':    { id:'lat-pulldown',name:'Lat Pulldown',detail:'4 Sets',reps:'9–12 reps',muscle:'Latissimus Dorsi',emoji:'🏋️',bodyPart:'back',youtubeUrl:'https://youtu.be/-k_-jIruWWs?si=Xg6U7GvemHSOvUm-',tips:['Pull bar to upper chest, not behind neck','Keep chest up, squeeze shoulder blades','Control negative — 2–3 seconds up','Alternate grips for full lat coverage'],targetMuscles:['Lats','Biceps','Rear Delts','Rhomboids']},
  'seated-row':      { id:'seated-row',name:'Seated Cable Row',detail:'3 Sets',reps:'9–12 reps',muscle:'Middle Back',emoji:'🔙',bodyPart:'back',youtubeUrl:'https://youtu.be/-k_-jIruWWs?si=Xg6U7GvemHSOvUm-',tips:['Use low cable angle to hit lower lats','Drive elbows back and squeeze at peak','Keep torso upright throughout','Full stretch at the front for max range'],targetMuscles:['Mid-Back','Lats','Biceps','Rear Delts']},
  'pullup':          { id:'pullup',name:'Pull-Ups',detail:'3 Sets',reps:'8–12 reps',muscle:'Back / Biceps',emoji:'⬆️',bodyPart:'back',youtubeUrl:'https://youtu.be/-k_-jIruWWs?si=Xg6U7GvemHSOvUm-',tips:['Full dead hang at the bottom','Chin over bar at the top','Lead with chest, not chin','Use band assistance if needed'],targetMuscles:['Lats','Biceps','Rear Delts','Core']},
  'shrugs':          { id:'shrugs',name:'Shrugs',detail:'3 Sets',reps:'12–15 reps',muscle:'Trapezius',emoji:'🔼',bodyPart:'back',youtubeUrl:'https://youtu.be/-k_-jIruWWs?si=Xg6U7GvemHSOvUm-',tips:['Lift shoulders straight up, not forward','Hold at the top for 1–2 seconds','Use straps for heavier weight','Keep arms straight throughout'],targetMuscles:['Traps','Upper Traps','Levator Scapulae']},

  // ── SHOULDERS ─────────────────────────────────────────────────────────────
  'ohp':             { id:'ohp',name:'Overhead Press',detail:'3 Sets',reps:'9–12 reps',muscle:'Front Deltoids',emoji:'🏛️',bodyPart:'shoulders',youtubeUrl:'https://youtu.be/DwlwD7qdrdM?si=gebMoOCKkxHNQkRo',tips:['Barbell or dumbbell — both work','Press slightly in front of face','Engage core and glutes for stability','Full lockout — squeeze front delts'],targetMuscles:['Anterior Deltoid','Lateral Deltoid','Triceps','Upper Traps']},
  'lateral-raise':   { id:'lateral-raise',name:'Lateral Raises',detail:'4 Sets',reps:'12–15 reps',muscle:'Lateral Deltoids',emoji:'↔️',bodyPart:'shoulders',youtubeUrl:'https://youtu.be/DwlwD7qdrdM?si=gebMoOCKkxHNQkRo',tips:['Cable = constant tension','Raise just above shoulder height','Lead with elbows not wrists','Cross-body path for better activation'],targetMuscles:['Lateral Deltoid','Supraspinatus','Upper Traps']},
  'reverse-fly':     { id:'reverse-fly',name:'Reverse Pec Dec',detail:'3 Sets',reps:'12–15 reps',muscle:'Rear Deltoids',emoji:'🦋',bodyPart:'shoulders',youtubeUrl:'https://youtu.be/DwlwD7qdrdM?si=gebMoOCKkxHNQkRo',tips:['Face the machine, arms out front','Slight elbow bend throughout','Focus on rear delt squeeze','Control the return slowly'],targetMuscles:['Rear Delts','Rhomboids','Traps']},
  'rear-delt-cable-fly': { id:'rear-delt-cable-fly',name:'Single Arm Rear Delt Cable Fly',detail:'3 Sets',reps:'12–15 reps',muscle:'Rear Deltoids',emoji:'🎯',bodyPart:'shoulders',youtubeUrl:'https://youtu.be/DwlwD7qdrdM?si=gebMoOCKkxHNQkRo',tips:['Cable at head height, cross cables','Slight elbow bend throughout','Focus on rear delt not back','Squeeze at full extension 1 sec'],targetMuscles:['Rear Delts','Rhomboids','Posterior Deltoid']},

  // ── CHEST ─────────────────────────────────────────────────────────────────
  'incline-db-press':{ id:'incline-db-press',name:'Incline Dumbbell Press',detail:'4 Sets',reps:'9–12 reps',muscle:'Upper Chest',emoji:'💪',bodyPart:'chest',youtubeUrl:'https://youtu.be/-i8Q6PnsTv4?si=BmuxiCmxSpzjC6MY',tips:['Set bench to 30–45 degrees','Keep shoulder blades retracted','Lower dumbbells until chest level','Drive upward, squeeze at the top'],targetMuscles:['Upper Pec','Anterior Deltoid','Triceps']},
  'chest-fly':       { id:'chest-fly',name:'Chest Fly',detail:'3 Sets',reps:'10–12 reps',muscle:'Complete Chest',emoji:'🫁',bodyPart:'chest',youtubeUrl:'https://youtu.be/-i8Q6PnsTv4?si=BmuxiCmxSpzjC6MY',tips:['Wide arc motion — like hugging a tree','Slight bend in elbows always','Feel full stretch at the bottom','Squeeze pecs hard at the top'],targetMuscles:['Pec Major','Pec Minor','Anterior Deltoid']},
  'cable-fly':       { id:'cable-fly',name:'Upper Angle Cable Fly',detail:'3 Sets',reps:'10–12 reps',muscle:'Lower Chest',emoji:'🔄',bodyPart:'chest',youtubeUrl:'https://youtu.be/-i8Q6PnsTv4?si=BmuxiCmxSpzjC6MY',tips:['Cables high — pull down + inward','Slight elbow bend always','Feel stretch at top of movement','Squeeze — imagine hugging a tree'],targetMuscles:['Lower Pec','Pec Minor','Anterior Deltoid']},

  // ── ARMS: BICEPS ──────────────────────────────────────────────────────────
  'hammer-curl':     { id:'hammer-curl',name:'Hammer Curl',detail:'3 Sets',reps:'9–12 reps',muscle:'Brachialis / Forearms',emoji:'🔨',bodyPart:'arms',youtubeUrl:'https://youtu.be/-k_-jIruWWs?si=Xg6U7GvemHSOvUm-',tips:['Neutral grip (palms facing in)','Builds brachialis under bicep','Also thickens forearms','Alternate or simultaneous'],targetMuscles:['Brachialis','Brachioradialis','Biceps Long Head']},
  'barbell-curl':    { id:'barbell-curl',name:'Barbell Curl',detail:'3 Sets',reps:'9–12 reps',muscle:'Biceps',emoji:'💪',bodyPart:'arms',youtubeUrl:'https://youtu.be/-k_-jIruWWs?si=Xg6U7GvemHSOvUm-',tips:['Elbows pinned to sides','EZ-bar reduces wrist strain','Full range: extended to chin','Strict form — no body rocking'],targetMuscles:['Biceps Brachii','Brachialis','Brachioradialis']},
  'incline-curl':    { id:'incline-curl',name:'Incline Dumbbell Curl',detail:'3 Sets',reps:'9–12 reps',muscle:'Biceps Long Head',emoji:'📐',bodyPart:'arms',youtubeUrl:'https://youtu.be/-k_-jIruWWs?si=Xg6U7GvemHSOvUm-',tips:['Bench 45–60°, arms hang behind','Stretches long head for peak',"Don't swing — feel the stretch",'Supinate wrist at top'],targetMuscles:['Biceps Long Head','Short Head','Brachialis']},

  // ── ARMS: TRICEPS ─────────────────────────────────────────────────────────
  'tricep-pushdown': { id:'tricep-pushdown',name:'Triceps Pushdown',detail:'3 Sets',reps:'10–12 reps',muscle:'Triceps (Lateral Head)',emoji:'⬇️',bodyPart:'arms',youtubeUrl:'https://youtu.be/-i8Q6PnsTv4?si=BmuxiCmxSpzjC6MY',tips:['Elbows pinned to sides always','Fully extend, squeeze at bottom','Rope allows wider extension',"Don't use back to push down"],targetMuscles:['Lateral Head','Medial Head','Long Head']},
  'overhead-ext':    { id:'overhead-ext',name:'Single Arm Overhead Extension',detail:'3 Sets',reps:'10–12 reps',muscle:'Triceps Long Head',emoji:'🔝',bodyPart:'arms',youtubeUrl:'https://youtu.be/-i8Q6PnsTv4?si=BmuxiCmxSpzjC6MY',tips:['Cable low, face away from machine','Hinge forward to stretch long head','Control descent behind head','Single-arm for better range'],targetMuscles:['Triceps Long Head','Triceps Lateral Head']},
  'single-arm-tricep-ext': { id:'single-arm-tricep-ext',name:'Single Arm Tricep Extension',detail:'3 Sets',reps:'10–12 reps',muscle:'Triceps Long Head',emoji:'💥',bodyPart:'arms',youtubeUrl:'https://youtu.be/-i8Q6PnsTv4?si=BmuxiCmxSpzjC6MY',tips:['Keep elbow pointing forward','Lower weight slowly behind head','Full extension at the top','Great for targeting long head'],targetMuscles:['Triceps Long Head','Lateral Head']},

  // ── LEGS ──────────────────────────────────────────────────────────────────
  'squat':           { id:'squat',name:'Squats',detail:'4 Sets',reps:'8–12 reps',muscle:'Quads / Glutes',emoji:'🦵',bodyPart:'legs',youtubeUrl:'https://youtu.be/DwlwD7qdrdM?si=gebMoOCKkxHNQkRo',tips:['Feet shoulder-width, toes slightly out','Chest up, knees track over toes','Go to parallel or below','Drive through heels on the way up'],targetMuscles:['Quads','Glutes','Hamstrings','Core']},
  'leg-ext':         { id:'leg-ext',name:'Quad Extension',detail:'3 Sets',reps:'12–15 reps',muscle:'Quadriceps',emoji:'🦿',bodyPart:'legs',youtubeUrl:'https://youtu.be/DwlwD7qdrdM?si=gebMoOCKkxHNQkRo',tips:['Squeeze hard at top 1–2s','Slow eccentric for overload','Pad just above ankle','Hips flush against seat'],targetMuscles:['Rectus Femoris','Vastus Lateralis','Vastus Medialis']},
  'ham-curl':        { id:'ham-curl',name:'Hamstring Curl',detail:'3 Sets',reps:'12–15 reps',muscle:'Hamstrings',emoji:'🦵',bodyPart:'legs',youtubeUrl:'https://youtu.be/DwlwD7qdrdM?si=gebMoOCKkxHNQkRo',tips:['Lying or seated — both effective','Toes in to bias bicep femoris','Full range, no cheating stretch','Squeeze hard at peak contraction'],targetMuscles:['Bicep Femoris','Semitendinosus','Semimembranosus']},
  'calf-raise':      { id:'calf-raise',name:'Calf Raises',detail:'4 Sets',reps:'15–20 reps',muscle:'Calves',emoji:'🦶',bodyPart:'legs',youtubeUrl:'https://youtu.be/DwlwD7qdrdM?si=gebMoOCKkxHNQkRo',tips:['Full stretch at bottom, full peak','Hold top 2 sec for max activation','Straight = gastro, bent = soleus','Step for deeper stretch'],targetMuscles:['Gastrocnemius','Soleus']},

  // ── CORE ──────────────────────────────────────────────────────────────────
  'hanging-leg-raise':{ id:'hanging-leg-raise',name:'Hanging Leg Raises',detail:'3 Sets',reps:'12–15 reps',muscle:'Lower Abs',emoji:'⬆️',bodyPart:'core',youtubeUrl:'https://www.youtube.com/watch?v=hdng3Nm1x_E',tips:['Keep arms straight, hang fully','Raise legs to 90° or higher','Tuck hips at the top for max contraction','Control the descent — no swinging'],targetMuscles:['Lower Abs','Hip Flexors','Core']},
  'cable-crunch':    { id:'cable-crunch',name:'Cable Crunch',detail:'3 Sets',reps:'12–15 reps',muscle:'Abs',emoji:'⭕',bodyPart:'core',youtubeUrl:'https://www.youtube.com/watch?v=2fbujeH3F0E',tips:['Kneel, grab rope at sides of face','Crunch down — elbows to knees','Focus on abs, not pulling with arms','Hold squeeze 1 sec at bottom'],targetMuscles:['Rectus Abdominis','Obliques','Core']},

  // ── KEPT FOR BACKWARDS COMPATIBILITY ─────────────────────────────────────
  'facepull':        { id:'facepull',name:'Face Pull',detail:'3 Sets',reps:'12–15 reps',muscle:'Rear Delts / Rotator Cuff',emoji:'🎯',bodyPart:'shoulders',youtubeUrl:'https://www.youtube.com/watch?v=rep-qVOkqgk',tips:['Pull rope to face level','External rotate at end position','Keep elbows high throughout','Light weight, high mind-muscle'],targetMuscles:['Rear Delts','Rotator Cuff','Upper Traps']},
  'db-press':        { id:'db-press',name:'Dumbbell Press',detail:'2 Flat + 2 Incline Sets',reps:'9–12 reps',muscle:'Chest',emoji:'💪',bodyPart:'chest',youtubeUrl:'https://www.youtube.com/watch?v=VmB1G1K7v94',tips:['Flat: mid/lower chest builder','Incline 30–45°: upper chest','Touch dumbbells lightly at top','Control descent always'],targetMuscles:['Pec Major','Anterior Deltoid','Triceps']},
  'machine-press':   { id:'machine-press',name:'Incline Machine Press',detail:'2 Sets',reps:'9–12 reps',muscle:'Upper Chest',emoji:'🖥️',bodyPart:'chest',youtubeUrl:'https://www.youtube.com/watch?v=Y2DkPFmgVBs',tips:['Go heavier safely on machine','Handles at upper chest level','Full lockout, 3-sec negative','Great finisher after free weight'],targetMuscles:['Upper Pec','Anterior Deltoid','Triceps']},
  'dips':            { id:'dips',name:'Dips',detail:'3 Sets',reps:'8–12 reps',muscle:'Chest / Triceps',emoji:'⬇️',bodyPart:'chest',youtubeUrl:'https://www.youtube.com/watch?v=2z8JmcrW-As',tips:['Lean forward for more chest','Upright = more triceps','Elbows past 90° at bottom','Add weight when reps get easy'],targetMuscles:['Lower Pec','Triceps','Anterior Delt']},
  'leg-press':       { id:'leg-press',name:'Leg Press',detail:'3 Sets',reps:'9–12 reps',muscle:'Quads / Glutes',emoji:'🦵',bodyPart:'legs',youtubeUrl:'https://www.youtube.com/watch?v=IZxyjW7MPJQ',tips:['Feet shoulder-width, mid-plate','Chest up, knees over toes','Go to parallel or below','Drive through heels on push'],targetMuscles:['Quads','Glutes','Hamstrings','Adductors']},
  'rdl':             { id:'rdl',name:'Romanian Deadlift',detail:'3 Sets',reps:'9–12 reps',muscle:'Hamstrings / Glutes',emoji:'🏗️',bodyPart:'legs',youtubeUrl:'https://www.youtube.com/watch?v=JCXUYuzwNrM',tips:['Hinge at hips, soft knee bend','Bar close to legs throughout','Pause at stretch position','Drive hips forward to stand'],targetMuscles:['Hamstrings','Glutes','Erectors']},
  'hip-thrust':      { id:'hip-thrust',name:'Hip Thrust',detail:'3 Sets',reps:'9–12 reps',muscle:'Glutes',emoji:'🍑',bodyPart:'legs',youtubeUrl:'https://www.youtube.com/watch?v=xDmFkJxPzeM',tips:['Shoulders on bench, bar on hips','Drive hips to full extension','Squeeze glutes hard at top','Chin tucked, core braced'],targetMuscles:['Glutes','Hamstrings','Hip Flexors']},
};

export const muscleGroupExercises = {
  chest:     { label:'Chest',    color:'#ff3b6b', icon:'🫁', exercises:['incline-db-press','chest-fly','cable-fly'] },
  back:      { label:'Back',     color:'#ff4500', icon:'🔙', exercises:['lat-pulldown','seated-row','pullup','shrugs'] },
  shoulders: { label:'Shoulders',color:'#00bfff', icon:'💫', exercises:['ohp','lateral-raise','rear-delt-cable-fly','reverse-fly'] },
  arms:      { label:'Arms',     color:'#ffd700', icon:'💪', exercises:['hammer-curl','barbell-curl','incline-curl','tricep-pushdown','overhead-ext'] },
  legs:      { label:'Legs',     color:'#39ff14', icon:'🦵', exercises:['squat','leg-ext','ham-curl','calf-raise'] },
  core:      { label:'Core',     color:'#bf00ff', icon:'⭕', exercises:['hanging-leg-raise','cable-crunch'] },
};

export const workoutPlans = {
  3:{ days:3,label:'3 Day Split',subtitle:'Classic PPL — Perfect for Beginners',description:'The foundational Push-Pull-Legs cycle. 3 days per week with full recovery. Ideal for beginners.',badge:'Beginner',color:'#00bfff',
    schedule:[
      {day:'Day 1',focus:'Pull',title:'Back + Triceps + Rear Delts',emoji:'💪',color:'#ff4500',exercises:['lat-pulldown','seated-row','reverse-fly','tricep-pushdown','overhead-ext']},
      {day:'Day 2',focus:'Legs',title:'Legs + Abs',emoji:'🦵',color:'#00bfff',exercises:['squat','leg-ext','ham-curl','calf-raise','hanging-leg-raise','cable-crunch']},
      {day:'Day 3',focus:'Push',title:'Chest + Shoulder + Biceps',emoji:'🏋️',color:'#ff3b6b',exercises:['incline-db-press','chest-fly','cable-fly','ohp','lateral-raise','hammer-curl','barbell-curl','incline-curl']},
    ]},
  4:{ days:4,label:'4 Day Split',subtitle:'Upper/Lower PPL Hybrid',description:'Four days for more frequency and muscle stimulation per week.',badge:'Intermediate',color:'#39ff14',
    schedule:[
      {day:'Day 1',focus:'Pull',title:'Back + Rear Delts',emoji:'💪',color:'#ff4500',exercises:['lat-pulldown','seated-row','pullup','rear-delt-cable-fly','reverse-fly']},
      {day:'Day 2',focus:'Push',title:'Chest + Front Delts + Triceps',emoji:'🏋️',color:'#ff3b6b',exercises:['incline-db-press','chest-fly','cable-fly','ohp','dips']},
      {day:'Day 3',focus:'Legs',title:'Quads + Calves',emoji:'🦵',color:'#00bfff',exercises:['squat','leg-ext','calf-raise','lateral-raise']},
      {day:'Day 4',focus:'Arms + Hamstrings',title:'Hamstrings + Arms',emoji:'💪',color:'#ffd700',exercises:['rdl','ham-curl','barbell-curl','incline-curl','hammer-curl','tricep-pushdown','overhead-ext']},
    ]},
  5:{ days:5,label:'5 Day Split',subtitle:'High Frequency Power Program',description:'Five days for intermediate lifters wanting more volume and frequency.',badge:'Advanced',color:'#ffd700',
    schedule:[
      {day:'Day 1',focus:'Pull',title:'Back + Biceps',emoji:'💪',color:'#ff4500',exercises:['lat-pulldown','seated-row','pullup','barbell-curl','incline-curl','hammer-curl']},
      {day:'Day 2',focus:'Push',title:'Chest + Triceps',emoji:'🏋️',color:'#ff3b6b',exercises:['incline-db-press','chest-fly','cable-fly','dips','tricep-pushdown','overhead-ext']},
      {day:'Day 3',focus:'Legs',title:'Full Legs',emoji:'🦵',color:'#00bfff',exercises:['squat','leg-ext','ham-curl','rdl','calf-raise']},
      {day:'Day 4',focus:'Shoulders',title:'Full Shoulder Day',emoji:'🏛️',color:'#bf00ff',exercises:['ohp','lateral-raise','rear-delt-cable-fly','reverse-fly']},
      {day:'Day 5',focus:'Arms + Glutes',title:'Arms + Glutes',emoji:'💪',color:'#39ff14',exercises:['barbell-curl','hammer-curl','tricep-pushdown','hip-thrust','ham-curl','calf-raise']},
    ]},
  6:{ days:6,label:'6 Day Split',subtitle:'Elite PPL — Advanced Athletes Only',description:'The full PPL twice per week. Maximum volume and frequency for Begginers And Intermidiates lifters.',badge:'Elite',color:'#ff4500',
    // Standard Beginner/Intermediate schedule (classic PPL)
    schedule:[
      {day:'Day 1',focus:'Push A',title:'Chest + Shoulders + Triceps',emoji:'🏋️',color:'#ff3b6b',
        exercises:['incline-db-press','chest-fly','cable-fly','ohp','lateral-raise','tricep-pushdown','overhead-ext']},
      {day:'Day 2',focus:'Pull A',title:'Back + Biceps',emoji:'💪',color:'#ff4500',
        exercises:['lat-pulldown','seated-row','pullup','barbell-curl','hammer-curl','incline-curl']},
      {day:'Day 3',focus:'Legs A',title:'Legs + Abs',emoji:'🦵',color:'#00bfff',
        exercises:['squat','leg-ext','ham-curl','calf-raise','hanging-leg-raise','cable-crunch']},
      {day:'Day 4',focus:'Push B',title:'Chest + Shoulders + Triceps',emoji:'🏋️',color:'#ff3b6b',
        exercises:['incline-db-press','chest-fly','cable-fly','ohp','lateral-raise','tricep-pushdown','overhead-ext']},
      {day:'Day 5',focus:'Pull B',title:'Back + Biceps',emoji:'💪',color:'#ff4500',
        exercises:['lat-pulldown','seated-row','pullup','barbell-curl','hammer-curl','incline-curl']},
      {day:'Day 6',focus:'Legs B',title:'Legs + Abs',emoji:'🦵',color:'#00bfff',
        exercises:['squat','leg-ext','ham-curl','calf-raise','hanging-leg-raise','cable-crunch']},
    ],
    // Advanced schedule — creator's custom exercise selection
    advancedSchedule:[
      {day:'Day 1',focus:'Chest + Shoulder + Biceps',title:'Chest · Shoulder · Biceps',emoji:'🏋️',color:'#ff3b6b',
        exercises:['incline-db-press','chest-fly','cable-fly','ohp','lateral-raise','hammer-curl','barbell-curl','incline-curl']},
      {day:'Day 2',focus:'Back + Rear Delt + Triceps',title:'Back · Rear Delt · Triceps',emoji:'💪',color:'#ff4500',
        exercises:['lat-pulldown','seated-row','pullup','rear-delt-cable-fly','reverse-fly','tricep-pushdown','overhead-ext','single-arm-tricep-ext']},
      {day:'Day 3',focus:'Legs + Abs',title:'Legs · Abs',emoji:'🦵',color:'#00bfff',
        exercises:['squat','leg-ext','ham-curl','calf-raise','hanging-leg-raise','cable-crunch']},
      {day:'Day 4',focus:'Chest + Shoulder + Biceps',title:'Chest · Shoulder · Biceps',emoji:'🏋️',color:'#ff3b6b',
        exercises:['incline-db-press','chest-fly','cable-fly','ohp','lateral-raise','hammer-curl','barbell-curl','incline-curl']},
      {day:'Day 5',focus:'Back + Rear Delt + Triceps',title:'Back · Rear Delt · Triceps',emoji:'💪',color:'#ff4500',
        exercises:['lat-pulldown','seated-row','pullup','rear-delt-cable-fly','reverse-fly','shrugs','tricep-pushdown','overhead-ext','single-arm-tricep-ext']},
      {day:'Day 6',focus:'Legs + Abs',title:'Legs · Abs',emoji:'🦵',color:'#00bfff',
        exercises:['squat','leg-ext','ham-curl','calf-raise','hanging-leg-raise','cable-crunch']},
    ]},
};

export const workoutData = workoutPlans[3].schedule.map(day=>({
  id:day.day.toLowerCase().replace(' ',''),day:day.day,title:day.title,emoji:day.emoji,color:day.color,
  description:`${day.focus} session targeting ${day.title}.`,
  exercises:day.exercises.map(id=>exerciseDB[id]).filter(Boolean)
}));

export const generalGuidelines = [
  {icon:'🎯',title:'Rep Range',text:'9–12 reps for all exercises — optimal for hypertrophy and strength'},
  {icon:'⏱️',title:'Rest Periods',text:'60–90 seconds between sets — enough recovery, not too much'},
  {icon:'🎨',title:'Controlled Tempo',text:'Maintain proper form and controlled tempo on every rep'},
  {icon:'🔥',title:'Train Hard',text:'Train close to failure for best muscle building results'},
];
