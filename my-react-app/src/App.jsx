import { Routes, Route } from "react-router-dom";
import Login from "./login.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      {/* route อื่นๆ */}
    </Routes>
  );
}

export default App;