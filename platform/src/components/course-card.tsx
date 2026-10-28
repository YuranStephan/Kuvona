import Link from "next/link";
import { formatDuration, levelLabel } from "@/lib/format";
import { plural } from "@/lib/text";
import type { CourseCard as CourseCardData } from "@/server/catalog/queries";
import { CourseCover } from "./cover";
import { Icon } from "./icon";
import { Price, Stars } from "./ui";

export function CourseCard({ course, layout = "grid", index = 0 }: { course: CourseCardData; layout?: "grid" | "list"; index?: number }) {
  return (
    <Link
      href={`/cursos/${course.slug}`}
      className={`course-card rise${layout === "list" ? " course-card-list" : ""}`}
      style={{ ["--i" as string]: index % 8 }}
    >
      <div className="course-card-cover">
        <CourseCover seed={course.coverSeed} title={course.title} rounded={false} />
        {course.priceCents === 0 ? (
          <span className="badge badge-teal">Gratuito</span>
        ) : course.featured ? (
          <span className="badge badge-ink">Destaque</span>
        ) : null}
      </div>
      <div className="course-card-body">
        {course.categoryName && <span className="course-card-meta">{course.categoryName}</span>}
        <h3>{course.title}</h3>
        <span className="by">{course.instructorName}</span>
        <div className="course-card-stats">
          {course.ratingAvg !== null && course.ratingCount > 0 && (
            <span>
              <strong>{course.ratingAvg.toLocaleString("pt-PT")}</strong>
              <Stars value={course.ratingAvg} size={13} />
              <span className="muted">({course.ratingCount})</span>
            </span>
          )}
          <span>
            <Icon name="layers" size={14} /> {plural(course.lessonCount, "aula", "aulas")}
          </span>
          {course.durationSeconds > 0 && (
            <span>
              <Icon name="clock" size={14} /> {formatDuration(course.durationSeconds)}
            </span>
          )}
        </div>
        <div className="course-card-foot">
          <Price cents={course.priceCents} currency={course.currency} />
          <span className="badge">{levelLabel[course.level]}</span>
        </div>
      </div>
    </Link>
  );
}
