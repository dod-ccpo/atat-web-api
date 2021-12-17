import { EntityRepository, Repository, InsertResult, UpdateResult } from "typeorm";
import { Environment, IEnvironmentCreate, IEnvironment } from "../../orm/entity/Environment";

@EntityRepository(Environment)
export class EnvironmentRepository extends Repository<Environment> {
  // GET environments/:id
  getEnvironment(id: string): Promise<Environment> {
    return this.findOneOrFail({
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
  getEnvironmentsByApplicationId(applicationId: string): Promise<[Array<Environment>, number]> {
    return this.createQueryBuilder("environment")
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

  async getAllEnvironmentNames(applicationId: string): Promise<Array<string>> {
    const environments = await this.createQueryBuilder("environment")
      .select(["environment.name"])
      .where("environment.applicationId = :applicationId", { applicationId })
      .getMany();
    return environments.map((env) => env.name);
  }

  // POST create new environment
  createEnvironment(environments: Array<IEnvironmentCreate>): Promise<InsertResult> {
    return this.insert(environments);
  }

  // PUT update environment
  async updateEnvironment(id: string, overwrites: IEnvironment): Promise<Environment> {
    await this.update(id, {
      administrators: [],
      contributors: [],
      readOnlyOperators: [],
      ...overwrites,
    });
    return await this.getEnvironment(id);
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
