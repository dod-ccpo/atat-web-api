import { retrieveSecrets } from "../utils/retrieveSecrets";
import * as getSecrets from "../utils/retrieveSecrets";
import { SmtpConfiguration } from "./retrieveSecrets";

beforeEach(() => {
  jest.clearAllMocks();
});

const secrets: SmtpConfiguration = {
  hostname: "smtp.mail.mil",
  port: 465,
  username: "postmate@sandbox.mail.mil",
  password: "password",
};

describe("retrieveSecrets", function () {
  it("should return a secrets object upon successfully getting secret value", async () => {
    const secretsSpy = jest.spyOn(getSecrets, "retrieveSecrets").mockImplementation((id: any) => id);
    secretsSpy.mockReturnValue(Promise.resolve(secrets));
    const secretsValue = await retrieveSecrets("test/email");
    expect(secretsSpy).toHaveBeenCalledTimes(1);
    expect(secretsSpy).toHaveBeenCalledWith("test/email");
    expect(secretsValue).toEqual(secrets);
  });
});
