import express from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { calculateEnhancementSynergy, getEnhancementSynergyDescription } from '../utils/enhancementSynergy';

const router = express.Router();

// Get all user decks
router.get('/all', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [decks]: any = await pool.query(
      'SELECT id, deck_slot, name, is_active, is_default, laning_strategy, teamfight_strategy, macro_strategy, created_at, updated_at FROM decks WHERE user_id = ? ORDER BY deck_slot ASC',
      [userId]
    );

    res.json({ success: true, data: decks });
  } catch (error: any) {
    console.error('Get all decks error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get deck by slot helper function
const getDeckBySlot = async (req: AuthRequest, res: express.Response) => {
  try {
    const userId = req.user!.id;
    const deckSlot = parseInt(req.params.slot);

    if (isNaN(deckSlot) || deckSlot < 1 || deckSlot > 5) {
      return res.status(400).json({ success: false, error: '덱 슬롯은 1-5 사이여야 합니다.' });
    }

    const [decks]: any = await pool.query(
      'SELECT * FROM decks WHERE user_id = ? AND deck_slot = ?',
      [userId, deckSlot]
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
          p.salary,
          CASE
            WHEN p.season = 'ICON' THEN 'ICON'
            WHEN p.overall <= 80 THEN 'COMMON'
            WHEN p.overall <= 90 THEN 'RARE'
            WHEN p.overall <= 100 THEN 'EPIC'
            ELSE 'LEGENDARY'
          END as tier,
          p.season,
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
              season: card.season,
              salary: card.salary,
              laning: card.laning || 50,
              teamfight: card.teamfight || 50,
              macro: card.macro || 50,
              mental: card.mental || 50,
            },
          };
        }
      });
    }

    // Calculate enhancement synergy
    const levels = Object.values(cards).map((card: any) => card.level || 0);
    const enhancementSynergy = calculateEnhancementSynergy(levels);

    res.json({
      success: true,
      data: {
        id: deck.id,
        deckSlot: deck.deck_slot,
        name: deck.name,
        top: cards.top || null,
        jungle: cards.jungle || null,
        mid: cards.mid || null,
        adc: cards.adc || null,
        support: cards.support || null,
        laningStrategy: deck.laning_strategy,
        teamfightStrategy: deck.teamfight_strategy,
        macroStrategy: deck.macro_strategy,
        isActive: deck.is_active,
        isDefault: deck.is_default,
        enhancementSynergy: {
          bonus: enhancementSynergy.bonus,
          tier: enhancementSynergy.tier,
          minLevel: enhancementSynergy.minLevel,
          description: getEnhancementSynergyDescription(enhancementSynergy.tier),
        },
      },
    });
  } catch (error: any) {
    console.error('Get deck by slot error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get all user cards (must be before /:slot to avoid route conflict)
router.get('/cards', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [cards]: any = await pool.query(
      `SELECT
        uc.id,
        uc.user_id,
        uc.player_id,
        uc.level,
        p.id as player_id,
        p.name,
        p.team,
        p.position,
        p.overall,
        p.region,
        p.season,
        p.salary,
        CASE
          WHEN p.season = 'ICON' THEN 'ICON'
          WHEN p.overall <= 80 THEN 'COMMON'
          WHEN p.overall <= 90 THEN 'RARE'
          WHEN p.overall <= 100 THEN 'EPIC'
          ELSE 'LEGENDARY'
        END as tier
      FROM user_cards uc
      JOIN players p ON uc.player_id = p.id
      WHERE uc.user_id = ?
      ORDER BY p.overall DESC, p.name ASC`,
      [userId]
    );

    // Transform to nested player structure for frontend compatibility
    const transformedCards = cards.map((card: any) => ({
      id: card.id,
      userId: card.user_id,
      playerId: card.player_id,
      level: card.level,
      player: {
        id: card.player_id,
        name: card.name,
        team: card.team,
        position: card.position,
        overall: card.overall,
        region: card.region,
        season: card.season,
        salary: card.salary,
        tier: card.tier
      }
    }));

    res.json({ success: true, data: transformedCards });
  } catch (error: any) {
    console.error('Get user cards error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Route handlers for slot-based access (must be after /cards)
router.get('/slot/:slot', authMiddleware, getDeckBySlot);
router.get('/:slot', authMiddleware, getDeckBySlot); // Alias for compatibility

// Get active deck (for backward compatibility)
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
          CASE
            WHEN p.season = 'ICON' THEN 'ICON'
            WHEN p.overall <= 80 THEN 'COMMON'
            WHEN p.overall <= 90 THEN 'RARE'
            WHEN p.overall <= 100 THEN 'EPIC'
            ELSE 'LEGENDARY'
          END as tier,
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

    // Calculate enhancement synergy
    const levels = Object.values(cards).map((card: any) => card.level || 0);
    const enhancementSynergy = calculateEnhancementSynergy(levels);

    res.json({
      success: true,
      data: {
        id: deck.id,
        name: deck.name,
        deck_slot: deck.deck_slot || 1, // 덱 슬롯 번호 추가
        top: cards.top || null,
        jungle: cards.jungle || null,
        mid: cards.mid || null,
        adc: cards.adc || null,
        support: cards.support || null,
        laningStrategy: deck.laning_strategy,
        teamfightStrategy: deck.teamfight_strategy,
        macroStrategy: deck.macro_strategy,
        isActive: true,
        enhancementSynergy: {
          bonus: enhancementSynergy.bonus,
          tier: enhancementSynergy.tier,
          minLevel: enhancementSynergy.minLevel,
          description: getEnhancementSynergyDescription(enhancementSynergy.tier),
        },
      },
    });
  } catch (error: any) {
    console.error('Get deck error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Save/Update deck (with deck slot support)
router.put('/', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { deckSlot, name, topCardId, jungleCardId, midCardId, adcCardId, supportCardId, laningStrategy, teamfightStrategy, macroStrategy } = req.body;

    // Validate deck slot
    const finalDeckSlot = deckSlot || 1;
    if (finalDeckSlot < 1 || finalDeckSlot > 5) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '덱 슬롯은 1-5 사이여야 합니다.' });
    }

    // Use provided strategies or default values
    const finalLaningStrategy = laningStrategy || 'SAFE';
    const finalTeamfightStrategy = teamfightStrategy || 'ENGAGE';
    const finalMacroStrategy = macroStrategy || 'OBJECTIVE';

    // Validate that all cards belong to user
    const cardIds = [topCardId, jungleCardId, midCardId, adcCardId, supportCardId].filter(Boolean);

    if (cardIds.length > 0) {
      const [userCards]: any = await connection.query(
        `SELECT uc.id, uc.player_id, p.salary
         FROM user_cards uc
         JOIN players p ON uc.player_id = p.id
         WHERE uc.id IN (?) AND uc.user_id = ?`,
        [cardIds, userId]
      );

      if (userCards.length !== cardIds.length) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: '일부 카드가 소유하지 않은 카드입니다.' });
      }

      // Check for duplicate players (same player in multiple positions)
      const playerIds = userCards.map((card: any) => card.player_id);
      const uniquePlayerIds = new Set(playerIds);

      if (playerIds.length !== uniquePlayerIds.size) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: '같은 선수를 여러 포지션에 배치할 수 없습니다.' });
      }

      // Check total salary (salary cap = 115)
      const totalSalary = userCards.reduce((sum: number, card: any) => sum + (card.salary || 0), 0);
      if (totalSalary > 115) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: `급여 한도 초과 (${totalSalary}/115). 급여가 더 낮은 선수를 배치하세요.`
        });
      }
    }

    // Check if deck exists for this slot
    const [existingDecks]: any = await connection.query(
      'SELECT id, top_card_id, jungle_card_id, mid_card_id, adc_card_id, support_card_id FROM decks WHERE user_id = ? AND deck_slot = ?',
      [userId, finalDeckSlot]
    );

    let deckId;
    let oldCardIds: number[] = [];

    if (existingDecks.length > 0) {
      // Get old card IDs to unlock them
      const oldDeck = existingDecks[0];
      oldCardIds = [
        oldDeck.top_card_id,
        oldDeck.jungle_card_id,
        oldDeck.mid_card_id,
        oldDeck.adc_card_id,
        oldDeck.support_card_id
      ].filter(Boolean);

      // Update existing deck
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
      `, [name || `덱 ${finalDeckSlot}`, topCardId, jungleCardId, midCardId, adcCardId, supportCardId, finalLaningStrategy, finalTeamfightStrategy, finalMacroStrategy, deckId]);
    } else {
      // Create new deck
      const [result]: any = await connection.query(`
        INSERT INTO decks (user_id, deck_slot, name, top_card_id, jungle_card_id, mid_card_id, adc_card_id, support_card_id, laning_strategy, teamfight_strategy, macro_strategy, is_active, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
      `, [userId, finalDeckSlot, name || `덱 ${finalDeckSlot}`, topCardId, jungleCardId, midCardId, adcCardId, supportCardId, finalLaningStrategy, finalTeamfightStrategy, finalMacroStrategy, finalDeckSlot === 1]);
      deckId = result.insertId;
    }

    // Unlock old cards (that are no longer in the deck)
    const cardsToUnlock = oldCardIds.filter(id => !cardIds.includes(id));
    if (cardsToUnlock.length > 0) {
      await connection.query(
        'UPDATE user_cards SET is_locked = FALSE WHERE id IN (?) AND user_id = ?',
        [cardsToUnlock, userId]
      );
    }

    // Lock new cards in deck
    if (cardIds.length > 0) {
      await connection.query(
        'UPDATE user_cards SET is_locked = TRUE WHERE id IN (?) AND user_id = ?',
        [cardIds, userId]
      );
    }

    // 이 슬롯의 덱을 활성화하고 다른 슬롯은 비활성화
    await connection.query(
      'UPDATE decks SET is_active = (deck_slot = ?) WHERE user_id = ?',
      [finalDeckSlot, userId]
    );

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

// Set active deck
router.post('/set-active/:slot', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const deckSlot = parseInt(req.params.slot);

    if (deckSlot < 1 || deckSlot > 5) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '덱 슬롯은 1-5 사이여야 합니다.' });
    }

    // Check if deck exists
    const [decks]: any = await connection.query(
      'SELECT id FROM decks WHERE user_id = ? AND deck_slot = ?',
      [userId, deckSlot]
    );

    if (decks.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '해당 슬롯에 덱이 없습니다.' });
    }

    // Set all decks to inactive
    await connection.query(
      'UPDATE decks SET is_active = FALSE WHERE user_id = ?',
      [userId]
    );

    // Set selected deck as active
    await connection.query(
      'UPDATE decks SET is_active = TRUE WHERE user_id = ? AND deck_slot = ?',
      [userId, deckSlot]
    );

    await connection.commit();

    res.json({ success: true, message: '활성 덱이 변경되었습니다.' });
  } catch (error: any) {
    await connection.rollback();
    console.error('Set active deck error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Delete deck
router.delete('/slot/:slot', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const deckSlot = parseInt(req.params.slot);

    if (deckSlot < 1 || deckSlot > 5) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '덱 슬롯은 1-5 사이여야 합니다.' });
    }

    // Check if deck exists
    const [decks]: any = await connection.query(
      'SELECT id, is_active FROM decks WHERE user_id = ? AND deck_slot = ?',
      [userId, deckSlot]
    );

    if (decks.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '해당 슬롯에 덱이 없습니다.' });
    }

    const wasActive = decks[0].is_active;

    // Delete deck
    await connection.query(
      'DELETE FROM decks WHERE user_id = ? AND deck_slot = ?',
      [userId, deckSlot]
    );

    // If deleted deck was active, set slot 1 as active (if exists)
    if (wasActive) {
      await connection.query(
        'UPDATE decks SET is_active = TRUE WHERE user_id = ? AND deck_slot = 1',
        [userId]
      );
    }

    await connection.commit();

    res.json({ success: true, message: '덱이 삭제되었습니다.' });
  } catch (error: any) {
    await connection.rollback();
    console.error('Delete deck error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Copy deck to another slot
router.post('/copy/:fromSlot/:toSlot', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const fromSlot = parseInt(req.params.fromSlot);
    const toSlot = parseInt(req.params.toSlot);

    if (fromSlot < 1 || fromSlot > 5 || toSlot < 1 || toSlot > 5) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '덱 슬롯은 1-5 사이여야 합니다.' });
    }

    if (fromSlot === toSlot) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '같은 슬롯으로 복사할 수 없습니다.' });
    }

    // Get source deck
    const [sourceDecks]: any = await connection.query(
      'SELECT * FROM decks WHERE user_id = ? AND deck_slot = ?',
      [userId, fromSlot]
    );

    if (sourceDecks.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '복사할 덱이 없습니다.' });
    }

    const source = sourceDecks[0];

    // Check if target slot already has a deck
    const [targetDecks]: any = await connection.query(
      'SELECT id FROM decks WHERE user_id = ? AND deck_slot = ?',
      [userId, toSlot]
    );

    if (targetDecks.length > 0) {
      // Delete existing deck in target slot
      await connection.query(
        'DELETE FROM decks WHERE user_id = ? AND deck_slot = ?',
        [userId, toSlot]
      );
    }

    // Copy deck to new slot
    await connection.query(`
      INSERT INTO decks (user_id, deck_slot, name, top_card_id, jungle_card_id, mid_card_id, adc_card_id, support_card_id, laning_strategy, teamfight_strategy, macro_strategy, is_active, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, FALSE)
    `, [
      userId,
      toSlot,
      `${source.name} (복사)`,
      source.top_card_id,
      source.jungle_card_id,
      source.mid_card_id,
      source.adc_card_id,
      source.support_card_id,
      source.laning_strategy,
      source.teamfight_strategy,
      source.macro_strategy,
    ]);

    await connection.commit();

    res.json({ success: true, message: '덱이 복사되었습니다.' });
  } catch (error: any) {
    await connection.rollback();
    console.error('Copy deck error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// ==========================================
// DECK PRESET MANAGEMENT SYSTEM
// ==========================================

// Get all presets for the user
router.get('/presets', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [decks]: any = await pool.query(
      'SELECT id, deck_slot, name, preset_name, is_active, created_at, updated_at FROM decks WHERE user_id = ? ORDER BY deck_slot ASC',
      [userId]
    );

    // Get card previews for each deck (first 5 cards)
    const decksWithCards = await Promise.all(
      decks.map(async (deck: any) => {
        const cardIds = [
          deck.top_card_id,
          deck.jungle_card_id,
          deck.mid_card_id,
          deck.adc_card_id,
          deck.support_card_id,
        ].filter(Boolean);

        let cards: any[] = [];

        if (cardIds.length > 0) {
          const [cardResults]: any = await pool.query(`
            SELECT
              uc.id,
              uc.level,
              p.name,
              p.position,
              p.overall,
              CASE
                WHEN p.season = 'ICON' THEN 'ICON'
                WHEN p.overall <= 80 THEN 'COMMON'
                WHEN p.overall <= 90 THEN 'RARE'
                WHEN p.overall <= 100 THEN 'EPIC'
                ELSE 'LEGENDARY'
              END as tier
            FROM user_cards uc
            JOIN players p ON uc.player_id = p.id
            WHERE uc.id IN (?)
          `, [cardIds]);

          cards = cardResults;
        }

        return {
          id: deck.id,
          deckSlot: deck.deck_slot,
          name: deck.name,
          presetName: deck.preset_name,
          isActive: deck.is_active,
          cards,
          createdAt: deck.created_at,
          updatedAt: deck.updated_at,
        };
      })
    );

    res.json({ success: true, data: decksWithCards });
  } catch (error: any) {
    console.error('Get presets error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Save new preset
router.post('/preset', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const { presetName, name, topCardId, jungleCardId, midCardId, adcCardId, supportCardId, laningStrategy, teamfightStrategy, macroStrategy } = req.body;

    // Check if user already has 5 decks
    const [existingDecks]: any = await connection.query(
      'SELECT COUNT(*) as count FROM decks WHERE user_id = ?',
      [userId]
    );

    if (existingDecks[0].count >= 5) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '최대 5개의 덱만 저장할 수 있습니다.' });
    }

    if (!presetName || presetName.trim().length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: '프리셋 이름을 입력해주세요.' });
    }

    // Find next available slot
    const [usedSlots]: any = await connection.query(
      'SELECT deck_slot FROM decks WHERE user_id = ? ORDER BY deck_slot ASC',
      [userId]
    );

    let nextSlot = 1;
    const usedSlotNumbers = usedSlots.map((s: any) => s.deck_slot);
    for (let i = 1; i <= 5; i++) {
      if (!usedSlotNumbers.includes(i)) {
        nextSlot = i;
        break;
      }
    }

    // Validate cards
    const cardIds = [topCardId, jungleCardId, midCardId, adcCardId, supportCardId].filter(Boolean);

    if (cardIds.length > 0) {
      const [userCards]: any = await connection.query(
        `SELECT uc.id, uc.player_id, p.salary
         FROM user_cards uc
         JOIN players p ON uc.player_id = p.id
         WHERE uc.id IN (?) AND uc.user_id = ?`,
        [cardIds, userId]
      );

      if (userCards.length !== cardIds.length) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: '일부 카드가 소유하지 않은 카드입니다.' });
      }

      // Check for duplicate players
      const playerIds = userCards.map((card: any) => card.player_id);
      const uniquePlayerIds = new Set(playerIds);

      if (playerIds.length !== uniquePlayerIds.size) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: '같은 선수를 여러 포지션에 배치할 수 없습니다.' });
      }

      // Check total salary (salary cap = 115)
      const totalSalary = userCards.reduce((sum: number, card: any) => sum + (card.salary || 0), 0);
      if (totalSalary > 115) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: `급여 한도 초과 (${totalSalary}/115). 급여가 더 낮은 선수를 배치하세요.`
        });
      }
    }

    // Create new preset
    const [result]: any = await connection.query(`
      INSERT INTO decks (user_id, deck_slot, name, preset_name, top_card_id, jungle_card_id, mid_card_id, adc_card_id, support_card_id, laning_strategy, teamfight_strategy, macro_strategy, is_active, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, FALSE)
    `, [userId, nextSlot, name || `덱 ${nextSlot}`, presetName, topCardId, jungleCardId, midCardId, adcCardId, supportCardId, laningStrategy || 'SAFE', teamfightStrategy || 'ENGAGE', macroStrategy || 'OBJECTIVE']);

    await connection.commit();

    res.json({ success: true, data: { id: result.insertId, deckSlot: nextSlot }, message: '프리셋이 저장되었습니다.' });
  } catch (error: any) {
    await connection.rollback();
    console.error('Save preset error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Activate preset (set as active deck)
router.patch('/preset/:id/activate', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const presetId = parseInt(req.params.id);

    // Check if deck exists and belongs to user
    const [decks]: any = await connection.query(
      'SELECT id FROM decks WHERE id = ? AND user_id = ?',
      [presetId, userId]
    );

    if (decks.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '해당 프리셋을 찾을 수 없습니다.' });
    }

    // Set all decks to inactive
    await connection.query(
      'UPDATE decks SET is_active = FALSE WHERE user_id = ?',
      [userId]
    );

    // Set selected deck as active
    await connection.query(
      'UPDATE decks SET is_active = TRUE WHERE id = ?',
      [presetId]
    );

    await connection.commit();

    res.json({ success: true, message: '덱이 활성화되었습니다.' });
  } catch (error: any) {
    await connection.rollback();
    console.error('Activate preset error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Update preset name
router.put('/preset/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const presetId = parseInt(req.params.id);
    const { presetName } = req.body;

    if (!presetName || presetName.trim().length === 0) {
      return res.status(400).json({ success: false, error: '프리셋 이름을 입력해주세요.' });
    }

    // Check if deck exists and belongs to user
    const [decks]: any = await pool.query(
      'SELECT id FROM decks WHERE id = ? AND user_id = ?',
      [presetId, userId]
    );

    if (decks.length === 0) {
      return res.status(404).json({ success: false, error: '해당 프리셋을 찾을 수 없습니다.' });
    }

    await pool.query(
      'UPDATE decks SET preset_name = ? WHERE id = ?',
      [presetName, presetId]
    );

    res.json({ success: true, message: '프리셋 이름이 변경되었습니다.' });
  } catch (error: any) {
    console.error('Update preset name error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete preset
router.delete('/preset/:id', authMiddleware, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user!.id;
    const presetId = parseInt(req.params.id);

    // Check if deck exists and belongs to user
    const [decks]: any = await connection.query(
      'SELECT id, is_active FROM decks WHERE id = ? AND user_id = ?',
      [presetId, userId]
    );

    if (decks.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '해당 프리셋을 찾을 수 없습니다.' });
    }

    const wasActive = decks[0].is_active;

    // Delete preset
    await connection.query(
      'DELETE FROM decks WHERE id = ?',
      [presetId]
    );

    // If deleted deck was active, set first available deck as active
    if (wasActive) {
      await connection.query(
        'UPDATE decks SET is_active = TRUE WHERE user_id = ? ORDER BY deck_slot ASC LIMIT 1',
        [userId]
      );
    }

    await connection.commit();

    res.json({ success: true, message: '프리셋이 삭제되었습니다.' });
  } catch (error: any) {
    await connection.rollback();
    console.error('Delete preset error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
