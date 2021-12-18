import { EntityRepository, Repository, InsertResult } from "typeorm";
import { Application, IApplicationCreate } from "../../orm/entity/Application";

@EntityRepository(Application)
export class ApplicationRepository extends Repository<Application> {
  // GET all application names that match the provided name
  getAllMatchingApplicationNames(portfolioId: string, appName: string): Promise<Array<Application>> {
    return this.createQueryBuilder("application")
      .select(["application.name"])
      .where("application.portfolioId = :portfolioId", { portfolioId })
      .andWhere("application.name = :appName", { appName })
      .getMany();
  }

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
  createApplication(application: IApplicationCreate): Promise<InsertResult> {
    return this.insert(application);
  }

  // DELETE application (hard delete)
  async deleteApplication(applicationId: string): Promise<Application> {
    console.log("Deleting: " + applicationId);
    const appToDelete = await this.findOneOrFail({ id: applicationId });
    const deleteResult = await this.delete(applicationId);
    console.log(deleteResult);
    return appToDelete;
  }

  // DELETE application (soft delete)
  async softDeleteApplication(applicationId: string): Promise<Application> {
    console.log("Deleting: " + applicationId);
    const appToDelete = await this.findOneOrFail({ id: applicationId });
    const deleteResult = await this.softDelete(applicationId);
    console.log(deleteResult);
    return appToDelete;
  }

  // GET all applications in a Portfolio by PortfolioId
  getApplicationsByPortfolioId(portfolioId: string): Promise<Array<Application>> {
    return this.find({ where: { portfolio: portfolioId } });
  }
}
