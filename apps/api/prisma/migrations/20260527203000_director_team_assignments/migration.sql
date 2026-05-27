CREATE TABLE "DirectorTeam" (
    "directorId" UUID NOT NULL,
    "teamId" UUID NOT NULL,

    CONSTRAINT "DirectorTeam_pkey" PRIMARY KEY ("directorId","teamId")
);

ALTER TABLE "DirectorTeam" ADD CONSTRAINT "DirectorTeam_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DirectorTeam" ADD CONSTRAINT "DirectorTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
