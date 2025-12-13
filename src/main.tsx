import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root") as HTMLElement;

createRoot(rootElement).render(<App />);
