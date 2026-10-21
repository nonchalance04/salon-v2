// Bring in the tools for the salon website so this file can work with the rest of the application.
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./app/router";

import "./styles/tailwind.css";
import "./styles/feature-utilities.css";
import "./styles/public-utilities.css";
import "./styles/global.css";
import "./styles/workspace.css";
import "./styles/button-shape.css";

// Open the page navigation inside the website container so visitors can use the salon screens.
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
