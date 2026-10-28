import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { requireRolePage } from "@/server/auth/session";
import { getEditorData } from "@/server/catalog/editor";
import { getDb } from "@/server/db/client";
import { DomainError } from "@/server/errors";

/** Loads the course editor data for the current instructor/admin, once per request. */
export const loadEditor = cache(async (id: string) => {
  const user = await requireRolePage(["instructor", "admin"], `/instrutor/cursos/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  try {
    return { user, ...(await getEditorData(await getDb(), user, id)) };
  } catch (error) {
    if (error instanceof DomainError && error.code === "forbidden") redirect("/sem-acesso");
    notFound();
  }
});
