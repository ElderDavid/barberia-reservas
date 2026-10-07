-- The reward reads after "¡Ganaste…!", so the default carries its article.
UPDATE "shop_settings" SET "loyalty_reward" = 'Un corte gratis' WHERE "loyalty_reward" = 'Corte gratis';
