import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

import StartPage from "./pages/StartPage";
import StreamPage from "./pages/StreamPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/stream" element={<StreamPage />} />
      </Routes>
    </Router>
  );
}
