import { EntityRepository, Repository, InsertResult, UpdateResult } from "typeorm";
import { Application, IApplicationCreate, IApplicationUpdate } from "../../orm/entity/Application";

@EntityRepository(Application)
export class ApplicationRepository extends Repository<Application> {
  // GET environments/:id
  /*
  getEnvironment(id: string): Promise<Application> {
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
  } */

  // GET all environments in an application
  /*
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
  */

  // POST create a new Application

  createApplication(application: IApplicationCreate): Promise<InsertResult> {
    return this.insert(application);
  }

  // PUT update environment
  /*
  updateEnvironment(id: string, changes: IEnvironmentUpdate): Promise<UpdateResult> {
    return this.update(id, { ...changes });
  } */

  // DELETE environment (hard delete)
  /*
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
  */
}
