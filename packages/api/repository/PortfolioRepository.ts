import { EntityRepository, Repository, InsertResult, UpdateResult } from "typeorm";
import { IPortfolioCreate, IPortfolioUpdate, Portfolio } from "../../orm/entity/Portfolio";

@EntityRepository(Portfolio)
export class PortfolioRepository extends Repository<Portfolio> {
  // GET portfolios/:id
  getPortfolio(id: string): Promise<Portfolio> {
    return this.findOneOrFail({
      select: [
        "id",
        "name",
        "description",
        "owner",
        "csp",
        "dodComponents",
        "portfolioManagers",
        "createdAt",
        "updatedAt",
        "archivedAt",
        "administrators",
      ],
      where: { id },
    });
  }

  // GET all portfolios
  getPortfolios(): Promise<[Array<Portfolio>, number]> {
    return this.createQueryBuilder("portfolio")
      .select(["portfolio.name", "portfolio.id", "portfolio.createdAt", "portfolio.updatedAt", "portfolio.archivedAt"])
      .getManyAndCount();
  }

  // POST create new portfolio
  createPortfolio(portfolio: IPortfolioCreate): Promise<InsertResult> {
    return this.insert(portfolio);
  }

  // PUT update portfolio
  updatePortfolio(id: string, changes: IPortfolioUpdate): Promise<UpdateResult> {
    return this.update(id, { ...changes });
  }

  // DELETE portfolio (hard delete)
  async deletePortfolio(id: string): Promise<Portfolio> {
    console.log("Deleting: " + id);
    const portfolio = await this.findOneOrFail({
      select: ["id", "name", "csp", "description", "createdAt", "updatedAt", "archivedAt"],
      where: { id },
    });
    const deleteResult = await this.delete(id);
    console.log(`Deleted: ${portfolio}. Results: ${deleteResult}`);

    return portfolio;
  }
}
