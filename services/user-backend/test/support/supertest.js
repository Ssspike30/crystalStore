const http = require("node:http");
const { URL } = require("node:url");

class RequestBuilder {
  constructor(app, method, path) {
    this.app = app;
    this.method = method;
    this.path = path;
    this.headers = {};
    this.body = undefined;
    this.expectedStatus = null;
  }

  set(name, value) {
    this.headers[String(name).toLowerCase()] = value;
    return this;
  }

  send(body) {
    this.body = body;
    return this;
  }

  expect(status) {
    this.expectedStatus = status;
    return this;
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  catch(reject) {
    return this.execute().catch(reject);
  }

  async execute() {
    const server = http.createServer(this.app);
    await new Promise((resolve) => server.listen(0, resolve));

    try {
      const address = server.address();
      const url = new URL(this.path, `http://127.0.0.1:${address.port}`);
      const headers = { ...this.headers };
      let payload = null;

      if (this.body !== undefined) {
        if (!headers["content-type"]) {
          headers["content-type"] = "application/json";
        }
        payload = JSON.stringify(this.body);
        headers["content-length"] = Buffer.byteLength(payload);
      }

      const response = await new Promise((resolve, reject) => {
        const req = http.request(
          url,
          {
            method: this.method,
            headers
          },
          (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
              const text = Buffer.concat(chunks).toString("utf8");
              let body = text;
              const contentType = res.headers["content-type"] || "";
              if (contentType.includes("application/json")) {
                try {
                  body = JSON.parse(text || "{}");
                } catch {
                  body = text;
                }
              } else {
                try {
                  body = JSON.parse(text);
                } catch {
                  body = text;
                }
              }
              resolve({
                status: res.statusCode,
                headers: res.headers,
                text,
                body
              });
            });
          }
        );
        req.on("error", reject);
        if (payload != null) {
          req.write(payload);
        }
        req.end();
      });

      if (this.expectedStatus != null && response.status !== this.expectedStatus) {
        throw new Error(`Expected HTTP ${this.expectedStatus} but received ${response.status}: ${response.text}`);
      }

      return response;
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

function supertest(app) {
  return {
    get(path) {
      return new RequestBuilder(app, "GET", path);
    },
    post(path) {
      return new RequestBuilder(app, "POST", path);
    },
    patch(path) {
      return new RequestBuilder(app, "PATCH", path);
    },
    delete(path) {
      return new RequestBuilder(app, "DELETE", path);
    },
    put(path) {
      return new RequestBuilder(app, "PUT", path);
    }
  };
}

module.exports = supertest;
