function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui",
      }}
    >
      <h1 style={{ fontSize: "3rem", fontWeight: "bold" }}>Reasonly</h1>
      <p style={{ marginTop: "1rem", opacity: 0.8 }}>
        React is now rendering correctly.
      </p>
    </div>
  );
}

export default App;
