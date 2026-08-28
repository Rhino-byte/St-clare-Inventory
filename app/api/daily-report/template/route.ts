import { NextResponse } from "next/server";
import { isWeekday } from "@/lib/dates";
import { requireAdmin } from "@/lib/auth/api-auth";
import {
  getWeeklyMenuMealsForDay,
  saveWeeklyMenuForDay,
} from "@/lib/sheets";
import type { MenuMeal, Weekday, WeeklyMenuMeals } from "@/lib/types";

function parseWeekdayParam(value: string | null): Weekday {
  const day = (value ?? "monday").trim().toLowerCase();
  if (!isWeekday(day)) {
    throw new Error("Invalid day. Use monday through sunday.");
  }
  return day;
}

function parseMealItems(
  items: unknown,
  meal: MenuMeal
): WeeklyMenuMeals[MenuMeal] {
  if (!Array.isArray(items)) {
    throw new Error(`meals.${meal} must be an array.`);
  }

  return items
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const itemId = String((entry as { itemId?: unknown }).itemId ?? "").trim();
      const itemName = String(
        (entry as { itemName?: unknown }).itemName ?? ""
      ).trim();
      if (!itemId) return null;
      return {
        sortOrder: index + 1,
        itemId,
        itemName,
      };
    })
    .filter((entry): entry is WeeklyMenuMeals[MenuMeal][number] => entry !== null);
}

function parseMealsBody(body: unknown): WeeklyMenuMeals {
  if (!body || typeof body !== "object" || !("meals" in body)) {
    throw new Error("Request body must include meals object.");
  }

  const meals = (body as { meals: unknown }).meals;
  if (!meals || typeof meals !== "object") {
    throw new Error("meals must be an object.");
  }

  const payload = meals as Partial<Record<MenuMeal, unknown>>;
  return {
    breakfast: parseMealItems(payload.breakfast, "breakfast"),
    lunch: parseMealItems(payload.lunch, "lunch"),
    dinner: parseMealItems(payload.dinner, "dinner"),
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const weekday = parseWeekdayParam(searchParams.get("day"));
    const meals = await getWeeklyMenuMealsForDay(weekday);
    return NextResponse.json({ weekday, meals });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/daily-report/template", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load template",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const weekday = parseWeekdayParam(searchParams.get("day"));
    const body = await request.json();
    const meals = parseMealsBody(body);
    const saved = await saveWeeklyMenuForDay(weekday, meals);
    return NextResponse.json({ weekday, meals: saved });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("PUT /api/daily-report/template", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save template",
      },
      { status: 400 }
    );
  }
}
