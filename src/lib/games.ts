import { eq, asc, and, inArray } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

export type GameFilters = {
    categoryIds?: number[];
    publisherIds?: number[];
};

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function normalizeFilterValues(values?: number[]): number[] {
    if (!Array.isArray(values)) {
        return [];
    }

    return [...new Set(values.filter((id) => Number.isInteger(id) && id > 0))];
}

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/** All categories ordered by name for filter controls. */
export async function getAllCategories(db: Database): Promise<Array<{ id: number; name: string }>> {
    return await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));
}

/** All publishers ordered by name for filter controls. */
export async function getAllPublishers(db: Database): Promise<Array<{ id: number; name: string }>> {
    return await db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));
}

/** All games ordered by title and optionally narrowed by category and publisher filters. */
export async function getAllGames(db: Database, filters: GameFilters = {}): Promise<Game[]> {
    const categoryIds = normalizeFilterValues(filters.categoryIds);
    const publisherIds = normalizeFilterValues(filters.publisherIds);
    const whereClauses = [];

    if (categoryIds.length > 0) {
        whereClauses.push(inArray(categories.id, categoryIds));
    }

    if (publisherIds.length > 0) {
        whereClauses.push(inArray(publishers.id, publisherIds));
    }

    const query = whereClauses.length > 0 ? baseGamesQuery(db).where(and(...whereClauses)) : baseGamesQuery(db);
    const rows = await query.orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
