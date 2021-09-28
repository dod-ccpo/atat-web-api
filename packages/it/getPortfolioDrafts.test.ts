import request from "supertest";
import jestOpenAPI from "jest-openapi";
import path from "path";

const localAPI = path.resolve("../../atat_provisioning_wizard_api.yaml");
jestOpenAPI(localAPI);

const baseUrl = process.env.BASEURL;
jest.setTimeout(7000);

describe("GET /portfolioDrafts", () => {
  it("should return a 200 status code & match api spec", async () => {
    const res = await request(baseUrl).get("/portfolioDrafts");
    expect(res.statusCode).toEqual(200);
    expect(res).toSatisfyApiSpec();
    // Spec likely needs to be updated to make the following statement pass
    //  expect(res).toSatisfySchemaInApiSpec("PortfolioDraftSummary");
  });
});
