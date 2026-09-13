-- CreateTable
CREATE TABLE "SimPackage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SimCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "phoneNumber" TEXT NOT NULL,
    "userId" INTEGER,
    "departmentId" INTEGER,
    "packageId" INTEGER,
    "clsDomestic" INTEGER,
    "clsRoaming" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SimCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SimCard_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SimCard_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SimPackage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SimPackage_name_key" ON "SimPackage"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SimCard_phoneNumber_key" ON "SimCard"("phoneNumber");
