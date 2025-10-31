import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import influencerRoutes from "./routes/influencerRoutes.js";
import scriptRoutes from "./routes/scriptRoutes.js";
import plannerRoutes from "./routes/plannerRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import buildAceiteRouter from "./routes/aceite.js";
import { authenticate } from "./middleware/authentication.js";

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);
app.use(express.json());

app.use(authRoutes);
app.use(influencerRoutes);
app.use(scriptRoutes);
app.use(plannerRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api", buildAceiteRouter({ authenticate }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

