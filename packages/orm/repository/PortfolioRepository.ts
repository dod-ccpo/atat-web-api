import { EntityRepository, InsertResult, Repository } from "typeorm";
import { IPortfolio, Portfolio } from "../entity/Portfolio";

@EntityRepository(Portfolio)
export class PortfolioRepository extends Repository<Portfolio> {
  async createPortfolio(portfolio: IPortfolio): Promise<InsertResult> {
    return await this.insert(portfolio);
  }
}
