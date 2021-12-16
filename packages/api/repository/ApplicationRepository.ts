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

  // GET an application by applicationId
  getApplication(applicationId: string): Promise<Application> {
    return this.findOneOrFail({
      select: [
        "id",
        "name",
        "description",
        "createdAt",
        "updatedAt",
        "archivedAt",
        "administrators",
        "contributors",
        "readOnlyOperators",
        "provisioningStatus",
      ],
      where: { id: applicationId },
      relations: ["environments"],
    });
  }

  // POST create a new Application
  /*
  createApplication(application: IApplicationCreate): Promise<InsertResult> {
    return this.insert(application);
  } */
  // POST create a new Application
  createApplication(application: IApplicationCreate): Promise<InsertResult> {
    return this.insert(application);
  }

  // PUT update environment
  /*
  updateEnvironment(id: string, changes: IEnvironmentUpdate): Promise<UpdateResult> {
    return this.update(id, { ...changes });
  } */

  // DELETE application (hard delete)
  async deleteApplication(applicationId: string): Promise<Application> {
    console.log("Deleting: " + applicationId);
    const appToDelete = await this.findOneOrFail({ id: applicationId });
    // const deleteResult = await this.delete(applicationId);
    const deleteResult = await this.delete(applicationId);
    console.log(deleteResult);
    return appToDelete;
  }

  // DELETE application (soft delete)
  async softDeleteApplication(applicationId: string): Promise<Application> {
    console.log("Deleting: " + applicationId);
    const appToDelete = await this.findOneOrFail({ id: applicationId });
    // const deleteResult = await this.delete(applicationId);
    const deleteResult = await this.softDelete(applicationId);
    console.log(deleteResult);
    return appToDelete;
  }

  // GET all applications in a Portfolio by PortfolioId
  getApplicationsByPortfolioId(portfolioId: string): Promise<Array<Application>> {
    return this.find({ where: { portfolio: portfolioId } });
  }
}
