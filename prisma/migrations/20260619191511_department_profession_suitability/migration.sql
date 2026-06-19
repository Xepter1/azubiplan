-- CreateTable
CREATE TABLE "DepartmentProfession" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "professionId" UUID NOT NULL,

    CONSTRAINT "DepartmentProfession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepartmentProfession_tenantId_idx" ON "DepartmentProfession"("tenantId");

-- CreateIndex
CREATE INDEX "DepartmentProfession_professionId_idx" ON "DepartmentProfession"("professionId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentProfession_departmentId_professionId_key" ON "DepartmentProfession"("departmentId", "professionId");

-- AddForeignKey
ALTER TABLE "DepartmentProfession" ADD CONSTRAINT "DepartmentProfession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentProfession" ADD CONSTRAINT "DepartmentProfession_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentProfession" ADD CONSTRAINT "DepartmentProfession_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
