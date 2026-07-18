import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Login from "./pages/login";

function App() {
  const [, setUser] = useState(null);

  const handleAfterLogin = (loggedInUser) => {
    setUser(loggedInUser);
    console.log(loggedInUser);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Login
              setUser={setUser}
              goAfterLogin={handleAfterLogin}
              goHome={() => {}}
              goRegister={() => {}}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;