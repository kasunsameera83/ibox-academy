/** Light colour blocks used as a course's fallback cover. Ink text reads on all of them. */
const BLOCKS = ["bg-block-lilac", "bg-block-lemon", "bg-block-mint", "bg-block-pink", "bg-block-sky", "bg-block-cream"] as const;

/** The same course always gets the same colour (by id), never by its position in a list. */
export function blockFor(id: string): (typeof BLOCKS)[number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return BLOCKS[h % BLOCKS.length];
}
