import { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/analytics", {
      headers: {
        "x-admin-key": prompt("Admin key") ?? "",
      },
    })
      .then((res) => res.json())
      .then(setData);
  }, []);

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Reasonly Admin</h1>

      {data.map((day) => (
        <div key={day.date} style={{ marginBottom: "1rem" }}>
          <h3>{day.date}</h3>
          <p>Total messages: {day.totalMessages}</p>
          <p>Active users: {day.activeUsers.length}</p>

          <ul>
            {Object.entries(day.messagesByPlan).map(([plan, count]) => (
              <li key={plan}>
                {plan}: {count as any}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
