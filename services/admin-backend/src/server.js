require("dotenv").config();

const createApp = require("./app");

const port = Number(process.env.PORT || 3002);
const app = createApp();

app.listen(port, () => {
  console.log(`[admin-backend] running at http://localhost:${port}`);
});
