import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./app/router";

import "./styles/global.css";
import "./styles/workspace.css";

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
