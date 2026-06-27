-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN     "fachlich" INTEGER,
ADD COLUMN     "selbststaendigkeit" INTEGER,
ADD COLUMN     "sorgfalt" INTEGER,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "teamverhalten" INTEGER;
