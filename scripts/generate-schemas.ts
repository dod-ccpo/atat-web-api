import { convertSchema } from "../infrastructure/lib/load-schema";

// Convert the YAML API spec to JSON, send the JSON schema to packages/api/models
convertSchema("internal");
convertSchema("provisioning");
