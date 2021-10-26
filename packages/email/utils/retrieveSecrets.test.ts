import { retrieveSecrets, SmtpConfiguration } from "./retrieveSecrets";
import * as getSecrets from "./retrieveSecrets";
import { SECRETS_NOT_RETRIEVED } from "./statusCodesAndErrors";

const secrets: SmtpConfiguration = {
  hostname: "smtp.mail.mil",
  port: 465,
  username: "postmate@sandbox.mail.mil",
  password: "password",
};

const secretsSpy = jest.spyOn(getSecrets, "retrieveSecrets");

beforeEach(() => {
  jest.clearAllMocks();
  secretsSpy.mockReset();
});

describe("retrieveSecrets", function () {
  it("should return a secrets object upon successfully getting secret value", async () => {
    secretsSpy.mockResolvedValue(secrets);

    const secretsValue = await retrieveSecrets("test/email");
    expect(secretsSpy).toHaveBeenCalledTimes(1);
    expect(secretsSpy).toHaveBeenCalledWith("test/email");
    expect(secretsValue).toEqual(secrets);
  });
  it("should return an error when empty string provided", async () => {
    secretsSpy.mockRejectedValue(SECRETS_NOT_RETRIEVED);

    try {
      await retrieveSecrets("");
    } catch (e) {
      expect(e).toEqual(SECRETS_NOT_RETRIEVED);
    }
  });
});
