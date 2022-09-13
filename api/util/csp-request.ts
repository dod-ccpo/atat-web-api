export interface CspResponse<Req, Resp> {
  code: number;
  content: {
    request: Req;
    response: Resp;
  };
}
