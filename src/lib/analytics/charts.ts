/**
 * Утилиты для генерации графиков аналитики
 * 
 * Примечание: Для полноценной работы требуется установка recharts или chart.js:
 * npm install recharts
 * или
 * npm install chart.js react-chartjs-2
 */

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ActivityChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}

/**
 * Подготовка данных для графика активности
 */
export function prepareActivityChartData(
  data: ChartDataPoint[],
  type: "line" | "bar" = "line"
): ActivityChartData {
  const labels = data.map((point) => {
    const date = new Date(point.date);
    return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
  });

  const values = data.map((point) => point.value);

  return {
    labels,
    datasets: [
      {
        label: "Активность",
        data: values,
        backgroundColor: type === "bar" ? "rgba(76, 175, 80, 0.2)" : undefined,
        borderColor: "rgba(76, 175, 80, 1)",
      },
    ],
  };
}

/**
 * Группировка данных по периодам
 */
export function groupDataByPeriod(
  data: ChartDataPoint[],
  period: "day" | "week" | "month"
): ChartDataPoint[] {
  const grouped = new Map<string, number>();

  data.forEach((point) => {
    const date = new Date(point.date);
    let key: string;

    switch (period) {
      case "day":
        key = date.toISOString().split("T")[0];
        break;
      case "week":
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
        break;
      case "month":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        break;
    }

    grouped.set(key, (grouped.get(key) || 0) + point.value);
  });

  return Array.from(grouped.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Вычисление статистики из данных
 */
export function calculateStats(data: ChartDataPoint[]): {
  total: number;
  average: number;
  max: number;
  min: number;
  trend: "up" | "down" | "stable";
} {
  if (data.length === 0) {
    return { total: 0, average: 0, max: 0, min: 0, trend: "stable" };
  }

  const values = data.map((d) => d.value);
  const total = values.reduce((sum, val) => sum + val, 0);
  const average = total / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);

  // Определяем тренд (сравниваем первую и вторую половину данных)
  const mid = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, mid).reduce((sum, val) => sum + val, 0) / mid;
  const secondHalf = values.slice(mid).reduce((sum, val) => sum + val, 0) / (values.length - mid);

  let trend: "up" | "down" | "stable" = "stable";
  if (secondHalf > firstHalf * 1.1) trend = "up";
  else if (secondHalf < firstHalf * 0.9) trend = "down";

  return { total, average, max, min, trend };
}

