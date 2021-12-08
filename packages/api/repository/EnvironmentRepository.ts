import { EntityRepository, Repository, InsertResult, UpdateResult } from "typeorm";
import { Environment, IEnvironmentCreate, IEnvironmentUpdate } from "../../orm/entity/Environment";

@EntityRepository(Environment)
export class EnvironmentRepository extends Repository<Environment> {
  // GET environments/:id
  async getEnvironment(id: string): Promise<Environment> {
    return await this.findOneOrFail({
      select: [
        "name",
        "id",
        "createdAt",
        "updatedAt",
        "archivedAt",
        "administrators",
        "contributors",
        "readOnlyOperators",
      ],
      where: { id },
    });
  }

  // GET all environments in an application
  async getEnvironmentsByApplicationId(applicationId: string): Promise<[Array<Environment>, number]> {
    return await this.createQueryBuilder("environment")
      .select([
        "environment.name",
        "environment.id",
        "environment.createdAt",
        "environment.updatedAt",
        "environment.archivedAt",
      ])
      .where("environment.applicationId = :applicationId", {
        applicationId,
      })
      .getManyAndCount();
  }

  // POST create new environment
  async createEnvironment(environments: Array<IEnvironmentCreate>): Promise<InsertResult> {
    return await this.insert(environments);
  }

  // PUT update environment
  async updateEnvironment(id: string, changes: IEnvironmentUpdate): Promise<UpdateResult> {
    return await this.update(id, { ...changes });
  }

  // DELETE environment (hard delete)
  async deleteEnvironment(id: string): Promise<Environment> {
    console.log("Deleting: " + id);
    const environment = await this.findOneOrFail({
      select: ["name", "id", "createdAt", "updatedAt", "archivedAt"],
      where: { id },
    });
    const deleteResult = await this.delete(id);
    console.log(`Deleted: ${environment}. Results: ${deleteResult}`);

    return environment;
  }
}
