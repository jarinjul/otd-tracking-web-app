-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "roles" "ProjectRole"[] DEFAULT ARRAY[]::"ProjectRole"[];
