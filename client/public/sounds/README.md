Drop your own audio files here (`.ogg`, `.mp3`, or `.wav`) with these exact names — `client/src/lib/sound.ts` references them by path and needs nothing else changed:

- `card-deal.wav` — a card sliding/being dealt
- `card-flip.wav` — a card flipping face-up
- `chip-bet.ogg` — placing a chip/bet (not yet provided)
- `shuffle.ogg` — deck shuffle (not yet provided)
- `button-click.mp3` — tapping an action button (Hit/Stand/Double/Split/Surrender), also used app-wide as the general click
- `win.wav` — hand won (incl. blackjack)
- `lose.mp3` — hand lost
- `push.mp3` — push/tie
- `chest-open.ogg` — coffre de battle pass qui s'ouvre (distinct de `win.wav`, not yet provided)
