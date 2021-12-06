export interface AppEnvAccess {
  administrators?: Array<string>;
  contributors?: Array<string>;
  readOnlyOperators?: Array<string>;
}
/*
  AppEnvAccess:
      description: >-
        Represents a set of Operators who should be granted access to
        an Application or Environment at a specific access level. The same access
        levels are available for both Applications & Environments.
      properties:
        administrators:
          type: array
          items:
            type: string
            format: email
        contributors:
          type: array
          items:
            type: string
            format: email
        readOnlyOperators:
          type: array
          items:
            type: string
            format: email
            */
