-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AUSBILDER', 'AZUBI', 'AUSBILDUNGSBEAUFTRAGTER');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'AZUBI',
    "departmentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profession" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Profession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apprentice" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "vorname" TEXT NOT NULL,
    "nachname" TEXT NOT NULL,
    "start" DATE NOT NULL,
    "ende" DATE NOT NULL,
    "professionId" UUID,
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Apprentice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kapazitaet" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningContent" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "titel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LearningContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequiredContent" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "professionId" UUID NOT NULL,
    "learningContentId" UUID NOT NULL,

    CONSTRAINT "RequiredContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaughtContent" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "learningContentId" UUID NOT NULL,

    CONSTRAINT "TaughtContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Placement" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "apprenticeId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "von" DATE NOT NULL,
    "bis" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "placementId" UUID NOT NULL,
    "bewertung" INTEGER,
    "kommentar" TEXT,
    "evaluatorUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "apprenticeId" UUID NOT NULL,
    "fach" TEXT NOT NULL,
    "wert" DECIMAL(3,1) NOT NULL,
    "datum" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Profession_tenantId_idx" ON "Profession"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Apprentice_userId_key" ON "Apprentice"("userId");

-- CreateIndex
CREATE INDEX "Apprentice_tenantId_idx" ON "Apprentice"("tenantId");

-- CreateIndex
CREATE INDEX "Apprentice_professionId_idx" ON "Apprentice"("professionId");

-- CreateIndex
CREATE INDEX "Department_tenantId_idx" ON "Department"("tenantId");

-- CreateIndex
CREATE INDEX "LearningContent_tenantId_idx" ON "LearningContent"("tenantId");

-- CreateIndex
CREATE INDEX "RequiredContent_tenantId_idx" ON "RequiredContent"("tenantId");

-- CreateIndex
CREATE INDEX "RequiredContent_learningContentId_idx" ON "RequiredContent"("learningContentId");

-- CreateIndex
CREATE UNIQUE INDEX "RequiredContent_professionId_learningContentId_key" ON "RequiredContent"("professionId", "learningContentId");

-- CreateIndex
CREATE INDEX "TaughtContent_tenantId_idx" ON "TaughtContent"("tenantId");

-- CreateIndex
CREATE INDEX "TaughtContent_learningContentId_idx" ON "TaughtContent"("learningContentId");

-- CreateIndex
CREATE UNIQUE INDEX "TaughtContent_departmentId_learningContentId_key" ON "TaughtContent"("departmentId", "learningContentId");

-- CreateIndex
CREATE INDEX "Placement_tenantId_idx" ON "Placement"("tenantId");

-- CreateIndex
CREATE INDEX "Placement_apprenticeId_von_idx" ON "Placement"("apprenticeId", "von");

-- CreateIndex
CREATE INDEX "Placement_departmentId_von_bis_idx" ON "Placement"("departmentId", "von", "bis");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_placementId_key" ON "Evaluation"("placementId");

-- CreateIndex
CREATE INDEX "Evaluation_tenantId_idx" ON "Evaluation"("tenantId");

-- CreateIndex
CREATE INDEX "Grade_tenantId_idx" ON "Grade"("tenantId");

-- CreateIndex
CREATE INDEX "Grade_apprenticeId_idx" ON "Grade"("apprenticeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profession" ADD CONSTRAINT "Profession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apprentice" ADD CONSTRAINT "Apprentice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apprentice" ADD CONSTRAINT "Apprentice_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apprentice" ADD CONSTRAINT "Apprentice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningContent" ADD CONSTRAINT "LearningContent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequiredContent" ADD CONSTRAINT "RequiredContent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequiredContent" ADD CONSTRAINT "RequiredContent_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequiredContent" ADD CONSTRAINT "RequiredContent_learningContentId_fkey" FOREIGN KEY ("learningContentId") REFERENCES "LearningContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaughtContent" ADD CONSTRAINT "TaughtContent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaughtContent" ADD CONSTRAINT "TaughtContent_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaughtContent" ADD CONSTRAINT "TaughtContent_learningContentId_fkey" FOREIGN KEY ("learningContentId") REFERENCES "LearningContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_apprenticeId_fkey" FOREIGN KEY ("apprenticeId") REFERENCES "Apprentice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "Placement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_evaluatorUserId_fkey" FOREIGN KEY ("evaluatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_apprenticeId_fkey" FOREIGN KEY ("apprenticeId") REFERENCES "Apprentice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
