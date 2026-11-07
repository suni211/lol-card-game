-- Additive repair for admin coupon creation. Does not modify existing coupon rows.
USE lol_card_game;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_users INT NULL AFTER max_uses;
