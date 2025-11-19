// Calculate trait bonus for a card
export function calculateTraitBonus(card: any): number {
  let bonus = 0;

  // Check trait1
  if (card.trait1) {
    switch (card.trait1) {
      case '중국 최고 정글':
        // Mlxg: +3 overall for jungle position
        if (card.position === 'JUNGLE') bonus += 3;
        break;
      case '무작위 한타':
        // Mystic: +3 overall (teamfight boost)
        bonus += 3;
        break;
      case '뚫고 지나가.':
        // Ambition: +3 overall (macro/decision boost)
        bonus += 3;
        break;
      case '나도 최강이야.':
        // Crown: +5 overall for mid position
        if (card.position === 'MID') bonus += 5;
        break;
    }
  }

  return bonus;
}
