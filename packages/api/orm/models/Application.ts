import { AppEnvAccess } from "./AppEnvAccess";
import { BaseObject } from "./BaseObject";
import { Environment } from "./Environment";

export interface Application extends BaseObject, AppEnvAccess {
  name: string;
  description?: string;
  environments: Array<Environment>;
}
/*
Conform to this schema.....

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
/*
CREATE TABLE application (
  id uuid DEFAULT uuid_generate_v4() CONSTRAINT "pk_application" PRIMARY KEY,
  "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
  "archivedAt" timestamp without time zone,
  "provisioningStatus" provisioning_status_enum DEFAULT 'PENDING'::provisioning_status_enum NOT NULL,
  administrators character varying [] DEFAULT '{}'::character varying [] NOT NULL,
  contributors character varying [] DEFAULT '{}'::character varying [] NOT NULL,
  "readOnlyOperators" character varying [] DEFAULT '{}'::character varying [] NOT NULL,
  name character varying(100) NOT NULL,
  description character varying(300),
  "portfolioId" uuid,
  CONSTRAINT "fk_application_portfolio" FOREIGN KEY ("portfolioId") REFERENCES portfolio(id)
); */
