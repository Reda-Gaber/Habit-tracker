const LINKED_TYPES = ["lesson", "course", "level", "subject"];

export function isLinkedGoal(goal) {
  return Boolean(goal?.linkedType && goal?.linkedId && LINKED_TYPES.includes(goal.linkedType));
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

export function getGoalProgress(goal, learningData) {
  if (isLinkedGoal(goal)) {
    return computeLinkedProgress(goal.linkedType, goal.linkedId, learningData);
  }
  return goal.progress ?? 0;
}

export function getLinkedGoalStats(goal, learningData) {
  if (!isLinkedGoal(goal)) return null;

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

export function getLinkTypeLabel(linkedType) {
  const labels = {
    lesson: "Lesson",
    course: "Course",
    level: "Level",
    subject: "Subject",
  };
  return labels[linkedType] || linkedType;
}
