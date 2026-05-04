import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";
import "../styles/globals.css";
import Home from "./pages/Home";
import Auth from "./pages/Auth";

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
