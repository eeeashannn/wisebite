import React, { useEffect, useState } from "react";

function App() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/items")
      .then((res) => res.json())
      .then((data) => setItems(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Smart Pantry Dashboard</h1>
      <ul>
        {items.map((item, index) => (
          <li key={index}>
            {item.name} — Expires on {item.expiry}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
