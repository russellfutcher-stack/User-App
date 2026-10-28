// Room request checks, copied from the prototype (App.submitRoom).
import { notAllowed } from './safety';

export function roomRequestError(name: string, desc: string, taken: string[]) {
  if (name.length < 3) return 'Give the room a name of at least 3 characters.';
  if (desc.length < 10) return 'Say what the room is for in at least 10 characters.';
  if (notAllowed(name + ' ' + desc)) return "Room requests can't mention buying or selling, prices, links or contact details.";
  if (taken.some(n => n.toLowerCase() === name.toLowerCase())) return 'A room with that name already exists or has been requested.';
  return null;
}
export const TAKEN_ROOM = 'A room with that name already exists or has been requested.';
