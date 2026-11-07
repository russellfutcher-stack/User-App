// Location (Rusty, 8 Nov 2026): the countries members can choose, and made-up cities for the 100 sample members.
// Same rule in prototype/index.html (sampleLocation) and supabase/seed: keep the three the same.
import { SERVICES } from './support';

export const COUNTRIES = SERVICES.map(s => s.country);

// Sample members' regions, with towns to place them in and the country each region is in.
const PLACES: Record<string, [string, string[]]> = {
  'North-west': ['United Kingdom', ['Manchester', 'Liverpool', 'Preston', 'Lancaster']],
  'North-east': ['United Kingdom', ['Newcastle', 'Sunderland', 'Durham', 'Middlesbrough']],
  'Midlands': ['United Kingdom', ['Birmingham', 'Nottingham', 'Leicester', 'Derby']],
  'South-east': ['United Kingdom', ['Brighton', 'Oxford', 'Reading', 'Canterbury']],
  'South-west': ['United Kingdom', ['Bristol', 'Exeter', 'Plymouth', 'Bath']],
  'London': ['United Kingdom', ['London']],
  'Scotland': ['United Kingdom', ['Glasgow', 'Edinburgh', 'Aberdeen', 'Dundee']],
  'Wales': ['United Kingdom', ['Cardiff', 'Swansea', 'Newport']],
  'Northern Ireland': ['United Kingdom', ['Belfast', 'Derry']],
  'Ireland': ['Ireland', ['Dublin', 'Cork', 'Galway', 'Limerick']],
  'Yorkshire': ['United Kingdom', ['Leeds', 'Sheffield', 'York', 'Bradford', 'Hull']],
  'East of England': ['United Kingdom', ['Norwich', 'Cambridge', 'Ipswich', 'Peterborough']],
  'Online only': ['United Kingdom', []],
};
// A sample member's made-up city and country: a town in their region, chosen by their username.
export function sampleLocation(username: string, region: string) {
  const [country, towns] = PLACES[region] || ['', []];
  const n = [...username].reduce((a, c) => a + c.charCodeAt(0), 0);
  return { city: towns.length ? towns[n % towns.length] : '', country };
}
// "Leeds, United Kingdom", or just the country when the city is private or not given.
export const placeLabel = (city?: string, country?: string) => [city, country].filter(Boolean).join(', ');
