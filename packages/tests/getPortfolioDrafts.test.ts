import request from "supertest";

const baseUrl = process.env.BASEURL;
jest.setTimeout(7000);

describe("GET /portfolioDrafts", () => {
  it("should return a 200 status code and have portfolio summary attributes: id, status, number of portfolio managers, portfolio step, created at, updated at", async () => {
    const res = await request(baseUrl).get("/portfolioDrafts");
    const portfolio = res.body[0];
    expect(res.statusCode).toEqual(200);
    expect(portfolio).toHaveProperty("id");
    expect(portfolio).toHaveProperty("status");
    expect(portfolio).toHaveProperty("num_portfolio_managers");
    expect(portfolio).toHaveProperty("portfolio_step");
    expect(portfolio).toHaveProperty("created_at");
    expect(portfolio).toHaveProperty("updated_at");
  });

  it("limit of 3 should return 3 portfolios", async () => {
    const res = await request(baseUrl).get("/portfolioDrafts?limit=3");
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toEqual(3);
  });

  it("limit of -3 should return 400", async () => {
    const res = await request(baseUrl).get("/portfolioDrafts?limit=-3");
    expect(res.statusCode).toEqual(400);
    expect(res.body.code).toBe("INVALID_INPUT");
  });

  it("offset should return 200 and equal 5", async () => {
    const res = await request(baseUrl).get("/portfolioDrafts?offset=2");
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toEqual(5);
  });
});
