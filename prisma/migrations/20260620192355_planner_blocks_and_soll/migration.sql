-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('URLAUB', 'PRUEFUNG', 'PRUEFUNGSVORBEREITUNG');

-- AlterTable
ALTER TABLE "DepartmentProfession" ADD COLUMN     "sollWochen" INTEGER;

-- CreateTable
CREATE TABLE "SchoolBlock" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "professionId" UUID NOT NULL,
    "ausbildungsjahr" INTEGER,
    "von" DATE NOT NULL,
    "bis" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenceBlock" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "apprenticeId" UUID NOT NULL,
    "typ" "AbsenceType" NOT NULL,
    "von" DATE NOT NULL,
    "bis" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbsenceBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentBlock" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "grund" TEXT,
    "von" DATE NOT NULL,
    "bis" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolBlock_tenantId_idx" ON "SchoolBlock"("tenantId");

-- CreateIndex
CREATE INDEX "SchoolBlock_professionId_idx" ON "SchoolBlock"("professionId");

-- CreateIndex
CREATE INDEX "AbsenceBlock_tenantId_idx" ON "AbsenceBlock"("tenantId");

-- CreateIndex
CREATE INDEX "AbsenceBlock_apprenticeId_idx" ON "AbsenceBlock"("apprenticeId");

-- CreateIndex
CREATE INDEX "DepartmentBlock_tenantId_idx" ON "DepartmentBlock"("tenantId");

-- CreateIndex
CREATE INDEX "DepartmentBlock_departmentId_idx" ON "DepartmentBlock"("departmentId");

-- AddForeignKey
ALTER TABLE "SchoolBlock" ADD CONSTRAINT "SchoolBlock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolBlock" ADD CONSTRAINT "SchoolBlock_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceBlock" ADD CONSTRAINT "AbsenceBlock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceBlock" ADD CONSTRAINT "AbsenceBlock_apprenticeId_fkey" FOREIGN KEY ("apprenticeId") REFERENCES "Apprentice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentBlock" ADD CONSTRAINT "DepartmentBlock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentBlock" ADD CONSTRAINT "DepartmentBlock_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
