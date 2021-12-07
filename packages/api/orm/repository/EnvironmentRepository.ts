import { EntityRepository, AbstractRepository } from "typeorm";
import { NO_SUCH_PORTFOLIO_DRAFT_400 } from "../../utils/errors";
import { Application } from "../entity/Application";
import { Environment } from "../entity/Environment";
import { Portfolio } from "../entity/Portfolio";

@EntityRepository(Environment)
export class EnvironmentRepository extends AbstractRepository<Environment> {
  /*
  createAndSave(portfolioId: string, name: string, description: string | null) {
    const app = new Application();
    // Setup example app
    // TODO - pass actual Application object after its updated
    app.name = name;
    app.description = description || "";
    // Find portfolio based on given UUID
    // If it exists -> create new application
    // If it doesn't exist -> return an error to user
    try {
      this.manager.getRepository(Portfolio).findOneOrFail({ id: portfolioId });
      return this.manager.save(app);
    } catch (error) {
      if (error.name === "EntityNotFoundError") {
        console.log("Invalid parameter entered: " + error);
        // TODO - update erorr
        return NO_SUCH_PORTFOLIO_DRAFT_400;
      }
    }
    return NO_SUCH_PORTFOLIO_DRAFT_400;
  }
  */

  // TODO once validation and model is setup

  createAndSaveEnvironment(applicationId: string, environment: Array<Environment>) {
    const env = new Environment();
    env.name = environment?.name;

    this.manager.getRepository(Application).findOneOrFail({ id: applicationId });
    return this.manager.save(env);
    /*
    try {
      this.manager.getRepository(Portfolio).findOneOrFail({ id: portfolioId });
      return this.manager.save(app);
    } catch (error) {
      if (error.name === "EntityNotFoundError") {
        console.log("Invalid parameter entered: " + error);
        // TODO - update erorr
        return NO_SUCH_PORTFOLIO_DRAFT_400;
      }
    }
    return NO_SUCH_PORTFOLIO_DRAFT_400; */
  }

  /*
  findPortfolio(portfolioId: string) {

  }
  /*
  findByName(firstName: string, lastName: string) {
    return this.repository.findOne({ firstName, lastName });
  }
  */
}
/*
Application:
      required:
        - environments
        - name
      type: object
      allOf:
        - $ref: "#/components/schemas/BaseObject"
        - $ref: '#/components/schemas/AppEnvAccess'
      properties:
        environments:
          minItems: 1
          type: array
          items:
            $ref: "#/components/schemas/Environment"
        name:
          pattern: "^[a-zA-Z\\d _-]{4,100}$"
          type: string
        description:
          pattern: "^[\\w\\d !@#$%^&*_|:;,'.-]{0,300}$"
          type: string
      additionalProperties: false
      description: "Represents an Application in a Portfolio"
*/
