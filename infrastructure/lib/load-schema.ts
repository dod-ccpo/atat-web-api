import * as fs from "fs";
import { load } from "js-yaml";
import toJsonSchema from "@openapi-contrib/openapi-schema-to-json-schema";
import * as utils from "./util";
export function convertSchema() {
  try {
    const schema = utils.packageRoot() + "/../atat_provisioning_wizard_api.yaml";
    const fileContents = fs.readFileSync(schema, { encoding: "utf8" });
    const data = load(fileContents, {
      onWarning: console.log,
    });
    // console.log(data);
    // data is now loaded, we can now convert it to json schema with toJsonSchema
    const convertedSchema = toJsonSchema(data as any);
    fs.writeFileSync("schema.json", JSON.stringify(convertedSchema));
  } catch (e) {
    console.log(e);
  }
  return true;
}
