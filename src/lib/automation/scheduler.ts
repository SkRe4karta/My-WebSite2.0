/**
 * Планировщик задач для автоматизации
 * 
 * Примечание: Для полноценной работы требуется установка node-cron:
 * npm install node-cron
 * npm install @types/node-cron
 */

export interface ScheduledTask {
  id: string;
  name: string;
  schedule: string; // Cron expression
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Регистрация задачи
   */
  register(task: ScheduledTask): void {
    this.tasks.set(task.id, task);
    if (task.enabled) {
      this.start(task.id);
    }
  }

  /**
   * Запуск задачи
   */
  start(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task || !task.enabled) return;

    // Останавливаем существующий интервал, если есть
    this.stop(taskId);

    // Простая реализация с setInterval (для полноценной работы нужен node-cron)
    // Здесь используется упрощенная версия
    const interval = setInterval(async () => {
      try {
        task.lastRun = new Date();
        await task.handler();
        console.log(`Task ${task.name} executed successfully`);
      } catch (error) {
        console.error(`Task ${task.name} failed:`, error);
      }
    }, this.parseSchedule(task.schedule));

    this.intervals.set(taskId, interval);
  }

  /**
   * Остановка задачи
   */
  stop(taskId: string): void {
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(taskId);
    }
  }

  /**
   * Удаление задачи
   */
  unregister(taskId: string): void {
    this.stop(taskId);
    this.tasks.delete(taskId);
  }

  /**
   * Парсинг расписания (упрощенная версия)
   * Для полноценной работы нужен node-cron
   */
  private parseSchedule(schedule: string): number {
    // Упрощенная версия: принимает интервал в миллисекундах или минутах
    if (schedule.endsWith("ms")) {
      return parseInt(schedule);
    }
    if (schedule.endsWith("m")) {
      return parseInt(schedule) * 60 * 1000;
    }
    if (schedule.endsWith("h")) {
      return parseInt(schedule) * 60 * 60 * 1000;
    }
    // По умолчанию: каждые 5 минут
    return 5 * 60 * 1000;
  }

  /**
   * Получить все задачи
   */
  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Получить задачу по ID
   */
  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }
}

// Singleton instance
export const scheduler = new TaskScheduler();

/**
 * Предустановленные задачи
 */
export const defaultTasks = {
  cleanupOldLogs: {
    id: "cleanup-old-logs",
    name: "Очистка старых логов",
    schedule: "24h", // Каждые 24 часа
    enabled: false,
    handler: async () => {
      // Реализация очистки старых логов
      console.log("Cleaning up old logs...");
    },
  },
  backupDatabase: {
    id: "backup-database",
    name: "Бэкап базы данных",
    schedule: "24h", // Каждые 24 часа
    enabled: false,
    handler: async () => {
      // Реализация бэкапа БД
      console.log("Backing up database...");
    },
  },
};

