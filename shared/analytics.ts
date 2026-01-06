type Analytics = {
  date: string;
  totalMessages: number;
  messagesByPlan: Record<string, number>;
  activeUsers: Set<string>;
};

const analytics = new Map<string, Analytics>();

export function recordUsage(userId: string, plan: string) {
  const today = new Date().toISOString().slice(0, 10);

  if (!analytics.has(today)) {
    analytics.set(today, {
      date: today,
      totalMessages: 0,
      messagesByPlan: {},
      activeUsers: new Set(),
    });
  }

  const record = analytics.get(today)!;
  record.totalMessages += 1;
  record.messagesByPlan[plan] = (record.messagesByPlan[plan] || 0) + 1;
  record.activeUsers.add(userId);
}

export function getAnalytics() {
  return Array.from(analytics.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: r.date,
      totalMessages: r.totalMessages,
      messagesByPlan: r.messagesByPlan,
      activeUsers: Array.from(r.activeUsers),
      activeUsersCount: r.activeUsers.size,
    }));
}
