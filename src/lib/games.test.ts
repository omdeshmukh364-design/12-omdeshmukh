import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllCategories,
    getAllGames,
    getAllGameIds,
    getAllPublishers,
    getGameById,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedFilterFixture(db: Database): Promise<{
    strategyCategoryId: number;
    puzzleCategoryId: number;
    pubOneId: number;
    pubTwoId: number;
}> {
    const [strategyCategory] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'Strategy games' })
        .returning({ id: categories.id });
    const [puzzleCategory] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'Puzzle games' })
        .returning({ id: categories.id });
    const [pubOne] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'Publisher one' })
        .returning({ id: publishers.id });
    const [pubTwo] = await db
        .insert(publishers)
        .values({ name: 'Pub Two', description: 'Publisher two' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        {
            title: 'Alpha',
            description: 'Strategy from Pub One',
            starRating: 4.5,
            categoryId: strategyCategory.id,
            publisherId: pubOne.id,
        },
        {
            title: 'Beta',
            description: 'Puzzle from Pub One',
            starRating: 4.4,
            categoryId: puzzleCategory.id,
            publisherId: pubOne.id,
        },
        {
            title: 'Gamma',
            description: 'Strategy from Pub Two',
            starRating: 4.1,
            categoryId: strategyCategory.id,
            publisherId: pubTwo.id,
        },
        {
            title: 'Delta',
            description: 'Puzzle from Pub Two',
            starRating: 4.7,
            categoryId: puzzleCategory.id,
            publisherId: pubTwo.id,
        },
    ]);

    return {
        strategyCategoryId: strategyCategory.id,
        puzzleCategoryId: puzzleCategory.id,
        pubOneId: pubOne.id,
        pubTwoId: pubTwo.id,
    };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by a single category', async () => {
        const { strategyCategoryId } = await seedFilterFixture(db);

        const filtered = await getAllGames(db, { categoryIds: [strategyCategoryId] });

        expect(filtered.map((game) => game.title)).toEqual(['Alpha', 'Gamma']);
    });

    it('combines category and publisher filters', async () => {
        const { strategyCategoryId, pubOneId } = await seedFilterFixture(db);

        const filtered = await getAllGames(db, {
            categoryIds: [strategyCategoryId],
            publisherIds: [pubOneId],
        });

        expect(filtered.map((game) => game.title)).toEqual(['Alpha']);
    });

    it('returns no games when filters do not match any rows', async () => {
        const { strategyCategoryId, pubOneId } = await seedFilterFixture(db);

        const filtered = await getAllGames(db, {
            categoryIds: [strategyCategoryId],
            publisherIds: [pubOneId + 999],
        });

        expect(filtered).toEqual([]);
    });

    it('lists categories and publishers in name order for filter controls', async () => {
        await seedFilterFixture(db);

        const categoriesList = await getAllCategories(db);
        const publishersList = await getAllPublishers(db);

        expect(categoriesList.map((entry) => entry.name)).toEqual(['Puzzle', 'Strategy']);
        expect(publishersList.map((entry) => entry.name)).toEqual(['Pub One', 'Pub Two']);
    });
});
