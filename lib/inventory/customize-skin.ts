import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { canUserAccessAllCatalogSkins } from "@/lib/inventory/catalog-access";
import { userOwnsCatalogSkin } from "@/lib/inventory/inventory-ownership";
import {
  clampSkinFloat,
  clampSkinSeed,
  floatToWearTier,
} from "@/lib/inventory/skin-wear";

export type CustomizeSkinInput = {
  catalogSkinId: string;
  floatValue?: number;
  seed?: number;
  stattrak?: boolean;
  nametag?: string | null;
};

/** Updates float/pattern (and optional StatTrak/nametag) of an equipped skin instance. */
export async function customizeCatalogSkinForUser(
  userId: string,
  input: CustomizeSkinInput,
) {
  const canAccessAll = await canUserAccessAllCatalogSkins(userId);
  if (!canAccessAll && !(await userOwnsCatalogSkin(userId, input.catalogSkinId))) {
    throw new CsgoApiError("Você não possui esta skin no inventário.", 403);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, steamId: true },
  });
  if (!user) throw new CsgoApiError("Usuário não encontrado.", 404);
  if (!user.steamId) {
    throw new CsgoApiError("Vincule sua Steam no perfil para personalizar skins.", 400);
  }

  const catalog = await prisma.csgoSkinCatalog.findUnique({
    where: { id: input.catalogSkinId },
    select: { id: true, weaponId: true, weaponName: true, paintkitName: true },
  });
  if (!catalog) throw new CsgoApiError("Skin não encontrada no catálogo.", 404);

  const playerSkin = await prisma.csgoPlayerSkin.findFirst({
    where: { steamId: user.steamId, skinId: catalog.id },
  });
  if (!playerSkin) {
    throw new CsgoApiError("Equipe a skin antes de personalizá-la.", 400);
  }

  const floatValue =
    input.floatValue !== undefined
      ? clampSkinFloat(input.floatValue)
      : playerSkin.floatValue;
  const seed = input.seed !== undefined ? clampSkinSeed(input.seed) : playerSkin.seed;
  const nametag =
    input.nametag !== undefined
      ? input.nametag?.trim().slice(0, 64) || null
      : playerSkin.nametag;

  const updated = await prisma.csgoPlayerSkin.update({
    where: { id: playerSkin.id },
    data: {
      floatValue,
      wear: floatToWearTier(floatValue),
      seed,
      stattrak: input.stattrak ?? playerSkin.stattrak,
      nametag,
    },
  });

  return {
    ok: true,
    catalogSkinId: catalog.id,
    steamId: user.steamId,
    weaponId: catalog.weaponId,
    floatValue: updated.floatValue,
    seed: updated.seed,
    stattrak: updated.stattrak,
    nametag: updated.nametag,
    name: `${catalog.weaponName} | ${catalog.paintkitName}`,
  };
}
