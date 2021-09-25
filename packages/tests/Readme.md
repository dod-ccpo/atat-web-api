# ATAT Web API Tests
The ATAT Web API Tests contains integration tests for the Web API.  These tests are built on Jest and Supertest.

## Getting Started
### Install JavaScript Dependencies 
```
npm ci
npm run bootstrap
npm run build
```
Once the dependencies are installed, a `.env` file will need to be created in the root test directory.  A `BASEURL` must be defined which is used in the tests to add each unique endpoint to.

`BASEURL="https://mywebsite.api"`

Note: When adding the `BASEURL` ensure to leave off the trailing `/`, as each of the tests adds that in as a part of the HTTP method operation.

### Useful Commands

 * `npm run test`    execute the Jest unit tests