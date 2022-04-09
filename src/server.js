import * as dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import cors from "cors";
import path from "path";
import helmet from "helmet";
import express from "express";
import swaggerUi from "swagger-ui-express";
import enableWs from "express-ws";

import { cameraRouter } from "./router/cameraRouter.js";
import { configRouter } from "./router/configRouter.js";
import { authRouter } from "./router/authRouter.js";

import { errorHandler } from "./middleware/errorHandler.js";
import { observationRouter } from "./router/observationRouter.js";
import { notFoundController } from "./controller/NotFoundController.js";

import { swaggerSpec } from "./swagger/swagger.js";
import { morganWithWs } from "./middleware/morganWithWs.js";
import { serverStatusRouter } from "./router/serverStatusRouter.js";
import { healthRouter } from "./router/healthRouter.js"

import { ServerStatusController } from "./controller/ServerStatusController.js";
import { getWs } from "./middleware/getWs.js";

import { openidConfigController } from "./controller/OpenidConfig.js"


const PORT = process.env.PORT || 8090;

const app = express();
const ws = enableWs(app);

app.set("view engine", "ejs");
app.set("views", path.join(path.resolve(), "src/views"));

app.use(getWs(ws))
app.use(express.static(path.join(path.resolve(), "src/public")));
app.use(cors());
app.options("*", cors());
app.use(helmet({ contentSecurityPolicy: false }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ws.getWss().clients.forEach(i => i.url)
// logger
app.use(morganWithWs);

app.get("/", (req, res) => res.render("pages/index"));
// Swagger definition
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Auth
app.use(authRouter);

// Camera routes
app.use(cameraRouter);
app.use(observationRouter);
app.use(configRouter);
app.use(serverStatusRouter);
app.use(healthRouter)

app.get("/.well-known/openid-configuration", openidConfigController)

app.ws("/logger", (ws, req) => { ws.route = "/logger" });
app.ws('/observations/:ip', (ws, req) => {
  ws.route = "/observations"
  ws.params = req.params
});

// Error handler
app.use(errorHandler);
app.all("*", notFoundController);

// Server status monitor
ServerStatusController.init(ws);

app.listen(PORT, () =>
  console.log(`[SERVER] : Middleware App listening at http://localhost:${PORT}`)
);
