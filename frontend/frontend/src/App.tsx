import { useEffect, useState } from "react";

function App() {
  const [backendMessage, setBackendMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:4000/api/health")
      .then((res) => res.json())
      .then((data) => setBackendMessage(data.message))
      .catch(() => setBackendMessage("Backend not reachable"));
  }, []);

  return (
    <div className="p-4 text-xl font-bold">
      Collaborative Code Review Platform
      <p className="mt-4 text-lg text-green-600">Backend says: {backendMessage}</p>
    </div>
  );
}

export default App;
