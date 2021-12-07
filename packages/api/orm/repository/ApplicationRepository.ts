import { EntityRepository, AbstractRepository } from "typeorm";
import { NO_SUCH_PORTFOLIO_DRAFT_400 } from "../../utils/errors";
import { Application } from "../entity/Application";
import { Portfolio } from "../entity/Portfolio";

@EntityRepository(Application)
export class ApplicationRepository extends AbstractRepository<Application> {
  createAndSaveApplication(portfolio: Portfolio, application: Application) {
    const app = new Application();
    app.name = application?.name;
    app.description = application?.description || "";
    app.portfolio = portfolio;
    return this.manager.save(app);
  }
}
