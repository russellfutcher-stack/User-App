// Reference data, copied from prototype/index.html (REF, CATS, PATHS, STAGES, LOOKING, VIS).
export type Tag = { id: string; label: string };
export type CatKey = 'interests' | 'mh' | 'meds' | 'subs' | 'other';
export type PathKey = 'interests' | 'drugs' | 'mh';
export type VisKey = 'interests' | 'mh' | 'subs';
export type Vis = 'everyone' | 'matches' | 'me';

export const REF: Record<CatKey, Tag[]> = {
  interests: [
    { id: 'I01', label: 'Walking & hiking' }, { id: 'I02', label: 'Pets & dog walking' }, { id: 'I03', label: 'Movies & TV' },
    { id: 'I04', label: 'Books & reading' }, { id: 'I05', label: 'Music' }, { id: 'I06', label: 'Gaming' },
    { id: 'I07', label: 'Art & crafts' }, { id: 'I08', label: 'Cooking & food' }, { id: 'I09', label: 'Fitness, yoga & sport' },
    { id: 'I10', label: 'Gardening & nature' },
    { id: 'I11', label: 'Cycling' }, { id: 'I12', label: 'Running' }, { id: 'I13', label: 'Swimming' }, { id: 'I14', label: 'Photography' },
    { id: 'I15', label: 'Writing & poetry' }, { id: 'I16', label: 'Podcasts & radio' }, { id: 'I17', label: 'Board games & puzzles' },
    { id: 'I18', label: 'Fishing' }, { id: 'I19', label: 'Watching sport' }, { id: 'I20', label: 'Volunteering & community' }],
  mh: [
    { id: 'D01', label: 'Depression' }, { id: 'D02', label: 'Generalised anxiety' }, { id: 'D03', label: 'Social anxiety' },
    { id: 'D04', label: 'PTSD / C-PTSD' }, { id: 'D05', label: 'Bipolar disorder' }, { id: 'D06', label: 'ADHD' },
    { id: 'D07', label: 'OCD' }, { id: 'D08', label: 'Borderline personality disorder' }, { id: 'D09', label: 'Schizophrenia & psychosis' },
    { id: 'D10', label: 'Eating disorders' },
    { id: 'D11', label: 'Panic disorder' }, { id: 'D12', label: 'Agoraphobia' }, { id: 'D13', label: 'Insomnia & sleep problems' }, { id: 'D14', label: 'Autism' },
    { id: 'D15', label: 'Dissociative disorders' }, { id: 'D16', label: 'Perinatal / postnatal depression' }, { id: 'D17', label: 'Seasonal affective disorder' },
    { id: 'D18', label: 'Body dysmorphic disorder' }, { id: 'D19', label: 'Schizoaffective disorder' }, { id: 'D20', label: 'Self-harm' }],
  meds: [
    { id: 'M01', label: 'Oxycodone' }, { id: 'M02', label: 'Hydrocodone' }, { id: 'M03', label: 'Codeine' }, { id: 'M04', label: 'Tramadol' },
    { id: 'M05', label: 'Alprazolam (Xanax)' }, { id: 'M06', label: 'Diazepam (Valium)' }, { id: 'M07', label: 'Amphetamine salts (Adderall)' },
    { id: 'M08', label: 'Methylphenidate (Ritalin)' }, { id: 'M09', label: 'Zolpidem & Z-drugs' }, { id: 'M10', label: 'Pregabalin / gabapentin' },
    { id: 'M11', label: 'Morphine' }, { id: 'M12', label: 'Fentanyl (prescribed)' }, { id: 'M13', label: 'Methadone' }, { id: 'M14', label: 'Buprenorphine (Subutex, Suboxone)' },
    { id: 'M15', label: 'Clonazepam (Klonopin)' }, { id: 'M16', label: 'Lorazepam (Ativan)' }, { id: 'M17', label: 'Lisdexamfetamine (Vyvanse, Elvanse)' },
    { id: 'M18', label: 'Promethazine' }, { id: 'M19', label: 'Dextromethorphan (cough medicine)' }, { id: 'M20', label: 'Quetiapine (Seroquel)' }],
  subs: [
    { id: 'S01', label: 'Cannabis' }, { id: 'S02', label: 'Cocaine' }, { id: 'S03', label: 'Crack cocaine' }, { id: 'S04', label: 'Methamphetamine' },
    { id: 'S05', label: 'Heroin' }, { id: 'S06', label: 'Illicit fentanyl / nitazenes' }, { id: 'S07', label: 'MDMA / ecstasy' },
    { id: 'S08', label: 'Ketamine' }, { id: 'S09', label: 'Hallucinogens (LSD, psilocybin)' }, { id: 'S10', label: 'GHB / GBL' }],
  other: [{ id: 'O01', label: 'Alcohol' }, { id: 'O02', label: 'Nicotine & vaping' }, { id: 'O03', label: 'Kratom' }, { id: 'O04', label: 'Gambling' }],
};

export const CATS: { key: CatKey; name: string }[] = [
  { key: 'interests', name: 'Interests' },
  { key: 'mh', name: 'Mental health' },
  { key: 'meds', name: 'Medications' },
  { key: 'subs', name: 'Other Substances' },
  { key: 'other', name: 'Alcohol, nicotine & gambling' }];

export const TAG_CAT: Record<string, CatKey> = {};
CATS.forEach(c => REF[c.key].forEach(t => { TAG_CAT[t.id] = c.key; }));

// The three choices. Every tag belongs to exactly one.
export const PATHS: { key: PathKey; g: 'int' | 'drug' | 'mh'; name: string; cats: CatKey[] }[] = [
  { key: 'interests', g: 'int', name: 'Interests', cats: ['interests'] },
  { key: 'drugs', g: 'drug', name: 'Drug use', cats: ['meds', 'subs', 'other'] },
  { key: 'mh', g: 'mh', name: 'Mental health', cats: ['mh'] }];

export const STAGES = [
  { id: 'using', label: 'Using, not looking to change right now' }, { id: 'thinking', label: 'Thinking about change' },
  { id: 'cutting', label: 'Cutting down / harm reduction' }, { id: 'quit', label: 'I just gave up' },
  { id: 'early3', label: 'Early recovery (under 3 months)' }, { id: 'early6', label: 'Early recovery (under 6 months)' },
  { id: 'early', label: 'Early recovery (under a year)' }, { id: 'long', label: 'Long-term recovery' },
  { id: 'help', label: 'Ready to help someone' }, { id: 'support', label: 'Supporting someone I love' }, { id: 'na', label: 'Prefer not to say' }];

export const LOOKING = [
  { id: 'chat', label: 'Someone to chat with' }, { id: 'walk', label: 'A walking buddy' }, { id: 'pets', label: 'Pet walks' },
  { id: 'accountability', label: 'An accountability partner' }, { id: 'groups', label: 'Group chats' }, { id: 'listen', label: 'I can listen to others' },
  { id: 'checkin', label: 'A daily check-in buddy' }, { id: 'mentor', label: 'A peer mentor' }, { id: 'mentoring', label: 'To mentor someone' },
  { id: 'night', label: 'Late-night company' }, { id: 'exercise', label: 'An exercise or gym partner' }, { id: 'watch', label: 'Film or TV watch-along' },
  { id: 'games', label: 'Someone to game with' }, { id: 'books', label: 'A book buddy' }];

export const VIS: { id: Vis; label: string }[] = [
  { id: 'everyone', label: 'Everyone' }, { id: 'matches', label: 'People I chat with' }, { id: 'me', label: 'Only me (still used for matching)' }];

// Privacy defaults: drug use and mental health are only shown to people you chat with.
export const DEFAULT_VIS: Record<VisKey, Vis> = { interests: 'everyone', mh: 'matches', subs: 'matches' };

// Usernames of the 100 sample members. They can't be taken by new accounts.
export const SAMPLE_HANDLES = ["MossyOtter","NightLark","PaperFern","SteadyBadger","QuietComet","WillowTide","EmberFinch","HarborMoth","CedarRook","PixelHare","JuniperWren","BrambleOwl","HollowFox","MistyMoth","CalmWren","SoftHeron","PaperCrane","MeadowCrane","SoftFox","PaperOwl","SteadySeal","LittleSeal","GentleKestrel","BraveOtter","MossyFinch","SteadyNewt","RustyKestrel","RustyMoth","AmberFinch","MeadowNewt","BraveWren","QuietWren","SoftFox16","CalmCrane","HollowPlover","SilverCrane","RiverSwift","GoldenBadger","MossyHeron","MossyNewt","GentleFox","CedarStoat","PaperHeron","CalmMoth","QuietRobin","WillowWren","HollowSeal","SteadyLark","MossyFox","WillowHeron","HollowHare","AmberHeron","SilverStoat","MistyLark","BraveNewt","WillowStoat","AmberFinch14","SoftWren","SoftMoth","MistyRobin","BraveBadger","BrightOtter","GentleHeron","QuietMoth","SteadyNewt57","WillowHeron68","MossyBadger","SoftOtter","CalmHeron","MistyOtter","GentleWren","CalmVole","SilverKestrel","CedarHare","CalmOtter","MossyKestrel","MossyStoat","GentleSwift","CedarMoth","HollowCrane","RustyOwl","AmberDove","CalmCrane43","CedarLark","SteadyKestrel","CalmHeron59","SoftPlover","SteadyHeron","BrightOtter37","GentleWren13","GoldenNewt","MossyOtter72","SoftVole","GentleCrane","SoftDove","WillowFox","LittlePlover","CalmOwl","RustyBadger","BrightFox"];
