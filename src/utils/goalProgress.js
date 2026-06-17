const LEARNING_LINKED_TYPES = ["lesson", "course", "level", "subject"];
const FINANCIAL_LINKED_TYPES = ["income", "expense_limit"];

export function isFinancialGoal(goal) {
  return Boolean(goal?.linkedType && FINANCIAL_LINKED_TYPES.includes(goal.linkedType) && goal?.targetAmount > 0);
}

export function isLearningLinkedGoal(goal) {
  return Boolean(goal?.linkedType && goal?.linkedId && LEARNING_LINKED_TYPES.includes(goal.linkedType));
}

export function isLinkedGoal(goal) {
  return isLearningLinkedGoal(goal) || isFinancialGoal(goal);
}

export function getLessonsForLink(linkedType, linkedId, { lessons = [], courses = [], levels = [] }) {
  switch (linkedType) {
    case "lesson": {
      const lesson = lessons.find((l) => l.id === linkedId);
      return lesson ? [lesson] : [];
    }
    case "course":
      return lessons.filter((l) => l.courseId === linkedId);
    case "level": {
      const courseIds = new Set(courses.filter((c) => c.levelId === linkedId).map((c) => c.id));
      return lessons.filter((l) => courseIds.has(l.courseId));
    }
    case "subject": {
      const levelIds = new Set(levels.filter((l) => l.subjectId === linkedId).map((l) => l.id));
      const courseIds = new Set(courses.filter((c) => levelIds.has(c.levelId)).map((c) => c.id));
      return lessons.filter((l) => courseIds.has(l.courseId));
    }
    default:
      return [];
  }
}

export function computeLinkedProgress(linkedType, linkedId, learningData) {
  const scopedLessons = getLessonsForLink(linkedType, linkedId, learningData);
  if (scopedLessons.length === 0) return 0;

  if (linkedType === "lesson") {
    return scopedLessons[0].status === "completed" ? 100 : 0;
  }

  const completed = scopedLessons.filter((l) => l.status === "completed").length;
  return Math.round((completed / scopedLessons.length) * 100);
}

// Transactions that fall inside a goal's tracking window: from the day the
// goal was created through its target date (inclusive).
function transactionsInGoalWindow(goal, transactions = []) {
  const startDate = new Date(goal.createdAt).toISOString().split("T")[0];
  const endDate = goal.targetDate;
  return transactions.filter((t) => t.date >= startDate && t.date <= endDate);
}

// Income goals: progress climbs toward 100% as you earn more.
// Expense-limit goals: progress STARTS at 100% (full budget left) and falls
// as you spend, so "higher is still better" stays true for every goal type.
export function computeFinancialProgress(goal, transactions = []) {
  if (!goal?.targetAmount) return 0;
  const inWindow = transactionsInGoalWindow(goal, transactions);

  if (goal.linkedType === "income") {
    const earned = inWindow.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    return Math.min(100, Math.round((earned / goal.targetAmount) * 100));
  }

  if (goal.linkedType === "expense_limit") {
    const spent = inWindow.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const remainingPct = 100 - (spent / goal.targetAmount) * 100;
    return Math.max(0, Math.round(remainingPct));
  }

  return 0;
}

export function getFinancialGoalStats(goal, transactions = []) {
  if (!isFinancialGoal(goal)) return null;
  const inWindow = transactionsInGoalWindow(goal, transactions);

  if (goal.linkedType === "income") {
    const earned = inWindow.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    return { kind: "income", current: earned, target: goal.targetAmount, over: false };
  }

  const spent = inWindow.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  return { kind: "expense_limit", current: spent, target: goal.targetAmount, over: spent > goal.targetAmount };
}

export function getGoalProgress(goal, data = {}) {
  if (isFinancialGoal(goal)) {
    return computeFinancialProgress(goal, data.transactions || []);
  }
  if (isLearningLinkedGoal(goal)) {
    return computeLinkedProgress(goal.linkedType, goal.linkedId, data);
  }
  return goal.progress ?? 0;
}

export function getLinkedGoalStats(goal, learningData) {
  if (!isLearningLinkedGoal(goal)) return null;

  const scopedLessons = getLessonsForLink(goal.linkedType, goal.linkedId, learningData);
  const completed = scopedLessons.filter((l) => l.status === "completed").length;
  const total = scopedLessons.length;

  return { completed, total };
}

export function getLinkedGoalLabel(linkedType, linkedId, { subjects = [], levels = [], courses = [], lessons = [] }) {
  const parts = [];

  if (linkedType === "lesson") {
    const lesson = lessons.find((l) => l.id === linkedId);
    if (!lesson) return "Linked lesson";
    const course = courses.find((c) => c.id === lesson.courseId);
    if (course) {
      const level = levels.find((l) => l.id === course.levelId);
      const subject = level ? subjects.find((s) => s.id === level.subjectId) : null;
      if (subject) parts.push(subject.name);
      if (level) parts.push(level.name);
      parts.push(course.name);
    }
    parts.push(lesson.name);
    return parts.join(" › ");
  }

  if (linkedType === "course") {
    const course = courses.find((c) => c.id === linkedId);
    if (!course) return "Linked course";
    const level = levels.find((l) => l.id === course.levelId);
    const subject = level ? subjects.find((s) => s.id === level.subjectId) : null;
    if (subject) parts.push(subject.name);
    if (level) parts.push(level.name);
    parts.push(course.name);
    return parts.join(" › ");
  }

  if (linkedType === "level") {
    const level = levels.find((l) => l.id === linkedId);
    if (!level) return "Linked level";
    const subject = subjects.find((s) => s.id === level.subjectId);
    if (subject) parts.push(subject.name);
    parts.push(level.name);
    return parts.join(" › ");
  }

  if (linkedType === "subject") {
    const subject = subjects.find((s) => s.id === linkedId);
    return subject ? subject.name : "Linked subject";
  }

  return "";
}

export function getFinancialGoalLabel(goal, currency = "EGP") {
  if (goal.linkedType === "income") return `Earn ${goal.targetAmount} ${currency}`;
  if (goal.linkedType === "expense_limit") return `Max ${goal.targetAmount} ${currency}`;
  return "";
}

export function getGoalsLinkedTo(goals, linkedType, linkedId) {
  return goals.filter((g) => g.linkedType === linkedType && g.linkedId === linkedId);
}

export function getLinkTypeLabel(linkedType) {
  const labels = {
    lesson: "Lesson",
    course: "Course",
    level: "Level",
    subject: "Subject",
    income: "Income Goal",
    expense_limit: "Expense Limit",
  };
  return labels[linkedType] || linkedType;
}
