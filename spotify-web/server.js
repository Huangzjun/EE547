const express = require("express");
const path = require("path");
const routes = require("./routes");

const app = express();
const PORT = 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/web", express.static(path.join(__dirname, "public")));

app.use(routes);

app.use((req, res) => {
    res.status(404).render("error", { message: "Page Not Found", backLink: "/web" });
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}/web`));
