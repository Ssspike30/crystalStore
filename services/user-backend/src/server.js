require("dotenv").config();
const app = require("./app");

const port = Number(process.env.PORT || 3001);

app.listen(port, () => {
  console.log(`[user-backend] running at http://localhost:${port}`);
});
