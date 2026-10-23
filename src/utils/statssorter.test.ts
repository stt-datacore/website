import { describe, expect, it } from 'vitest';
import { StatsSorter } from './statssorter';

const makeSorter = () => new StatsSorter({ objectConfig: { props: [] } });

describe('StatsSorter.getValue', () => {
    const sorter = makeSorter();
    const target = { a: 1, nested: { b: 2, arr: [10, 20] }, list: [{ c: 3 }] };

    it('reads top-level and nested properties', () => {
        expect(sorter.getValue(target, 'a')).toBe(1);
        expect(sorter.getValue(target, 'nested/b')).toBe(2);
        expect(sorter.getValue(target, 'nested/arr/1')).toBe(20);
        expect(sorter.getValue(target, 'list/0/c')).toBe(3);
        expect(sorter.getValue([5, 6], 1)).toBe(6);
    });

    it('returns undefined for missing paths', () => {
        expect(sorter.getValue(target, 'missing')).toBeUndefined();
        expect(sorter.getValue(target, 'missing/b')).toBeUndefined();
        expect(sorter.getValue(target, 'list/5/c')).toBeUndefined();
    });
});

describe('StatsSorter.getCompoundValue', () => {
    const sorter = makeSorter();
    const target = { a: 6, b: 3, c: -2, z: 0, nested: { d: 4 } };

    it('defaults to addition', () => {
        expect(sorter.getCompoundValue(target, 'a&b')).toBe(9);
        expect(sorter.getCompoundValue(target, 'a&b&c&nested/d')).toBe(11);
    });

    it.each([
        ['+', 9],
        ['-', 3],
        ['*', 18],
        ['/', 2],
        ['%', 0],
        ['**', 216],
    ])('applies the %s operator', (op, expected) => {
        expect(sorter.getCompoundValue(target, 'a&b', op)).toBe(expected);
    });

    it('applies operators left to right', () => {
        expect(sorter.getCompoundValue(target, 'a&b&c', '-')).toBe(5);
        expect(sorter.getCompoundValue(target, 'a&b&nested/d', '/')).toBe(0.5);
    });

    it('handles negative operands', () => {
        expect(sorter.getCompoundValue(target, 'a&c', '-')).toBe(8);
        expect(sorter.getCompoundValue(target, 'a&c', '*')).toBe(-12);
    });

    it('handles division by zero', () => {
        expect(sorter.getCompoundValue(target, 'a&z', '/')).toBe(Infinity);
    });

    it('skips missing properties', () => {
        expect(sorter.getCompoundValue(target, 'missing&a&missing&b', '-')).toBe(3);
        expect(sorter.getCompoundValue(target, 'a&missing')).toBe(6);
        expect(sorter.getCompoundValue(target, 'missing&other')).toBeUndefined();
    });

    it('returns a single value unchanged', () => {
        expect(sorter.getCompoundValue(target, 'b')).toBe(3);
        expect(sorter.getCompoundValue([7, 8], 1)).toBe(8);
    });

    it('coerces numeric strings when combining', () => {
        expect(sorter.getCompoundValue({ a: '2', b: '3' }, 'a&b')).toBe(5);
    });
});

describe('StatsSorter.sortStats', () => {
    const data = [
        { name: 'a', x: 1, y: 5 },
        { name: 'b', x: 3, y: 1 },
        { name: 'c', x: 2 },
        { name: 'd', y: 10 },
    ];

    it('sorts on a compound property', () => {
        const sorter = new StatsSorter({ objectConfig: { props: [{ props: 'x&y', direction: 'descending' }] } });
        expect(sorter.sortStats(data).map(d => d.name)).toEqual(['d', 'a', 'b', 'c']);
    });

    it('sorts on a compound property with a custom operator', () => {
        const sorter = new StatsSorter({ objectConfig: { props: [{ props: 'x&y', compoundOperator: '*' }] } });
        expect(sorter.sortStats(data).map(d => d.name)).toEqual(['c', 'b', 'a', 'd']);
    });

    it('places nulls according to nullDirection and respects precedence', () => {
        const sorter = new StatsSorter({
            objectConfig: {
                props: [
                    { props: 'y', direction: 'ascending', precedence: 2 },
                    { props: 'x', direction: 'descending', nullDirection: 'descending', precedence: 1 },
                ]
            }
        });
        expect(sorter.sortStats(data).map(d => d.name)).toEqual(['b', 'c', 'a', 'd']);
    });

    it('does not mutate the input unless sorting in place', () => {
        const sorter = new StatsSorter({ objectConfig: { props: [{ props: 'x', direction: 'descending' }] } });
        const copy = [...data];
        sorter.sortStats(copy);
        expect(copy).toEqual(data);
        sorter.sortStats(copy, true);
        expect(copy.map(d => d.name)).toEqual(['d', 'b', 'c', 'a']);
    });
});

describe('StatsSorter compound operator validation', () => {
    const sorter = makeSorter();

    it('rejects unsupported operators instead of evaluating them', () => {
        try {
            expect(() => sorter.getCompoundValue({ a: 1, b: 2 }, 'a&b', '; globalThis.hacked = true;')).toThrow(/Unsupported compound operator/);
            expect((globalThis as any).hacked).toBeUndefined();
        }
        finally {
            delete (globalThis as any).hacked;
        }
    });

    it('tolerates whitespace around the operator', () => {
        expect(sorter.getCompoundValue({ a: 1, b: 2 }, 'a&b', ' - ')).toBe(-1);
    });
});
