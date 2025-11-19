/**
 * Salary Cap System
 * Maximum salary per deck: 100
 * Salary range: 5-26 based on player overall rating
 */

const SALARY_CAP = 100;

/**
 * Check if a deck's total salary is within the cap
 * @param connection - Database connection
 * @param deckId - Deck ID to check
 * @returns { valid: boolean, totalSalary: number, error?: string }
 */
export async function checkDeckSalaryCap(connection: any, deckId: number): Promise<{
  valid: boolean;
  totalSalary: number;
  error?: string;
}> {
  try {
    // Get all cards in the deck with their salaries
    const [deck]: any = await connection.query(
      'SELECT top_card_id, jungle_card_id, mid_card_id, adc_card_id, support_card_id FROM decks WHERE id = ?',
      [deckId]
    );

    if (deck.length === 0) {
      return { valid: false, totalSalary: 0, error: '덱을 찾을 수 없습니다.' };
    }

    const cardIds = [
      deck[0].top_card_id,
      deck[0].jungle_card_id,
      deck[0].mid_card_id,
      deck[0].adc_card_id,
      deck[0].support_card_id,
    ].filter(Boolean);

    if (cardIds.length === 0) {
      return { valid: true, totalSalary: 0 };
    }

    // Get salaries for all cards in the deck
    const [cards]: any = await connection.query(
      `SELECT p.salary
       FROM user_cards uc
       JOIN players p ON uc.player_id = p.id
       WHERE uc.id IN (?)`,
      [cardIds]
    );

    const totalSalary = cards.reduce((sum: number, card: any) => sum + (card.salary || 0), 0);

    if (totalSalary > SALARY_CAP) {
      return {
        valid: false,
        totalSalary,
        error: `급여 한도 초과 (${totalSalary}/${SALARY_CAP}). 급여가 더 낮은 선수로 덱을 구성하세요.`
      };
    }

    return { valid: true, totalSalary };
  } catch (error) {
    console.error('Salary check error:', error);
    return { valid: false, totalSalary: 0, error: '급여 확인 중 오류가 발생했습니다.' };
  }
}

export { SALARY_CAP };
