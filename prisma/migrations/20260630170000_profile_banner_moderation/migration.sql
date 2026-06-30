-- AlterTable
ALTER TABLE "User"
ADD COLUMN "profileBannerMediaType" "AvatarMediaType" NOT NULL DEFAULT 'STATIC',
ADD COLUMN "profileBannerModerationStatus" "AvatarModerationStatus" NOT NULL DEFAULT 'APPROVED';
