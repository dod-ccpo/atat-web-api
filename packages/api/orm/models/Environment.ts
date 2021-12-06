import { AppEnvAccess } from "./AppEnvAccess";
import { BaseObject } from "./BaseObject";

export interface Environment extends BaseObject, AppEnvAccess {
  name: string;
}
/*
Environment:
      required:
        - name
      type: object
      allOf:
        - $ref: "#/components/schemas/BaseObject"
        - $ref: '#/components/schemas/AppEnvAccess'
      properties:
        name:
          pattern: "^[a-zA-Z\\d _-]{1,100}$"
          type: string
      additionalProperties: false
      description: "Represents an Environment for a specific Application"
      */
