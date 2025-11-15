import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get active deck
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [decks]: any = await pool.query(
      'SELECT * FROM decks WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    if (decks.length === 0) {
      return res.json({ success: true, data: null });
    }

    const deck = decks[0];

    // Get card details
    const cardIds = [
      deck.top_card_id,
      deck.jungle_card_id,
      deck.mid_card_id,
      deck.adc_card_id,
      deck.support_card_id,
    ].filter(Boolean);

    let cards: any = {};

    if (cardIds.length > 0) {
      const [cardResults]: any = await pool.query(`
        SELECT
          uc.id,
          uc.level,
          p.id as player_id,
          p.name,
          p.team,
          p.position,
          p.overall,
          p.region,
          p.tier,
          p.laning,
          p.teamfight,
          p.macro,
          p.mental
        FROM user_cards uc
        JOIN players p ON uc.player_id = p.id
        WHERE uc.id IN (?)
      `, [cardIds]);

      // Map cards by ID
      cardResults.forEach((card: any) => {
        const position = ['top', 'jungle', 'mid', 'adc', 'support'].find(pos => {
          const key = `${pos}_card_id`;
          return deck[key] === card.id;
        });

        if (position) {
          cards[position] = {
            id: card.id,
            level: card.level,
            player: {
              id: card.player_id,
              name: card.name,
              team: card.team,
              position: card.position,
              overall: card.overall,
              region: card.region,
              tier: card.tier,
              laning: card.laning || 50,
              teamfight: card.teamfight || 50,
              macro: card.macro || 50,
              mental: card.mental || 50,
            },
          };
        }
      });
    }

    res.json({
      success: true,
      data: {
        id: deck.id,
        name: deck.name,
        top: cards.top || null,
        jungle: cards.jungle || null,
        mid: cards.mid || null,
        adc: cards.adc || null,
        support: cards.support || null,
        laningStrategy: deck.laning_strategy,
        teamfightStrategy: deck.teamfight_strategy,
        macroStrategy: deck.macro_strategy,
        isActive: true,
      },
    });
  } catch (error: any) {
    console.error('Get deck error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Save/Update deck
router.put('/', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { name, topCardId, jungleCardId, midCardId, adcCardId, supportCardId, laningStrategy, teamfightStrategy, macroStrategy } = req.body;

    // Use provided strategies or default values
    const finalLaningStrategy = laningStrategy || 'SAFE';
    const finalTeamfightStrategy = teamfightStrategy || 'ENGAGE';
    const finalMacroStrategy = macroStrategy || 'OBJECTIVE';

    // Validate that all cards belong to user
    const cardIds = [topCardId, jungleCardId, midCardId, adcCardId, supportCardId].filter(Boolean);

    if (cardIds.length > 0) {
      const [userCards]: any = await connection.query(
        'SELECT id FROM user_cards WHERE id IN (?) AND user_id = ?',
        [cardIds, userId]
      );

      if (userCards.length !== cardIds.length) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: 'Some cards do not belong to you' });
      }
    }

    // Get or create active deck
    const [existingDecks]: any = await connection.query(
      'SELECT id FROM decks WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    let deckId;

    if (existingDecks.length > 0) {
      deckId = existingDecks[0].id;
      await connection.query(`
        UPDATE decks SET
          name = ?,
          top_card_id = ?,
          jungle_card_id = ?,
          mid_card_id = ?,
          adc_card_id = ?,
          support_card_id = ?,
          laning_strategy = ?,
          teamfight_strategy = ?,
          macro_strategy = ?
        WHERE id = ?
      `, [name || 'My Deck', topCardId, jungleCardId, midCardId, adcCardId, supportCardId, finalLaningStrategy, finalTeamfightStrategy, finalMacroStrategy, deckId]);
    } else {
      const [result]: any = await connection.query(`
        INSERT INTO decks (user_id, name, top_card_id, jungle_card_id, mid_card_id, adc_card_id, support_card_id, laning_strategy, teamfight_strategy, macro_strategy, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      `, [userId, name || 'My Deck', topCardId, jungleCardId, midCardId, adcCardId, supportCardId, finalLaningStrategy, finalTeamfightStrategy, finalMacroStrategy]);
      deckId = result.insertId;
    }

    await connection.commit();

    res.json({ success: true, data: { deckId } });
  } catch (error: any) {
    await connection.rollback();
    console.error('Save deck error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
