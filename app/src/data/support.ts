// Support page content, copied from prototype/index.html (SERVICES, UPLIFT and the overdose information).
// Check every number before launch: services change. findahelpline.com lists more.
// Checked 29 Oct 2026 (docs/HELPLINE-CHECK.md): all current; hours added to lines that aren't open 24/7 (Rusty, 29 Oct 2026).
export type Service = { country: string; emergency: string; lines: [string, string][] };

export const SERVICES: Service[] = [
  { country: 'United Kingdom', emergency: '999 or 112', lines: [['Samaritans, 24/7', '116 123'], ['Shout, text support', 'Text SHOUT to 85258'], ['FRANK, drugs information', '0300 123 6600'], ['NHS urgent mental health (England)', '111, option 2']] },
  { country: 'Ireland', emergency: '112 or 999', lines: [['Samaritans, 24/7', '116 123'], ['Text About It', 'Text HELLO to 50808'], ['HSE Drugs and Alcohol Helpline (weekdays 9:30am to 5:30pm)', '1800 459 459']] },
  { country: 'United States', emergency: '911', lines: [['988 Suicide & Crisis Lifeline', 'Call or text 988'], ['SAMHSA National Helpline (substance use)', '1-800-662-4357'], ['Never Use Alone', '1-800-484-3731']] },
  { country: 'Canada', emergency: '911', lines: [['9-8-8 Suicide Crisis Helpline', 'Call or text 988'], ['National Overdose Response Service', '1-888-688-6677']] },
  { country: 'Australia', emergency: '000', lines: [['Lifeline', '13 11 14'], ['Beyond Blue', '1300 22 4636'], ['National Alcohol and Other Drug Hotline', '1800 250 015']] },
  { country: 'New Zealand', emergency: '111', lines: [['Need to talk?', 'Call or text 1737'], ['Lifeline Aotearoa', '0800 543 354'], ['Alcohol Drug Helpline', '0800 787 797']] },
  { country: 'South Africa', emergency: '10111, or 112 from a mobile', lines: [['SADAG Suicide Crisis Line', '0800 567 567'], ['SADAG Substance Abuse Line', '0800 12 13 14']] },
  { country: 'India', emergency: '112', lines: [['Tele-MANAS mental health helpline', '14416 or 1-800-891-4416']] },
  { country: 'Germany', emergency: '112', lines: [['TelefonSeelsorge', '0800 111 0 111 or 0800 111 0 222'], ['Sucht & Drogen Hotline', '01806 313031']] },
  { country: 'France', emergency: '15 (SAMU) or 112', lines: [['Suicide prevention line', '3114'], ['Drogues Info Service (8am to 2am)', '0 800 23 13 13']] },
  { country: 'Spain', emergency: '112', lines: [['Suicide prevention line', '024']] },
  { country: 'Italy', emergency: '112', lines: [['Telefono Amico (9am to midnight)', '02 2327 2327']] },
  { country: 'Netherlands', emergency: '112', lines: [['113 Zelfmoordpreventie', '113 or 0800 0113']] },
  { country: 'Belgium', emergency: '112', lines: [['Zelfmoordlijn (Dutch)', '1813'], ['Centre de Prévention du Suicide (French)', '0800 32 123']] },
  { country: 'Switzerland', emergency: '144 (ambulance) or 112', lines: [['Die Dargebotene Hand / La Main Tendue', '143']] },
  { country: 'Austria', emergency: '144 (ambulance) or 112', lines: [['TelefonSeelsorge', '142']] },
  { country: 'Sweden', emergency: '112', lines: [['Självmordslinjen (Mind)', '90101']] },
  { country: 'Norway', emergency: '113 (ambulance) or 112', lines: [['Mental Helse helpline', '116 123']] },
  { country: 'Denmark', emergency: '112', lines: [['Livslinien (not open all night)', '70 201 201']] },
  { country: 'Finland', emergency: '112', lines: [['MIELI Crisis Helpline', '09 2525 0111']] },
  { country: 'Poland', emergency: '112', lines: [['Crisis line for adults (2pm to 10pm)', '116 123'], ['Itaka, 24 hours', '800 70 22 22']] },
  { country: 'Portugal', emergency: '112', lines: [['SOS Voz Amiga (4pm to midnight)', '213 544 545']] },
  { country: 'Israel', emergency: '101 (ambulance)', lines: [['ERAN emotional first aid', '1201']] },
  { country: 'Japan', emergency: '119 (ambulance)', lines: [['TELL Lifeline, English (not 24 hours)', '03-5774-0992'], ['Inochi no Denwa (limited hours, calls are charged)', '0570-783-556']] },
  { country: 'South Korea', emergency: '119', lines: [['Suicide prevention line', '109']] },
  { country: 'Singapore', emergency: '995', lines: [['Samaritans of Singapore', '1767']] },
  { country: 'Hong Kong', emergency: '999', lines: [['Samaritan Befrienders Hong Kong', '2389 2222']] },
  { country: 'Malaysia', emergency: '999', lines: [['Befrienders Kuala Lumpur', '03-7627 2929']] },
  { country: 'Philippines', emergency: '911', lines: [['NCMH Crisis Hotline', '1553']] },
  { country: 'Brazil', emergency: '192 (ambulance)', lines: [['CVV emotional support', '188']] },
  { country: 'Mexico', emergency: '911', lines: [['Línea de la Vida', '800 911 2000']] },
  { country: 'Argentina', emergency: '107 (ambulance) or 911', lines: [['Centro de Asistencia al Suicida (closed 2am to 8am)', '135 (Buenos Aires) or (011) 5275-1135']] },
  { country: 'Kenya', emergency: '999 or 112', lines: [['Befrienders Kenya (9am to 5pm)', '+254 722 178 177'], ['Kenya Red Cross, 24 hours', '1199']] },
];

// A supportive message that changes daily; Another message shows the next one.
export const UPLIFT = [
  'Reaching out is a strength, not a weakness. You opened this page, and that counts.',
  'You don\'t have to fix everything today. One small step is enough.',
  'Feelings come and go like weather. This one will pass too.',
  'Recovery isn\'t a straight line. A hard day doesn\'t undo your progress.',
  'You are allowed to ask for help as many times as you need.',
  'Someone here has felt what you\'re feeling. You are not the only one.',
  'Drink some water, eat something, and rest if you can. Looking after your body helps your mind.',
  'Being kind to yourself is part of getting better.',
  'You matter, today and every day, exactly as you are.',
  'If today was hard, you still made it through. That is worth noticing.',
  'Connection is the opposite of loneliness. One message to one person is a start.',
  'Whatever stage you\'re at, you are welcome here.',
];
